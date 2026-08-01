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
    console.error('❌ Erro Completo:', details.error);
    if (details.error instanceof Error && details.error.stack) {
      console.error('📜 Stack Trace:', details.error.stack);
    } else {
      console.trace('📜 Stack Trace:');
    }
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
  let fullUrl = endpoint;

  if (!endpoint.startsWith('http://') && !endpoint.startsWith('https://')) {
    const baseUrl = getApiBaseUrl();
    fullUrl = `${baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
  }

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

    return {
      ok: response.ok,
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
