/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Movie, Profile, User } from './types';
import { fetchApi } from './lib/apiClient';

export const PROFILE_AVATARS = [
  { id: 'av1', name: 'Retro Punk', url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80', color: 'border-rose-500 text-rose-500' },
  { id: 'av2', name: 'Cyber Wave', url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80', color: 'border-cyan-400 text-cyan-400' },
  { id: 'av3', name: 'VHS Collector', url: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?auto=format&fit=crop&w=150&q=80', color: 'border-purple-500 text-purple-500' },
  { id: 'av4', name: '90s Gamer', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80', color: 'border-yellow-400 text-yellow-400' },
  { id: 'av5', name: 'Neon Driver', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80', color: 'border-green-400 text-green-400' },
];

export const INITIAL_MOVIES: Movie[] = [
  {
    id: 'm_2026_1',
    title: 'The Batman: Parte II',
    description: 'No segundo capítulo da saga do Cavaleiro das Trevas dirigida por Matt Reeves, Bruce Wayne se aprofunda ainda mais no submundo corrupto e gótico de Gotham City, enfrentando novas ameaças que testam sua integridade e mente investigativa.',
    posterUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=780&q=80',
    backdropUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80',
    category: 'Ação',
    year: 2026,
    duration: '2h 45m',
    type: 'movie',
    rating: 8.9,
    trailerUrl: 'https://www.youtube.com/embed/mqq_H30_u5Q',
    isFeatured: true,
    vhsTapeColor: '#1c1917', // Dark Stone
    tmdbId: 414906
  },
  {
    id: 'm_2026_2',
    title: 'Stranger Things: Temporada Final (5)',
    description: 'A épica conclusão da saga dos anos 80 em Hawkins. Eleven, Mike e toda a turma precisam unir forças em uma batalha derradeira contra o mundo invertido e o terrível vilão Vecna, para fechar de vez o portal e salvar o mundo.',
    posterUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=780&q=80',
    backdropUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1200&q=80',
    category: 'Suspense',
    year: 2026,
    duration: '5ª Temporada',
    type: 'series',
    rating: 9.1,
    trailerUrl: 'https://www.youtube.com/embed/b9EkMc79ZSU',
    isFeatured: true,
    vhsTapeColor: '#e11d48', // Crimson Red
    tmdbId: 66732
  },
  {
    id: 'm_2026_3',
    title: 'Avatar: Fogo e Cinzas',
    description: 'Jake Sully e Neytiri enfrentam uma nova tribo Na\'vi ameaçadora e vulcânica em Pandora: o Povo das Cinzas. Determinados a manter a paz e proteger seu ecossistema, eles precisam forjar perigosas alianças contra novos inimigos.',
    posterUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=780&q=80',
    backdropUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=1200&q=80',
    category: 'Ficção Científica',
    year: 2026,
    duration: '2h 35m',
    type: 'movie',
    rating: 8.4,
    trailerUrl: 'https://www.youtube.com/embed/CRRlbK5w8AE',
    isFeatured: false,
    vhsTapeColor: '#2563eb', // Indigo Blue
    tmdbId: 83533
  },
  {
    id: 'm_gran_1',
    title: 'Como Ganhar Milhões Antes Que a Avó Morra',
    description: 'M desiste de sua carreira para cuidar de sua avó doente terminal, motivado pelo desejo de receber sua herança multimilionária. No entanto, o tempo que passa ao lado dela o força a reconsiderar suas reais intenções e valores familiares.',
    posterUrl: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=780&q=80',
    backdropUrl: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=1200&q=80',
    category: 'Drama',
    year: 2024,
    duration: '2h 07m',
    type: 'movie',
    rating: 8.3,
    trailerUrl: 'https://www.youtube.com/embed/S2gXv2dM5Lg',
    isFeatured: true,
    vhsTapeColor: '#eab308', // Yellow
    tmdbId: 1103621
  },
  {
    id: 'm1',
    title: 'De Volta para o Futuro',
    description: 'Marty McFly, um adolescente típico dos anos 80, é acidentalmente enviado de volta a 1955 em uma máquina do tempo construída pelo excêntrico cientista Doc Brown. Para voltar, ele precisa fazer com que seus futuros pais se apaixonem.',
    posterUrl: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=780&q=80',
    backdropUrl: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1200&q=80',
    category: 'Ficção Científica',
    year: 1985,
    duration: '1h 56m',
    type: 'movie',
    rating: 8.5,
    trailerUrl: 'https://www.youtube.com/embed/qvsgGtIvCBY',
    isFeatured: true,
    vhsTapeColor: '#e11d48', // Rose/Red
    tmdbId: 105
  },
  {
    id: 'm2',
    title: 'O Exterminador do Futuro 2: O Julgamento Final',
    description: 'Um ciborgue idêntico ao que tentou matar Sarah Connor é programado para proteger seu filho rebelde, John Connor, de um modelo ainda mais avançado e letal, o T-1000, enviado para eliminá-lo.',
    posterUrl: 'https://images.unsplash.com/photo-1563089145-599997674d42?auto=format&fit=crop&w=780&q=80',
    backdropUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80',
    category: 'Ação',
    year: 1991,
    duration: '2h 17m',
    type: 'movie',
    rating: 8.6,
    trailerUrl: 'https://www.youtube.com/embed/CRRlbK5w8AE',
    vhsTapeColor: '#2563eb', // Blue
    tmdbId: 280
  },
  {
    id: 'm3',
    title: 'Blade Runner: O Caçador de Androides',
    description: 'No século XXI, um ex-policial de elite reincorporado à ativa tem como missão rastrear e eliminar quatro replicantes fugitivos que roubaram uma nave espacial e retornaram à Terra para prolongar suas vidas de apenas quatro anos.',
    posterUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=780&q=80',
    backdropUrl: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=1200&q=80',
    category: 'Ficção Científica',
    year: 1982,
    duration: '1h 57m',
    type: 'movie',
    rating: 8.1,
    trailerUrl: 'https://www.youtube.com/embed/gCcx85zbxz4',
    vhsTapeColor: '#9333ea', // Purple
    tmdbId: 78
  },
  {
    id: 'm4',
    title: 'Stranger Things',
    description: 'Quando um garoto desaparece sob circunstâncias misteriosas, uma pequena cidade descobre mistérios envolvendo experimentos governamentais secretos, forças sobrenaturais aterrorizantes e uma garotinha muito estranha com poderes telecinéticos.',
    posterUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=780&q=80',
    backdropUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1200&q=80',
    category: 'Suspense',
    year: 2016,
    duration: '4 Temporadas',
    type: 'series',
    rating: 8.7,
    trailerUrl: 'https://www.youtube.com/embed/b9EkMc79ZSU',
    vhsTapeColor: '#16a34a', // Green
    tmdbId: 66732
  },
  {
    id: 'm5',
    title: 'The Matrix',
    description: 'Um jovem programador descobre que o mundo em que vive é na verdade uma simulação de realidade virtual criada por máquinas inteligentes que se alimentam da energia bioelétrica da humanidade presa em casulos.',
    posterUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=780&q=80',
    backdropUrl: 'https://images.unsplash.com/photo-1563089145-599997674d42?auto=format&fit=crop&w=1200&q=80',
    category: 'Ficção Científica',
    year: 1999,
    duration: '2h 16m',
    type: 'movie',
    rating: 8.7,
    trailerUrl: 'https://www.youtube.com/embed/vKQi3bBA1y8',
    vhsTapeColor: '#059669', // Emerald Green
    tmdbId: 603
  },
  {
    id: 'm6',
    title: 'Alien, o Oitavo Passageiro',
    description: 'A tripulação da nave cargueira Nostromo atende a um pedido de socorro vindo de um asteroide isolado, apenas para descobrir que lá habita uma criatura biológica biomecânica mortal cujo único instinto é a sobrevivência e a proliferação.',
    posterUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=780&q=80',
    backdropUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=1200&q=80',
    category: 'Terror',
    year: 1979,
    duration: '1h 57m',
    type: 'movie',
    rating: 8.1,
    trailerUrl: 'https://www.youtube.com/embed/jQ5lWy9wS6Y',
    vhsTapeColor: '#171717', // Black
    tmdbId: 348
  },
  {
    id: 'm7',
    title: 'Akira',
    description: 'Em 2019, na megalópole futurista Neo-Tokyo reconstruída por cima das ruínas da Terceira Guerra Mundial, Kaneda lidera sua gangue de motoqueiros enquanto tenta resgatar seu amigo Tetsuo, que desperta perigosos poderes psíquicos monstruosos após um acidente militar.',
    posterUrl: 'https://images.unsplash.com/photo-1563089145-599997674d42?auto=format&fit=crop&w=780&q=80',
    backdropUrl: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=1200&q=80',
    category: 'Ação',
    year: 1988,
    duration: '2h 4m',
    type: 'movie',
    rating: 8.0,
    trailerUrl: 'https://www.youtube.com/embed/ftke1u6a3bE',
    vhsTapeColor: '#dc2626', // Red
    tmdbId: 149
  },
  {
    id: 'm8',
    title: 'Brinquedo Assassino',
    description: 'Uma mãe solteira dá ao seu filho um cobiçado boneco de aniversário, sem saber que o brinquedo está possuído pela alma maligna de Charles Lee Ray, um notório assassino em série que usa o boneco para continuar seus crimes.',
    posterUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=780&q=80',
    backdropUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80',
    category: 'Terror',
    year: 1988,
    duration: '1h 27m',
    type: 'movie',
    rating: 6.6,
    trailerUrl: 'https://www.youtube.com/embed/8I9p4L_A0-I',
    vhsTapeColor: '#dc2626', // Bright Red
    tmdbId: 10585
  },
  {
    id: 'm9',
    title: 'Os Caça-Fantasmas',
    description: 'Três cientistas desempregados da Columbia University decidem montar um extravagante serviço profissional de remoção e contenção de assombrações paranormales na ensolarada e caótica cidade de Nova York.',
    posterUrl: 'https://images.unsplash.com/photo-1514533450685-4493e01d1fdc?auto=format&fit=crop&w=780&q=80',
    backdropUrl: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=1200&q=80',
    category: 'Comédia',
    year: 1984,
    duration: '1h 45m',
    type: 'movie',
    rating: 7.8,
    trailerUrl: 'https://www.youtube.com/embed/weasb_575U0',
    vhsTapeColor: '#ca8a04', // Yellow
    tmdbId: 620
  },
  {
    id: 'm10',
    title: 'The Chosen',
    description: 'Uma visão inovadora e intimista sobre os acontecimentos históricos da vida de Jesus de Nazaré, vista através dos olhos daqueles que O conheceram de perto: pescadores endividados, coletores de impostos rejeitados, e mulheres com o coração angustiado.',
    posterUrl: 'https://images.unsplash.com/photo-1504052434569-70ad5836ab65?auto=format&fit=crop&w=780&q=80',
    backdropUrl: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=1200&q=80',
    category: 'Cristão',
    year: 2019,
    duration: '4 Temporadas',
    type: 'series',
    rating: 9.3,
    trailerUrl: 'https://www.youtube.com/embed/SshM_IkaV24',
    vhsTapeColor: '#0ea5e9', // Blue Sky
    tmdbId: 97186
  },
  {
    id: 'm11',
    title: 'À Prova de Fogo',
    description: 'No trabalho cotidiano, Caleb Holt é um heróico capitão do corpo de bombeiros que cumpre com excelência o lema de nunca deixar um companheiro para trás. Porém, em sua própria casa, ele vê seu casamento de sete anos ruir e as cinzas da indiferença tomarem conta de sua relação.',
    posterUrl: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=780&q=80',
    backdropUrl: 'https://images.unsplash.com/photo-1475503572774-15a45e5d60b9?auto=format&fit=crop&w=1200&q=80',
    category: 'Cristão',
    year: 2008,
    duration: '2h 2m',
    type: 'movie',
    rating: 7.7,
    trailerUrl: 'https://www.youtube.com/embed/gZ9s4aofqK8',
    vhsTapeColor: '#dc2626', // Red
    tmdbId: 14574
  },
  {
    id: 'm12',
    title: 'Quarto de Guerra',
    description: 'Elizabeth e Tony Jordan parecem ter o casamento e a família exemplares na vizinhança. No entanto, por trás das portas fechadas, suas vidas são marcadas por um estresse constante e um distanciamento perigoso. Elizabeth conhece uma cliente idosa sábia que a desafia a criar uma estratégia de oração intensa em um closet vazio de sua casa.',
    posterUrl: 'https://images.unsplash.com/photo-1475503572774-15a45e5d60b9?auto=format&fit=crop&w=780&q=80',
    backdropUrl: 'https://images.unsplash.com/photo-1504052434569-70ad5836ab65?auto=format&fit=crop&w=1200&q=80',
    category: 'Cristão',
    year: 2015,
    duration: '2h 0m',
    type: 'movie',
    rating: 7.5,
    trailerUrl: 'https://www.youtube.com/embed/Wb1MreR3b_M',
    vhsTapeColor: '#16a34a', // Green
    tmdbId: 308505
  },
  {
    id: 'm13',
    title: 'Depois Daquele Ano',
    description: 'Depois Daquele Ano, de Carley Fortune, é um romance nostálgico sobre primeiros amores e sobre as pessoas e escolhas que nos marcam para sempre.',
    posterUrl: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=780&q=80',
    backdropUrl: 'https://images.unsplash.com/photo-1475503572774-15a45e5d60b9?auto=format&fit=crop&w=1200&q=80',
    category: 'Romance',
    year: 2026,
    duration: '1 Temporada',
    type: 'series',
    rating: 8.8,
    trailerUrl: 'https://www.youtube.com/embed/CRRlbK5w8AE',
    vhsTapeColor: '#e11d48', // Red
    tmdbId: 215151
  },
  {
    id: 'm14',
    title: 'Solo Leveling (Arise)',
    description: 'Em um mundo onde caçadores humanos enfrentam monstros mortais para proteger a humanidade, o caçador mais fraco Sung Jinwoo ganha uma habilidade única que lhe permite subir de nível sem limites.',
    posterUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=780&q=80',
    backdropUrl: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=1200&q=80',
    category: 'Animes',
    year: 2026,
    duration: '2 Temporadas',
    type: 'series',
    rating: 9.6,
    trailerUrl: 'https://www.youtube.com/embed/S_I9_7E2K80',
    vhsTapeColor: '#8b5cf6', // Purple
    tmdbId: 214999
  }
];

export const INITIAL_USERS: User[] = [
  {
    id: 'u1',
    name: 'Rafael Gusmão',
    email: 'rafaelguaruja09@gmail.com',
    password: '19112016',
    isAdmin: true,
    createdAt: '2026-05-10T12:00:00Z',
  },
  {
    id: 'u2',
    name: 'Ana Maria',
    email: 'usuario@streamflix.cor',
    password: 'user',
    isAdmin: false,
    createdAt: '2026-05-15T15:30:00Z',
  },
  {
    id: 'u3',
    name: 'Carlos VHS Collector',
    email: 'carlos@retro.com',
    password: 'user',
    isAdmin: false,
    createdAt: '2026-05-18T18:45:00Z',
  }
];

export const DEFAULT_PROFILES: { [userId: string]: Profile[] } = {
  'u1': [
    {
      id: 'p1_1',
      name: 'Rafael (Admin)',
      avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
      myList: ['m1', 'm3', 'm4'],
      watchHistory: {
        'm1': { movieId: 'm1', progress: 45, currentTime: 3132, duration: 6960, updatedAt: '2026-05-29T10:00:00Z', isFinished: false },
        'm2': { movieId: 'm22', progress: 100, currentTime: 8220, duration: 8220, updatedAt: '2026-05-28T14:20:00Z', isFinished: true }
      }
    }
  ],
  'u2': [
    {
      id: 'p2_1',
      name: 'Ana Main',
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80',
      myList: ['m2', 'm4'],
      watchHistory: {
        'm4': { movieId: 'm4', progress: 85, currentTime: 2550, duration: 3000, updatedAt: '2026-05-29T11:00:00Z', isFinished: false }
      }
    }
  ],
  'u3': [
    {
      id: 'p3_1',
      name: 'Carlos VHS',
      avatarUrl: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?auto=format&fit=crop&w=150&q=80',
      myList: ['m5', 'm6', 'm7'],
      watchHistory: {}
    }
  ]
};

// CATEGORIES definidos de forma robusta e estilosa para a navegação de gênero
export const GENRE_CATEGORIES = [
  'Todos',
  'Melhores Avaliações',
  'Ação',
  'Animes',
  'Aventura',
  'Terror',
  'Suspense',
  'Drama',
  'Comédia',
  'Ficção Científica',
  'Cristão',
  'Séries',
  'Reality',
  'Documentário',
  'Animação',
  'Fantasia',
  'Crime',
  'Musical',
  'Guerra',
  'Faroeste',
  'Romance'
];

/**
 * Função simuladora de Busca do TMDB para quando o usuário ESTÁ sem chave de API
 * permitindo testar facilmente e visualizar resultados fantásticos.
 */
export async function fallbackTMDBSearch(query: string): Promise<any[]> {
  const normalizedQuery = query.toLowerCase();
  
  // Banco estendido de títulos que simula o TMDB perfeitamente
  const mockTMDBDatabase = [
    {
      id: 200,
      title: 'Blade Runner 2049',
      overview: 'Trinta anos após os acontecimentos do primeiro filme, a descoberta de um segredo enterrado há muito tempo leva o novo caçador de replicantes da polícia de Los Angeles, K, a procurar o ex-caçador de replicantes Rick Deckard.',
      release_date: '2017-10-04',
      poster_path: '/gajva260Yvdf6vSgS769v6ZkS6B.jpg',
      backdrop_path: '/ilR6g79YgcnXasgOfhqq9Xv60fG.jpg',
      vote_average: 8.2,
      duration_min: 164,
      genres: ['Ficção Científica', 'Ação'],
      trailerId: 'gCcx85zbxz4'
    },
    {
      id: 201,
      title: 'RoboCop: O Policial do Futuro',
      overview: 'Em uma Detroit distópica e violenta, um policial honesto é brutalmente assassinado por criminosos e ressuscitado por uma megacorporação como uma cibercrime máquina indestrutível de aplicação da lei.',
      release_date: '1987-07-17',
      poster_path: '/g3M0R7jVWhZ9ZgSuSMNkaIsK6e0.jpg',
      backdrop_path: '/u6A5S3R6cbeMAn9kPjH6C8x6yoA.jpg',
      vote_average: 7.3,
      duration_min: 102,
      genres: ['Ação', 'Ficção Científica'],
      trailerId: '6tC_5bp1S6Y'
    },
    {
      id: 202,
      title: 'O Enigma de Outro Mundo',
      overview: 'Na Antártica, cientistas americanos de uma estação remota se deparam com um parasita alienígena metamórfico mortal capaz de imitar perfeitamente qualquer ser vivo que consome, gerando paranoia extrema e terror corporal.',
      release_date: '1982-06-25',
      poster_path: '/6v8yNlId7Z0fHInx3m6LPh8p1S.jpg',
      backdrop_path: '/3SFr9Q39hL9tC1fAsR3W4FqCjX8.jpg',
      vote_average: 8.0,
      duration_min: 109,
      genres: ['Terror', 'Ficção Científica'],
      trailerId: '5gK3fAn98lG'
    },
    {
      id: 203,
      title: 'Indiana Jones: Caçadores da Arca Perdida',
      overview: 'O arqueólogo e aventureiro Indiana Jones é contratado pelo governo dos EUA para localizar a lendária Arca da Aliança antes que os nazistas usem suas misteriosas forças cósmicas para dominar o planeta.',
      release_date: '1981-06-12',
      poster_path: '/8uO0gUMYrj5BNZ6Z9ZgWaS9Stj3.jpg',
      backdrop_path: '/vKof7jZ50vS2pYgO569ofCidG9y.jpg',
      vote_average: 8.4,
      duration_min: 115,
      genres: ['Ação', 'Ficção Científica'],
      trailerId: 'qvsgGtIvCBY'
    },
    {
      id: 204,
      title: 'Gremlins',
      overview: 'Um jovem descobre que seu novo, fofo e exótico bicho de estimação místico vem com três regras fundamentais de cuidado: nunca expô-lo à luz forte, nunca molhá-lo de forma alguma, e o mais crucial de tudo: nunca alimentá-lo após a meia-noite.',
      release_date: '1984-06-08',
      poster_path: '/b0Y6209qN8Hqg9I3XmSkaIsK6e0.jpg',
      backdrop_path: '/3N8pG8cbeMAn9kPjH6C8x6yof88.jpg',
      vote_average: 7.1,
      duration_min: 106,
      genres: ['Comédia', 'Terror'],
      trailerId: 'weasb_575U0'
    }
  ];

  if (!query) return mockTMDBDatabase;

  return mockTMDBDatabase.filter(
    m => m.title.toLowerCase().includes(normalizedQuery) || 
         m.overview.toLowerCase().includes(normalizedQuery) ||
         m.genres.some(g => g.toLowerCase().includes(normalizedQuery))
  );
}

/**
 * Busca Real de filmes no TMDB usando API.
 * Se falhar ou estiver sem chave, retorna uma busca simulada inteligente.
 */
export async function searchMoviesTMDB(query: string, apiKey: string): Promise<any[]> {
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey.trim() === '') {
    return fallbackTMDBSearch(query);
  }

  try {
    const url = `https://api.themoviedb.org/3/search/multi?api_key=${encodeURIComponent(apiKey)}&query=${encodeURIComponent(query)}&language=pt-BR&include_adult=false`;
    const res = await fetchApi(url);
    if (!res.ok || !res.data) {
      throw new Error('Chave TMDB inválida ou limite excedido, usando fallback embutido.');
    }
    const data = res.data;
    return (data.results || []).filter((item: any) => item.media_type === 'movie' || item.media_type === 'tv');
  } catch (err) {
    console.warn('Erro ao conectar com a API do TMDB. Usando banco simulado.', err);
    return fallbackTMDBSearch(query);
  }
}

/**
 * Detalhes de um filme no TMDB para preenchimento de formulário admin.
 */
export async function getMovieDetailsTMDB(id: number, type: 'movie' | 'tv', apiKey: string): Promise<Partial<Movie> | null> {
  const mediaType = type === 'tv' ? 'tv' : 'movie';
  
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey.trim() === '') {
    // Busca simulada do fallback
    const mockDb = await fallbackTMDBSearch('');
    const found = mockDb.find(m => m.id === id);
    if (found) {
      return {
        title: found.title,
        description: found.overview,
        posterUrl: `https://image.tmdb.org/t/p/w780${found.poster_path}`,
        backdropUrl: `https://image.tmdb.org/t/p/original${found.backdrop_path}`,
        year: parseInt(found.release_date.split('-')[0]) || 1980,
        duration: found.duration_min ? `${Math.floor(found.duration_min / 60)}h ${found.duration_min % 60}m` : '1h 45m',
        type: 'movie',
        category: found.genres[0],
        rating: found.vote_average,
        trailerUrl: `https://www.youtube.com/embed/${found.trailerId}`,
        tmdbId: found.id
      };
    }
    
    // Retorna mock randômico caso não ache
    return {
      title: 'Filme Retro Importado #' + id,
      description: 'Uma obra prima dos anos dourados simulada, cheia de ação, suspense, fitas em rolo e sintetizadores vibrantes que revivem o melhor das fitas de videocassete da nossa infância.',
      posterUrl: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=780&q=80',
      backdropUrl: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1200&q=80',
      year: 1989,
      duration: '1h 50m',
      type: 'movie',
      category: 'Ação',
      rating: 7.9,
      trailerUrl: 'https://www.youtube.com/embed/qvsgGtIvCBY',
      tmdbId: id
    };
  }

  try {
    const url = `https://api.themoviedb.org/3/${mediaType}/${id}?api_key=${encodeURIComponent(apiKey)}&language=pt-BR&append_to_response=videos`;
    const res = await fetchApi(url);
    if (!res.ok || !res.data) throw new Error('Não foi possível obter detalhes do TMDB');
    const data = res.data;
    
    const title = data.title || data.name || 'Título Sem Nome';
    const description = data.overview || 'Sem descrição cadastrada.';
    const posterUrl = data.poster_path ? `https://image.tmdb.org/t/p/w780${data.poster_path}` : 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=780&q=80';
    const backdropUrl = data.backdrop_path ? `https://image.tmdb.org/t/p/original${data.backdrop_path}` : (data.poster_path ? `https://image.tmdb.org/t/p/w780${data.poster_path}` : 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1200&q=80');
    
    const dateStr = data.release_date || data.first_air_date || '1990-01-01';
    const year = parseInt(dateStr.split('-')[0]) || 1990;
    
    let duration = '2h';
    const seasonsConfig: { [seasonNumber: number]: number } = {};

    if (mediaType === 'movie') {
      const runtime = data.runtime || 120;
      duration = `${Math.floor(runtime / 60)}h ${runtime % 60}m`;
    } else {
      if (Array.isArray(data.seasons) && data.seasons.length > 0) {
        for (const sObj of data.seasons) {
          if (sObj && typeof sObj === 'object') {
            const seasonNum = typeof sObj.season_number === 'number' ? sObj.season_number : parseInt(sObj.season_number);
            const epCount = typeof sObj.episode_count === 'number' ? sObj.episode_count : parseInt(sObj.episode_count);
            // Considerar apenas temporadas regulares (season_number > 0) com pelo menos 1 episódio
            if (!isNaN(seasonNum) && seasonNum > 0 && !isNaN(epCount) && epCount > 0) {
              seasonsConfig[seasonNum] = epCount;
            }
          }
        }
      }

      // Fallback caso seasons estivesse ausente na resposta
      if (Object.keys(seasonsConfig).length === 0) {
        const numSeasons = data.number_of_seasons || 1;
        for (let s = 1; s <= numSeasons; s++) {
          seasonsConfig[s] = 10;
        }
      }

      const totalSeasons = Object.keys(seasonsConfig).length;
      duration = `${totalSeasons} Temporada${totalSeasons > 1 ? 's' : ''}`;
    }

    // Achar um trailer do youtube relevante no retorno
    let trailerKey = 'qvsgGtIvCBY'; // default
    if (data.videos && data.videos.results) {
      const youtubeTrailer = data.videos.results.find(
        (v: any) => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser')
      );
      if (youtubeTrailer) {
        trailerKey = youtubeTrailer.key;
      }
    }

    // Encontrar ou mapear categoria com base nos gêneros do TMDB de forma inteligente
    const TMDB_GENRE_MAP: { [key: number]: string } = {
      28: 'Ação',
      12: 'Aventura',
      16: 'Animação',
      35: 'Comédia',
      80: 'Crime',
      99: 'Documentário',
      18: 'Drama',
      10751: 'Comédia', // Família redirecionado para Comédia/Aventura/Animação
      14: 'Fantasia',
      36: 'Drama',
      27: 'Terror',
      10402: 'Musical',
      9648: 'Suspense',
      53: 'Suspense',
      10749: 'Romance',
      878: 'Ficção Científica',
      10752: 'Guerra',
      37: 'Faroeste',
      10759: 'Ação',
      10762: 'Animação', // Kids/Infantil -> Animação
      10764: 'Reality',
      10765: 'Ficção Científica',
      10766: 'Drama',
      10767: 'Reality',
      10768: 'Guerra'
    };

    let resolvedCategory = mediaType === 'tv' ? 'Séries' : 'Ação';

    // Verificar se é Animação/Desenho/Disney/Pixar/Anime (Regra Estreita: Sempre categoria "Animação")
    const lowerTitle = title.toLowerCase();
    const lowerDesc = description.toLowerCase();
    const hasAnimationGenre = data.genres && data.genres.some((g: any) => g.id === 16 || g.id === 10762 || (g.name && (g.name.toLowerCase().includes('anim') || g.name.toLowerCase().includes('kid') || g.name.toLowerCase().includes('desenho'))));
    const isAnimationKeyword = 
      lowerTitle.includes('disney') ||
      lowerTitle.includes('pixar') ||
      lowerTitle.includes('desenho') ||
      lowerTitle.includes('animação') ||
      lowerTitle.includes('animado') ||
      lowerTitle.includes('anime') ||
      lowerTitle.includes('cartoon') ||
      lowerDesc.includes('animação') ||
      lowerDesc.includes('desenho animado') ||
      lowerDesc.includes('estúdio ghibli') ||
      lowerDesc.includes('pixar') ||
      lowerDesc.includes('walt disney');

    const isAnimeKeyword = 
      lowerTitle.includes('anime') ||
      lowerDesc.includes('anime') ||
      lowerTitle.includes('dragon ball') ||
      lowerTitle.includes('naruto') ||
      lowerTitle.includes('one piece') ||
      lowerTitle.includes('attack on titan') ||
      lowerTitle.includes('shingeki') ||
      lowerTitle.includes('demon slayer') ||
      lowerTitle.includes('jujutsu') ||
      lowerTitle.includes('bleach') ||
      lowerTitle.includes('solo leveling') ||
      lowerTitle.includes('my hero academia') ||
      lowerDesc.includes('estúdio ghibli') ||
      lowerDesc.includes('mangá');

    if (isAnimeKeyword) {
      resolvedCategory = 'Animes';
    } else if (hasAnimationGenre || isAnimationKeyword) {
      resolvedCategory = 'Animação';
    } else if (data.genres && data.genres.length > 0) {
      const tmdbGenreId = data.genres[0].id;
      if (TMDB_GENRE_MAP[tmdbGenreId]) {
        resolvedCategory = TMDB_GENRE_MAP[tmdbGenreId];
      } else {
        const firstGenreName = data.genres[0].name ? data.genres[0].name.toLowerCase() : '';
        if (firstGenreName.includes('reality') || firstGenreName.includes('television') || firstGenreName.includes('tv show')) {
          resolvedCategory = 'Reality';
        } else if (firstGenreName.includes('document')) {
          resolvedCategory = 'Documentário';
        } else if (firstGenreName.includes('anima') || firstGenreName.includes('desenho') || firstGenreName.includes('kid')) {
          resolvedCategory = 'Animação';
        } else if (firstGenreName.includes('fam')) {
          resolvedCategory = 'Comédia';
        } else if (firstGenreName.includes('fantas')) {
          resolvedCategory = 'Fantasia';
        } else if (firstGenreName.includes('crim')) {
          resolvedCategory = 'Crime';
        } else if (firstGenreName.includes('mus')) {
          resolvedCategory = 'Musical';
        } else if (firstGenreName.includes('war') || firstGenreName.includes('guer')) {
          resolvedCategory = 'Guerra';
        } else if (firstGenreName.includes('west') || firstGenreName.includes('faro')) {
          resolvedCategory = 'Faroeste';
        } else if (firstGenreName.includes('rom')) {
          resolvedCategory = 'Romance';
        } else if (firstGenreName.includes('christ') || firstGenreName.includes('crist')) {
          resolvedCategory = 'Cristão';
        } else if (firstGenreName.includes('science') || firstGenreName.includes('ficç')) {
          resolvedCategory = 'Ficção Científica';
        } else if (firstGenreName.includes('com')) {
          resolvedCategory = 'Comédia';
        } else if (firstGenreName.includes('dr')) {
          resolvedCategory = 'Drama';
        } else if (firstGenreName.includes('thrill') || firstGenreName.includes('susp') || firstGenreName.includes('myst')) {
          resolvedCategory = 'Suspense';
        } else if (firstGenreName.includes('horr') || firstGenreName.includes('terr')) {
          resolvedCategory = 'Terror';
        } else if (firstGenreName.includes('adv') || firstGenreName.includes('aven')) {
          resolvedCategory = 'Aventura';
        }
      }
    }

    const ratingVal = Number((data.vote_average || 7.5).toFixed(1));
    const tmdbVoteCount = data.vote_count || 1250;
    const votesLikes = Math.round((ratingVal / 10) * tmdbVoteCount);
    const votesDislikes = Math.round(((10 - ratingVal) / 10) * tmdbVoteCount * 0.25);

    return {
      title,
      description,
      posterUrl,
      backdropUrl,
      year,
      duration,
      type: mediaType === 'tv' ? 'series' : 'movie',
      category: resolvedCategory,
      rating: ratingVal,
      tmdbVoteCount,
      votesLikes,
      votesDislikes,
      trailerUrl: `https://www.youtube.com/embed/${trailerKey}`,
      tmdbId: id,
      seasonsConfig: mediaType === 'tv' ? seasonsConfig : undefined
    };
  } catch (err) {
    console.error('Erro de detalhamento TMDB:', err);
    return null;
  }
}

/**
 * Busca Filmes e Séries em Tendência Hoje no TMDB (Trending / Popular)
 */
export async function getTMDBTrendingMovies(apiKey: string): Promise<any[]> {
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey.trim() === '') {
    const mockDb = await fallbackTMDBSearch('');
    return mockDb.map(item => ({
      id: item.id,
      title: item.title,
      name: item.title,
      popularity: item.vote_average * 10,
      vote_average: item.vote_average,
      media_type: 'movie',
      poster_path: item.poster_path,
      backdrop_path: item.backdrop_path,
      overview: item.overview
    }));
  }

  try {
    const url = `https://api.themoviedb.org/3/trending/all/day?api_key=${encodeURIComponent(apiKey)}&language=pt-BR`;
    const res = await fetchApi(url);
    if (!res.ok || !res.data) {
      throw new Error('Falha ao obter tendências do TMDB');
    }
    const results = res.data.results || [];
    return results;
  } catch (err) {
    console.warn('Erro ao obter tendências do TMDB, usando banco simulado:', err);
    const mockDb = await fallbackTMDBSearch('');
    return mockDb.map(item => ({
      id: item.id,
      title: item.title,
      name: item.title,
      popularity: item.vote_average * 10,
      vote_average: item.vote_average,
      media_type: 'movie',
      poster_path: item.poster_path,
      backdrop_path: item.backdrop_path,
      overview: item.overview
    }));
  }
}

