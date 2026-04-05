/* --- Config --- */

var ICAL_URL = 'https://calendar.google.com/calendar/ical/97cdb0276a84ba2f8b8e7c72ae3fc32c0695c09a6d866abb25c596cb4572cb1e%40group.calendar.google.com/public/basic.ics';
var ICAL_PROXY = 'https://cors.kingposs.com/ical/';


/* --- Utilities --- */

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


/* --- State --- */

var currentYear = new Date().getFullYear();
var currentMonth = new Date().getMonth();
var events = {};
var allIcalEvents = [];
var isFetching = false;

var MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
var DAY_ABBREVS = ['SUN','MON','TUE','WED','THU','FRI','SAT'];

var RECUR_HORIZON = new Date();
RECUR_HORIZON.setFullYear(RECUR_HORIZON.getFullYear() + 2);
var MAX_RECUR = 500;


/* --- ICS Parser (ical.js) --- */

function parseICS(icsText) {
  var jcal = ICAL.parse(icsText);
  var comp = new ICAL.Component(jcal);
  var allEvs = [];

  var timezones = comp.getAllSubcomponents('vtimezone');
  for (var t = 0; t < timezones.length; t++) {
    var tz = new ICAL.Timezone(timezones[t]);
    ICAL.TimezoneService.register(tz.tzid, tz);
  }

  var vevents = comp.getAllSubcomponents('vevent');

  for (var i = 0; i < vevents.length; i++) {
    var vevent = new ICAL.Event(vevents[i]);
    var summary = vevent.summary || '(No title)';
    var description = vevent.description || '';
    var location = vevent.location || '';

    if (vevent.isRecurring()) {
      var expand = new ICAL.RecurExpansion({
        component: vevents[i],
        dtstart: vevent.startDate
      });

      var dur = vevent.duration;
      var safetyLimit = 0;

      while (safetyLimit < MAX_RECUR) {
        var next = expand.next();
        if (!next) break;

        var start = next.toJSDate();
        if (start > RECUR_HORIZON) break;

        var isAD = (next.isDate === true);
        var end = null;

        if (dur) {
          var endTime = next.clone();
          endTime.addDuration(dur);
          end = endTime.toJSDate();
        }

        if (isAD && end) {
          end = new Date(end.getTime() - 86400000);
          if (end < start) end = new Date(start.getTime());
        }

        allEvs.push({
          summary: summary,
          description: description,
          location: location,
          start: start,
          end: end,
          isAllDay: isAD
        });
        safetyLimit++;
      }
    } else {
      var sd = vevent.startDate.toJSDate();
      var ed = vevent.endDate ? vevent.endDate.toJSDate() : null;
      var isAD2 = (vevent.startDate.isDate === true);

      if (isAD2 && ed) {
        ed = new Date(ed.getTime() - 86400000);
        if (ed < sd) ed = new Date(sd.getTime());
      }

      allEvs.push({
        summary: summary,
        description: description,
        location: location,
        start: sd,
        end: ed,
        isAllDay: isAD2
      });
    }
  }

  return allEvs;
}


/* --- Event Mapping --- */

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


/* --- Fetch --- */

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
    updateNextBroadcast();
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


/* --- Render --- */

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

  // pad out the last row
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
  var titleEl = document.getElementById('popupTitle');
  if (titleEl) {
    titleEl.textContent = 'Broadcasts for ' + MONTH_NAMES[currentMonth] + ' ' + day + ', ' + currentYear;
  }
  var body = document.getElementById('popupBody');

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


/* --- Next Broadcast Banner --- */

function formatDateLocale(date) {
  if (!(date instanceof Date) || isNaN(date.getTime())) return '';
  try {
    return new Intl.DateTimeFormat(userLocale, {
      weekday: 'long', month: 'long', day: 'numeric'
    }).format(date);
  } catch(e) {
    var months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    return months[date.getMonth()] + ' ' + date.getDate();
  }
}

function updateNextBroadcast() {
  var banner = document.getElementById('nextBroadcast');
  if (!banner) return;

  var now = new Date();
  var next = null;

  for (var i = 0; i < allIcalEvents.length; i++) {
    var ev = allIcalEvents[i];
    var end = ev.end || ev.start;
    // skip events that have already ended
    if (end <= now) continue;
    // pick the soonest upcoming event
    if (!next || ev.start < next.start) {
      next = ev;
    }
  }

  if (!next) {
    banner.innerHTML = '<div class="next-broadcast-none">No upcoming broadcasts scheduled</div>';
    return;
  }

  var datePart = formatDateLocale(next.start);
  var startTime = formatTimeLocale(next.start);
  var endTime = next.end ? formatTimeLocale(next.end) : '';
  var timePart = endTime ? (startTime + ' to ' + endTime) : startTime;
  var tzNote = userTZ ? (' (' + userTZ + ')') : '';

  // check if broadcast is happening right now
  var isLive = (now >= next.start && next.end && now <= next.end);

  var html = '';
  if (isLive) {
    html += '<div class="next-broadcast-live">';
    html += '<span class="broadcast-live-dot"></span> ';
    html += 'LIVE NOW: <strong>' + escapeHtml(next.summary) + '</strong>';
    html += ' &mdash; until ' + escapeHtml(endTime) + '<span class="broadcast-tz">' + escapeHtml(tzNote) + '</span>';
    html += '</div>';
  } else {
    html += '<div class="next-broadcast-info">';
    html += 'NEXT BROADCAST: <strong>' + escapeHtml(datePart) + '</strong>';
    html += ' @ <strong>' + escapeHtml(timePart) + '</strong>';
    html += '<span class="broadcast-tz">' + escapeHtml(tzNote) + '</span>';
    html += '</div>';
  }

  banner.innerHTML = html;
}


/* --- kpradio.net Referral Popup --- */

function checkKpradioReferral() {
  var params = new URLSearchParams(window.location.search);
  if (params.get('from') !== 'kpradio') return;

  // clean the URL so it doesn't show the param
  if (window.history.replaceState) {
    window.history.replaceState({}, '', window.location.pathname);
  }

  // wait for events to be loaded, then show popup
  var attempts = 0;
  var check = setInterval(function() {
    attempts++;
    if (allIcalEvents.length > 0 || attempts > 30) {
      clearInterval(check);
      showKpradioPopup();
    }
  }, 500);
}

function showKpradioPopup() {
  var now = new Date();
  var next = null;

  for (var i = 0; i < allIcalEvents.length; i++) {
    var ev = allIcalEvents[i];
    var end = ev.end || ev.start;
    if (end <= now) continue;
    if (!next || ev.start < next.start) next = ev;
  }

  // build overlay
  var overlay = document.createElement('div');
  overlay.className = 'kpradio-popup-overlay';

  var box = document.createElement('div');
  box.className = 'kpradio-popup';

  var html = '';
  if (next) {
    var isLive = (now >= next.start && next.end && now <= next.end);
    var datePart = formatDateLocale(next.start);
    var startTime = formatTimeLocale(next.start);
    var endTime = next.end ? formatTimeLocale(next.end) : '';
    var timePart = endTime ? (startTime + ' to ' + endTime) : startTime;
    var tzLabel = userTZ || '';

    if (isLive) {
      html += '<div class="kpradio-popup-title">LIVE NOW!</div>';
      html += '<div class="kpradio-popup-event">' + escapeHtml(next.summary) + '</div>';
      html += '<div class="kpradio-popup-time">Until ' + escapeHtml(endTime) + '</div>';
    } else {
      html += '<div class="kpradio-popup-title">Next Broadcast</div>';
      html += '<div class="kpradio-popup-date">' + escapeHtml(datePart) + '</div>';
      html += '<div class="kpradio-popup-event">' + escapeHtml(next.summary) + '</div>';
      html += '<div class="kpradio-popup-time">' + escapeHtml(timePart) + '</div>';
    }
    if (tzLabel) {
      html += '<div class="kpradio-popup-tz">Your time (' + escapeHtml(tzLabel) + ')</div>';
    }
  } else {
    html += '<div class="kpradio-popup-title">KP Radio</div>';
    html += '<div class="kpradio-popup-event">No upcoming broadcasts scheduled</div>';
  }
  html += '<button class="kpradio-popup-close btn-95">Got it!</button>';

  box.innerHTML = html;
  overlay.appendChild(box);
  document.body.appendChild(overlay);

  // close handlers
  var closeBtn = box.querySelector('.kpradio-popup-close');
  closeBtn.onclick = function() { overlay.remove(); };
  overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };
}


/* --- Boot --- */

document.addEventListener('DOMContentLoaded', function() {
  fetchAndRender();
  checkKpradioReferral();
});
