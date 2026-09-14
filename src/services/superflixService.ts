/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const SuperflixService = {
  /**
   * Retorna a URL de reprodução para Filmes no Servidor Play 4 (Superflix)
   * Suporta ID do IMDb (iniciado com tt) ou ID numérico do TMDB
   */
  getMovieUrl(idOrTmdb: string | number, imdbId?: string): string {
    let target = '';
    if (imdbId && String(imdbId).trim().startsWith('tt')) {
      target = String(imdbId).trim();
    } else {
      target = String(idOrTmdb).replace(/^tmdb_/, '').trim();
    }
    const url = `https://superflixapi.monster/filme/${target}`;
    return url.replace(/([^:])(\/{2,})/g, '$1/');
  },

  /**
   * Retorna a URL de reprodução unificada para Séries, Animes e Doramas no Servidor Play 4 (Superflix)
   * Endpoint /serie/ unificado.
   */
  getSeriesUrl(
    idOrTmdb: string | number,
    season?: number,
    episode?: number,
    imdbId?: string
  ): string {
    let target = '';
    // TMDB ID numérico preferencial para séries no superflixapi, ou IMDb se aplicável
    if (idOrTmdb) {
      target = String(idOrTmdb).replace(/^tmdb_/, '').trim();
    } else if (imdbId) {
      target = String(imdbId).trim();
    }

    let url = `https://superflixapi.monster/serie/${target}`;
    if (season && episode) {
      url = `https://superflixapi.monster/serie/${target}/${season}/${episode}`;
    } else if (season) {
      url = `https://superflixapi.monster/serie/${target}/${season}`;
    }

    return url.replace(/([^:])(\/{2,})/g, '$1/');
  }
};
