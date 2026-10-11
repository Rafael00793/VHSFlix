const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, x-api-key',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

export default async function handler(req: any, res: any) {
  if (req.method === 'OPTIONS') {
    Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v));
    return res.status(204).end();
  }

  const queryParams = req.query || {};
  const authHeader = req.headers.authorization || '';
  const bearerKey = authHeader.replace(/^Bearer\s+/i, '').trim();
  const apiKey = queryParams.key || queryParams.apiKey || bearerKey || process.env.ABYSS_API_KEY || process.env.VITE_ABYSS_API_KEY || '';

  try {
    if (req.method === 'GET') {
      const query = (queryParams.q || '').trim();
      const type = queryParams.type === 'folders' ? 'folders' : 'files';
      const folderId = (queryParams.folderId || queryParams.folder_id || '').trim();
      const pageToken = (queryParams.pageToken || queryParams.page_token || '').trim();

      const params = new URLSearchParams({
        key: apiKey,
        type: type,
        maxResults: '100'
      });

      if (query) params.set('q', query);
      if (folderId) {
        params.set('folderId', folderId);
        params.set('folder_id', folderId);
        params.set('parent_id', folderId);
      }
      if (pageToken) {
        params.set('pageToken', pageToken);
        params.set('page_token', pageToken);
      }

      const primaryEndpoint = type === 'folders' ? 'https://api.abyss.to/v1/folders/list' : 'https://api.abyss.to/v1/resources';
      const primaryUrl = `${primaryEndpoint}?${params.toString()}`;

      let response = await fetch(primaryUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Accept': 'application/json'
        }
      });

      const data = await response.json().catch(() => null);
      Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v));
      return res.status(response.status).json(data || {});
    }

    Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v));
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v));
    return res.status(500).json({ error: 'Internal Server Error', details: error?.message });
  }
}
