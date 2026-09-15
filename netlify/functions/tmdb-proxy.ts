import type { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

const DEFAULT_TMDB_API_KEY = '9ba478ffe785bbc34fa2b10c46296580';

export const handler: Handler = async (event: HandlerEvent, _context: HandlerContext) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: CORS_HEADERS,
      body: '',
    };
  }

  const queryParams = event.queryStringParameters || {};
  let endpoint = (queryParams.endpoint || '').trim().replace(/^\/+/, '');
  const rawUrl = (queryParams.url || '').trim();

  if (rawUrl) {
    try {
      const parsed = new URL(rawUrl);
      if (parsed.hostname === 'api.themoviedb.org' && parsed.pathname.startsWith('/3/')) {
        endpoint = parsed.pathname.replace(/^\/3\//, '');
        parsed.searchParams.forEach((val, key) => {
          if (!queryParams[key]) {
            queryParams[key] = val;
          }
        });
      }
    } catch (e) {}
  }

  if (!endpoint) {
    return {
      statusCode: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Endpoint is required', results: [] }),
    };
  }

  const apiKey = (queryParams.api_key || queryParams.apiKey || process.env.TMDB_API_KEY || DEFAULT_TMDB_API_KEY).trim();

  const urlParams = new URLSearchParams();
  for (const [k, v] of Object.entries(queryParams)) {
    if (k !== 'endpoint' && k !== 'url' && k !== 'api_key' && k !== 'apiKey' && v !== undefined) {
      urlParams.set(k, String(v));
    }
  }
  urlParams.set('api_key', apiKey);
  if (!urlParams.has('language')) {
    urlParams.set('language', 'pt-BR');
  }

  const targetUrl = `https://api.themoviedb.org/3/${endpoint}?${urlParams.toString()}`;

  try {
    const tmdbRes = await fetch(targetUrl, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'VHSFLIX/1.0',
      },
      signal: AbortSignal.timeout(8000),
    });

    const data = await tmdbRes.json();
    return {
      statusCode: tmdbRes.status,
      headers: {
        ...CORS_HEADERS,
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300',
      },
      body: JSON.stringify(data),
    };
  } catch (err: any) {
    return {
      statusCode: 502,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'TMDB proxy error', message: err.message, results: [] }),
    };
  }
};
