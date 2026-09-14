/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface EmbedPlayStatusResponse {
  available: boolean;
  status?: string;
  data?: any;
  message?: string;
}

export const EmbedPlayService = {
  /**
   * Retorna a URL de reprodução para Filmes no Servidor Play 2
   */
  getMovieUrl(tmdbIdOrImdb: string | number): string {
    const cleanId = String(tmdbIdOrImdb).replace(/^tmdb_/, '');
    return `https://embedplayapi.top/embed/${cleanId}`;
  },

  /**
   * Retorna a URL de reprodução para Séries no Servidor Play 2
   */
  getSeriesUrl(tmdbId: string | number, season?: number, episode?: number): string {
    const cleanId = String(tmdbId).replace(/^tmdb_/, '');
    if (season && episode) {
      return `https://embedplayapi.top/embed/${cleanId}/${season}/${episode}`;
    }
    return `https://embedplayapi.top/embed/${cleanId}`;
  },

  /**
   * Verifica a disponibilidade de filmes ou séries no Servidor Play 2 (embedplayapi.top)
   */
  async checkAvailability(
    tmdbIdOrImdb: string | number,
    type: 'movie' | 'series',
    season: number = 1,
    episode: number = 1
  ): Promise<EmbedPlayStatusResponse> {
    const cleanId = String(tmdbIdOrImdb).replace(/^tmdb_/, '');
    const isTv = type === 'series';
    const url = isTv
      ? `https://embedplayapi.top/api/status?tmdb=${encodeURIComponent(cleanId)}&sea=${season}&epi=${episode}&type=tv`
      : `https://embedplayapi.top/api/status?tmdb=${encodeURIComponent(cleanId)}&type=movie`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!res.ok) {
        return { available: false, message: `Status HTTP ${res.status}` };
      }

      const json = await res.json();
      // A API retorna disponibilidade (ex: { status: 'available' } ou boolean/success)
      const isAvailable = json?.status === 'available' || json?.available === true || json?.success === true || json?.found === true;
      return {
        available: isAvailable,
        status: json?.status || (isAvailable ? 'available' : 'unavailable'),
        data: json
      };
    } catch (err: any) {
      console.warn('[EmbedPlayService] Erro ao checar status:', err?.message || err);
      // Fallback otimista para não bloquear caso seja restrição de rede momentânea
      return { available: true, message: 'Status não verificado (verificação ignorada)' };
    }
  },

  /**
   * Retorna a lista de IDs de catálogo do Servidor Play 2 para sincronização
   */
  async getAllIds(type?: 'movie' | 'series'): Promise<string[] | number[]> {
    let url = 'https://embedplayapi.top/api/all-ids';
    if (type === 'movie') url += '?type=movie';
    if (type === 'series') url += '?type=series';

    try {
      const res = await fetch(url);
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : (data?.ids || []);
    } catch (err) {
      console.warn('[EmbedPlayService] Erro ao buscar IDs de catálogo:', err);
      return [];
    }
  }
};
