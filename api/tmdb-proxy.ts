const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

const DEFAULT_TMDB_API_KEY = '9ba478ffe785bbc34fa2b10c46296580';

export default async function handler(req: any, res: any) {
  if (req.method === 'OPTIONS') {
    Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v));
    return res.status(204).end();
  }

  const queryParams = req.query || {};
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
    Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v));
    return res.status(400).json({ error: 'Endpoint is required', results: [] });
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
      },
    });

    const data = await tmdbRes.json();
    Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v));
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400');
    return res.status(tmdbRes.status).json(data);
  } catch (err: any) {
    Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v));
    return res.status(502).json({ error: 'TMDB proxy request failed', details: err?.message || String(err) });
  }
}
