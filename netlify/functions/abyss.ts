import type { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, x-api-key',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

export const handler: Handler = async (event: HandlerEvent, _context: HandlerContext) => {
  // Tratar requisição OPTIONS (CORS Preflight)
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: CORS_HEADERS,
      body: '',
    };
  }

  const queryParams = event.queryStringParameters || {};
  
  // Extrai chave da API de parâmetros, cabeçalhos ou variáveis de ambiente
  const authHeader = event.headers.authorization || event.headers.Authorization || '';
  const bearerKey = authHeader.replace(/^Bearer\s+/i, '').trim();
  const apiKey = queryParams.key || queryParams.apiKey || bearerKey || process.env.ABYSS_API_KEY || process.env.VITE_ABYSS_API_KEY || '';

  console.log(`[NETLIFY FUNCTION ABYSS] Método: ${event.httpMethod}, Query: "${queryParams.q || ''}", Tipo: "${queryParams.type || 'files'}", Key Presente: ${!!apiKey}`);

  try {
    if (event.httpMethod === 'GET') {
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
        },
        signal: AbortSignal.timeout(12000)
      }).catch(err => {
        console.warn('[NETLIFY FUNCTION ABYSS] Timeout ou erro na requisição principal:', err.message || err);
        return null;
      });

      if (!response || !response.ok) {
        if (response && (response.status === 401 || response.status === 403)) {
          return {
            statusCode: 401,
            headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              success: false,
              error: 'AUTH_ERROR',
              message: 'Chave de API do Abyss inválida ou expirada.'
            }),
          };
        }

        const secondaryEndpoint = type === 'folders' ? 'https://api.abyss.to/v1/resources' : 'https://api.abyss.to/v1/files';
        response = await fetch(`${secondaryEndpoint}?${params.toString()}`, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${apiKey}`, 'Accept': 'application/json' },
          signal: AbortSignal.timeout(12000)
        }).catch(() => null);

        if (!response || !response.ok) {
          const tertiaryEndpoint = type === 'folders' ? 'https://api.abyss.to/v1/folders' : 'https://api.abyss.to/v1/resources';
          response = await fetch(`${tertiaryEndpoint}?${params.toString()}`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${apiKey}`, 'Accept': 'application/json' },
            signal: AbortSignal.timeout(12000)
          }).catch(() => null);
        }
      }

      if (!response || !response.ok) {
        const status = response ? response.status : 500;
        return {
          statusCode: status,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            success: false,
            error: 'API_ERROR',
            message: `A API do Abyss respondeu com código HTTP ${status}`,
            results: [],
            files: [],
            rawResponse: null
          }),
        };
      }

      const data = await response.json();

      // Extração de itens independente do schema da resposta
      function extractItems(node: any): any[] {
        if (!node) return [];
        if (Array.isArray(node)) return node;
        if (Array.isArray(node.data)) return node.data;
        if (Array.isArray(node.results)) return node.results;
        if (Array.isArray(node.files)) return node.files;
        if (Array.isArray(node.resources)) return node.resources;
        if (Array.isArray(node.items)) return node.items;

        if (node.data && typeof node.data === 'object') {
          if (Array.isArray(node.data.files)) return node.data.files;
          if (Array.isArray(node.data.results)) return node.data.results;
          if (Array.isArray(node.data.items)) return node.data.items;
          if (Array.isArray(node.data.resources)) return node.data.resources;
          if (Array.isArray(node.data.children)) return node.data.children;
          if (Array.isArray(node.data.list)) return node.data.list;
        }

        const found: any[] = [];
        const visited = new Set<string>();

        function deepSearch(curr: any) {
          if (!curr) return;
          if (Array.isArray(curr)) {
            curr.forEach(deepSearch);
            return;
          }
          if (typeof curr === 'object') {
            const id = curr.id || curr.fileId || curr.file_id || curr.video_id || curr.videoId || curr._id || curr.slug || curr.hash || curr.code;
            const name = curr.name || curr.title || curr.filename || curr.file_name || curr.label || curr.original_name || curr.displayName;
            if (id && name) {
              const idStr = String(id);
              if (!visited.has(idStr)) {
                visited.add(idStr);
                found.push(curr);
              }
            }
            for (const key of Object.keys(curr)) {
              if (key === 'rawResponse') continue;
              const child = curr[key];
              if (child && typeof child === 'object') {
                deepSearch(child);
              }
            }
          }
        }

        deepSearch(node);
        return found;
      }

      const items = extractItems(data);

      return {
        statusCode: 200,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: true,
          results: items,
          files: items,
          rawResponse: data,
          status: 200
        }),
      };
    } else if (event.httpMethod === 'POST') {
      let body: any = {};
      try {
        body = JSON.parse(event.body || '{}');
      } catch (e) {
        body = {};
      }

      const { tmdbId, type, title, season, episode, apiKey: bodyKey } = body;
      const effectiveKey = bodyKey || apiKey;

      let cleanId = '';
      if (type === 'series') {
        cleanId = `series-${tmdbId || '1396'}-${season || 1}-${episode || 1}`;
      } else {
        cleanId = `movie-${tmdbId || '105'}`;
      }

      let abyssId = cleanId;
      let embedUrl = `https://play.abyssplayer.com/${abyssId}`;
      let status = 'active';
      let usedRealAPI = false;
      let apiError = null;
      let matchedFileName = '';

      if (effectiveKey && effectiveKey.trim() !== '') {
        try {
          const sStr = String(season || 1).padStart(2, '0');
          const eStr = String(episode || 1).padStart(2, '0');
          const searchQueries = type === 'series'
            ? [`${title} S${sStr}E${eStr}`, `${title} ${season}x${eStr}`, `${title} ${season}x${episode}`, title]
            : [title];

          let foundFile: any = null;

          for (const query of searchQueries) {
            if (foundFile) break;
            const searchParams = new URLSearchParams({
              key: effectiveKey,
              q: query,
              searchType: 'any',
              type: 'files',
              maxResults: '30'
            });

            const res = await fetch(`https://api.abyss.to/v1/files?${searchParams.toString()}`, {
              method: 'GET',
              headers: { 'Authorization': `Bearer ${effectiveKey}` },
              signal: AbortSignal.timeout(6000)
            }).catch(() => null);

            if (res && res.ok) {
              const resData = await res.json();
              const files = resData.data || resData.results || resData.files || (Array.isArray(resData) ? resData : []);
              if (files && files.length > 0) {
                if (type === 'series') {
                  const sNum = Number(season || 1);
                  const epNum = Number(episode || 1);
                  const sRegex1 = new RegExp(`s(?:eason)?\\.?\\s*0*${sNum}\\s*e(?:pisode)?\\.?\\s*0*${epNum}\\b`, 'i');
                  const sRegex2 = new RegExp(`\\b0*${sNum}x0*${epNum}\\b`, 'i');

                  foundFile = files.find((f: any) => {
                    const name = f.name || f.title || '';
                    return sRegex1.test(name) || sRegex2.test(name);
                  }) || files.find((f: any) => {
                    const name = (f.name || f.title || '').toLowerCase();
                    return name.includes(`e${eStr}`) || name.includes(`ep${eStr}`);
                  });
                } else {
                  foundFile = files.find((f: any) => (f.name || f.title || '').toLowerCase().includes((title || '').toLowerCase())) || files[0];
                }
              }
            }
          }

          if (foundFile) {
            abyssId = foundFile.id || foundFile.fileId || foundFile.video_id || foundFile.videoId;
            embedUrl = `https://play.abyssplayer.com/${abyssId}`;
            status = foundFile.status || 'active';
            matchedFileName = foundFile.name || foundFile.title || '';
            usedRealAPI = true;
          }
        } catch (err: any) {
          apiError = err.message || String(err);
        }
      }

      return {
        statusCode: 200,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: true,
          abyssId,
          embedUrl,
          status,
          usedRealAPI,
          apiError,
          matchedFileName,
          updatedAt: new Date().toISOString()
        }),
      };
    }

    return {
      statusCode: 405,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  } catch (err: any) {
    return {
      statusCode: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: false,
        error: 'SERVER_ERROR',
        message: err.message || 'Erro interno na Netlify Function'
      })
    };
  }
};
