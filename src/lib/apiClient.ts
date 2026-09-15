/**
 * Cliente de API Unificado com Logger Detalhado para Produção (Netlify & Dev)
 * 
 * Atende aos requisitos estritos do ambiente de Produção e Netlify:
 * 1. Loga no Console: URL completa, Método HTTP, Status HTTP, Corpo da Resposta, Erro e Stack Trace.
 * 2. Suporta VITE_API_URL / VITE_BACKEND_URL quando o backend Express estiver em um servidor separado.
 * 3. Trata respostas HTML 404 sem quebrar o parse de JSON em hospedagens estáticas.
 */

export interface RequestLogDetails {
  url: string;
  method: string;
  status?: number;
  statusText?: string;
  responseBody?: any;
  error?: any;
  stackTrace?: string;
}

export function logApiTransaction(details: RequestLogDetails) {
  const isError = !details.status || details.status < 200 || details.status >= 400 || !!details.error;
  const badgeStyle = isError
    ? 'background: #881337; color: #fecdd3; font-weight: bold; padding: 2px 6px; border-radius: 4px;'
    : 'background: #064e3b; color: #a7f3d0; font-weight: bold; padding: 2px 6px; border-radius: 4px;';

  console.groupCollapsed(`%c🌐 [API ${details.method.toUpperCase()}] ${details.url} (${details.status || 'FALHA'})`, badgeStyle);
  console.log('📍 URL Completa:', details.url);
  console.log('📝 Método HTTP:', details.method);
  console.log('📊 Status HTTP:', details.status ? `${details.status} ${details.statusText || ''}` : 'Falha de Conexão / Host Estático');

  if (details.responseBody !== undefined) {
    console.log('📥 Corpo da Resposta:', details.responseBody);
  }

  if (details.error) {
    console.warn('⚠️ [API Info/Fallback]:', details.error?.message || details.error);
  }
  console.groupEnd();
}

/**
 * Retorna a URL base do backend API.
 * Prioridade:
 * 1. import.meta.env.VITE_API_URL
 * 2. import.meta.env.VITE_BACKEND_URL
 * 3. window.location.origin (Relativo ao domínio atual)
 */
export function getApiBaseUrl(): string {
  const metaEnv = (import.meta as any).env || {};
  const envApiUrl = metaEnv.VITE_API_URL || metaEnv.VITE_BACKEND_URL;
  if (envApiUrl && typeof envApiUrl === 'string' && envApiUrl.trim() !== '') {
    return envApiUrl.trim().replace(/\/+$/, '');
  }
  return window.location.origin;
}

export interface FetchResult<T = any> {
  ok: boolean;
  status: number;
  data: T | null;
  isJson: boolean;
  error?: Error;
}

/**
 * Executa requisição HTTP com captura auditada de erros e logs completos no console
 */
export async function fetchApi<T = any>(endpoint: string, options: RequestInit = {}): Promise<FetchResult<T>> {
  const method = (options.method || 'GET').toUpperCase();

  // Para chamadas diretas ao TMDB API:
  // 1. Tentamos conexão direta do navegador (o TMDB oferece CORS universal nativo com ultra baixa latência).
  // 2. Caso haja restrição de rede local ou adblocker no navegador do usuário, recorre ao proxy do backend.
  if (endpoint.includes('api.themoviedb.org/3/')) {
    try {
      const directController = new AbortController();
      const directTimeout = setTimeout(() => directController.abort(), 6000);
      const directRes = await fetch(endpoint, {
        ...options,
        signal: directController.signal,
        headers: {
          'Accept': 'application/json',
          ...(options.headers || {})
        }
      });
      clearTimeout(directTimeout);

      const contentType = directRes.headers.get('content-type') || '';
      if (directRes.ok && contentType.includes('application/json')) {
        const directData = await directRes.json();
        logApiTransaction({
          url: endpoint,
          method,
          status: directRes.status,
          statusText: directRes.statusText,
          responseBody: directData
        });
        return {
          ok: true,
          status: directRes.status,
          data: directData,
          isJson: true
        };
      }
    } catch (directErr) {
      console.warn('[fetchApi] Conexão direta com TMDB falhou ou bloqueada por adblocker, recorrendo ao proxy local:', directErr);
    }

    // Recurso via Proxy do servidor
    const baseUrl = getApiBaseUrl();
    const proxyUrl = `${baseUrl}/api/tmdb-proxy?url=${encodeURIComponent(endpoint)}`;
    return fetchApiInternal(proxyUrl, options, method);
  }

  let fullUrl = endpoint;
  if (!endpoint.startsWith('http://') && !endpoint.startsWith('https://')) {
    const baseUrl = getApiBaseUrl();
    fullUrl = `${baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
  }

  return fetchApiInternal(fullUrl, options, method);
}

async function fetchApiInternal<T = any>(fullUrl: string, options: RequestInit, method: string): Promise<FetchResult<T>> {
  try {
    const response = await fetch(fullUrl, {
      ...options,
      headers: {
        'Accept': 'application/json, text/plain, */*',
        ...(options.headers || {})
      }
    });

    const contentType = response.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');
    let responseData: any = null;

    if (isJson) {
      try {
        responseData = await response.json();
      } catch (jsonParseError) {
        responseData = await response.text();
      }
    } else {
      responseData = await response.text();
    }

    logApiTransaction({
      url: fullUrl,
      method,
      status: response.status,
      statusText: response.statusText,
      responseBody: responseData
    });

    // Se o status for 200 mas a resposta for HTML (ex: rewrite de SPA do Netlify),
    // marcamos ok = false para não quebrar parsers que esperam JSON
    const isActuallyOk = response.ok && (!fullUrl.includes('/api/') || isJson);

    return {
      ok: isActuallyOk,
      status: response.status,
      data: responseData,
      isJson
    };
  } catch (err: any) {
    const errorObj = err instanceof Error ? err : new Error(String(err));

    logApiTransaction({
      url: fullUrl,
      method,
      error: errorObj,
      stackTrace: errorObj.stack
    });

    return {
      ok: false,
      status: 0,
      data: null,
      isJson: false,
      error: errorObj
    };
  }
}
