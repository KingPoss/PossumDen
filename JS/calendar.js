
var ICAL_URL = 'https://calendar.google.com/calendar/ical/97cdb0276a84ba2f8b8e7c72ae3fc32c0695c09a6d866abb25c596cb4572cb1e%40group.calendar.google.com/public/basic.ics';
var ICAL_PROXY = 'https://cors.kingposs.com/ical/';


/* ═══════════════════════════════════════════════════
   UTILITIES
   ═══════════════════════════════════════════════════ */

var userLocale = (navigator.languages && navigator.languages[0]) || navigator.language || 'en-US';

function formatTimeLocale(date) {
  if (!(date instanceof Date) || isNaN(date.getTime())) return '';
  try {
    return new Intl.DateTimeFormat(userLocale, { hour: 'numeric', minute: '2-digit' }).format(date);
  } catch(e) {
    var h = date.getHours(), m = date.getMinutes();
    var ap = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return h + ':' + (m < 10 ? '0' : '') + m + ' ' + ap;
  }
}

function escapeHtml(s) {
  var d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

function isSpecialEvent(t) { return /interview/i.test(t); }
function dateMidnight(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
function dateKey(d) { return d.getFullYear() + '-' + d.getMonth() + '-' + d.getDate(); }

var userTZ = '';
try { userTZ = Intl.DateTimeFormat().resolvedOptions().timeZone; } catch(e) {}


/* ═══════════════════════════════════════════════════
   STATE
   ═══════════════════════════════════════════════════ */

var currentYear = new Date().getFullYear();
var currentMonth = new Date().getMonth();
var events = {};
var allIcalEvents = [];
var isFetching = false;

var MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
var DAY_ABBREVS = ['SUN','MON','TUE','WED','THU','FRI','SAT'];
var DAY_MAP = { SU:0, MO:1, TU:2, WE:3, TH:4, FR:5, SA:6 };

var RECUR_HORIZON = new Date();
RECUR_HORIZON.setFullYear(RECUR_HORIZON.getFullYear() + 2);
var MAX_RECUR = 500;


/* ═══════════════════════════════════════════════════
   ICS PARSER
   ═══════════════════════════════════════════════════ */

function unfoldICS(text) {
  var raw = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  var lines = raw.split('\n');
  var result = [];
  for (var i = 0; i < lines.length; i++) {
    if ((lines[i].charAt(0) === ' ' || lines[i].charAt(0) === '\t') && result.length > 0) {
      result[result.length - 1] += lines[i].substring(1);
    } else {
      result.push(lines[i]);
    }
  }
  return result;
}

function parseICSDate(str, tzid) {
  if (/^\d{8}$/.test(str)) {
    return new Date(parseInt(str.substring(0,4),10), parseInt(str.substring(4,6),10)-1, parseInt(str.substring(6,8),10));
  }
  var m = str.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)$/);
  if (!m) return null;
  var yr=parseInt(m[1],10), mo=parseInt(m[2],10)-1, dy=parseInt(m[3],10);
  var hh=parseInt(m[4],10), mm=parseInt(m[5],10), ss=parseInt(m[6],10);
  if (m[7] === 'Z') return new Date(Date.UTC(yr, mo, dy, hh, mm, ss));
  if (tzid) {
    try {
      var utc = new Date(Date.UTC(yr, mo, dy, hh, mm, ss));
      var inTZ = new Date(utc.toLocaleString('en-US', { timeZone: tzid }));
      var inUTC = new Date(utc.toLocaleString('en-US', { timeZone: 'UTC' }));
      return new Date(utc.getTime() + (inUTC.getTime() - inTZ.getTime()));
    } catch(e) {}
  }
  return new Date(yr, mo, dy, hh, mm, ss);
}

function unescapeICS(s) {
  return s.replace(/\\n/g,'\n').replace(/\\,/g,',').replace(/\\;/g,';').replace(/\\\\/g,'\\');
}


/* ═══════════════════════════════════════════════════
   RRULE EXPANSION
   ═══════════════════════════════════════════════════ */

function parseRRule(str) {
  var rule = {};
  var parts = str.split(';');
  for (var i = 0; i < parts.length; i++) {
    var kv = parts[i].split('=');
    if (kv.length === 2) rule[kv[0]] = kv[1];
  }
  return rule;
}

function parseExDates(strs, tzid) {
  var dates = {};
  for (var i = 0; i < strs.length; i++) {
    var vals = strs[i].split(',');
    for (var j = 0; j < vals.length; j++) {
      var d = parseICSDate(vals[j].trim(), tzid);
      if (d) dates[dateMidnight(d).getTime()] = true;
    }
  }
  return dates;
}

function getNthWeekday(year, month, dow, n) {
  if (n > 0) {
    var f = new Date(year, month, 1);
    var diff = (dow - f.getDay() + 7) % 7;
    var day = 1 + diff + (n - 1) * 7;
    if (day > new Date(year, month + 1, 0).getDate()) return null;
    return new Date(year, month, day);
  } else if (n < 0) {
    var l = new Date(year, month + 1, 0);
    var diff2 = (l.getDay() - dow + 7) % 7;
    var day2 = l.getDate() - diff2 + (n + 1) * 7;
    if (day2 < 1) return null;
    return new Date(year, month, day2);
  }
  return null;
}

function expandRecurrence(start, end, rruleStr, exStrs, isAllDay, tzid) {
  var rule = parseRRule(rruleStr);
  var freq = rule.FREQ || '';
  var interval = parseInt(rule.INTERVAL || '1', 10);
  var count = rule.COUNT ? parseInt(rule.COUNT, 10) : null;
  var until = rule.UNTIL ? parseICSDate(rule.UNTIL, tzid) : null;
  var byDay = (rule.BYDAY || '').split(',').filter(function(s) { return s.length > 0; });
  var byMonthDay = rule.BYMONTHDAY ? parseInt(rule.BYMONTHDAY, 10) : null;
  var byMonth = rule.BYMONTH ? parseInt(rule.BYMONTH, 10) : null;
  var bySetPos = rule.BYSETPOS ? parseInt(rule.BYSETPOS, 10) : null;

  var exDates = parseExDates(exStrs || [], tzid);
  var dur = end ? (end.getTime() - start.getTime()) : 0;
  var horizon = until ? new Date(Math.min(until.getTime(), RECUR_HORIZON.getTime())) : RECUR_HORIZON;
  var instances = [];
  var gen = 0;

  function makeEnd(s) { return end ? new Date(s.getTime() + dur) : null; }
  function isExcluded(d) { return !!exDates[dateMidnight(d).getTime()]; }
  function copyTime(d) { if (!isAllDay) d.setHours(start.getHours(), start.getMinutes(), start.getSeconds()); }

  if (!isExcluded(start)) {
    instances.push({ start: start, end: makeEnd(start) });
    gen++;
  }
  if (!freq) return instances;

  var cand, cur;

  if (freq === 'DAILY') {
    cur = new Date(start);
    for (var s = 0; s < MAX_RECUR * interval + 1; s++) {
      cur = new Date(cur.getTime() + 86400000 * interval);
      if (cur > horizon || (count && gen >= count)) break;
      if (isExcluded(cur)) continue;
      instances.push({ start: new Date(cur), end: makeEnd(cur) });
      gen++;
    }
  } else if (freq === 'WEEKLY') {
    var targets = [];
    if (byDay.length > 0) {
      for (var b = 0; b < byDay.length; b++) {
        var dn = DAY_MAP[byDay[b].replace(/[^A-Z]/g, '')];
        if (dn !== undefined) targets.push(dn);
      }
    } else {
      targets.push(start.getDay());
    }
    targets.sort(function(a, b) { return a - b; });
    var ws = dateMidnight(start);
    ws = new Date(ws.getTime() - ws.getDay() * 86400000);
    for (var w = 0; w < MAX_RECUR; w++) {
      var wd = new Date(ws.getTime() + w * 7 * 86400000 * interval);
      if (wd > new Date(horizon.getTime() + 7 * 86400000)) break;
      for (var td = 0; td < targets.length; td++) {
        cand = new Date(wd.getTime() + targets[td] * 86400000);
        copyTime(cand);
        if (cand <= start || cand > horizon || (count && gen >= count)) continue;
        if (isExcluded(cand)) continue;
        instances.push({ start: new Date(cand), end: makeEnd(cand) });
        gen++;
      }
      if (count && gen >= count) break;
    }
  } else if (freq === 'MONTHLY') {
    cur = new Date(start);
    for (var mi = 0; mi < MAX_RECUR; mi++) {
      var nm = cur.getMonth() + interval;
      var ny = cur.getFullYear() + Math.floor(nm / 12);
      nm = nm % 12;
      var td2 = byMonthDay || start.getDate();
      if (byDay.length > 0 && bySetPos) {
        var dn2 = DAY_MAP[byDay[0].replace(/[^A-Z]/g, '')];
        cand = getNthWeekday(ny, nm, dn2, bySetPos);
        if (!cand) { cur = new Date(ny, nm, 1); continue; }
        copyTime(cand);
      } else if (byDay.length > 0) {
        var pm = byDay[0].match(/^(-?\d+)([A-Z]{2})$/);
        if (pm) {
          cand = getNthWeekday(ny, nm, DAY_MAP[pm[2]], parseInt(pm[1], 10));
          if (!cand) { cur = new Date(ny, nm, 1); continue; }
          copyTime(cand);
        } else {
          var dim = new Date(ny, nm + 1, 0).getDate();
          cand = new Date(ny, nm, Math.min(td2, dim));
          copyTime(cand);
        }
      } else {
        var dim2 = new Date(ny, nm + 1, 0).getDate();
        cand = new Date(ny, nm, Math.min(td2, dim2));
        copyTime(cand);
      }
      cur = new Date(ny, nm, 1);
      if (cand <= start) continue;
      if (cand > horizon || (count && gen >= count)) break;
      if (isExcluded(cand)) continue;
      instances.push({ start: new Date(cand), end: makeEnd(cand) });
      gen++;
    }
  } else if (freq === 'YEARLY') {
    for (var yi = 0; yi < MAX_RECUR; yi++) {
      var yy = start.getFullYear() + (yi + 1) * interval;
      var ym = byMonth ? (byMonth - 1) : start.getMonth();
      var yd = byMonthDay || start.getDate();
      var ydim = new Date(yy, ym + 1, 0).getDate();
      cand = new Date(yy, ym, Math.min(yd, ydim));
      copyTime(cand);
      if (cand > horizon || (count && gen >= count)) break;
      if (isExcluded(cand)) continue;
      instances.push({ start: new Date(cand), end: makeEnd(cand) });
      gen++;
    }
  }

  return instances;
}


/* ═══════════════════════════════════════════════════
   FULL ICS PARSE
   ═══════════════════════════════════════════════════ */

function parseICS(icsText) {
  var lines = unfoldICS(icsText);
  var cur = null;
  var rawEvents = [];

  for (var i = 0; i < lines.length; i++) {
    var line = lines[i];
    if (line === 'BEGIN:VEVENT') {
      cur = { exdates: [] };
    } else if (line === 'END:VEVENT' && cur) {
      rawEvents.push(cur);
      cur = null;
    } else if (cur) {
      var ci = line.indexOf(':');
      if (ci > 0) {
        var fk = line.substring(0, ci);
        var val = line.substring(ci + 1);
        var pts = fk.split(';');
        var bk = pts[0];
        var tzid = '';
        for (var p = 1; p < pts.length; p++) {
          if (pts[p].indexOf('TZID=') === 0) tzid = pts[p].substring(5);
        }
        if (bk === 'EXDATE') {
          cur.exdates.push(val);
          if (tzid) cur['EXDATE_TZID'] = tzid;
        } else {
          cur[bk] = val;
          if (tzid) cur[bk + '_TZID'] = tzid;
        }
      }
    }
  }

  var allEvs = [];
  for (var r = 0; r < rawEvents.length; r++) {
    var raw = rawEvents[r];
    var rs = raw['DTSTART'] || '';
    var re = raw['DTEND'] || '';
    var stZ = raw['DTSTART_TZID'] || '';
    var isAD = (rs.length === 8);
    var sd = parseICSDate(rs, stZ);
    var ed = re ? parseICSDate(re, raw['DTEND_TZID'] || '') : null;
    if (!sd) continue;
    if (isAD && ed) {
      ed = new Date(ed.getTime() - 86400000);
      if (ed < sd) ed = new Date(sd.getTime());
    }
    var sm = unescapeICS(raw['SUMMARY'] || '(No title)');
    var ds = unescapeICS(raw['DESCRIPTION'] || '');
    var lc = unescapeICS(raw['LOCATION'] || '');

    if (raw['RRULE']) {
      var inst = expandRecurrence(sd, ed, raw['RRULE'], raw.exdates, isAD, stZ);
      for (var j = 0; j < inst.length; j++) {
        allEvs.push({ summary: sm, description: ds, location: lc, start: inst[j].start, end: inst[j].end, isAllDay: isAD });
      }
    } else {
      allEvs.push({ summary: sm, description: ds, location: lc, start: sd, end: ed, isAllDay: isAD });
    }
  }
  return allEvs;
}


/* ═══════════════════════════════════════════════════
   EVENT MAPPING
   ═══════════════════════════════════════════════════ */

function sortAndColor(evMap) {
  for (var k in evMap) {
    if (!evMap.hasOwnProperty(k)) continue;
    evMap[k].sort(function(a, b) {
      if (a.isAllDay && !b.isAllDay) return -1;
      if (!a.isAllDay && b.isAllDay) return 1;
      if (a.startDate && b.startDate) return a.startDate.getTime() - b.startDate.getTime();
      return 0;
    });
    for (var i = 0; i < evMap[k].length; i++) {
      var dayNum = parseInt(k.split('-')[2], 10);
      evMap[k][i].colorIndex = (dayNum + i) % 6;
      evMap[k][i].isSpecial = isSpecialEvent(evMap[k][i].title);
    }
  }
  return evMap;
}

function filterForMonth(year, month) {
  var evMap = {};
  var ms = new Date(year, month, 1);
  var me = new Date(year, month + 1, 0, 23, 59, 59);

  for (var i = 0; i < allIcalEvents.length; i++) {
    var ev = allIcalEvents[i];
    var ee = ev.end || ev.start;
    if (ev.start > me || ee < ms) continue;

    if (ev.isAllDay) {
      var dS = new Date(Math.max(ev.start.getTime(), ms.getTime()));
      var dE = new Date(Math.min(ee.getTime(), me.getTime()));
      var d = new Date(dS.getFullYear(), dS.getMonth(), dS.getDate());
      var lim = new Date(dE.getFullYear(), dE.getMonth(), dE.getDate());
      while (d <= lim) {
        var k = dateKey(d);
        if (!evMap[k]) evMap[k] = [];
        evMap[k].push({
          title: ev.summary, description: ev.description, location: ev.location,
          startTime: 'All Day', endTime: '', startDate: ev.start, endDate: ev.end, isAllDay: true
        });
        d.setDate(d.getDate() + 1);
      }
    } else {
      var dk = dateKey(ev.start);
      if (!evMap[dk]) evMap[dk] = [];
      evMap[dk].push({
        title: ev.summary, description: ev.description, location: ev.location,
        startTime: formatTimeLocale(ev.start), endTime: ev.end ? formatTimeLocale(ev.end) : '',
        startDate: ev.start, endDate: ev.end, isAllDay: false
      });
    }
  }
  return sortAndColor(evMap);
}


/* ═══════════════════════════════════════════════════
   FETCH
   ═══════════════════════════════════════════════════ */

function addCacheBuster(url) {
  var sep = (url.indexOf('?') === -1) ? '?' : '&';
  return url + sep + '_cb=' + Date.now();
}

function rewriteToProxy(url) {
  var marker = '/calendar/ical/';
  var idx = url.indexOf(marker);
  if (idx !== -1) {
    return ICAL_PROXY + url.substring(idx + marker.length);
  }
  return url;
}

function fetchIcal() {
  var finalUrl = addCacheBuster(rewriteToProxy(ICAL_URL));
  return fetch(finalUrl).then(function(r) {
    if (r.ok) return r.text();
    throw new Error('Fetch failed: HTTP ' + r.status);
  });
}

function setFetchingState(v) {
  isFetching = v;
  var b = document.getElementById('refreshBtn');
  if (b) {
    b.disabled = v;
    if (v) b.classList.add('refreshing');
    else b.classList.remove('refreshing');
  }
}

function fetchAndRender() {
  var grid = document.getElementById('calGrid');
  grid.innerHTML = '<div class="cal-loading" style="grid-column:1/-1">Loading events...</div>';
  setFetchingState(true);

  fetchIcal().then(function(text) {
    if (text.indexOf('BEGIN:VCALENDAR') === -1) {
      throw new Error('Invalid iCal data');
    }
    allIcalEvents = parseICS(text);
    events = filterForMonth(currentYear, currentMonth);
    renderCalendar();
    updateStatus();
    setFetchingState(false);
  }).catch(function(e) {
    grid.innerHTML = '<div class="cal-error" style="grid-column:1/-1">Calendar error: ' + escapeHtml(e.message) + '</div>';
    setFetchingState(false);
  });
}

function forceRefresh() {
  if (isFetching) return;
  allIcalEvents = [];
  events = {};
  fetchAndRender();
}


/* ═══════════════════════════════════════════════════
   RENDER
   ═══════════════════════════════════════════════════ */

function renderCalendar() {
  var grid = document.getElementById('calGrid');
  document.getElementById('monthLabel').textContent = '--- ' + MONTH_NAMES[currentMonth] + ' ' + currentYear + ' Schedule ---';
  var html = '';

  for (var h = 0; h < DAY_ABBREVS.length; h++) {
    html += '<div class="day-header">' + DAY_ABBREVS[h] + '</div>';
  }

  var firstDay = new Date(currentYear, currentMonth, 1).getDay();
  var daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  var today = new Date();

  for (var i = 0; i < firstDay; i++) {
    html += '<div class="day-cell empty"></div>';
  }

  for (var d = 1; d <= daysInMonth; d++) {
    var isToday = (d === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear());
    var key = currentYear + '-' + currentMonth + '-' + d;
    var dayEvs = events[key] || [];

    html += '<div class="day-cell' + (isToday ? ' today' : '') + '" onclick="showDayEvents(' + d + ')">';
    html += '<span class="day-num">' + d + '</span>';

    var show = Math.min(dayEvs.length, 3);
    for (var j = 0; j < show; j++) {
      var ev = dayEvs[j];
      var pl = ev.isAllDay ? ev.title : (ev.startTime + ' ' + ev.title);
      var pc = ev.isSpecial ? 'event-pip event-special' : 'event-pip event-color-' + ev.colorIndex;
      html += '<div class="' + pc + '" title="' + escapeHtml((ev.isAllDay ? 'All Day' : ev.startTime) + ' - ' + ev.title) + '">' + escapeHtml(pl) + '</div>';
    }
    if (dayEvs.length > 3) {
      html += '<div class="cal-overflow">+' + (dayEvs.length - 3) + ' more</div>';
    }
    html += '</div>';
  }
// Fill trailing empty cells to complete the grid
var totalCells = firstDay + daysInMonth;
var remainder = totalCells % 7;
if (remainder > 0) {
  for (var e = 0; e < 7 - remainder; e++) {
    html += '<div class="day-cell empty"></div>';
  }
}
  grid.innerHTML = html;
  renderAgenda();
}


function renderAgenda() {
  var agenda = document.getElementById('calAgenda');
  if (!agenda) return;

  var daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  var today = new Date();
  var dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  var html = '';
  var hasAny = false;

  for (var d = 1; d <= daysInMonth; d++) {
    var key = currentYear + '-' + currentMonth + '-' + d;
    var dayEvs = events[key] || [];
    if (dayEvs.length === 0) continue;

    hasAny = true;
    var isToday = (d === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear());
    var dow = new Date(currentYear, currentMonth, d).getDay();

    html += '<div class="agenda-day' + (isToday ? ' today' : '') + '" onclick="showDayEvents(' + d + ')">';
    html += '<div class="agenda-date"><span class="agenda-dow">' + dayNames[dow] + '</span>' + d + ' ' + MONTH_NAMES[currentMonth] + '</div>';

    for (var j = 0; j < dayEvs.length; j++) {
      var ev = dayEvs[j];
      var pl = ev.isAllDay ? ev.title : (ev.startTime + ' ' + ev.title);
      var pc = ev.isSpecial ? 'event-pip event-special' : 'event-pip event-color-' + ev.colorIndex;
      html += '<div class="' + pc + '">' + escapeHtml(pl) + '</div>';
    }
    html += '</div>';
  }

  if (!hasAny) {
    html = '<div class="agenda-empty">No events this month</div>';
  }

  agenda.innerHTML = html;
}


function updateStatus() {
  var t = 0;
  for (var k in events) {
    if (events.hasOwnProperty(k)) t += events[k].length;
  }
  var evEl = document.getElementById('statusEvents');
  if (evEl) evEl.textContent = 'Events: ' + t;

  var syncEl = document.getElementById('statusFetched');
  if (syncEl) syncEl.textContent = 'Synced: ' + formatTimeLocale(new Date());
}

function changeMonth(delta) {
  currentMonth += delta;
  if (currentMonth > 11) { currentMonth = 0; currentYear++; }
  if (currentMonth < 0) { currentMonth = 11; currentYear--; }

  if (allIcalEvents.length > 0) {
    events = filterForMonth(currentYear, currentMonth);
    renderCalendar();
    renderAgenda();
    updateStatus();
  } else {
    fetchAndRender();
  }
}

function showDayEvents(day) {
  var key = currentYear + '-' + currentMonth + '-' + day;
  var dayEvs = events[key] || [];
  document.getElementById('popupTitle').textContent = MONTH_NAMES[currentMonth] + ' ' + day + ', ' + currentYear;
  var body = document.getElementById('popupBody');
  var titleEl = document.getElementById('popupTitle');
  if (titleEl) {
    titleEl.textContent = 'Broadcasts for ' + MONTH_NAMES[currentMonth] + ' ' + day + ', ' + currentYear;
  }
  if (dayEvs.length === 0) {
    body.innerHTML = '<div class="no-events">No events on this day.</div>';
  } else {
    var html = '';
    for (var i = 0; i < dayEvs.length; i++) {
      var ev = dayEvs[i];
      var ic = ev.isSpecial ? 'event-item event-item-special' : 'event-item';
      html += '<div class="' + ic + '">';
      html += '<div class="event-title">' + escapeHtml(ev.title) + '</div>';
      html += '<div class="event-time">Time: ' + escapeHtml(ev.startTime);
      if (ev.endTime) html += ' - ' + escapeHtml(ev.endTime);
      html += '</div>';
      if (ev.location) html += '<div class="event-desc">Location: ' + escapeHtml(ev.location) + '</div>';
      if (ev.description) html += '<div class="event-desc">' + escapeHtml(ev.description) + '</div>';
      html += '</div>';
    }
    if (userTZ) {
      html += '<div class="tz-note">Times shown in ' + escapeHtml(userTZ) + '</div>';
    }
    body.innerHTML = html;
  }
  document.getElementById('popupOverlay').classList.add('active');
}

function closePopup(e) {
  if (!e || e.target === document.getElementById('popupOverlay')) {
    document.getElementById('popupOverlay').classList.remove('active');
  }
}

document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') closePopup();
  if (e.key === 'ArrowLeft') changeMonth(-1);
  if (e.key === 'ArrowRight') changeMonth(1);
});


/* ═══════════════════════════════════════════════════
   BOOT
   ═══════════════════════════════════════════════════ */

fetchAndRender();