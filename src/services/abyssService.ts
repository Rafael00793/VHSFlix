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
  error?: 'AUTH_ERROR' | 'TIMEOUT_ERROR' | 'NETWORK_ERROR' | 'EMPTY_RESPONSE' | 'NOT_FOUND' | 'API_ERROR' | 'SERIES_FOLDER_NOT_FOUND' | 'SEASON_FOLDER_NOT_FOUND' | 'EPISODE_NOT_FOUND_IN_SEASON' | 'NO_API_KEY';
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
 * Gera variações inteligentes de títulos de mídia para aumentar drasticamente as chances de busca no Abyss
 */
export function generateTitleVariants(title: string): string[] {
  if (!title) return [];
  const variants: string[] = [];
  const raw = title.trim();
  if (raw) variants.push(raw);

  // Remoteno de ano entre parênteses ou isolado (ex: "The Walking Dead (2010)" -> "The Walking Dead")
  const noYear = raw.replace(/\(\s*(?:19|20)\d{2}\s*\)/g, '').replace(/\b(?:19|20)\d{2}\b/g, '').trim();
  if (noYear && !variants.includes(noYear)) variants.push(noYear);

  // Remoteno de colchetes e parênteses genéricos
  const noBrackets = raw.replace(/\[.*?\]/g, '').replace(/\(.*?\)/g, '').trim();
  if (noBrackets && !variants.includes(noBrackets)) variants.push(noBrackets);

  // Extração de título principal antes de separadores (: - — | /)
  const mainPart = raw.split(/[:\-\—\|]/)[0].trim();
  if (mainPart && mainPart.length >= 3 && !variants.includes(mainPart)) {
    variants.push(mainPart);
  }

  // Versão limpa de pontuação
  const cleanPunctuation = noYear.replace(/[^\w\s\u00C0-\u00FF]/g, ' ').replace(/\s+/g, ' ').trim();
  if (cleanPunctuation && !variants.includes(cleanPunctuation)) {
    variants.push(cleanPunctuation);
  }

  // Subtitular se existir (ex: "Sem Volta para Casa" de "Homem-Aranha: Sem Volta para Casa")
  const parts = raw.split(/[:\-\—\|]/);
  if (parts.length > 1) {
    const subPart = parts[1].trim();
    if (subPart && subPart.length >= 3 && !variants.includes(subPart)) {
      variants.push(subPart);
    }
  }

  // Versão com pontos no lugar de espaços (padrão de arquivos torrent/release: "The.Walking.Dead")
  if (cleanPunctuation) {
    const dotted = cleanPunctuation.replace(/\s+/g, '.');
    if (dotted && !variants.includes(dotted)) {
      variants.push(dotted);
    }
  }

  // Palavras-chave principais
  const stopWords = new Set(['o', 'a', 'os', 'as', 'um', 'uma', 'uns', 'umas', 'de', 'da', 'do', 'dos', 'das', 'em', 'no', 'na', 'nos', 'nas', 'por', 'para', 'com', 'sem', 'sob', 'sobre', 'e', 'or', 'and', 'the', 'of', 'in', 'on', 'at', 'to', 'for', 'with', 'by']);
  const words = cleanPunctuation.split(' ').filter(w => w.length > 2 && !stopWords.has(w.toLowerCase()));
  if (words.length >= 2) {
    const keyPhrase = words.join(' ');
    if (keyPhrase && !variants.includes(keyPhrase)) {
      variants.push(keyPhrase);
    }
  }

  return variants;
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
  const visitedObjects = new Set<any>();

  function processNode(node: any, depth = 0) {
    if (!node || depth > 6) return;

    if (Array.isArray(node)) {
      for (const item of node) {
        processNode(item, depth + 1);
      }
      return;
    }

    if (typeof node === 'object') {
      if (visitedObjects.has(node)) return;
      visitedObjects.add(node);

      const id = extractAbyssId(node);
      const name = extractAbyssName(node);

      if (id && name) {
        if (!visitedIds.has(id)) {
          visitedIds.add(id);
          results.push(node);
        }
      }

      // Varrer chaves de sub-listas/objetos com proteção de profundidade
      const keysToScan = ['files', 'items', 'children', 'contents', 'data', 'results', 'episodes', 'seasons', 'list'];
      for (const key of Object.keys(node)) {
        if (key === 'rawResponse' || key === 'parent' || key === 'window') continue;
        if (keysToScan.includes(key) || Array.isArray(node[key])) {
          const child = node[key];
          if (child && typeof child === 'object') {
            processNode(child, depth + 1);
          }
        }
      }
    }
  }

  processNode(input);
  return results;
}

/**
 * Avalia a compatibilidade de um arquivo para um episódio de série utilizando Regex flexíveis.
 * Reconhece equivalências como: S03E09, s03e09, 03x09, 3x09, 03X09, S3E9, s3e9, 3e9, T03E09, etc.
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

  // Regex 1: S06E02, s06e02, S6E2, s6e2, T06E02, T6E2, S06_E02, S06.E02, S06-E02, S06 E02
  const regSxxExx = new RegExp(`(?:^|[^a-z0-9])[sStT]0*${sNum}[\\s\\._\\-]*[eE]0*${epNum}(?:[^a-z0-9]|$)`, 'i');

  // Regex 2: 06x02, 6x02, 06X02, 6X2, 06 x 02, 6 x 2
  const regXxX = new RegExp(`(?:^|[^a-z0-9])0*${sNum}[\\s\\._\\-]*[xX][\\s\\._\\-]*0*${epNum}(?:[^a-z0-9]|$)`, 'i');

  // Regex 3: Season 6 Ep 02 / Temporada 6 Episodio 02 / Temp 6 Ep 2 / Cap 2
  const regTempEp = new RegExp(`(?:temp(?:orada)?|season|t|s)?\\s*0*${sNum}.*?(?:ep(?:isode|isod[ií]o)?|e|cap(?:itulo|ítulo)?)\\.?\\s*0*${epNum}(?:[^a-z0-9]|$)`, 'i');

  // Regex 4: Separado por ponto/traço/espaço (ex: 06.02 ou 6-02 ou 06_02)
  const regDotDash = new RegExp(`(?:^|[^a-z0-9])0*${sNum}[\\s\\._\\-]+0*${epNum}(?:[^a-z0-9]|$)`, 'i');

  // Regex 5: Código de 3 ou 4 dígitos (ex: 602, 0602, 1015)
  const regCode = new RegExp(`(?:^|[^0-9])0*${sNum}${ePadded}(?:[^0-9]|$)`, 'i');

  // Regex 6: Apenas episódio (ex: Ep 02, Episode 02, Episódio 2, E02, EP02, Cap 02, #02, #2)
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

  // Se não estiver dentro da pasta da temporada, aceita se contiver o título da série e a tag de episódio (ex: E15, #15)
  if (!isMatch && (hasEpOnly || hasIsolatedNum)) {
    const titleVars = generateTitleVariants(seriesTitle);
    for (const tv of titleVars) {
      const normTv = normalizeMediaText(tv);
      if (normTv && normTv.length >= 3 && normItem.includes(normTv)) {
        isMatch = true;
        break;
      }
    }
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

  // Comparação do Título da Série com suporte a variações
  const titleVars = generateTitleVariants(seriesTitle);
  let titleMatched = false;
  for (const tv of titleVars) {
    const normTv = normalizeMediaText(tv);
    if (normTv && normTv.length >= 3 && normItem.includes(normTv)) {
      score += 150;
      titleMatched = true;
      break;
    }
  }

  if (!titleMatched) {
    const normTitle = normalizeMediaText(seriesTitle);
    const titleWords = normTitle.split(' ').filter(w => w.length > 2);
    let matchedWords = 0;
    for (const word of titleWords) {
      if (normItem.includes(word)) matchedWords++;
    }
    if (titleWords.length > 0 && matchedWords > 0) {
      score += Math.round((matchedWords / titleWords.length) * 80);
    }
  }

  return {
    matched: true,
    score,
    reason: `Correspondência para S${sPadded}E${ePadded} (Score: ${score})`
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
    return { matched: true, score: 170, reason: `Contém o título "${movieTitle}"` };
  }

  // Testa variações do título (ex: sem ano, sem subtítulo, com pontos)
  const variants = generateTitleVariants(movieTitle);
  for (const variant of variants) {
    const normVar = normalizeMediaText(variant);
    if (normVar && normVar.length >= 3 && normItem.includes(normVar)) {
      return { matched: true, score: 140, reason: `Contém variação do título "${variant}"` };
    }
  }

  // Comparação de palavras-chave
  const stopWords = new Set(['o', 'a', 'os', 'as', 'de', 'da', 'do', 'dos', 'das', 'em', 'para', 'com', 'and', 'the', 'of']);
  const titleWords = normTitle.split(' ').filter(w => w.length > 2 && !stopWords.has(w));
  let matchedCount = 0;
  for (const word of titleWords) {
    if (normItem.includes(word)) matchedCount++;
  }

  if (titleWords.length > 0 && matchedCount === titleWords.length) {
    return { matched: true, score: 120, reason: `Contém todas as palavras-chave (${matchedCount}/${titleWords.length})` };
  }

  if (titleWords.length > 1 && matchedCount >= Math.ceil(titleWords.length * 0.6)) {
    return { matched: true, score: 80, reason: `Contém maioria das palavras-chave (${matchedCount}/${titleWords.length})` };
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

      try {
        const queryParams = new URLSearchParams();
        if (cleanQuery) queryParams.set('q', cleanQuery);
        queryParams.set('type', type);
        if (folderId) queryParams.set('folderId', folderId);
        if (currentPageToken) queryParams.set('pageToken', currentPageToken);
        if (apiKey) queryParams.set('key', apiKey);

        const clientHeaders: Record<string, string> = { 'Accept': 'application/json' };
        if (apiKey) clientHeaders['Authorization'] = `Bearer ${apiKey}`;

        // Timeout ajustado para 8s para garantir tempo de resposta adequado da API do Abyss
        let res = await fetchApi(`/.netlify/functions/abyss?${queryParams.toString()}`, {
          method: 'GET',
          headers: clientHeaders,
          signal: AbortSignal.timeout(8000)
        });

        // Fallback para rota /api/abyss/resources se necessário
        if (!res.ok) {
          res = await fetchApi(`/api/abyss/resources?${queryParams.toString()}`, {
            method: 'GET',
            headers: clientHeaders,
            signal: AbortSignal.timeout(8000)
          });
        }

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
   * Busca automaticamente a URL do player para um filme utilizando MÚLTIPLOS métodos e variações de títulos
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
    console.log(`[AbyssService] 🎬 INICIANDO BUSCA DE FILME MULTI-MÉTODOS NO ABYSS`);
    console.log(`Filme: "${cleanTitle}"`);
    console.log(`==================================================`);

    const apiKey = this.getApiKey(customApiKey);
    if (!apiKey) {
      return {
        success: false,
        error: 'NO_API_KEY',
        message: 'Chave de API do Abyss não configurada.'
      };
    }

    const titleVariants = generateTitleVariants(cleanTitle);
    let bestCandidate: { file: AbyssResourceFile; score: number; reason: string } | null = null;

    // MÉTODOS 1 & 2: BUSCA DIRETA DE ARQUIVOS COM MÚLTIPLAS VARIAÇÕES DE TERMOS DE BUSCA
    for (const queryVariant of titleVariants) {
      try {
        const searchRes = await this.fetchAllPagesSearch(queryVariant, 'files', undefined, apiKey);
        for (const file of searchRes.files) {
          const name = extractAbyssName(file);
          const matchRes = scoreMovieMatch(name, cleanTitle);
          if (matchRes.matched && matchRes.score > (bestCandidate?.score || 0)) {
            bestCandidate = { file, score: matchRes.score, reason: matchRes.reason };
            if (matchRes.score >= 150) break; // Excelente correspondência!
          }
        }
        if (bestCandidate && bestCandidate.score >= 150) break;
      } catch (err) {
        console.warn(`[AbyssService] Erro na busca de arquivos para variação "${queryVariant}":`, err);
      }
    }

    // MÉTODO 3: BUSCA EM PASTAS DE FILMES (Ex: "Filmes", "Homem Aranha")
    if (!bestCandidate || bestCandidate.score < 100) {
      for (const folderQuery of titleVariants) {
        try {
          const folderSearch = await this.fetchAllPagesSearch(folderQuery, 'folders', undefined, apiKey);
          for (const folder of folderSearch.files) {
            const folderId = extractAbyssId(folder);
            if (folderId) {
              const folderFiles = await this.fetchAllPagesSearch('', 'files', folderId, apiKey);
              for (const file of folderFiles.files) {
                const name = extractAbyssName(file);
                const matchRes = scoreMovieMatch(name, cleanTitle);
                if (matchRes.matched && matchRes.score > (bestCandidate?.score || 0)) {
                  bestCandidate = { file, score: matchRes.score, reason: `Pasta "${extractAbyssName(folder)}": ${matchRes.reason}` };
                }
              }
            }
          }
        } catch (err) {
          console.warn(`[AbyssService] Erro na busca de pastas de filme para "${folderQuery}":`, err);
        }
      }
    }

    // MÉTODO 4: LISTAGEM DA RAIZ (ÚLTIMO RECURSO)
    if (!bestCandidate) {
      try {
        const rootFiles = await this.fetchAllPagesSearch('', 'files', undefined, apiKey);
        for (const file of rootFiles.files) {
          const name = extractAbyssName(file);
          const matchRes = scoreMovieMatch(name, cleanTitle);
          if (matchRes.matched && matchRes.score > (bestCandidate?.score || 0)) {
            bestCandidate = { file, score: matchRes.score, reason: `Listagem raiz: ${matchRes.reason}` };
          }
        }
      } catch (err) {
        console.warn(`[AbyssService] Erro na busca na raiz para filme:`, err);
      }
    }

    if (!bestCandidate) {
      return {
        success: false,
        error: 'NOT_FOUND',
        message: `O vídeo "${cleanTitle}" ainda não existe ou não foi localizado no seu painel Abyss.`
      };
    }

    const rawId = extractAbyssId(bestCandidate.file);
    if (!rawId) {
      return {
        success: false,
        error: 'API_ERROR',
        message: 'O arquivo localizado no Abyss não possui um ID válido.'
      };
    }

    const playerUrl = `https://play.abyssplayer.com/${rawId}`;
    const fileName = extractAbyssName(bestCandidate.file) || cleanTitle;

    console.log(`🎉 [AbyssService] SUCESSO! Filme localizado no Abyss: "${fileName}" (ID: ${rawId}) | ${bestCandidate.reason}`);

    return {
      success: true,
      fileId: rawId,
      playerUrl,
      fileName
    };
  }

  /**
   * Busca automaticamente a URL do player para um episódio de série utilizando MÚLTIPLOS MÉTODOS INTEGRAIS:
   * 1. Estrutura de Pastas (Série -> Temporada -> Episódio) com tratamento de variações de títulos e números.
   * 2. Arquivos diretos dentro da pasta da série.
   * 3. Busca direta por nome de arquivo de episódio (sem depender de pastas).
   * 4. Varredura por tags de episódios isoladas e listagem geral.
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
    console.log(`[AbyssService] 📺 BUSCA MULTI-ESTRATÉGIA DE EPISÓDIO NO ABYSS`);
    console.log(`Série: "${cleanTitle}" | Temporada: ${sNum} | Episódio: ${epNum} (${seasonEpisodeTag})`);
    console.log(`==================================================`);

    const apiKey = this.getApiKey(customApiKey);
    if (!apiKey) {
      return {
        success: false,
        error: 'NO_API_KEY',
        message: 'Chave de API do Abyss não configurada.'
      };
    }

    const titleVariants = generateTitleVariants(cleanTitle);
    let bestCandidate: { file: AbyssResourceFile; score: number; reason: string } | null = null;

    // ESTRATÉGIA A: BUSCA POR ESTRUTURA DE PASTAS (Série -> Temporada -> Arquivo ou Série -> Arquivo)
    let seriesFolders: AbyssResourceFile[] = [];
    const visitedSeriesFolderIds = new Set<string>();

    for (const variant of titleVariants) {
      try {
        const folderSearch = await this.fetchAllPagesSearch(variant, 'folders', undefined, apiKey);
        for (const f of folderSearch.files) {
          const id = extractAbyssId(f);
          if (id && !visitedSeriesFolderIds.has(id)) {
            visitedSeriesFolderIds.add(id);
            seriesFolders.push(f);
          }
        }
      } catch (err) {
        console.warn(`[AbyssService] Erro ao buscar pasta da série para "${variant}":`, err);
      }
    }

    // Se não achou por termo, tenta listar pastas da raiz
    if (seriesFolders.length === 0) {
      try {
        const rootFolders = await this.fetchAllPagesSearch('', 'folders', undefined, apiKey);
        for (const f of rootFolders.files) {
          const id = extractAbyssId(f);
          if (id && !visitedSeriesFolderIds.has(id)) {
            visitedSeriesFolderIds.add(id);
            seriesFolders.push(f);
          }
        }
      } catch (err) {
        console.warn(`[AbyssService] Erro ao listar pastas da raiz:`, err);
      }
    }

    // Filtrar melhor pasta de série
    const matchingSeriesFolders = seriesFolders.filter(f => {
      const name = extractAbyssName(f);
      if (!name) return false;
      const normFolder = normalizeMediaText(name);
      for (const v of titleVariants) {
        const normV = normalizeMediaText(v);
        if (normFolder === normV || normFolder.includes(normV) || normV.includes(normFolder)) {
          return true;
        }
      }
      return false;
    });

    for (const sFolder of matchingSeriesFolders) {
      const sFolderId = extractAbyssId(sFolder);
      const sFolderName = extractAbyssName(sFolder);
      if (!sFolderId) continue;

      // A1: Buscar subpasta de Temporada dentro da pasta da série
      let seasonFolders: AbyssResourceFile[] = [];
      try {
        const subFoldersRes = await this.fetchAllPagesSearch('', 'folders', sFolderId, apiKey);
        seasonFolders = subFoldersRes.files;
      } catch (err) {
        console.warn(`[AbyssService] Erro ao listar subpastas da série "${sFolderName}":`, err);
      }

      // Regex flexível para encontrar a pasta da temporada
      const seasonFolderMatch = seasonFolders.find(f => {
        const name = extractAbyssName(f);
        if (!name) return false;
        const lower = name.toLowerCase().trim();
        const norm = normalizeMediaText(name);

        if (norm === String(sNum) || norm === sStr) return true;
        if (new RegExp(`\\b(?:temp(?:orada)?|season|t|s)?\\s*0*${sNum}\\b`, 'i').test(lower)) return true;
        if (lower.includes(`${sNum}a`) || lower.includes(`${sNum}ª`)) return true;
        return false;
      });

      if (seasonFolderMatch) {
        const seasonFolderId = extractAbyssId(seasonFolderMatch);
        if (seasonFolderId) {
          try {
            const seasonFilesRes = await this.fetchAllPagesSearch('', 'files', seasonFolderId, apiKey);
            for (const file of seasonFilesRes.files) {
              const name = extractAbyssName(file);
              const mRes = scoreEpisodeMatch(name, cleanTitle, sNum, epNum, true);
              if (mRes.matched && mRes.score > (bestCandidate?.score || 0)) {
                bestCandidate = { file, score: mRes.score, reason: `Pasta "${sFolderName}/${extractAbyssName(seasonFolderMatch)}": ${mRes.reason}` };
              }
            }
          } catch (err) {
            console.warn(`[AbyssService] Erro ao listar arquivos da temporada:`, err);
          }
        }
      }

      // A2: Arquivos diretamente na pasta da série (sem subpasta de temporada)
      if (!bestCandidate || bestCandidate.score < 100) {
        try {
          const directSeriesFiles = await this.fetchAllPagesSearch('', 'files', sFolderId, apiKey);
          for (const file of directSeriesFiles.files) {
            const name = extractAbyssName(file);
            const mRes = scoreEpisodeMatch(name, cleanTitle, sNum, epNum, false);
            if (mRes.matched && mRes.score > (bestCandidate?.score || 0)) {
              bestCandidate = { file, score: mRes.score, reason: `Pasta "${sFolderName}": ${mRes.reason}` };
            }
          }
        } catch (err) {
          console.warn(`[AbyssService] Erro ao listar arquivos diretos da série:`, err);
        }
      }

      if (bestCandidate && bestCandidate.score >= 150) break;
    }

    // ESTRATÉGIA B: BUSCA DIRETA DE ARQUIVOS (Sem depender de estrutura de pastas)
    if (!bestCandidate || bestCandidate.score < 100) {
      const epQueries: string[] = [];
      for (const vTitle of titleVariants) {
        epQueries.push(`${vTitle} S${sStr}E${eStr}`);
        epQueries.push(`${vTitle} ${sNum}x${eStr}`);
        epQueries.push(`${vTitle} S${sNum}E${epNum}`);
        epQueries.push(`${vTitle} T${sStr}E${eStr}`);
        epQueries.push(`${vTitle} E${eStr}`);
        epQueries.push(`${vTitle} ${eStr}`);
        epQueries.push(vTitle);
      }

      // Adiciona busca por tags de episódio isoladas
      epQueries.push(`S${sStr}E${eStr}`);
      epQueries.push(`${sNum}x${eStr}`);

      for (const epQuery of epQueries) {
        try {
          const directFiles = await this.fetchAllPagesSearch(epQuery, 'files', undefined, apiKey);
          for (const file of directFiles.files) {
            const name = extractAbyssName(file);
            const mRes = scoreEpisodeMatch(name, cleanTitle, sNum, epNum, false);
            if (mRes.matched && mRes.score > (bestCandidate?.score || 0)) {
              bestCandidate = { file, score: mRes.score, reason: `Busca direta ("${epQuery}"): ${mRes.reason}` };
              if (mRes.score >= 150) break;
            }
          }
          if (bestCandidate && bestCandidate.score >= 150) break;
        } catch (err) {
          console.warn(`[AbyssService] Erro na busca direta para "${epQuery}":`, err);
        }
      }
    }

    // ESTRATÉGIA C: LISTAGEM DA RAIZ COMO ÚLTIMO RECURSO
    if (!bestCandidate) {
      try {
        const rootFiles = await this.fetchAllPagesSearch('', 'files', undefined, apiKey);
        for (const file of rootFiles.files) {
          const name = extractAbyssName(file);
          const mRes = scoreEpisodeMatch(name, cleanTitle, sNum, epNum, false);
          if (mRes.matched && mRes.score > (bestCandidate?.score || 0)) {
            bestCandidate = { file, score: mRes.score, reason: `Raiz: ${mRes.reason}` };
          }
        }
      } catch (err) {
        console.warn(`[AbyssService] Erro na varredura da raiz:`, err);
      }
    }

    if (!bestCandidate) {
      return {
        success: false,
        error: 'NOT_FOUND',
        message: `O vídeo do episódio (${seasonEpisodeTag}) ainda não existe ou não foi localizado no seu painel Abyss.`
      };
    }

    const rawId = extractAbyssId(bestCandidate.file);
    const chosenFileName = extractAbyssName(bestCandidate.file);

    if (!rawId) {
      return {
        success: false,
        error: 'API_ERROR',
        message: `O arquivo localizado ("${chosenFileName}") não possui um ID válido no Abyss.`
      };
    }

    const playerUrl = `https://play.abyssplayer.com/${rawId}`;

    console.log(`🎉 [ABYSS] SUCESSO! Episódio localizado: "${chosenFileName}" (ID: ${rawId}) | ${bestCandidate.reason}`);

    return {
      success: true,
      fileId: rawId,
      playerUrl,
      fileName: chosenFileName
    };
  }
}
