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
