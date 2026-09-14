/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const FembedService = {
  /**
   * Determina o tipo específico de série (anime, dorama ou série padrão)
   */
  detectSeriesType(category?: string, title?: string): 'anime' | 'dorama' | 'serie' {
    const text = `${category || ''} ${title || ''}`.toLowerCase();
    if (text.includes('dorama') || text.includes('k-drama') || text.includes('kdrama') || text.includes('corean')) {
      return 'dorama';
    }
    if (text.includes('anime') || text.includes('otaku') || text.includes('mangá') || text.includes('manga')) {
      return 'anime';
    }
    return 'serie';
  },

  /**
   * Retorna a URL de reprodução para Filmes no Servidor Play 3 (Fembed)
   * Suporta ID do TMDb numérico ou IMDb (iniciado com tt)
   */
  getMovieUrl(idOrTmdb: string | number, subServer?: 1 | 2 | 3 | 4): string {
    const cleanId = String(idOrTmdb).replace(/^tmdb_/, '');
    const baseUrl = `https://fembed.lol/filme/${cleanId}`;
    if (subServer) {
      return `${baseUrl}/servidor-${subServer}`;
    }
    return baseUrl;
  },

  /**
   * Retorna a URL de reprodução para Séries, Animes ou Doramas no Servidor Play 3 (Fembed)
   */
  getSeriesUrl(
    idOrTmdb: string | number,
    season: number = 1,
    episode: number = 1,
    category?: string,
    title?: string,
    subServer?: 1 | 2 | 3 | 4
  ): string {
    const cleanId = String(idOrTmdb).replace(/^tmdb_/, '');
    const kind = this.detectSeriesType(category, title);

    if (kind === 'anime') {
      return `https://fembed.lol/anime/${cleanId}/${season}/${episode}`;
    }

    if (kind === 'dorama') {
      return `https://fembed.lol/dorama/${cleanId}/${season}/${episode}`;
    }

    // Séries convencionais
    const baseUrl = `https://fembed.lol/serie/${cleanId}/${season}/${episode}`;
    if (subServer) {
      return `${baseUrl}/servidor-${subServer}`;
    }
    return baseUrl;
  }
};
