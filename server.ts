import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import path from 'path';
import fs from 'fs';
import https from 'https';
import { createServer as createViteServer } from 'vite';
import { INITIAL_USERS, DEFAULT_PROFILES, INITIAL_MOVIES } from './src/data';

const app = express();
const PORT = 3000;
const DB_FILE = path.join(process.cwd(), 'vhsflix_database.json');

app.use(express.json({ limit: '15mb' }));

// Middleware para habilitar CORS de forma universal (importante para Netlify/Smart TVs)
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Funções para ler e escrever no arquivo de banco de dados central
function getDb() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      return JSON.parse(content);
    }
  } catch (err) {
    console.error("Erro ao ler banco de dados:", err);
  }
  
  // Se não existir, inicializamos com as constantes padrão do sistema
  const initialDb = {
    users: INITIAL_USERS,
    allProfiles: DEFAULT_PROFILES,
    movies: INITIAL_MOVIES,
    adguardEnabled: true
  };
  saveDb(initialDb);
  return initialDb;
}

function saveDb(data: any) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error("Erro ao salvar no banco de dados:", err);
    return false;
  }
}

// 1. Rota de sincronização do banco de dados (GET)
app.get('/api/sync', (req, res) => {
  const dbData = getDb();
  res.json(dbData);
});

// 2. Rota de sincronização do banco de dados (POST)
app.post('/api/sync', (req, res) => {
  const { users, allProfiles, movies, adguardEnabled } = req.body;
  const currentDb = getDb();

  if (users) currentDb.users = users;
  if (allProfiles) currentDb.allProfiles = allProfiles;
  if (movies) currentDb.movies = movies;
  if (adguardEnabled !== undefined) currentDb.adguardEnabled = adguardEnabled;

  const success = saveDb(currentDb);
  res.json({ success });
});

// 3. Status de saúde do servidor
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// 3.0. PROXY SEGURO DE IMAGENS DO TMDB (Backup para redes com bloqueio de DNS/Adblockers)
const tmdbImageCache = new Map<string, { buffer: Buffer; contentType: string; timestamp: number }>();

app.get('/api/tmdb-image-proxy', async (req, res) => {
  try {
    const rawPath = String(req.query.path || '').trim();
    if (!rawPath) return res.status(400).send('Path is required');

    let targetUrl = rawPath;
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      const tmdbPath = targetUrl.startsWith('/') ? targetUrl : '/' + targetUrl;
      if (tmdbPath.startsWith('/t/p/')) {
        targetUrl = `https://image.tmdb.org${tmdbPath}`;
      } else {
        targetUrl = `https://image.tmdb.org/t/p/w780${tmdbPath}`;
      }
    }

    // Permitir apenas TMDB, Unsplash e Amazon
    const parsed = new URL(targetUrl);
    if (!['image.tmdb.org', 'images.unsplash.com', 'm.media-amazon.com'].includes(parsed.hostname)) {
      return res.status(403).send('Domain not allowed');
    }

    const cached = tmdbImageCache.get(targetUrl);
    if (cached && (Date.now() - cached.timestamp < 3600000 * 24)) { // 24 horas de cache em memória
      res.setHeader('Content-Type', cached.contentType);
      res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
      res.setHeader('Access-Control-Allow-Origin', '*');
      return res.send(cached.buffer);
    }

    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    if (!response.ok) {
      return res.status(response.status).send('Failed to fetch image');
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const arrayBuf = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuf);

    if (tmdbImageCache.size > 200) {
      const oldestKey = tmdbImageCache.keys().next().value;
      if (oldestKey) tmdbImageCache.delete(oldestKey);
    }
    tmdbImageCache.set(targetUrl, { buffer, contentType, timestamp: Date.now() });

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.send(buffer);
  } catch (err) {
    console.error('[PROXY IMAGEM ERROR]:', err);
    res.status(500).send('Proxy error');
  }
});

// 3.1. SISTEMA INTELIGENTE DE TRAILERS (TMDB + YOUTUBE DATA API V3 + SCRAPER)
const inMemoryTrailerCache = new Map<string, { videoId: string; trailerUrl: string; source: string; channelTitle?: string }>();

const OFFICIAL_CHANNEL_KEYWORDS = [
  'warner', 'universal', 'paramount', 'sony', 'disney', 'marvel', 'netflix', 
  'prime video', 'hbo', '20th century', 'lionsgate', 'a24', 'imagem filmes', 
  'paris filmes', 'downtown filmes', 'diamond films', 'o2 play', 'zazen', 
  'globo filmes', 'ingresso.com', 'trailersbr', 'pipoca moderna', 'fandom', 
  'cinemark', 'cinépolis', 'galeria distribuidora', 'vitiello', 'playarte',
  'apple tv', 'star+', 'hulu', 'bluray', 'oficial', 'official'
];

interface SmartTrailerResult {
  videoId: string;
  trailerUrl: string;
  source: 'tmdb' | 'youtube' | 'cache' | 'fallback';
  channelTitle?: string;
  queryUsed?: string;
}

// Scraper direto de HTML da busca do YouTube (funciona 100% sem chave ou limites de API)
async function scrapeYouTubeSearch(query: string): Promise<Array<{ videoId: string; title: string; channelTitle: string }>> {
  const results: Array<{ videoId: string; title: string; channelTitle: string }> = [];

  try {
    const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      },
      signal: AbortSignal.timeout(6000)
    });

    if (response.ok) {
      const html = await response.text();

      // Estratégia 1: Extrair JSON ytInitialData
      const jsonMatch = html.match(/var\s+ytInitialData\s*=\s*({.*?});<\/script>/s) ||
                        html.match(/window\["ytInitialData"\]\s*=\s*({.*?});/s) ||
                        html.match(/ytInitialData\s*=\s*({.*?});/s);

      if (jsonMatch && jsonMatch[1]) {
        try {
          const ytData = JSON.parse(jsonMatch[1]);
          const contents = ytData?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents;
          if (Array.isArray(contents)) {
            for (const section of contents) {
              const itemSection = section?.itemSectionRenderer?.contents;
              if (Array.isArray(itemSection)) {
                for (const item of itemSection) {
                  const vr = item?.videoRenderer;
                  if (vr && vr.videoId) {
                    const videoId = vr.videoId;
                    const title = vr.title?.runs?.[0]?.text || '';
                    const channelTitle = vr.ownerText?.runs?.[0]?.text || vr.shortBylineText?.runs?.[0]?.text || '';
                    results.push({ videoId, title, channelTitle });
                  }
                }
              }
            }
          }
        } catch (e) {
          // Ignora falha de parse
        }
      }

      // Estratégia 2: Regex do videoRenderer
      if (results.length === 0) {
        const videoRendererRegex = /"videoRenderer":\s*({.*?"videoId":"([a-zA-Z0-9_-]{11})".*?})/g;
        let match;
        const seenIds = new Set<string>();

        while ((match = videoRendererRegex.exec(html)) !== null && results.length < 10) {
          const block = match[1];
          const vId = match[2];

          if (vId && !seenIds.has(vId)) {
            seenIds.add(vId);
            const titleMatch = block.match(/"title":\s*{\s*"runs":\s*\[\s*{\s*"text":\s*"([^"]+)"/);
            const channelMatch = block.match(/"ownerText":\s*{\s*"runs":\s*\[\s*{\s*"text":\s*"([^"]+)"/) ||
                                 block.match(/"shortBylineText":\s*{\s*"runs":\s*\[\s*{\s*"text":\s*"([^"]+)"/);

            const title = titleMatch ? titleMatch[1] : '';
            const channelTitle = channelMatch ? channelMatch[1] : '';

            results.push({ videoId: vId, title, channelTitle });
          }
        }
      }

      // Estratégia 3: Captura genérica de IDs de vídeos no HTML
      if (results.length === 0) {
        const idRegex = /\/watch\?v=([a-zA-Z0-9_-]{11})/g;
        let match;
        const seenIds = new Set<string>();
        while ((match = idRegex.exec(html)) !== null && results.length < 10) {
          const vId = match[1];
          if (!seenIds.has(vId)) {
            seenIds.add(vId);
            results.push({ videoId: vId, title: '', channelTitle: '' });
          }
        }
      }
    }
  } catch (err) {
    console.warn('[YOUTUBE SCRAPER] Erro ao raspar busca do YouTube:', err);
  }

  return results;
}

async function findSmartTrailer(
  title: string,
  tmdbId?: number | string,
  type: 'movie' | 'series' = 'movie',
  movieId?: string
): Promise<SmartTrailerResult> {
  const cleanTitleStr = (title || '').trim();
  if (!cleanTitleStr) {
    return {
      videoId: 'mqq_H30_u5Q',
      trailerUrl: 'https://www.youtube.com/embed/mqq_H30_u5Q',
      source: 'fallback'
    };
  }

  const cacheKey = tmdbId ? `tmdb_${tmdbId}` : `title_${cleanTitleStr.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;

  // 1. Verificação no cache em memória (ignora fallbacks antigos para re-pesquisar)
  if (inMemoryTrailerCache.has(cacheKey)) {
    const cached = inMemoryTrailerCache.get(cacheKey)!;
    if (cached.videoId && cached.videoId !== 'mqq_H30_u5Q') {
      console.log(`[SMART TRAILER] ⚡ Cache em memória ativado para: "${cleanTitleStr}"`);
      return { ...cached, source: 'cache' };
    }
  }

  const currentDb = getDb();
  if (!currentDb.trailerCache) {
    currentDb.trailerCache = {};
  }

  // 2. Verificação no cache do Banco de Dados
  if (currentDb.trailerCache[cacheKey]) {
    const cached = currentDb.trailerCache[cacheKey];
    if (cached.videoId && cached.videoId !== 'mqq_H30_u5Q') {
      inMemoryTrailerCache.set(cacheKey, cached);
      console.log(`[SMART TRAILER] 💾 Cache do banco de dados recuperado para: "${cleanTitleStr}"`);
      return { ...cached, source: 'cache' };
    }
  }

  // Verificação se o filme já possui trailer e youtubeVideoId VÁLIDO cadastrado no banco de dados
  if (currentDb.movies && Array.isArray(currentDb.movies)) {
    const existingMovie = currentDb.movies.find((m: any) => 
      (movieId && m.id === movieId) ||
      (tmdbId && Number(m.tmdbId) === Number(tmdbId)) ||
      (m.title && m.title.toLowerCase().trim() === cleanTitleStr.toLowerCase())
    );

    if (existingMovie && existingMovie.trailerUrl && existingMovie.youtubeVideoId && existingMovie.youtubeVideoId !== 'mqq_H30_u5Q') {
      const cached = {
        videoId: existingMovie.youtubeVideoId,
        trailerUrl: existingMovie.trailerUrl,
        source: 'cache' as const
      };
      inMemoryTrailerCache.set(cacheKey, cached);
      currentDb.trailerCache[cacheKey] = cached;
      saveDb(currentDb);
      console.log(`[SMART TRAILER] 🎬 Trailer já cadastrado para a fita "${cleanTitleStr}" no banco de dados.`);
      return cached;
    }
  }

  // PASSO 1: Consultar o TMDb
  console.log(`[SMART TRAILER] 🔍 Consultando o TMDb para "${cleanTitleStr}" (TMDB ID: ${tmdbId || 'N/A'})...`);
  const tmdbApiKey = process.env.TMDB_API_KEY || '9ba478ffe785bbc34fa2b10c46296580';
  let foundVideoId: string | null = null;
  let trailerSource: 'tmdb' | 'youtube' = 'tmdb';
  let selectedChannel: string | undefined;
  let selectedQuery: string | undefined;

  let effectiveTmdbId = tmdbId;
  if (!effectiveTmdbId) {
    try {
      const searchEndpoint = type === 'series' ? 'search/tv' : 'search/movie';
      const searchRes = await fetch(
        `https://api.themoviedb.org/3/${searchEndpoint}?api_key=${tmdbApiKey}&query=${encodeURIComponent(cleanTitleStr)}&language=pt-BR`,
        { signal: AbortSignal.timeout(4000) }
      );
      if (searchRes.ok) {
        const searchData = await searchRes.json();
        if (searchData.results && searchData.results.length > 0) {
          effectiveTmdbId = searchData.results[0].id;
        }
      }
    } catch (e) {
      console.warn('[SMART TRAILER] Erro na busca por título no TMDB:', e);
    }
  }

  if (effectiveTmdbId) {
    try {
      const mediaEndpoint = type === 'series' ? 'tv' : 'movie';
      // Tentar pt-BR primeiro
      let videosRes = await fetch(
        `https://api.themoviedb.org/3/${mediaEndpoint}/${effectiveTmdbId}/videos?api_key=${tmdbApiKey}&language=pt-BR`,
        { signal: AbortSignal.timeout(4000) }
      );
      let videosData = videosRes.ok ? await videosRes.json() : null;
      let videos = videosData?.results || [];

      // Fallback sem filtro de idioma (en-US / global)
      if (videos.length === 0) {
        videosRes = await fetch(
          `https://api.themoviedb.org/3/${mediaEndpoint}/${effectiveTmdbId}/videos?api_key=${tmdbApiKey}`,
          { signal: AbortSignal.timeout(4000) }
        );
        if (videosRes.ok) {
          videosData = await videosRes.json();
          videos = videosData?.results || [];
        }
      }

      const youtubeTrailer = videos.find((v: any) => 
        v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser')
      );

      if (youtubeTrailer && youtubeTrailer.key) {
        foundVideoId = youtubeTrailer.key;
        trailerSource = 'tmdb';
        console.log(`[SMART TRAILER] ✅ Trailer encontrado diretamente no TMDb! Key: ${foundVideoId}`);
      }
    } catch (err) {
      console.warn('[SMART TRAILER] Erro ao consultar vídeos do TMDb:', err);
    }
  }

  // PASSO 2: Se NÃO existir trailer no TMDb -> Pesquisar no YouTube (Scraper + API v3 + Invidious)
  if (!foundVideoId) {
    console.log(`[SMART TRAILER] ⚠️ Nenhum trailer localizado no TMDb. Buscando no YouTube...`);
    trailerSource = 'youtube';

    const youtubeApiKey = process.env.YOUTUBE_API_KEY || process.env.VITE_YOUTUBE_API_KEY;

    // Ordem exata de buscas configurada:
    const searchQueries = [
      `${cleanTitleStr} Trailer Oficial Dublado`,
      `${cleanTitleStr} Trailer Oficial Português`,
      `${cleanTitleStr} Trailer Oficial Legendado`,
      `${cleanTitleStr} Official Trailer`,
      `${cleanTitleStr} Final Trailer`,
      `${cleanTitleStr} Teaser Oficial`
    ];

    let bestCandidate: { videoId: string; channelTitle: string; title: string; score: number; query: string } | null = null;

    for (const query of searchQueries) {
      if (bestCandidate && bestCandidate.score >= 85) {
        // Pontuação máxima alcançada (canal oficial + dublado/oficial), encerra loop de busca
        break;
      }

      try {
        let items: any[] = [];

        // 1. YouTube API v3 oficial (se a chave estiver presente)
        if (youtubeApiKey && youtubeApiKey.trim() !== '') {
          const ytUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=8&key=${youtubeApiKey}`;
          const ytRes = await fetch(ytUrl, { signal: AbortSignal.timeout(5000) });
          if (ytRes.ok) {
            const ytData = await ytRes.json();
            items = ytData.items || [];
          } else {
            console.warn(`[SMART TRAILER] YouTube API HTTP ${ytRes.status} para query: "${query}"`);
          }
        }

        // 2. Scraper direto do HTML do YouTube (100% autônomo e sem chave)
        if (items.length === 0) {
          const scraped = await scrapeYouTubeSearch(query);
          if (scraped.length > 0) {
            items = scraped.map(s => ({
              id: { videoId: s.videoId },
              snippet: { title: s.title, channelTitle: s.channelTitle }
            }));
          }
        }

        // 3. Fallback via espelhos Invidious caso o scraper não retorne
        if (items.length === 0) {
          const invidiousMirrors = [
            'https://invidious.drgns.space/api/v1/search',
            'https://vid.puffyan.us/api/v1/search',
            'https://invidious.io.lol/api/v1/search'
          ];

          for (const mirror of invidiousMirrors) {
            try {
              const invRes = await fetch(`${mirror}?q=${encodeURIComponent(query)}&type=video`, { signal: AbortSignal.timeout(3500) });
              if (invRes.ok) {
                const invData = await invRes.json();
                if (Array.isArray(invData) && invData.length > 0) {
                  items = invData.map((v: any) => ({
                    id: { videoId: v.videoId },
                    snippet: { title: v.title, channelTitle: v.author }
                  }));
                  break;
                }
              }
            } catch (e) {
              // Silencioso nos espelhos
            }
          }
        }

        for (const item of items) {
          const videoId = item.id?.videoId || item.videoId;
          if (!videoId) continue;

          const videoTitle = (item.snippet?.title || '').toLowerCase();
          const channelTitle = (item.snippet?.channelTitle || item.snippet?.author || '').toLowerCase();

          let score = 40;

          // Selecionar apenas vídeos do canal oficial do estúdio ou distribuidora sempre que possível
          const isOfficialChannel = OFFICIAL_CHANNEL_KEYWORDS.some(kw => channelTitle.includes(kw));
          if (isOfficialChannel) {
            score += 45;
          }

          // Preferência por dublado / português
          if (videoTitle.includes('dublado') || videoTitle.includes('português') || videoTitle.includes('portugues')) {
            score += 25;
          } else if (videoTitle.includes('legendado')) {
            score += 15;
          }

          if (videoTitle.includes('official') || videoTitle.includes('oficial') || videoTitle.includes('trailer')) {
            score += 10;
          }

          if (!bestCandidate || score > bestCandidate.score) {
            bestCandidate = {
              videoId,
              channelTitle: item.snippet?.channelTitle || '',
              title: item.snippet?.title || '',
              score,
              query
            };
          }
        }
      } catch (err) {
        console.warn(`[SMART TRAILER] Erro na busca do YouTube para "${query}":`, err);
      }
    }

    if (bestCandidate) {
      foundVideoId = bestCandidate.videoId;
      selectedChannel = bestCandidate.channelTitle;
      selectedQuery = bestCandidate.query;
      console.log(`[SMART TRAILER] ✅ YouTube selecionou o videoId "${foundVideoId}" | Canal: "${selectedChannel}" | Query: "${selectedQuery}"`);
    }
  }

  // Fallback seguro caso não encontre
  if (!foundVideoId) {
    foundVideoId = 'mqq_H30_u5Q';
  }

  const trailerUrl = `https://www.youtube.com/embed/${foundVideoId}`;
  const result: SmartTrailerResult = {
    videoId: foundVideoId,
    trailerUrl,
    source: trailerSource,
    channelTitle: selectedChannel,
    queryUsed: selectedQuery
  };

  // PASSO 3: Salvar automaticamente o trailer e videoId no banco de dados para não pesquisar novamente
  inMemoryTrailerCache.set(cacheKey, result);
  currentDb.trailerCache[cacheKey] = result;

  if (currentDb.movies && Array.isArray(currentDb.movies)) {
    let updatedDb = false;
    currentDb.movies.forEach((m: any) => {
      if (
        (movieId && m.id === movieId) ||
        (effectiveTmdbId && Number(m.tmdbId) === Number(effectiveTmdbId)) ||
        (m.title && m.title.toLowerCase().trim() === cleanTitleStr.toLowerCase())
      ) {
        m.trailerUrl = trailerUrl;
        m.youtubeVideoId = foundVideoId;
        m.updatedAt = new Date().toISOString();
        updatedDb = true;
      }
    });
  }

  saveDb(currentDb);
  return result;
}

// Endpoint POST /api/trailer
app.post('/api/trailer', async (req, res) => {
  const { title, tmdbId, type, movieId } = req.body || {};
  if (!title) {
    return res.status(400).json({ success: false, error: 'Título é obrigatório.' });
  }

  try {
    const result = await findSmartTrailer(title, tmdbId, type, movieId);
    res.json({ success: true, ...result });
  } catch (err: any) {
    console.error('[API /api/trailer ERRO]', err);
    res.status(500).json({ success: false, error: err.message || String(err) });
  }
});

// Endpoint GET /api/trailer
app.get('/api/trailer', async (req, res) => {
  const title = req.query.title as string;
  const tmdbId = req.query.tmdbId as string;
  const type = (req.query.type as 'movie' | 'series') || 'movie';
  const movieId = req.query.movieId as string;

  if (!title) {
    return res.status(400).json({ success: false, error: 'Título é obrigatório.' });
  }

  try {
    const result = await findSmartTrailer(title, tmdbId, type, movieId);
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// 4. Endpoint de Pesquisa de Recursos do Abyss (GET /v1/resources)
app.get('/api/abyss/resources', async (req, res) => {
  const query = (req.query.q as string) || '';
  const type = (req.query.type as string) || 'files';
  const folderId = (req.query.folderId as string) || (req.query.folder_id as string) || (req.query.parent_id as string) || '';
  const pageToken = (req.query.pageToken as string) || (req.query.page_token as string) || (req.query.page as string) || (req.query.cursor as string) || '';
  const customKey = (req.query.key as string) || (req.headers.authorization ? req.headers.authorization.replace('Bearer ', '').trim() : '');
  const apiKey = customKey && customKey !== 'YOUR_ABYSS_API_KEY' ? customKey : (process.env.ABYSS_API_KEY || process.env.VITE_ABYSS_API_KEY);

  console.log(`\n==================================================`);
  console.log(`[SERVER ABYSS] 🔍 Nova Consulta de Recursos no Abyss`);
  console.log(`Query: "${query}" | Type: "${type}" | FolderId: "${folderId}" | PageToken: "${pageToken}" | HasApiKey: ${Boolean(apiKey)}`);
  console.log(`==================================================`);

  if (!apiKey || apiKey.trim() === '' || apiKey === 'YOUR_ABYSS_API_KEY') {
    console.warn('[SERVER ABYSS] ⚠️ Nenhuma API Key do Abyss configurada.');
    return res.status(401).json({
      success: false,
      error: 'AUTH_ERROR',
      message: 'Chave de API do Abyss não configurada.',
      results: [],
      rawResponse: null
    });
  }

  try {
    const params = new URLSearchParams({
      key: apiKey,
      type: type,
      maxResults: '100'
    });

    if (query.trim()) {
      params.set('q', query.trim());
    }

    if (folderId.trim()) {
      params.set('folderId', folderId.trim());
      params.set('folder_id', folderId.trim());
      params.set('parent_id', folderId.trim());
    }

    if (pageToken.trim()) {
      params.set('pageToken', pageToken.trim());
      params.set('page_token', pageToken.trim());
      params.set('page', pageToken.trim());
    }

    // Se a busca for de pastas, tentar primeiramente /v1/folders/list conforme documentação oficial
    const primaryEndpoint = type === 'folders' ? 'https://api.abyss.to/v1/folders/list' : 'https://api.abyss.to/v1/resources';
    const primaryUrl = `${primaryEndpoint}?${params.toString()}`;
    const safeUrlLog = `${primaryEndpoint}?q=${encodeURIComponent(query)}&type=${type}&folderId=${folderId}&pageToken=${pageToken}&key=***`;

    console.log(`[SERVER ABYSS] 📡 Efetuando GET para: ${safeUrlLog}`);

    let response = await fetch(primaryUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json'
      },
      signal: AbortSignal.timeout(10000)
    }).catch(err => {
      console.warn('[SERVER ABYSS] Timeout ou erro de conexão:', err.message || err);
      return null;
    });

    // Fallbacks se o endpoint principal falhar
    if (!response || !response.ok) {
      if (response && (response.status === 401 || response.status === 403)) {
        console.error('[SERVER ABYSS] ❌ Erro de Autenticação (401/403) na API do Abyss.');
        return res.status(401).json({
          success: false,
          error: 'AUTH_ERROR',
          message: 'Chave de API do Abyss inválida ou expirada.',
          results: [],
          rawResponse: null
        });
      }

      const secondaryEndpoint = type === 'folders' ? 'https://api.abyss.to/v1/resources' : 'https://api.abyss.to/v1/files';
      console.log(`[SERVER ABYSS] Fallback: Tentando endpoint ${secondaryEndpoint}...`);
      const fallbackUrl = `${secondaryEndpoint}?${params.toString()}`;
      response = await fetch(fallbackUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Accept': 'application/json'
        },
        signal: AbortSignal.timeout(10000)
      }).catch(() => null);

      if (!response || !response.ok) {
        const tertiaryEndpoint = type === 'folders' ? 'https://api.abyss.to/v1/folders' : 'https://api.abyss.to/v1/resources';
        console.log(`[SERVER ABYSS] Tertiary Fallback: Tentando endpoint ${tertiaryEndpoint}...`);
        response = await fetch(`${tertiaryEndpoint}?${params.toString()}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Accept': 'application/json'
          },
          signal: AbortSignal.timeout(10000)
        }).catch(() => null);
      }
    }

    if (!response || !response.ok) {
      const status = response ? response.status : 500;
      console.error(`[SERVER ABYSS] ❌ API do Abyss respondeu HTTP ${status}`);
      return res.status(status).json({
        success: false,
        error: 'API_ERROR',
        message: `A API do Abyss respondeu com o código HTTP ${status}`,
        results: [],
        rawResponse: null
      });
    }

    const data = await response.json();
    console.log('[SERVER ABYSS] ✅ Resposta da API do Abyss recebida com sucesso. Status HTTP:', response.status);

    // Função para extrair array de arquivos independente da estrutura de resposta
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

      // Varrer recursivamente
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
    console.log(`[SERVER ABYSS] Total de itens extraídos da resposta: ${items.length}`);

    return res.json({
      success: true,
      results: items,
      rawResponse: data,
      httpStatus: response.status,
      querySent: query.trim(),
      typeSent: type
    });
  } catch (err: any) {
    console.error('[SERVER ABYSS] ❌ Exceção ao comunicar com Abyss:', err.message || err);
    return res.status(500).json({
      success: false,
      error: 'NETWORK_ERROR',
      message: `Falha na conexão com o servidor Abyss: ${err.message || 'Erro de rede'}`,
      results: [],
      rawResponse: null
    });
  }
});

// 5. Integração Segura com API do Abyss (Registro)
app.post('/api/abyss/register', async (req, res) => {
  const { tmdbId, type, title, season, episode, apiKey: bodyApiKey } = req.body;
  const apiKey = bodyApiKey || process.env.ABYSS_API_KEY;

  console.log(`[ABYSS API] Solicitando registro para: ${title} (TMDB ID: ${tmdbId}, Tipo: ${type}, S: ${season}, E: ${episode})`);

  // Gerar ID determinístico para fallback robusto e seguro em caso de indisponibilidade externa
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

  if (apiKey && apiKey.trim() !== '' && apiKey !== 'YOUR_ABYSS_API_KEY') {
    try {
      // 1. Tentar buscar o arquivo pelo título na conta do Abyss
      // Nós buscamos por arquivos correspondentes utilizando o endpoint v1/files
      const searchUrl = new URL('https://api.abyss.to/v1/files');
      
      // Se for série, pesquisamos tanto o título completo com o episódio quanto o título limpo para filtrar depois
      const sStr = String(season || 1).padStart(2, '0');
      const eStr = String(episode || 1).padStart(2, '0');
      
      const searchQueries = type === 'series' 
        ? [`${title} S${sStr}E${eStr}`, `${title} ${season}x${eStr}`, `${title} ${season}x${episode}`, title]
        : [title];

      let foundFile: any = null;

      for (const query of searchQueries) {
        if (foundFile) break;

        const params = new URLSearchParams({
          key: apiKey,
          q: query,
          searchType: 'any',
          type: 'files',
          maxResults: '30'
        });
        
        const response = await fetch(`${searchUrl.origin}${searchUrl.pathname}?${params.toString()}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${apiKey}`
          },
          signal: AbortSignal.timeout(5000)
        });

        if (response.ok) {
          const resData = await response.json();
          const files = resData.data || resData.results || resData.files || (Array.isArray(resData) ? resData : []);
          
          if (files && files.length > 0) {
            if (type === 'series') {
              // Se for série, precisamos filtrar de forma inteligente para achar a temporada e episódio corretos
              const sNum = Number(season || 1);
              const epNum = Number(episode || 1);
              
              const sRegex1 = new RegExp(`s(?:eason)?\\.?\\s*0*${sNum}\\s*e(?:pisode)?\\.?\\s*0*${epNum}\\b`, 'i');
              const sRegex2 = new RegExp(`\\b0*${sNum}x0*${epNum}\\b`, 'i');
              const sRegex3 = new RegExp(`\\bep\\.?\\s*0*${epNum}\\b`, 'i'); // Caso o arquivo tenha só o ep num diretório da temporada

              foundFile = files.find((f: any) => {
                const name = f.name || f.title || '';
                return sRegex1.test(name) || sRegex2.test(name) || (name.toLowerCase().includes(title.toLowerCase()) && sRegex3.test(name));
              });

              // Fallback se não encontrar com filtros rígidos: pegar o primeiro resultado que mencione o ep ou temp
              if (!foundFile) {
                foundFile = files.find((f: any) => {
                  const name = (f.name || f.title || '').toLowerCase();
                  return name.includes(`e${eStr}`) || name.includes(`ep${eStr}`) || name.includes(`0*${epNum}`);
                });
              }
            } else {
              // Se for filme, pegar a melhor correspondência que contenha o título do filme
              foundFile = files.find((f: any) => {
                const name = (f.name || f.title || '').toLowerCase();
                return name.includes(title.toLowerCase());
              }) || files[0];
            }
          }
        }
      }

      if (foundFile) {
        console.log('[ABYSS API] Arquivo correspondente encontrado com sucesso:', foundFile);
        abyssId = foundFile.id || foundFile.fileId || foundFile.video_id || foundFile.videoId;
        embedUrl = `https://play.abyssplayer.com/${abyssId}`;
        status = foundFile.status || 'active';
        matchedFileName = foundFile.name || foundFile.title || '';
        usedRealAPI = true;
      } else {
        console.log('[ABYSS API] Nenhum arquivo correspondente encontrado na conta para:', title);
        
        // 2. Se for filme ou série e não houver arquivo específico, podemos tentar registrar como fallback
        // em um endpoint genérico de registro (v1/videos) caso o Abyss o possua
        const registerResponse = await fetch('https://api.abyss.to/v1/videos', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            title: title || `Video TMDB ${tmdbId}`,
            tmdb_id: tmdbId ? Number(tmdbId) : null,
            type: type === 'series' ? 'tv' : 'movie',
            season: season ? Number(season) : undefined,
            episode: episode ? Number(episode) : undefined,
            source: 'auto'
          }),
          signal: AbortSignal.timeout(5000)
        }).catch(() => null);

        if (registerResponse && registerResponse.ok) {
          const registerData = await registerResponse.json();
          if (registerData.id || registerData.video_id) {
            abyssId = registerData.id || registerData.video_id;
            embedUrl = `https://play.abyssplayer.com/${abyssId}`;
            status = registerData.status || 'active';
            usedRealAPI = true;
          }
        }
      }
    } catch (err: any) {
      console.error('[ABYSS API] Falha na conexão ou timeout:', err.message || err);
      apiError = err.message || String(err);
    }
  } else {
    console.log('[ABYSS API] Nenhuma chave de API configurada em ABYSS_API_KEY. Usando fallback automático.');
  }

  res.json({
    success: true,
    abyssId,
    embedUrl,
    status,
    usedRealAPI,
    apiError,
    matchedFileName,
    updatedAt: new Date().toISOString()
  });
});

// Alias handler para a Netlify Function no ambiente local
app.all('/.netlify/functions/abyss', (req, res) => {
  if (req.method === 'GET') {
    return app._router.handle({ ...req, url: '/api/abyss/resources', path: '/api/abyss/resources' }, res);
  } else if (req.method === 'POST') {
    return app._router.handle({ ...req, url: '/api/abyss/register', path: '/api/abyss/register' }, res);
  }
  res.status(405).json({ error: 'Method Not Allowed' });
});

app.get('/api/abyss/status/:abyssId', async (req, res) => {
  const { abyssId } = req.params;
  const apiKey = process.env.ABYSS_API_KEY;

  console.log(`[ABYSS API] Verificando status do ID: ${abyssId}`);

  let status = 'active';
  let usedRealAPI = false;
  let apiError = null;

  if (apiKey && apiKey.trim() !== '' && apiKey !== 'YOUR_ABYSS_API_KEY') {
    try {
      // Usar a URL oficial e documentada do Hydrax/Abyss para verificação de status
      const hydraxUrl = `https://api.hydrax.net/${apiKey}/slug/${abyssId}/status`;
      console.log(`[ABYSS API] Buscando status do Hydrax: ${hydraxUrl}`);
      
      const response = await fetch(hydraxUrl, {
        signal: AbortSignal.timeout(5000)
      });

      if (response.ok) {
        const data = await response.json();
        if (data && data.status === true) {
          if (data.msg === 'Ready' || data.msg === 'ready') {
            status = 'active';
          } else {
            status = data.msg ? data.msg.toLowerCase() : 'processing';
          }
        } else {
          status = 'failed';
        }
        usedRealAPI = true;
      } else {
        // Fallback para a API antiga da Abyss
        const altResponse = await fetch(`https://api.abyss.to/v1/videos/${abyssId}`, {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'X-API-Key': apiKey,
            'apikey': apiKey
          },
          signal: AbortSignal.timeout(5000)
        });
        
        if (altResponse.ok) {
          const data = await altResponse.json();
          status = data.status || 'active';
          usedRealAPI = true;
        } else {
          apiError = `Hydrax HTTP ${response.status}, Abyss HTTP ${altResponse.status}`;
        }
      }
    } catch (err: any) {
      apiError = err.message || String(err);
    }
  }

  res.json({
    success: true,
    abyssId,
    status,
    usedRealAPI,
    apiError
  });
});


// --- SISTEMA INTELIGENTE DE PARSING, ABYSS PLAYER API E TMDB AUTO-STREAM ---

const DEFAULT_ABYSS_KEY = 'b27bfc0a395f149c2749ddc33275b6ff';

function cleanTitle(title: string): string {
  const tags = [
    /\b1080p\b/i, /\b720p\b/i, /\b2160p\b/i, /\b4k\b/i,
    /\bweb-?dl\b/i, /\bbluray\b/i, /\bhdrip\b/i, /\bdvdrip\b/i,
    /\bx264\b/i, /\bh264\b/i, /\bhevc\b/i, /\bx265\b/i,
    /\bdual\b/i, /\baudio\b/i, /\bdublado\b/i, /\blegendado\b/i,
    /\bmulti\b/i, /\brip\b/i, /\byts\b/i, /\brgby\b/i,
    /\bhdr\b/i, /\b10bit\b/i, /\bmkv\b/i, /\bmp4\b/i, /\bavi\b/i,
    /\[.*?\]/g, /\(.*?\)/g
  ];
  let clean = title;
  for (const tag of tags) {
    clean = clean.replace(tag, ' ');
  }
  return clean.replace(/[\._\-]/g, ' ').replace(/\s+/g, ' ').trim();
}

function parseFilename(filename: string) {
  let nameWithoutExt = filename.replace(/\.(mkv|mp4|avi|webm|flv|mov|m4v)$/i, '');
  nameWithoutExt = nameWithoutExt.replace(/[\._\-]/g, ' ');

  // 1. Padrão de Série: S02E01, S2E1, Season 2 Episode 1, Temp 2 Ep 1
  const seriesRegex1 = /(.*?)\b(?:[sS](?:eason|temp|temporada)?\.?\s*0*(\d+))\s*(?:[eE](?:pisode|ep)?\.?\s*0*(\d+))\b/i;
  // 2. Padrão de Série: 02x01, 2x1
  const seriesRegex2 = /(.*?)\b0*(\d+)\s*x\s*0*(\d+)\b/i;
  // 3. Padrão de Série simples: EP01, Ep 1
  const seriesRegex3 = /(.*?)\b(?:[eE][pP]\.?\s*0*(\d+))\b/i;

  let match = nameWithoutExt.match(seriesRegex1);
  if (match) {
    return {
      type: 'series' as const,
      title: cleanTitle(match[1]),
      season: parseInt(match[2], 10) || 1,
      episode: parseInt(match[3], 10) || 1
    };
  }

  match = nameWithoutExt.match(seriesRegex2);
  if (match) {
    return {
      type: 'series' as const,
      title: cleanTitle(match[1]),
      season: parseInt(match[2], 10) || 1,
      episode: parseInt(match[3], 10) || 1
    };
  }

  match = nameWithoutExt.match(seriesRegex3);
  if (match) {
    return {
      type: 'series' as const,
      title: cleanTitle(match[1]),
      season: 1,
      episode: parseInt(match[2], 10) || 1
    };
  }

  // 4. Padrão de Filme com Ano (ex: Deadpool 3 (2026))
  const yearRegex = /(.*?)\b(19\d\d|20\d\d)\b/;
  match = nameWithoutExt.match(yearRegex);
  if (match) {
    return {
      type: 'movie' as const,
      title: cleanTitle(match[1]),
      year: parseInt(match[2], 10)
    };
  }

  // Fallback para Filme sem ano especificado
  return {
    type: 'movie' as const,
    title: cleanTitle(nameWithoutExt),
    year: new Date().getFullYear()
  };
}

async function fetchTMDBMetadata(parsed: any, tmdbKey?: string) {
  const apiKey = tmdbKey || '9ba478ffe785bbc34fa2b10c46296580';
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') return null;
  
  const query = encodeURIComponent(parsed.title);
  const isSeries = parsed.type === 'series';
  const searchEndpoint = isSeries ? 'search/tv' : 'search/movie';
  const searchUrl = `https://api.themoviedb.org/3/${searchEndpoint}?api_key=${apiKey}&query=${query}&language=pt-BR&include_adult=false`;
  
  try {
    let searchRes = await fetch(searchUrl, { signal: AbortSignal.timeout(5000) });
    let searchData = searchRes.ok ? await searchRes.json() : null;
    let results = searchData?.results || [];

    // Fallback para busca multi caso a busca específica não encontre
    if (results.length === 0) {
      const multiUrl = `https://api.themoviedb.org/3/search/multi?api_key=${apiKey}&query=${query}&language=pt-BR&include_adult=false`;
      const multiRes = await fetch(multiUrl, { signal: AbortSignal.timeout(5000) });
      if (multiRes.ok) {
        const multiData = await multiRes.json();
        results = multiData.results || [];
      }
    }
    
    if (results.length === 0) return null;

    const targetMediaType = isSeries ? 'tv' : 'movie';
    let bestResult = results.find((r: any) => r.media_type === targetMediaType) || results[0];
    const mediaType = bestResult.media_type || targetMediaType;

    const detailsUrl = `https://api.themoviedb.org/3/${mediaType}/${bestResult.id}?api_key=${apiKey}&language=pt-BR`;
    const detailsRes = await fetch(detailsUrl, { signal: AbortSignal.timeout(5000) });
    if (!detailsRes.ok) return null;
    
    const details = await detailsRes.json();
    
    const title = details.title || details.name || parsed.title;
    const description = details.overview || 'Sem descrição cadastrada no TMDB.';
    const posterUrl = details.poster_path 
      ? `https://image.tmdb.org/t/p/w780${details.poster_path}` 
      : 'https://image.tmdb.org/t/p/w780/8uO0gUMYrj5BNZ6Z9ZgWaS9Stj3.jpg';
    const backdropUrl = details.backdrop_path 
      ? `https://image.tmdb.org/t/p/original${details.backdrop_path}` 
      : 'https://image.tmdb.org/t/p/original/vKof7jZ50vS2pYgO569ofCidG9y.jpg';
    
    const dateStr = details.release_date || details.first_air_date || `${new Date().getFullYear()}-01-01`;
    const year = parseInt(dateStr.split('-')[0]) || parsed.year || new Date().getFullYear();
    
    let duration = '2h';
    if (mediaType === 'movie') {
      const runtime = details.runtime || 105;
      duration = `${Math.floor(runtime / 60)}h ${runtime % 60}m`;
    } else {
      const seasonsCount = details.number_of_seasons || 1;
      duration = `${seasonsCount} Temporada(s)`;
    }
    
    const category = details.genres && details.genres.length > 0 
      ? details.genres[0].name 
      : (isSeries ? 'Séries' : 'Lançamentos');
      
    const trailerResult = await findSmartTrailer(title, details.id, (mediaType === 'tv' || isSeries) ? 'series' : 'movie');

    return {
      title,
      description,
      posterUrl,
      backdropUrl,
      year,
      duration,
      type: (mediaType === 'tv' || isSeries) ? ('series' as const) : ('movie' as const),
      category,
      rating: Number((details.vote_average || 7.5).toFixed(1)),
      tmdbId: details.id,
      trailerUrl: trailerResult.trailerUrl,
      youtubeVideoId: trailerResult.videoId
    };
  } catch (err) {
    console.error('[TMDB] Erro de busca automática de metadados:', err);
    return null;
  }
}

// Função centralizada para sincronização automática com a conta do Abyss Player
async function syncAbyssWithDb(tmdbKey?: string) {
  const apiKey = (process.env.ABYSS_API_KEY && process.env.ABYSS_API_KEY !== 'YOUR_ABYSS_API_KEY')
    ? process.env.ABYSS_API_KEY
    : DEFAULT_ABYSS_KEY;

  console.log('[ABYSS ENGINE] Conectando à API do Abyss Player com chave configurada...');

  let files: any[] = [];
  let apiError: string | null = null;

  // Tentativa 1: Endpoint oficial de arquivos da Abyss API
  try {
    const searchUrl = new URL('https://api.abyss.to/v1/files');
    const params = new URLSearchParams({
      key: apiKey,
      searchType: 'any',
      type: 'files',
      maxResults: '200',
      orderBy: 'createdAt:desc'
    });

    const response = await fetch(`${searchUrl.origin}${searchUrl.pathname}?${params.toString()}`, {
      headers: { 'Authorization': `Bearer ${apiKey}`, 'X-API-Key': apiKey },
      signal: AbortSignal.timeout(8000)
    });

    if (response.ok) {
      const resData = await response.json();
      files = resData.data || resData.results || resData.files || (Array.isArray(resData) ? resData : []);
    } else {
      apiError = `HTTP ${response.status}`;
    }
  } catch (e: any) {
    apiError = e.message || String(e);
  }

  // Tentativa 2 (Fallback): Endpoint alternativo /v1/videos caso o primário retorne vazio ou falhe
  if (files.length === 0) {
    try {
      const altUrl = `https://api.abyss.to/v1/videos?key=${apiKey}`;
      const altRes = await fetch(altUrl, {
        headers: { 'Authorization': `Bearer ${apiKey}`, 'X-API-Key': apiKey },
        signal: AbortSignal.timeout(6000)
      });
      if (altRes.ok) {
        const altData = await altRes.json();
        files = altData.data || altData.results || altData.files || (Array.isArray(altData) ? altData : []);
      }
    } catch (e) {
      // Silencioso em fallback
    }
  }

  const currentDb = getDb();
  if (!currentDb.movies) currentDb.movies = [];

  let newlyAddedCount = 0;
  let updatedCount = 0;

  for (const file of files) {
    try {
      const fileId = file.id || file.fileId || file.slug || file.video_id || file.code;
      if (!fileId) continue;

      const rawName = file.name || file.title || file.filename || file.original_name || '';
      if (!rawName) continue;

      const embedUrl = file.embedUrl || file.embed_url || file.url || `https://abyssplayer.com/${fileId}`;
      const parsed = parseFilename(rawName);

      console.log(`[ABYSS AUTOMATION] Processando arquivo "${rawName}" -> Tipo: ${parsed.type}, Título: "${parsed.title}"`);

      // Busca metadados no TMDB para o título identificado
      const movieMetadata = await fetchTMDBMetadata(parsed, tmdbKey);

      if (parsed.type === 'series') {
        const targetTitleClean = (movieMetadata?.title || parsed.title).trim().toLowerCase();
        
        // Procura se a série já existe no catálogo do VHS Fix
        let seriesItem = currentDb.movies.find((m: any) => 
          m.type === 'series' && (
            (m.tmdbId && movieMetadata?.tmdbId && m.tmdbId === movieMetadata.tmdbId) ||
            m.title.trim().toLowerCase() === targetTitleClean
          )
        );

        const epKey = `${parsed.season}_${parsed.episode}`;

        if (seriesItem) {
          // Série já existe: atualiza episódios e temporadas automaticamente
          if (!seriesItem.episodeEmbeds) seriesItem.episodeEmbeds = {};
          if (!seriesItem.seasonsConfig) seriesItem.seasonsConfig = {};

          const isNewEp = !seriesItem.episodeEmbeds[epKey];
          seriesItem.episodeEmbeds[epKey] = embedUrl;
          seriesItem.seasonsConfig[parsed.season] = Math.max(
            seriesItem.seasonsConfig[parsed.season] || 0,
            parsed.episode
          );

          const totalSeasons = Object.keys(seriesItem.seasonsConfig).length;
          seriesItem.duration = `${totalSeasons} Temporada(s)`;

          if (!seriesItem.abyssId) seriesItem.abyssId = fileId;
          if (!seriesItem.abyssEmbedUrl) seriesItem.abyssEmbedUrl = embedUrl;
          seriesItem.updatedAt = new Date().toISOString();

          if (isNewEp) updatedCount++;
        } else {
          // Série não existe: cria cadastro novo completo com TMDB e primeiro episódio
          const seasonsConfig = { [parsed.season]: parsed.episode };
          const episodeEmbeds = { [epKey]: embedUrl };

          const newSeries = {
            id: `s_abyss_${movieMetadata?.tmdbId || parsed.title.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
            title: movieMetadata?.title || parsed.title,
            description: movieMetadata?.description || `Série ${parsed.title} cadastrada automaticamente pelo Abyss Player.`,
            backdropUrl: movieMetadata?.backdropUrl || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=1200&auto=format&fit=crop',
            posterUrl: movieMetadata?.posterUrl || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=720&auto=format&fit=crop',
            category: movieMetadata?.category || 'Séries',
            year: movieMetadata?.year || new Date().getFullYear(),
            duration: `1 Temporada(s)`,
            type: 'series' as const,
            rating: movieMetadata?.rating || 8.0,
            trailerUrl: movieMetadata?.trailerUrl || '',
            youtubeVideoId: movieMetadata?.youtubeVideoId || '',
            tmdbId: movieMetadata?.tmdbId,
            abyssId: fileId,
            abyssEmbedUrl: embedUrl,
            abyssStatus: file.status || 'active',
            seasonsConfig,
            episodeEmbeds,
            clicksCount: 0,
            votesLikes: 0,
            votesDislikes: 0,
            createdAt: new Date().toISOString()
          };

          currentDb.movies.unshift(newSeries);
          newlyAddedCount++;
        }
      } else {
        // Processamento de Filme
        const targetTitleClean = (movieMetadata?.title || parsed.title).trim().toLowerCase();
        let movieItem = currentDb.movies.find((m: any) =>
          m.type === 'movie' && (
            (m.abyssId && m.abyssId === fileId) ||
            (m.tmdbId && movieMetadata?.tmdbId && m.tmdbId === movieMetadata.tmdbId) ||
            m.title.trim().toLowerCase() === targetTitleClean
          )
        );

        if (movieItem) {
          movieItem.abyssId = fileId;
          movieItem.abyssEmbedUrl = embedUrl;
          movieItem.embedUrl = embedUrl;
          movieItem.abyssStatus = file.status || 'active';
          if (movieMetadata?.trailerUrl && (!movieItem.trailerUrl || movieItem.trailerUrl.includes('mqq_H30_u5Q'))) {
            movieItem.trailerUrl = movieMetadata.trailerUrl;
            movieItem.youtubeVideoId = movieMetadata.youtubeVideoId;
          }
          movieItem.updatedAt = new Date().toISOString();
          updatedCount++;
        } else {
          const newMovie = {
            id: `m_abyss_${fileId}`,
            title: movieMetadata?.title || parsed.title,
            description: movieMetadata?.description || `Filme ${parsed.title} sintonizado automaticamente da sua conta Abyss.`,
            posterUrl: movieMetadata?.posterUrl || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=720&auto=format&fit=crop',
            backdropUrl: movieMetadata?.backdropUrl || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=1200&auto=format&fit=crop',
            category: movieMetadata?.category || 'Lançamentos',
            year: movieMetadata?.year || parsed.year || new Date().getFullYear(),
            duration: movieMetadata?.duration || '1h 50m',
            type: 'movie' as const,
            rating: movieMetadata?.rating || 7.5,
            trailerUrl: movieMetadata?.trailerUrl || '',
            youtubeVideoId: movieMetadata?.youtubeVideoId || '',
            tmdbId: movieMetadata?.tmdbId,
            abyssId: fileId,
            abyssEmbedUrl: embedUrl,
            embedUrl: embedUrl,
            abyssStatus: file.status || 'active',
            clicksCount: 0,
            votesLikes: 0,
            votesDislikes: 0,
            createdAt: new Date().toISOString()
          };

          currentDb.movies.unshift(newMovie);
          newlyAddedCount++;
        }
      }
    } catch (err: any) {
      console.error(`[ABYSS AUTOMATION] Erro isolado ao processar arquivo "${file?.name || file?.id}":`, err?.message || err);
    }
  }

  saveDb(currentDb);

  return {
    success: true,
    movies: currentDb.movies,
    newlyAddedCount,
    updatedCount,
    totalFilesDetected: files.length,
    apiError
  };
}

// Endpoint de sincronização automática chamado pelo frontend ou admin
app.post('/api/abyss/sync', async (req, res) => {
  const { tmdbApiKey } = req.body || {};
  try {
    const result = await syncAbyssWithDb(tmdbApiKey);
    res.json(result);
  } catch (err: any) {
    console.error('[ABYSS SYNC ERROR]', err);
    res.status(500).json({
      success: false,
      message: `Erro na sincronização automatizada: ${err.message || String(err)}`
    });
  }
});

app.get('/api/abyss/sync', async (req, res) => {
  try {
    const result = await syncAbyssWithDb();
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, message: String(err) });
  }
});

// Execução de Sincronização Periódica Automática em segundo plano no servidor
setTimeout(() => {
  syncAbyssWithDb().catch(e => console.error('[AUTO ABYSS INIT SYNC ERROR]', e));
}, 3000);

setInterval(() => {
  syncAbyssWithDb().catch(e => console.error('[AUTO ABYSS INTERVAL SYNC ERROR]', e));
}, 60000);


async function startServer() {
  // Configuração do Vite middleware para desenvolvimento dinâmico e compilação
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[VHSFLIX SERVER] Ativo em http://0.0.0.0:${PORT}`);
  });
}

startServer();
