const http = require('http');
const ical = require('node-ical');

/* ── Config ── */

const ICAL_URL = 'https://calendar.google.com/calendar/ical/97cdb0276a84ba2f8b8e7c72ae3fc32c0695c09a6d866abb25c596cb4572cb1e%40group.calendar.google.com/public/basic.ics';
const REDIRECT_URL = 'https://kingposs.com/radio.html?from=kpradio';
const REFRESH_INTERVAL = 15 * 60 * 1000; // 15 minutes
const PORT = process.env.PORT || 3000;
const SITE_TITLE = 'KP Radio';

/* ── State ── */

let nextEvent = null;
let lastFetch = null;
let fetchError = null;

/* ── ICS Fetching ── */

async function fetchNextBroadcast() {
  try {
    const data = await ical.async.fromURL(ICAL_URL);
    const now = new Date();
    let soonest = null;

    for (const key of Object.keys(data)) {
      const ev = data[key];
      if (ev.type !== 'VEVENT') continue;

      const start = ev.start ? new Date(ev.start) : null;
      const end = ev.end ? new Date(ev.end) : start;
      if (!start || isNaN(start.getTime())) continue;

      // skip past events
      if (end <= now) continue;

      // handle recurring events - node-ical expands rrules for us
      if (!soonest || start < new Date(soonest.start)) {
        soonest = {
          summary: ev.summary || 'Broadcast',
          start: start,
          end: ev.end ? new Date(ev.end) : null,
          location: ev.location || ''
        };
      }
    }

    nextEvent = soonest;
    lastFetch = new Date();
    fetchError = null;
    console.log('[%s] Fetched calendar. Next event: %s',
      lastFetch.toISOString(),
      soonest ? soonest.summary + ' @ ' + soonest.start.toISOString() : 'none');
  } catch (err) {
    fetchError = err.message;
    console.error('[%s] Fetch error: %s', new Date().toISOString(), err.message);
  }
}

/* ── Time Formatting ── */

function formatTime(date) {
  // Format in the event's local time (server timezone).
  // Crawlers see this; real users get redirected and see localized time on-site.
  return date.toLocaleString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short'
  });
}

function formatTimeShort(date) {
  return date.toLocaleString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short'
  });
}

function formatDateOnly(date) {
  return date.toLocaleString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  });
}

function formatTimeOnly(date) {
  return date.toLocaleString('en-US', {
    hour: 'numeric',
    minute: '2-digit'
  });
}

function formatTzAbbr(date) {
  return date.toLocaleString('en-US', { timeZoneName: 'short' }).split(' ').pop();
}

/* ── HTML Generation ── */

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function buildPage() {
  let ogTitle, ogDescription;

  if (nextEvent) {
    const now = new Date();
    const isLive = (now >= nextEvent.start && nextEvent.end && now <= nextEvent.end);

    if (isLive) {
      ogTitle = 'LIVE NOW: ' + nextEvent.summary;
      ogDescription = 'Broadcasting until ' + formatTimeShort(nextEvent.end) + ' — Tune in!';
    } else {
      const dateStr = formatDateOnly(nextEvent.start);
      const startStr = formatTimeOnly(nextEvent.start);
      const tz = formatTzAbbr(nextEvent.start);
      const endStr = nextEvent.end ? (' to ' + formatTimeOnly(nextEvent.end)) : '';
      ogTitle = 'Next Broadcast: ' + dateStr;
      ogDescription = nextEvent.summary + ' @ ' + startStr + endStr + ' ' + tz + ' - Click to see in your timezone!';
    }
  } else {
    ogTitle = SITE_TITLE;
    ogDescription = 'Live broadcasts, tracker music, indie artists, and more!';
  }

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${escapeHtml(SITE_TITLE)}">
<meta property="og:title" content="${escapeHtml(ogTitle)}">
<meta property="og:description" content="${escapeHtml(ogDescription)}">
<meta property="og:url" content="${escapeHtml(REDIRECT_URL)}">
<meta name="twitter:card" content="summary">
<meta name="twitter:title" content="${escapeHtml(ogTitle)}">
<meta name="twitter:description" content="${escapeHtml(ogDescription)}">
<meta name="theme-color" content="#ff8b2d">
<script>window.location.replace(${JSON.stringify(REDIRECT_URL)});</script>
<meta http-equiv="refresh" content="0;url=${escapeHtml(REDIRECT_URL)}">
<title>${escapeHtml(ogTitle)} - ${escapeHtml(SITE_TITLE)}</title>
</head>
<body style="display:none"></body>
</html>`;
}

/* ── Server ── */

const server = http.createServer((req, res) => {
  // Health check endpoint
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      ok: !fetchError,
      lastFetch: lastFetch,
      nextEvent: nextEvent ? { summary: nextEvent.summary, start: nextEvent.start } : null,
      error: fetchError
    }));
    return;
  }

  // Everything else serves the OG redirect page
  const html = buildPage();
  res.writeHead(200, {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'public, max-age=300' // 5 min cache so crawlers don't hammer it
  });
  res.end(html);
});

// Initial fetch, then refresh on interval
fetchNextBroadcast();
setInterval(fetchNextBroadcast, REFRESH_INTERVAL);

server.listen(PORT, () => {
  console.log('broadcast-embed listening on port %d', PORT);
});
