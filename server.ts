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

// 4. Integração Segura com API do Abyss
app.post('/api/abyss/register', async (req, res) => {
  const { tmdbId, type, title, season, episode } = req.body;
  const apiKey = process.env.ABYSS_API_KEY;

  console.log(`[ABYSS API] Solicitando registro para: ${title} (TMDB ID: ${tmdbId}, Tipo: ${type}, S: ${season}, E: ${episode})`);

  // Gerar ID determinístico para fallback robusto e seguro em caso de indisponibilidade externa
  let cleanId = '';
  if (type === 'series') {
    cleanId = `series-${tmdbId || '1396'}-${season || 1}-${episode || 1}`;
  } else {
    cleanId = `movie-${tmdbId || '105'}`;
  }

  let abyssId = cleanId;
  let embedUrl = `https://abyssplayer.com/${abyssId}`;
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
        embedUrl = foundFile.embedUrl || foundFile.embed_url || `https://abyssplayer.com/${abyssId}`;
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
            embedUrl = registerData.embed_url || `https://abyssplayer.com/${abyssId}`;
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
      tmdbId: details.id
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
          trailerUrl: '',
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
          trailerUrl: '',
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
      server: { middlewareMode: true },
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
