import express from 'express';
import path from 'path';
import fs from 'fs';
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
      const response = await fetch(`https://api.abyss.to/v1/videos/${abyssId}`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'X-API-Key': apiKey,
          'apikey': apiKey
        },
        signal: AbortSignal.timeout(5000)
      });

      if (response.ok) {
        const data = await response.json();
        status = data.status || 'active';
        usedRealAPI = true;
      } else {
        apiError = `HTTP ${response.status}`;
      }
    } catch (err: any) {
      apiError = err.message;
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
