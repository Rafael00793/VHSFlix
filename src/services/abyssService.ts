/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { fetchApi } from '../lib/apiClient';

export interface AbyssResourceFile {
  id?: string;
  name?: string;
  title?: string;
  filename?: string;
  file_name?: string;
  fileId?: string;
  video_id?: string;
  videoId?: string;
  _id?: string;
  slug?: string;
  hash?: string;
  code?: string;
  size?: number;
  embedUrl?: string;
  embed_url?: string;
  files?: AbyssResourceFile[];
  items?: AbyssResourceFile[];
  children?: AbyssResourceFile[];
  contents?: AbyssResourceFile[];
  data?: AbyssResourceFile[];
  [key: string]: any;
}

export interface AbyssSearchResult {
  success: boolean;
  fileId?: string;
  playerUrl?: string; // Formato: https://play.abyssplayer.com/{id}
  fileName?: string;
  message?: string;
  error?: 'AUTH_ERROR' | 'TIMEOUT_ERROR' | 'NETWORK_ERROR' | 'EMPTY_RESPONSE' | 'NOT_FOUND' | 'API_ERROR' | 'SERIES_FOLDER_NOT_FOUND' | 'SEASON_FOLDER_NOT_FOUND' | 'EPISODE_NOT_FOUND_IN_SEASON';
  totalFilesCount?: number;
}

/**
 * Normaliza textos para comparação insensível a caixa, acentos e termos técnicos de release
 */
export function normalizeMediaText(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/\.(mkv|mp4|avi|webm|ts|flv|mov|m2ts)$/i, '') // Remove extensão de arquivo de vídeo
    .replace(/[\.\_\-\–\—\/\\[\]\(\)\{\}\:]+/g, ' ') // Substitui pontuações por espaço
    .replace(/\b(web-dl|webdl|bluray|bdrip|dvdrip|hdrip|hdtv|remux|proper|repack|dual|multi|dublado|legendado|aac|5\.1|7\.1|x264|x265|h264|h265|hevc|1080p|720p|2160p|4k|2k|hdr|10bit|sdr)\b/gi, ' ') // Remove termos de release
    .replace(/[^\w\s]/gi, '') // Remove caracteres especiais
    .replace(/\s+/g, ' ') // Consolida múltiplos espaços
    .trim();
}

/**
 * Extrai o ID único de um item retornado pela API do Abyss
 */
export function extractAbyssId(item: AbyssResourceFile): string | null {
  if (!item || typeof item !== 'object') return null;
  const rawId =
    item.id ||
    item.fileId ||
    item.file_id ||
    item.video_id ||
    item.videoId ||
    item._id ||
    item.slug ||
    item.hash ||
    item.code ||
    item.resource_id ||
    item.resourceId ||
    item.asset_id;
  if (!rawId) return null;
  return String(rawId).trim();
}

/**
 * Extrai o nome de exibição de um item retornado pela API do Abyss
 */
export function extractAbyssName(item: AbyssResourceFile): string {
  if (!item || typeof item !== 'object') return '';
  return String(
    item.name ||
    item.title ||
    item.filename ||
    item.file_name ||
    item.file_title ||
    item.original_name ||
    item.original_filename ||
    item.label ||
    item.displayName ||
    item.display_name ||
    item.resource_name ||
    ''
  ).trim();
}

/**
 * Desempacota e achata recursivamente qualquer estrutura de pastas e sub-listas da API do Abyss
 */
export function flattenAbyssFiles(input: any): AbyssResourceFile[] {
  if (!input) return [];
  const results: AbyssResourceFile[] = [];
  const visitedIds = new Set<string>();

  function processNode(node: any) {
    if (!node) return;

    if (Array.isArray(node)) {
      for (const item of node) {
        processNode(item);
      }
      return;
    }

    if (typeof node === 'object') {
      const id = extractAbyssId(node);
      const name = extractAbyssName(node);

      if (id && name) {
        if (!visitedIds.has(id)) {
          visitedIds.add(id);
          results.push(node);
        }
      }

      // Varrer todas as chaves do objeto para encontrar sub-listas/objetos
      for (const key of Object.keys(node)) {
        if (key === 'rawResponse') continue;
        const child = node[key];
        if (child && typeof child === 'object') {
          processNode(child);
        }
      }
    }
  }

  processNode(input);
  return results;
}

/**
 * Avalia a compatibilidade de um arquivo para um episódio de série utilizando Regex flexíveis.
 * Reconhece equivalências como: S03E09, s03e09, 03x09, 3x09, 03X09, S3E9, s3e9, 3e9, etc.
 */
export function scoreEpisodeMatch(
  itemName: string,
  seriesTitle: string,
  season: number,
  episode: number,
  isInsideSeasonFolder: boolean = false
): { matched: boolean; score: number; reason: string } {
  if (!itemName) return { matched: false, score: 0, reason: 'Nome do arquivo está vazio' };

  const normItem = normalizeMediaText(itemName);
  const rawItemLower = itemName.toLowerCase().trim();

  const sNum = Number(season);
  const epNum = Number(episode);
  const sPadded = String(sNum).padStart(2, '0');
  const ePadded = String(epNum).padStart(2, '0');

  // Regex 1: S06E02, s06e02, S6E2, s6e2, T06E02, T6E2, S06_E02, S06.E02, S06-E02
  const regSxxExx = new RegExp(`(?:^|[^a-z0-9])[sStT]0*${sNum}[\\s\\._\\-]*[eE]0*${epNum}(?:[^a-z0-9]|$)`, 'i');

  // Regex 2: 06x02, 6x02, 06X02, 6X2, 06 x 02, 6 x 2
  const regXxX = new RegExp(`(?:^|[^a-z0-9])0*${sNum}[\\s\\._\\-]*[xX][\\s\\._\\-]*0*${epNum}(?:[^a-z0-9]|$)`, 'i');

  // Regex 3: Season 6 Ep 02 / Temporada 6 Episodio 02 / Temp 6 Ep 2 / Cap 2
  const regTempEp = new RegExp(`(?:temp(?:orada)?|season|t|s)?\\s*0*${sNum}.*?(?:ep(?:isode|isod[ií]o)?|e|cap(?:itulo|ítulo)?)\\.?\\s*0*${epNum}(?:[^a-z0-9]|$)`, 'i');

  // Regex 4: Separado por ponto/traço (ex: 06.02 ou 6-02 ou 06_02)
  const regDotDash = new RegExp(`(?:^|[^a-z0-9])0*${sNum}[\\s\\._\\-]+0*${epNum}(?:[^a-z0-9]|$)`, 'i');

  // Regex 5: Código de 3 ou 4 dígitos (ex: 602, 0602)
  const regCode = new RegExp(`(?:^|[^0-9])0*${sNum}${ePadded}(?:[^0-9]|$)`, 'i');

  // Regex 6: Apenas episódio (ex: Ep 02, Episode 02, Episódio 2, E02, Cap 02, #02, #2)
  const regEpOnly = new RegExp(`(?:^|[^a-z0-9])(?:ep(?:isode|isod[ií]o)?|e|cap(?:itulo|ítulo)?|faixa|item|#)\\.?\\s*0*${epNum}(?:[^0-9a-z]|$)`, 'i');

  // Regex 7: Número do episódio isolado por limites ou extensão (ex: 02.mp4, 2.mkv, 02 - Title)
  const regIsolatedNum = new RegExp(`(?:^|[^0-9])0*${epNum}(?:[^0-9]|$)`, 'i');

  const hasSxxExx = regSxxExx.test(rawItemLower) || regSxxExx.test(normItem);
  const hasXxX = regXxX.test(rawItemLower) || regXxX.test(normItem);
  const hasTempEp = regTempEp.test(rawItemLower) || regTempEp.test(normItem);
  const hasDotDash = regDotDash.test(rawItemLower) || regDotDash.test(normItem);
  const hasCode = regCode.test(rawItemLower) || regCode.test(normItem);
  const hasEpOnly = regEpOnly.test(rawItemLower) || regEpOnly.test(normItem);
  const hasIsolatedNum = regIsolatedNum.test(rawItemLower) || regIsolatedNum.test(normItem);

  let isMatch = hasSxxExx || hasXxX || hasTempEp || hasDotDash || hasCode;

  // Se o arquivo estiver dentro da pasta da temporada, aceita também se contiver o número do episódio
  if (!isMatch && isInsideSeasonFolder && (hasEpOnly || hasIsolatedNum)) {
    isMatch = true;
  }

  if (!isMatch) {
    return {
      matched: false,
      score: 0,
      reason: `Não corresponde aos padrões S${sPadded}E${ePadded}, ${sNum}x${ePadded}, etc.`
    };
  }

  let score = 100;
  if (hasSxxExx) score += 120;
  if (hasXxX) score += 110;
  if (hasTempEp) score += 90;
  if (hasDotDash) score += 80;
  if (hasCode) score += 75;
  if (hasEpOnly) score += 60;
  if (hasIsolatedNum) score += 40;

  // Comparação parcial do Título da Série
  const normTitle = normalizeMediaText(seriesTitle);
  if (normTitle) {
    if (normItem.includes(normTitle)) {
      score += 150;
    } else {
      const titleWords = normTitle.split(' ').filter(w => w.length > 2);
      let matchedWords = 0;
      for (const word of titleWords) {
        if (normItem.includes(word)) matchedWords++;
      }
      if (titleWords.length > 0 && matchedWords > 0) {
        score += Math.round((matchedWords / titleWords.length) * 80);
      }
    }
  }

  return {
    matched: true,
    score,
    reason: `Regex aceitou o formato para S${sPadded}E${ePadded} (Score: ${score})`
  };
}

/**
 * Avalia a compatibilidade de um arquivo para um filme
 */
export function scoreMovieMatch(
  itemName: string,
  movieTitle: string
): { matched: boolean; score: number; reason: string } {
  if (!itemName) return { matched: false, score: 0, reason: 'Nome do arquivo está vazio' };

  const normItem = normalizeMediaText(itemName);
  const normTitle = normalizeMediaText(movieTitle);

  if (!normTitle) return { matched: false, score: 0, reason: 'Título do filme está vazio' };

  if (normItem === normTitle) {
    return { matched: true, score: 200, reason: 'Correspondência exata do título' };
  }

  if (normItem.includes(normTitle)) {
    return { matched: true, score: 150, reason: `Contém o título "${movieTitle}"` };
  }

  const titleWords = normTitle.split(' ').filter(w => w.length > 2);
  let matchedCount = 0;
  for (const word of titleWords) {
    if (normItem.includes(word)) matchedCount++;
  }

  if (titleWords.length > 0 && matchedCount === titleWords.length) {
    return { matched: true, score: 120, reason: `Contém todas as palavras do título (${matchedCount}/${titleWords.length})` };
  }

  if (titleWords.length > 1 && matchedCount > 0) {
    return { matched: true, score: 60, reason: `Contém parte das palavras do título (${matchedCount}/${titleWords.length})` };
  }

  return { matched: false, score: 0, reason: `Não contém o título do filme "${movieTitle}"` };
}

/**
 * Função auxiliar para extrair pageToken do objeto de resposta
 */
function extractPageToken(rawResponse: any): string | null {
  if (!rawResponse || typeof rawResponse !== 'object') return null;
  const token =
    rawResponse.nextPageToken ||
    rawResponse.next_page_token ||
    rawResponse.pageToken ||
    rawResponse.page_token ||
    rawResponse.cursor ||
    rawResponse.next ||
    rawResponse.pagination?.nextPageToken ||
    rawResponse.pagination?.next_page_token ||
    rawResponse.pagination?.pageToken ||
    rawResponse.data?.nextPageToken ||
    rawResponse.data?.next_page_token ||
    rawResponse.data?.pageToken ||
    rawResponse.data?.page_token;
  if (!token || typeof token !== 'string' || !token.trim()) return null;
  return token.trim();
}

/**
 * Serviço modular e reutilizável para comunicação com a API do Abyss (GET /v1/resources).
 */
export class AbyssService {
  /**
   * Obtém a chave de API do Abyss (da prop, localStorage ou variável de ambiente)
   */
  static getApiKey(overrideKey?: string): string {
    if (overrideKey && overrideKey.trim()) return overrideKey.trim();

    if (typeof localStorage !== 'undefined') {
      const storedKey = localStorage.getItem('vhsflix_abyss_key');
      if (storedKey && storedKey.trim()) return storedKey.trim();
    }

    const envKey = (import.meta as any).env?.VITE_ABYSS_API_KEY;
    if (envKey && envKey.trim()) return envKey.trim();

    return '';
  }

  /**
   * Salva a chave de API do Abyss no armazenamento local
   */
  static setApiKey(key: string): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('vhsflix_abyss_key', key.trim());
    }
  }

  /**
   * Busca automaticamente TODAS as páginas da API do Abyss enquanto existir pageToken.
   * Agrupa todos os resultados em uma lista única e registra a página onde cada arquivo foi localizado.
   */
  static async fetchAllPagesSearch(
    query: string,
    type: 'files' | 'folders' | 'all' = 'files',
    folderId?: string,
    customApiKey?: string
  ): Promise<{
    files: AbyssResourceFile[];
    pagesRead: number;
    rawResponses: any[];
    status: number;
  }> {
    const apiKey = this.getApiKey(customApiKey);
    const cleanQuery = query.trim();
    const allFiles: AbyssResourceFile[] = [];
    const visitedIds = new Set<string>();
    const visitedTokens = new Set<string>();
    const rawResponses: any[] = [];

    let currentPageToken: string | null = null;
    let pagesRead = 0;
    let lastStatus = 200;
    const maxPages = 20;

    while (pagesRead < maxPages) {
      pagesRead++;

      let pageResponse: { files: AbyssResourceFile[]; rawResponse: any; status: number } | null = null;

      // 1. Tentar através do backend Express (/api/abyss/resources)
      try {
        const queryParams = new URLSearchParams();
        if (cleanQuery) queryParams.set('q', cleanQuery);
        queryParams.set('type', type);
        if (folderId) queryParams.set('folderId', folderId);
        if (currentPageToken) queryParams.set('pageToken', currentPageToken);
        if (apiKey) queryParams.set('key', apiKey);

        const clientHeaders: Record<string, string> = { 'Accept': 'application/json' };
        if (apiKey) clientHeaders['Authorization'] = `Bearer ${apiKey}`;

        const res = await fetchApi(`/api/abyss/resources?${queryParams.toString()}`, {
          method: 'GET',
          headers: clientHeaders,
          signal: AbortSignal.timeout(12000)
        });

        if (res.ok && res.data && res.isJson) {
          const data = res.data;
          const raw = data.rawResponse || data;
          const extracted = flattenAbyssFiles(raw);

          if (Array.isArray(data.results) && data.results.length > 0) {
            const resultsFlattened = flattenAbyssFiles(data.results);
            for (const item of resultsFlattened) {
              const id = extractAbyssId(item);
              if (id && !extracted.some(f => extractAbyssId(f) === id)) {
                extracted.push(item);
              }
            }
          }

          pageResponse = { files: extracted, rawResponse: raw, status: res.status };
        } else if (res.status === 401 || res.status === 403) {
          throw new Error('AUTH_ERROR');
        }
      } catch (err: any) {
        if (err.message === 'AUTH_ERROR') throw err;
      }

      // 2. Fallback: Chamada direta client-side para https://api.abyss.to/v1/resources
      if (!pageResponse) {
        try {
          const directEndpoint = type === 'folders' ? 'https://api.abyss.to/v1/folders/list' : 'https://api.abyss.to/v1/resources';
          const queryParams = new URLSearchParams();
          if (cleanQuery) queryParams.set('q', cleanQuery);
          queryParams.set('type', type);
          if (folderId) {
            queryParams.set('folderId', folderId);
            queryParams.set('folder_id', folderId);
          }
          if (currentPageToken) queryParams.set('pageToken', currentPageToken);
          if (apiKey) queryParams.set('key', apiKey);

          const clientHeaders: Record<string, string> = { 'Accept': 'application/json' };
          if (apiKey) clientHeaders['Authorization'] = `Bearer ${apiKey}`;

          const res = await fetchApi(`${directEndpoint}?${queryParams.toString()}`, {
            method: 'GET',
            headers: clientHeaders,
            signal: AbortSignal.timeout(12000)
          });

          if (res.status === 401 || res.status === 403) {
            throw new Error('AUTH_ERROR');
          }

          if (res.ok && res.data && res.isJson) {
            const data = res.data;
            const extracted = flattenAbyssFiles(data);
            pageResponse = { files: extracted, rawResponse: data, status: res.status };
          }
        } catch (err: any) {
          if (err.message === 'AUTH_ERROR') throw err;
        }
      }

      if (!pageResponse) {
        break; // Interrompe se a requisição falhar
      }

      lastStatus = pageResponse.status;
      rawResponses.push(pageResponse.rawResponse);

      for (const file of pageResponse.files) {
        const id = extractAbyssId(file);
        if (id) {
          if (!visitedIds.has(id)) {
            visitedIds.add(id);
            (file as any)._pageFound = pagesRead;
            allFiles.push(file);
          }
        } else {
          (file as any)._pageFound = pagesRead;
          allFiles.push(file);
        }
      }

      // Verificar existência de próximo pageToken
      const nextToken = extractPageToken(pageResponse.rawResponse);
      if (nextToken && !visitedTokens.has(nextToken)) {
        visitedTokens.add(nextToken);
        currentPageToken = nextToken;
      } else {
        break; // Não há mais páginas
      }
    }

    return {
      files: allFiles,
      pagesRead,
      rawResponses,
      status: lastStatus
    };
  }

  /**
   * Realiza chamada HTTP bruta ao endpoint /v1/resources do Abyss
   */
  static async performRawSearch(query: string, customApiKey?: string): Promise<{
    files: AbyssResourceFile[];
    rawResponse: any;
    url: string;
    status: number;
    headers: Record<string, string>;
  }> {
    const res = await this.fetchAllPagesSearch(query, 'files', undefined, customApiKey);
    return {
      files: res.files,
      rawResponse: res.rawResponses[0] || {},
      url: `/api/abyss/resources?q=${encodeURIComponent(query)}`,
      status: res.status,
      headers: {}
    };
  }

  /**
   * Realiza a pesquisa de recursos no Abyss e retorna lista de arquivos
   */
  static async searchResources(query: string, customApiKey?: string): Promise<AbyssResourceFile[]> {
    try {
      const res = await this.fetchAllPagesSearch(query, 'files', undefined, customApiKey);
      return res.files;
    } catch (err: any) {
      console.error('[AbyssService] Erro em searchResources:', err.message || err);
      throw err;
    }
  }

  /**
   * Busca automaticamente a URL do player para um filme
   */
  static async findMoviePlayerUrl(movieTitle: string, customApiKey?: string): Promise<AbyssSearchResult> {
    const cleanTitle = movieTitle.trim();
    if (!cleanTitle) {
      return {
        success: false,
        error: 'EMPTY_RESPONSE',
        message: 'Título do filme não informado.'
      };
    }

    console.log(`==================================================`);
    console.log(`[AbyssService] 🎬 INICIANDO BUSCA DE FILME NO ABYSS`);
    console.log(`Filme: "${cleanTitle}"`);
    console.log(`==================================================`);

    try {
      const searchRes = await this.fetchAllPagesSearch(cleanTitle, 'files', undefined, customApiKey);
      const files = searchRes.files;

      if (!files || files.length === 0) {
        console.error(`❌ [AbyssService] AUDITORIA - FILME NÃO ENCONTRADO para "${cleanTitle}"`);
        return {
          success: false,
          error: 'NOT_FOUND',
          message: `O vídeo "${cleanTitle}" ainda não existe no Abyss.`
        };
      }

      // Varrer TODOS os itens e pontuar
      let bestItem: AbyssResourceFile | null = null;
      let highestScore = -1;
      let bestReason = '';

      for (const file of files) {
        const name = extractAbyssName(file);
        const matchRes = scoreMovieMatch(name, cleanTitle);
        if (matchRes.matched && matchRes.score > highestScore) {
          highestScore = matchRes.score;
          bestItem = file;
          bestReason = matchRes.reason;
        }
      }

      if (!bestItem) {
        bestItem = files[0];
        bestReason = 'Fallback: Primeiro item retornado pela API.';
      }

      const rawId = extractAbyssId(bestItem);

      if (!rawId) {
        return {
          success: false,
          error: 'API_ERROR',
          message: 'O arquivo no Abyss não possui um ID válido.'
        };
      }

      const playerUrl = `https://play.abyssplayer.com/${rawId}`;
      const fileName = extractAbyssName(bestItem) || cleanTitle;
      const pageFound = (bestItem as any)._pageFound || 1;

      console.log(`\n🎉 [AbyssService] SUCESSO! Filme localizado no Abyss:
   - Nome do Arquivo: "${fileName}"
   - ID do Arquivo: "${rawId}"
   - Página Localizada: Página ${pageFound}
   - Player URL Gerada: "${playerUrl}"
   - Motivo da Escolha: ${bestReason}`);

      return {
        success: true,
        fileId: rawId,
        playerUrl,
        fileName
      };

    } catch (err: any) {
      const errType = (err?.message as any) || 'NETWORK_ERROR';
      let msg = `O vídeo "${cleanTitle}" ainda não existe no Abyss.`;
      if (errType === 'AUTH_ERROR') {
        msg = 'Falha de autenticação na API do Abyss. Verifique sua chave de API.';
      }

      return {
        success: false,
        error: errType,
        message: msg
      };
    }
  }

  /**
   * Busca automaticamente a URL do player para um episódio de série.
   * REGRA OBRIGATÓRIA: Utiliza EXCLUSIVAMENTE a API de Folders da conta do Abyss.
   * 
   * Fluxo obrigatório:
   * 1. Localizar a pasta da série (ex: "The Walking Dead").
   * 2. Localizar a pasta da temporada (ex: "Temporada 3", "Season 3", "S03", "3").
   * 3. Obter o folderId da temporada.
   * 4. Listar todos os arquivos existentes naquela pasta (com paginação automática de todas as páginas).
   * 5. Localizar o episódio correto utilizando Regex.
   * 6. Obter o ID do arquivo.
   * 7. Gerar automaticamente a URL do player: https://play.abyssplayer.com/{id}
   */
  static async findEpisodePlayerUrl(
    seriesTitle: string,
    season: number,
    episode: number,
    customApiKey?: string
  ): Promise<AbyssSearchResult> {
    const cleanTitle = seriesTitle.trim();
    if (!cleanTitle) {
      return {
        success: false,
        error: 'EMPTY_RESPONSE',
        message: 'Título da série não informado.'
      };
    }

    const sNum = Number(season);
    const epNum = Number(episode);
    const sStr = String(sNum).padStart(2, '0');
    const eStr = String(epNum).padStart(2, '0');
    const seasonEpisodeTag = `S${sStr}E${eStr}`;

    console.log(`\n==================================================`);
    console.log(`[AbyssService] 📺 INICIANDO BUSCA DE EPISÓDIO VIA ESTRUTURA DE PASTAS NO ABYSS`);
    console.log(`Série: "${cleanTitle}" | Temporada: ${sNum} | Episódio: ${epNum} (${seasonEpisodeTag})`);
    console.log(`==================================================`);

    const apiKey = this.getApiKey(customApiKey);

    // -------------------------------------------------------------
    // ETAPA 1: LOCALIZAR PASTA DA SÉRIE
    // -------------------------------------------------------------
    console.log(`[AbyssService] 📁 1/4 Localizando pasta da série "${cleanTitle}"...`);

    let rootFolders: AbyssResourceFile[] = [];
    const visitedFolderIds = new Set<string>();

    try {
      // Busca pastas com filtro do título da série
      const seriesFolderSearch = await this.fetchAllPagesSearch(cleanTitle, 'folders', undefined, apiKey);
      for (const f of seriesFolderSearch.files) {
        const id = extractAbyssId(f);
        if (id && !visitedFolderIds.has(id)) {
          visitedFolderIds.add(id);
          rootFolders.push(f);
        }
      }

      // Se não encontrou nenhuma pasta filtrando, lista todas as pastas da raiz
      if (rootFolders.length === 0) {
        console.log(`[AbyssService] 📁 Listando pastas raiz sem filtro de busca...`);
        const rootList = await this.fetchAllPagesSearch('', 'folders', undefined, apiKey);
        for (const f of rootList.files) {
          const id = extractAbyssId(f);
          if (id && !visitedFolderIds.has(id)) {
            visitedFolderIds.add(id);
            rootFolders.push(f);
          }
        }
      }
    } catch (err: any) {
      console.error(`[AbyssService] ❌ Erro ao buscar pastas da série:`, err);
    }

    const normSeries = normalizeMediaText(cleanTitle);

    // Selecionar a melhor pasta da série
    const seriesFolder = rootFolders.find(f => {
      const name = extractAbyssName(f);
      if (!name) return false;
      const normName = normalizeMediaText(name);

      if (normName === normSeries) return true;
      if (normName.includes(normSeries) || normSeries.includes(normName)) return true;

      // Comparação de palavras-chave
      const titleWords = normSeries.split(' ').filter(w => w.length > 2);
      if (titleWords.length > 0) {
        const matchCount = titleWords.filter(w => normName.includes(w)).length;
        if (matchCount === titleWords.length) return true;
      }
      return false;
    });

    if (!seriesFolder) {
      console.log(`[AbyssService] 💡 Pasta da série "${cleanTitle}" não encontrada no Abyss. Executando busca direta por arquivos para "${cleanTitle} ${seasonEpisodeTag}"...`);
      
      const searchQueries = [
        `${cleanTitle} S${sStr}E${eStr}`,
        `${cleanTitle} ${sNum}x${eStr}`,
        `${cleanTitle} S${sNum}E${epNum}`,
        cleanTitle
      ];

      for (const q of searchQueries) {
        try {
          const directSearch = await this.fetchAllPagesSearch(q, 'files', undefined, apiKey);
          if (directSearch.files && directSearch.files.length > 0) {
            let bestDirect: AbyssResourceFile | null = null;
            let bestDirectScore = -1;

            for (const f of directSearch.files) {
              const name = extractAbyssName(f);
              const mRes = scoreEpisodeMatch(name, cleanTitle, sNum, epNum, false);
              if (mRes.matched && mRes.score > bestDirectScore) {
                bestDirectScore = mRes.score;
                bestDirect = f;
              }
            }

            if (bestDirect) {
              const rawId = extractAbyssId(bestDirect);
              const chosenName = extractAbyssName(bestDirect);
              if (rawId) {
                const playerUrl = `https://play.abyssplayer.com/${rawId}`;
                console.log(`🎉 [AbyssService] SUCESSO! Episódio localizado via busca direta de arquivo: "${chosenName}" (ID: ${rawId})`);
                return {
                  success: true,
                  fileId: rawId,
                  playerUrl,
                  fileName: chosenName
                };
              }
            }
          }
        } catch (err) {
          console.warn(`[AbyssService] Erro na busca direta para "${q}":`, err);
        }
      }

      return {
        success: false,
        error: 'SERIES_FOLDER_NOT_FOUND',
        message: `O vídeo do episódio (${seasonEpisodeTag}) ainda não existe ou não foi localizado no seu painel Abyss.`
      };
    }

    const seriesFolderId = extractAbyssId(seriesFolder);
    const seriesFolderName = extractAbyssName(seriesFolder);
    console.log(`[AbyssService] ✅ Pasta da Série localizada: "${seriesFolderName}" (ID: ${seriesFolderId})`);

    if (!seriesFolderId) {
      return {
        success: false,
        error: 'API_ERROR',
        message: `A pasta da série "${seriesFolderName}" não possui um ID válido.`
      };
    }

    // -------------------------------------------------------------
    // ETAPA 2: LOCALIZAR PASTA DA TEMPORADA DENTRO DA PASTA DA SÉRIE
    // -------------------------------------------------------------
    console.log(`[AbyssService] 📁 2/4 Localizando pasta da Temporada ${sNum} dentro de "${seriesFolderName}"...`);

    let seasonFolders: AbyssResourceFile[] = [];
    const visitedSeasonFolderIds = new Set<string>();

    try {
      const seasonSearch = await this.fetchAllPagesSearch('', 'folders', seriesFolderId, apiKey);
      for (const f of seasonSearch.files) {
        const id = extractAbyssId(f);
        if (id && !visitedSeasonFolderIds.has(id)) {
          visitedSeasonFolderIds.add(id);
          seasonFolders.push(f);
        }
      }

      // Se a listagem vazia não trouxe pastas, tenta buscar com termos específicos
      if (seasonFolders.length === 0) {
        const terms = [String(sNum), `Temporada ${sNum}`, `Season ${sNum}`, `S${sStr}`];
        for (const term of terms) {
          const search = await this.fetchAllPagesSearch(term, 'folders', seriesFolderId, apiKey);
          for (const f of search.files) {
            const id = extractAbyssId(f);
            if (id && !visitedSeasonFolderIds.has(id)) {
              visitedSeasonFolderIds.add(id);
              seasonFolders.push(f);
            }
          }
        }
      }
    } catch (err: any) {
      console.error(`[AbyssService] ❌ Erro ao listar subpastas da série:`, err);
    }

    // RegEx e regras flexíveis para encontrar a pasta da temporada
    const regSeasonNum = new RegExp(`\\b(?:temp(?:orada)?|season|t|s)?\\s*0*${sNum}\\b`, 'i');

    const seasonFolder = seasonFolders.find(f => {
      const name = extractAbyssName(f);
      if (!name) return false;
      const lowerName = name.toLowerCase().trim();
      const normName = normalizeMediaText(name);

      if (normName === String(sNum) || normName === sStr) return true;
      if (regSeasonNum.test(lowerName) || regSeasonNum.test(normName)) return true;
      if (lowerName.includes(`season ${sNum}`) || lowerName.includes(`season ${sStr}`)) return true;
      if (lowerName.includes(`temporada ${sNum}`) || lowerName.includes(`temporada ${sStr}`)) return true;
      if (lowerName.includes(`temp ${sNum}`) || lowerName.includes(`temp ${sStr}`)) return true;
      if (lowerName.includes(`t${sStr}`) || lowerName.includes(`s${sStr}`)) return true;

      return false;
    });

    if (!seasonFolder || !seriesFolder) {
      console.log(`[AbyssService] 💡 Pasta de série/temporada não localizada. Executando busca direta por arquivos no Abyss para "${cleanTitle} ${seasonEpisodeTag}"...`);
      
      const searchQueries = [
        `${cleanTitle} S${sStr}E${eStr}`,
        `${cleanTitle} ${sNum}x${eStr}`,
        `${cleanTitle} S${sNum}E${epNum}`,
        cleanTitle
      ];

      for (const q of searchQueries) {
        try {
          const directSearch = await this.fetchAllPagesSearch(q, 'files', undefined, apiKey);
          if (directSearch.files && directSearch.files.length > 0) {
            let bestDirect: AbyssResourceFile | null = null;
            let bestDirectScore = -1;

            for (const f of directSearch.files) {
              const name = extractAbyssName(f);
              const mRes = scoreEpisodeMatch(name, cleanTitle, sNum, epNum, false);
              if (mRes.matched && mRes.score > bestDirectScore) {
                bestDirectScore = mRes.score;
                bestDirect = f;
              }
            }

            if (bestDirect) {
              const rawId = extractAbyssId(bestDirect);
              const chosenName = extractAbyssName(bestDirect);
              if (rawId) {
                const playerUrl = `https://play.abyssplayer.com/${rawId}`;
                console.log(`🎉 [AbyssService] SUCESSO! Episódio localizado via busca direta de arquivo: "${chosenName}" (ID: ${rawId})`);
                return {
                  success: true,
                  fileId: rawId,
                  playerUrl,
                  fileName: chosenName
                };
              }
            }
          }
        } catch (err) {
          console.warn(`[AbyssService] Erro na busca direta para "${q}":`, err);
        }
      }

      return {
        success: false,
        error: !seriesFolder ? 'SERIES_FOLDER_NOT_FOUND' : 'SEASON_FOLDER_NOT_FOUND',
        message: `O vídeo do episódio (${seasonEpisodeTag}) ainda não existe ou não foi localizado no seu painel Abyss.`
      };
    }

    const seasonFolderId = extractAbyssId(seasonFolder);
    const seasonFolderName = extractAbyssName(seasonFolder);
    console.log(`[AbyssService] ✅ Pasta da Temporada ${sNum} localizada: "${seasonFolderName}" (ID: ${seasonFolderId})`);

    if (!seasonFolderId) {
      return {
        success: false,
        error: 'API_ERROR',
        message: `A pasta da temporada "${seasonFolderName}" não possui um ID válido.`
      };
    }

    // -------------------------------------------------------------
    // ETAPA 3 & 4: LISTAR ARQUIVOS DA PASTA E RECONHECER EPISÓDIO VIA REGEX
    // -------------------------------------------------------------
    console.log(`[AbyssService] 📁 3/4 Listando todos os arquivos dentro da pasta "${seasonFolderName}" (ID: ${seasonFolderId})...`);

    const filesResult = await this.fetchAllPagesSearch('', 'files', seasonFolderId, apiKey);
    const seasonFiles = filesResult.files;
    const pagesRead = filesResult.pagesRead;

    console.log(`[AbyssService] 📁 Paginador leu ${pagesRead} página(s) e encontrou ${seasonFiles.length} arquivo(s) na pasta da Temporada ${sNum}.`);

    if (!seasonFiles || seasonFiles.length === 0) {
      console.error(`\n==================================================`);
      console.error(`❌ [ABYSS AUDIT FAILURE] PASTA DA TEMPORADA ESTÁ VAZIA`);
      console.error(`• Série: "${cleanTitle}" | Temporada: ${sNum}`);
      console.error(`• Pasta: "${seasonFolderName}" (ID: ${seasonFolderId})`);
      console.error(`• Motivo: Nenhum arquivo de mídia foi retornado dentro desta pasta.`);
      console.error(`==================================================\n`);

      return {
        success: false,
        error: 'NOT_FOUND',
        message: `A pasta da Temporada ${sNum} ("${seasonFolderName}") está vazia no Abyss.`
      };
    }

    console.log(`[AbyssService] 🔍 4/4 Testando Regex para localizar o episódio ${seasonEpisodeTag} (Ep. ${epNum})...`);

    let bestItem: AbyssResourceFile | null = null;
    let highestScore = -1;
    let bestReason = '';

    for (const file of seasonFiles) {
      const name = extractAbyssName(file);
      const matchRes = scoreEpisodeMatch(name, cleanTitle, sNum, epNum, true);
      if (matchRes.matched && matchRes.score > highestScore) {
        highestScore = matchRes.score;
        bestItem = file;
        bestReason = matchRes.reason;
      }
    }

    // Fallback por posição natural dentro da pasta da temporada
    if (!bestItem && seasonFiles.length > 0) {
      const sortedFiles = [...seasonFiles].sort((a, b) => {
        const nameA = extractAbyssName(a);
        const nameB = extractAbyssName(b);
        return nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: 'base' });
      });

      if (epNum >= 1 && epNum <= sortedFiles.length) {
        bestItem = sortedFiles[epNum - 1];
        highestScore = 50;
        bestReason = `Fallback ativado: Selecionado o ${epNum}º arquivo da pasta por ordem natural.`;
        console.log(`[AbyssService] 💡 Fallback ativado: Selecionado o ${epNum}º arquivo da pasta ("${extractAbyssName(bestItem)}").`);
      }
    }

    const allFileNames = seasonFiles.map(f => extractAbyssName(f));

    if (!bestItem) {
      console.log(`[AbyssService] ℹ️ Episódio S${sStr}E${eStr} não localizado na pasta da Temporada ${sNum} ("${seasonFolderName}"). Total de arquivos na pasta: ${seasonFiles.length}.`);

      return {
        success: false,
        error: 'EPISODE_NOT_FOUND_IN_SEASON',
        message: `O episódio ${seasonEpisodeTag} não foi localizado na pasta da Temporada ${sNum} ("${seasonFolderName}").`,
        totalFilesCount: seasonFiles.length
      };
    }

    const rawId = extractAbyssId(bestItem);
    const chosenFileName = extractAbyssName(bestItem);
    const pageFound = (bestItem as any)._pageFound || 1;

    if (!rawId) {
      return {
        success: false,
        error: 'API_ERROR',
        message: `O arquivo localizado ("${chosenFileName}") não possui um ID válido no Abyss.`
      };
    }

    const playerUrl = `https://play.abyssplayer.com/${rawId}`;

    console.log(`\n==================================================`);
    console.log(`🎉 [ABYSS AUDIT SUCCESS] EPISÓDIO ENCONTRADO EXCLUSIVAMENTE VIA API DE PASTAS`);
    console.log(`• Quantidade de páginas lidas: ${pagesRead}`);
    console.log(`• Quantidade total de arquivos na pasta: ${seasonFiles.length}`);
    console.log(`• Nome de todos os arquivos encontrados:`, allFileNames);
    console.log(`• Página onde o episódio foi localizado: Página ${pageFound}`);
    console.log(`• Nome do arquivo escolhido: "${chosenFileName}"`);
    console.error ? null : null; // Clean formatting
    console.log(`• ID do arquivo escolhido: "${rawId}"`);
    console.log(`• Player URL gerada: "${playerUrl}"`);
    console.log(`• Motivo da Escolha: ${bestReason}`);
    console.log(`==================================================\n`);

    return {
      success: true,
      fileId: rawId,
      playerUrl,
      fileName: chosenFileName
    };
  }
}
