/**
 * Rockwood Nursery School — Cloudflare Pages Function
 * File: /functions/calendar-proxy.js
 *
 * This file lives in your GitHub repo alongside index.html.
 * Cloudflare Pages automatically deploys it as a serverless
 * function at: https://rockwoodnurseryschool.ca/calendar-proxy
 *
 * No configuration needed — it just works once deployed.
 */

const CALENDARS = {
  cleaning: '3cc581792ac4745c6ef7a857b215b5fb42aeeefed895c0a9074f220056d23334@group.calendar.google.com',
  monthly:  'adb2e08688202f0f028f6e50e1ad113e04b748e4cd25dc85c835b8f12f696e49@group.calendar.google.com',
};

export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders(),
    });
  }

  const calKey = url.searchParams.get('cal');
  const calId  = CALENDARS[calKey];

  if (!calId) {
    return new Response(JSON.stringify({ error: 'Unknown calendar key' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders() },
    });
  }

  const icsUrl = `https://calendar.google.com/calendar/ical/${encodeURIComponent(calId)}/public/basic.ics`;

  try {
    const response = await fetch(icsUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Cloudflare-Pages-Function/1.0)',
        'Accept': 'text/calendar, */*',
      },
    });

    if (!response.ok) {
      return new Response(`Google Calendar returned ${response.status}. Ensure the calendar is set to public.`, {
        status: response.status,
        headers: corsHeaders(),
      });
    }

    const icsText = await response.text();

    return new Response(icsText, {
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Cache-Control': 'public, max-age=300',
        ...corsHeaders(),
      },
    });

  } catch (err) {
    return new Response(`Proxy error: ${err.message}`, {
      status: 500,
      headers: corsHeaders(),
    });
  }
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Max-Age': '86400',
  };
}
