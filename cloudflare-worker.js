/**
 * Rockwood Nursery School — Cloudflare Worker
 *
 * This Worker serves the entire site AND handles the calendar proxy.
 * Deploy this as the main Worker for rockwoodnurseryschool.ca
 *
 * It does two things:
 * 1. GET /calendar-proxy?cal=cleaning|monthly  → fetches ICS from Google and returns it
 * 2. Everything else → passes through to your Pages/static assets
 */

const CALENDARS = {
  cleaning: '3cc581792ac4745c6ef7a857b215b5fb42aeeefed895c0a9074f220056d23334@group.calendar.google.com',
  monthly:  'adb2e08688202f0f028f6e50e1ad113e04b748e4cd25dc85c835b8f12f696e49@group.calendar.google.com',
};

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // ── CALENDAR PROXY ──────────────────────────────
    if (url.pathname === '/calendar-proxy') {

      if (request.method === 'OPTIONS') {
        return new Response(null, {
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Max-Age': '86400',
          },
        });
      }

      const calKey = url.searchParams.get('cal');
      const calId  = CALENDARS[calKey];

      if (!calId) {
        return new Response('Unknown calendar key', {
          status: 400,
          headers: { 'Access-Control-Allow-Origin': '*' },
        });
      }

      const icsUrl = `https://calendar.google.com/calendar/ical/${encodeURIComponent(calId)}/public/basic.ics`;

      try {
        const response = await fetch(icsUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; Cloudflare-Worker/1.0)',
            'Accept': 'text/calendar, */*',
          },
        });

        if (!response.ok) {
          return new Response(`Google Calendar error: ${response.status} — ensure calendar is set to public`, {
            status: response.status,
            headers: { 'Access-Control-Allow-Origin': '*' },
          });
        }

        const icsText = await response.text();

        return new Response(icsText, {
          headers: {
            'Content-Type': 'text/calendar; charset=utf-8',
            'Cache-Control': 'public, max-age=300',
            'Access-Control-Allow-Origin': '*',
          },
        });

      } catch (err) {
        return new Response(`Proxy error: ${err.message}`, {
          status: 500,
          headers: { 'Access-Control-Allow-Origin': '*' },
        });
      }
    }

    // ── ALL OTHER REQUESTS → pass through to origin ──
    return fetch(request);
  },
};
