import { Movie } from '../types';

/**
 * Utilitários de roteamento limpo para o VHSFLIX (SPA)
 * Suporta URLs canônicas:
 * - /filme/:id
 * - /serie/:id
 * - /assistir/:id
 * - /title/:id
 * - /watch/:id
 * - /m/:id
 * E parâmetros de consulta: ?watch=:id, ?filme=:id, ?serie=:id, ?id=:id, ?m=:id
 * E hash: #/filme/:id, etc.
 */

export function getContentIdFromUrl(): string | null {
  if (typeof window === 'undefined') return null;

  try {
    const pathname = window.location.pathname || '';
    const search = window.location.search || '';
    const hash = window.location.hash || '';

    // 1. Extração por Pathname (ex: /filme/m_2026_1 ou /serie/m_1790970889620)
    const pathMatch = pathname.match(/^\/(?:filme|filmes|serie|series|assistir|watch|title|m)\/([^/?#]+)/i);
    if (pathMatch && pathMatch[1]) {
      return decodeURIComponent(pathMatch[1]).trim();
    }

    // 2. Extração por Query Params (ex: ?watch=m_2026_1 ou ?filme=m_2026_1 ou ?id=m_2026_1)
    const params = new URLSearchParams(search);
    const paramId = params.get('watch') || params.get('filme') || params.get('serie') || params.get('series') || params.get('title') || params.get('id') || params.get('m');
    if (paramId) {
      return decodeURIComponent(paramId).trim();
    }

    // 3. Extração por Hash (ex: #/filme/m_2026_1 ou #m_2026_1)
    if (hash) {
      const cleanHash = hash.replace(/^#\/?/, '');
      const hashPathMatch = cleanHash.match(/^(?:filme|filmes|serie|series|assistir|watch|title|m)\/([^/?#]+)/i);
      if (hashPathMatch && hashPathMatch[1]) {
        return decodeURIComponent(hashPathMatch[1]).trim();
      }
      if (cleanHash.startsWith('m_') || /^\d+$/.test(cleanHash)) {
        return decodeURIComponent(cleanHash).trim();
      }
    }
  } catch (err) {
    console.warn('[ROUTING] Erro ao extrair identificador da URL:', err);
  }

  return null;
}

/**
 * Gera URL compartilhável oficial a partir do domínio real e configurado
 */
export function getShareUrl(movie: Movie): string {
  if (typeof window === 'undefined') return '';
  const origin = window.location.origin;
  const routePrefix = movie.type === 'series' ? 'serie' : 'filme';
  return `${origin}/${routePrefix}/${encodeURIComponent(movie.id)}`;
}

/**
 * Atualiza a barra de endereços do navegador sem recarregar a página
 */
export function updateBrowserUrl(movie: Movie | null): void {
  if (typeof window === 'undefined' || !window.history) return;

  try {
    if (movie) {
      const routePrefix = movie.type === 'series' ? 'serie' : 'filme';
      const targetPath = `/${routePrefix}/${encodeURIComponent(movie.id)}`;
      if (window.location.pathname !== targetPath) {
        window.history.pushState({ movieId: movie.id }, '', targetPath);
      }
      document.title = `${movie.title} • VHSFLIX`;
    } else {
      // Se não houver filme selecionado, volta para raiz limpa
      const pathname = window.location.pathname;
      if (pathname.match(/^\/(?:filme|serie|series|assistir|watch|title|m)\//i) || window.location.search.includes('watch=')) {
        window.history.pushState({}, '', '/');
      }
      document.title = 'VHSFLIX • Sua Locadora Digital Retrô';
    }
  } catch (err) {
    console.warn('[ROUTING] Erro ao atualizar URL do navegador:', err);
  }
}

/**
 * Localiza filme por id, tmdbId ou correspondência de slug/título
 */
export function findMovieById(movies: Movie[], targetId: string): Movie | null {
  if (!targetId || !Array.isArray(movies) || movies.length === 0) return null;

  const normalizedTarget = targetId.trim().toLowerCase();

  // 1. Busca exata por ID (seguro contra campos nulos)
  const exact = movies.find(m => m && m.id && (m.id === targetId || m.id.toLowerCase() === normalizedTarget));
  if (exact) return exact;

  // 2. Busca por TMDB ID numérico
  const byTmdb = movies.find(m => m && m.tmdbId && String(m.tmdbId).trim().toLowerCase() === normalizedTarget);
  if (byTmdb) return byTmdb;

  // 3. Busca por título slugificado ou simplificado
  const byTitleSlug = movies.find(m => {
    if (!m || !m.title) return false;
    const slug = m.title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return slug === normalizedTarget || m.title.toLowerCase().trim() === normalizedTarget;
  });
  if (byTitleSlug) return byTitleSlug;

  return null;
}
