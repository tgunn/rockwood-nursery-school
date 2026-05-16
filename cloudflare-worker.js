/**
 * Rockwood Nursery School — Cloudflare Worker
 * Calendar ICS Proxy
 *
 * Fetches Google Calendar .ics feeds server-side (bypassing CORS/allowlist)
 * and returns them to the browser with correct headers.
 *
 * Deploy at: https://dash.cloudflare.com → Workers → Create Worker
 * Route:     calendar.rockwoodnurseryschool.ca/* (or as a worker route)
 *
 * Usage from browser:
 *   fetch('/calendar-proxy?cal=cleaning')
 *   fetch('/calendar-proxy?cal=monthly')
 */

const CALENDARS = {
  cleaning: '3cc581792ac4745c6ef7a857b215b5fb42aeeefed895c0a9074f220056d23334@group.calendar.google.com',
  monthly:  'adb2e08688202f0f028f6e50e1ad113e04b748e4cd25dc85c835b8f12f696e49@group.calendar.google.com',
};

const ALLOWED_ORIGIN = 'https://rockwoodnurseryschool.ca';

export default {
  async fetch(request) {
    const url = new URL(request.url);

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
          'Access-Control-Allow-Methods': 'GET',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    // Only allow GET /calendar-proxy?cal=cleaning|monthly
    if (url.pathname !== '/calendar-proxy') {
      return new Response('Not found', { status: 404 });
    }

    const calKey = url.searchParams.get('cal');
    const calId = CALENDARS[calKey];

    if (!calId) {
      return new Response('Unknown calendar', { status: 400 });
    }

    const icsUrl = `https://calendar.google.com/calendar/ical/${encodeURIComponent(calId)}/public/basic.ics`;

    try {
      const response = await fetch(icsUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; RNS-Calendar-Proxy/1.0)',
        },
      });

      if (!response.ok) {
        return new Response(`Google Calendar error: ${response.status}`, {
          status: response.status,
        });
      }

      const icsText = await response.text();

      return new Response(icsText, {
        headers: {
          'Content-Type': 'text/calendar; charset=utf-8',
          'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
          'Cache-Control': 'public, max-age=300', // cache 5 minutes
        },
      });

    } catch (err) {
      return new Response(`Proxy error: ${err.message}`, { status: 500 });
    }
  },
};
