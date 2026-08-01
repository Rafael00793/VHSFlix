/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Movie, WatchProgress } from '../types';
import { X, Play, Pause, Plus, Check, Star, RefreshCw, Tv, Clock, HelpCircle, Film, Sparkles, AlertCircle, ExternalLink, Maximize, Shield, Sliders, ThumbsUp, ThumbsDown, ChevronDown, ArrowLeft, Settings, Volume2, VolumeX } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { INITIAL_MOVIES } from '../data';
import { AbyssService } from '../services/abyssService';

export interface Episode {
  number: number;
  title: string;
  description: string;
  duration: string;
  releaseDate: string;
  ratingCode: string;
  thumbnailUrl: string;
}

export function getEpisodesForSeries(movie: Movie, seasonNumber: number): Episode[] {
  const seasons = getSeriesSeasonsData(movie);
  const foundSeason = seasons.find(s => s.seasonNumber === seasonNumber);
  const epCount = foundSeason ? foundSeason.episodesCount : 8;

  const episodes: Episode[] = [];

  // For Depois Daquele Ano
  if (movie.id === 'm13') {
    const titles = [
      "Depois Daquele Verão",
      "Sangue Novo",
      "Brincando com Fogo",
      "Anatomia de um Romance",
      "Segredos Sob o Sol",
      "Cinzas do Passado",
      "Desencontros no Cais",
      "O Último Ponto de Partida"
    ];
    const descs = [
      "A morte de Sue Florek, quase uma segunda mãe para Percy Fraser, a leva de volta a um reencontro nostálgico repleto de memórias e segredos na casa do lago nos arredores da cidade.",
      "O Tavern causa atrito entre os irmãos. Jordie apresenta Chantal à vida pacata do lago e pega todos de surpresa com uma notícia que mexe com o coração de todos.",
      "Delilah conta seu segredo para Jordie. Chantal pede ajuda a Charlie para resolver um desentendimento familiar doloroso que ameaça a paz de todos na antiga cabana.",
      "O testamento de Sue deixa todos em choque. Enquanto Sam e Charlie estão furiosos, Percy tenta encontrar conforto em seus sentimentos remanescentes do passado.",
      "Um acampamento de verão reserva grandes surpresas e revelações que ameaçam separar o jovem casal antes da temporada de calor terminar nas margens do cais.",
      "Uma antiga carta de amor é encontrada nas ruínas da cabana, abrindo velhas feridas que precisam ser tratadas e curadas com urgência.",
      "Mal-entendidos colocam a lealdade de Sam à prova enquanto Percy tenta reconectar suas memórias mais profundas do passado com a nova realidade de sua vida no lago.",
      "A decisão final sobre o destino das propriedades de Sue é tomada, unindo todos em um emocionante reencontro às margens do eterno lago azul."
    ];
    const unsplashes = [
      "https://images.unsplash.com/photo-1510972527409-cac236c5341a?auto=format&fit=crop&w=500&q=80",
      "https://images.unsplash.com/photo-1475503572774-15a45e5d60b9?auto=format&fit=crop&w=500&q=80",
      "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&w=500&q=80",
      "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=500&q=80",
      "https://images.unsplash.com/photo-1498855926480-d98e83099315?auto=format&fit=crop&w=500&q=80",
      "https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=500&q=80",
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=500&q=80",
      "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=500&q=80"
    ];

    for (let i = 1; i <= epCount; i++) {
      const idx = (i - 1) % titles.length;
      episodes.push({
        number: i,
        title: titles[idx],
        description: descs[idx],
        duration: idx % 2 === 0 ? "55 min" : "43 min",
        releaseDate: "9 de jun. de 2026",
        ratingCode: "A14",
        thumbnailUrl: unsplashes[idx]
      });
    }
    return episodes;
  }

  // For Stranger Things
  if (movie.tmdbId === 66732) {
    const epData: { [season: number]: { titles: string[], descs: string[] } } = {
      1: {
        titles: [
          "O Desaparecimento de Will Byers",
          "A Estranha da Maple Street",
          "Caras de Natal",
          "O Corpo",
          "A Pulga e o Acrobata",
          "O Monstro",
          "A Banheira",
          "O Mundo Invertido"
        ],
        descs: [
          "No fito de volta para casa, Will vê algo terrível que desafia a razão humana. Perto dali, um segredo sinistro está escondido no laboratório governamental.",
          "Lucas, Mike e Dustin tentam interagir com a misteriosa menina que encontraram sob a chuva na floresta. Hopper investiga um estranho relato de Joyce.",
          "Uma Joyce cada vez mais ansiosa tenta se comunicar com seu filho Will usando luzes natalinas na parede da sala. Nancy descobre uma criatura bizarra.",
          "Recusando-se terminantemente a aceitar que o corpo encontrado no lago seja de Will, Joyce insiste. Os meninos dão um banho de loja em Eleven.",
          "Hopper arrisca sua vida ao invadir as dependências ocultas do laboratório. Dustin teoriza sobre um portal dimensional usando sua bússola.",
          "Em busca de respostas Nancy e Jonathan vão à floresta profunda e acham algo assombroso. Eleven recorda as torturas psíquicas.",
          "Com as viaturas do governo cercando a escola, os garotos organizam um aparato sensorial com sal de cozinha para Eleven contatar Will.",
          "Hopper e Joyce são impiedosamente interrogados. Enquanto isso, Nancy e Jonathan montam barreiras para conter a criatura na casa."
        ]
      },
      2: {
        titles: [
          "Madmax",
          "Gostosuras ou travessuras, aberração",
          "O Girino",
          "Will, o Sábio",
          "Dig Dug",
          "O Espião",
          "A irmã perdida",
          "O Devorador de Mentes",
          "O Portal"
        ],
        descs: [
          "Com a aproximação do Halloween, uma nova jogadora agita o fliperama local. Hopper investiga um campo de abóboras apodrecidas.",
          "Will vê algo perturbador no fliperama. Mike não consegue esquecer Eleven. Dustin adota um animal de estimação incomum.",
          "Dustin abriga um misterioso ser que logo demonstra um apetite insaciável. Eleven se sente frustrada de viver escondida.",
          "As visões de Will pioram cada vez mais, deixando Joyce em pânico. Hopper pesquisa a origem dos misteriosos túneis.",
          "Eleven realiza uma jornada pessoal de autodescoberta. Dustin recruta Steve para conter seu ex-animal de estimação.",
          "A ligação de Will com o monstro se aprofunda, e ele fornece coordenadas suspeitas para as equipes do governo.",
          "Levada por lembranças de sua infância, Eleven viaja para Chicago onde conhece uma gangue de marginais com poderes parecidos.",
          "O laboratório é invadido por monstros caninos famintos. Hopper, Joyce e Mike salvam Will antes do bloqueio definitivo.",
          "Eleven retorna triunfante pronta para fechar o portal. Jonathan, Nancy e Steve usam calor intenso para libertar Will."
        ]
      },
      3: {
        titles: [
          "Está me ouvindo, Suzie?",
          "O Caso dos Ratos",
          "A Salvação de uma Salva-vidas",
          "A Prova da Sauna",
          "O Devorado",
          "E Pluribus Unum",
          "A Mordida",
          "A Batalha de Starcourt"
        ],
        descs: [
          "O verão traz romance e um colossal novo shopping para Hawkins. Dustin sintoniza um rádio amador de altíssimo alcance.",
          "Nancy e Jonathan seguem uma pista jornalística sobre ratos enlouquecidos. Steve e Robin tentam traduzir uma rádio russa.",
          "Eleven e Max procuram Billy no clube de natação. Dustin e Erica infiltram-se nos respiradores do Starcourt.",
          "O grupo testa a sensibilidade de Billy ao calor intenso. Nancy encontra uma resposta monstruosa na redação.",
          "Uma criatura repulsiva cresce ao devorar corpos e se desenvolve nos subterrâneos. Dustin assume o controle da missão.",
          "Eleven reencontra o monstro em uma projeção mental de tirar o fôlego. O exército soviético prepara a super-arma cilíndrica.",
          "Fugindo do Devorador de Mentes no shopping, Eleven sofre um sério ferimento infeccionado pela garra do monstro.",
          "Em um confronto final de proporções épicas no shopping, Billy se sacrifica e Billy se redime enquanto Hopper vira herói."
        ]
      },
      4: {
        titles: [
          "O Clube de Hellfire",
          "A Maldição de Vecna",
          "O Monstro e a Super-heroína",
          "Querido Billy",
          "O Projeto Nina",
          "Mergulho no Escuro",
          "Massacre no Laboratório de Hawkins",
          "Papai",
          "O Plano"
        ],
        descs: [
          "Na nova escola na Califórnia, Eleven se sente excluída. Em Hawkins, o carismático mestre Eddie Munson organiza o Hellfire.",
          "Uma tragédia inexplicável abala Hawkins e mobiliza a polícia local. Eleven é alvo de terrível bullying escolar.",
          "Joyce viaja ao Alasca acompanhada por Murray para resgatar Hopper na Rússia. Eleven toma uma dramática iniciativa.",
          "Max corre contra o tempo sob o letal feitiço de Vecna, encontrando refúgio na audição intensa de sua música favorita para resistir.",
          "Eleven mergulha em uma banheira profunda para reativar suas memórias traumáticas e recuperar seus poderes perdidos.",
          "Os garotos mergulham no lago dos amantes e atravessam o novo portal dimensional nas profundezas aquáticas.",
          "O terrível segredo sobre a origem do temido vilão Vecna é finalmente revelado através das visões e lembranças de Eleven.",
          "Com as tropas governamentais cercando o silo do deserto, Eleven defende sua vida contra jatos e blindados.",
          "O grupo de Hawkins se infiltra no Mundo Invertido para o confronto final definitivo com Vecna em sua própria mente."
        ]
      },
      5: {
        titles: [
          "O Portal Aberto",
          "Hawkins em Ruínas",
          "A Aliança Vermelha",
          "Sombras na Escola",
          "Teste do Silo",
          "Eco das Luzes",
          "Batalha pelo Vale",
          "Conclusão Épica"
        ],
        descs: [
          "Com os portais convergindo e rachando a cidade, Eleven planeja uma contraofensiva maciça nos limites de Hawkins.",
          "Joyce e Hopper ajudam a organizar centros de evacuação enquanto a névoa tóxica do Mundo Invertido avança rápido.",
          "Robin e Nancy buscam pistas nos arquivos para selar as frestas subterrâneas usando impulsos eletromagnéticos.",
          "Vecna inicia seu assalto final às mentes vulneráveis, forçando os adolescentes a encarar seus piores pesadelos.",
          "Sob orientação científica, Eleven alcança seu potencial definitivo ao canalizar toda a energia residual retro.",
          "As luzes residenciais piscam num ritmo frenético sinalizando uma grande batalha de Eleven nos limites dimensionais.",
          "O exército de criaturas das trevas avança pelas ruas de Hawkins. Steve e Dustin lideram a linha de frente defensiva.",
          "A emocionante e definitiva batalha entre Eleven e o Upside Down. O destino de Hawkins e do mundo é selado de vez."
        ]
      }
    };

    const sData = epData[seasonNumber] || epData[1];
    const unsplashes = [
      "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=500&q=80", // Starry night/woods dark road
      "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=500&q=80", // Foggy creepy road/woods
      "https://images.unsplash.com/photo-1578301978018-3005759f48f7?auto=format&fit=crop&w=500&q=80", // 80s neon synthwave bedroom
      "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=500&q=80", // Retro TV and shelf (basement vibes)
      "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=500&q=80", // Glowing neon rift/portal red
      "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=500&q=80", // 1980s Arcade cabinet
      "https://images.unsplash.com/photo-1505686994434-e3cc5abf1330?auto=format&fit=crop&w=500&q=80", // Cozy wood cabin deep in deep fog forest
      "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=500&q=80", // Moody dark film spotlight
      "https://images.unsplash.com/photo-1533928298208-27ff66555d8d?auto=format&fit=crop&w=500&q=80"  // Old tech/rotary phone and walkie-talkies
    ];

    for (let i = 1; i <= epCount; i++) {
      const idx = (i - 1) % sData.titles.length;
      const title = sData.titles[idx] || `Capítulo ${i}: Revelação`;
      const desc = sData.descs[idx] || `A tensão aumenta consideravelmente à medida que a turma enfrenta novas faces do horror psicológico em Hawkins.`;
      const releaseYear = movie.year ? movie.year : 2016;

      episodes.push({
        number: i,
        title,
        description: desc,
        duration: "52 min",
        releaseDate: `15 de jul. de ${releaseYear}`,
        ratingCode: "A16",
        thumbnailUrl: unsplashes[idx % unsplashes.length]
      });
    }
    return episodes;
  }

  // General series or user-created series dynamic procedural episode generator
  const baseSeed = movie.id ? movie.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) : 42;
  
  const genTitles = [
    "Começo de uma Longa Jornada",
    "Conexões Inesperadas no Subúrbio",
    "Sinais de Alerta no Aparelho VHS",
    "Segredos Revelados por Acaso",
    "O Ponto Sem Retorno",
    "Encontros e Desencontros Marcados",
    "Decisões Sob Pressão",
    "Conclusão Eletrizante do Capítulo",
    "Novos Começos sob o Neon",
    "Descobertas Cruciais no Cais",
    "O Enigma Adicional Solucionado",
    "Destinos Cruzados na Grande Cidade"
  ];
  
  const genDescs = [
    "Os primeiros mistérios começam a se desenvolver de forma instigante neste episódio inicial cheio de reviravoltas emocionais para o elenco.",
    "O grupo principal lida com as consequências imediatas de uma descoberta impactante que muda todas as suas estratégias vigentes.",
    "Uma antiga gravação em fita magnética serve como a pista perfeita para desvendar uma conspiração de alta tecnologia retro.",
    "Conversas sinceras revelam um segredo familiar profundo que estava soterrado há mais de duas décadas em completo silêncio.",
    "A tensão se estende aos limites emocionais de todos os envolvidos, forçando uma dramática e inevitável escolha pessoal.",
    "Alianças surpreendentes são costuradas na surdina para enfrentar a imensa ameaça corporativa que paina sobre toda a região.",
    "Em um teste supremo de lealdade e afeto, os protagonistas correm freneticamente contra o relógio para evitar o pior desenlace.",
    "Os fios soltos da temporada começam a se amarrar de forma sublime, preparando o palco para o grandioso clímax de suspense."
  ];

  let fallbackUnsplashes: string[] = [];
  if (movie.category === 'Terror') {
    fallbackUnsplashes = [
      movie.backdropUrl || "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=500&q=80",
      "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=500&q=80", // creepy foggy road
      "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=500&q=80", // dark starry woods
      "https://images.unsplash.com/photo-1505686994434-e3cc5abf1330?auto=format&fit=crop&w=500&q=80", // wooden cabin
      "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=500&q=80", // red neon scary glow
      "https://images.unsplash.com/photo-1533928298208-27ff66555d8d?auto=format&fit=crop&w=500&q=80", // old phone
      "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=500&q=80", // stage spotlight
      "https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=500&q=80"
    ];
  } else if (movie.category === 'Cristão') {
    fallbackUnsplashes = [
      movie.backdropUrl || "https://images.unsplash.com/photo-1447005497901-b3e9ee359e6a?auto=format&fit=crop&w=500&q=80",
      "https://images.unsplash.com/photo-1548625361-155deee223d5?auto=format&fit=crop&w=500&q=80", // desert hills
      "https://images.unsplash.com/photo-1447005497901-b3e9ee359e6a?auto=format&fit=crop&w=500&q=80", // candle light
      "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=500&q=80", // majestic mountains
      "https://images.unsplash.com/photo-1439853949127-fa647821ebb0?auto=format&fit=crop&w=500&q=80", // serene ocean
      "https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=500&q=80", // columns
      "https://images.unsplash.com/photo-1519817650390-64a93db51149?auto=format&fit=crop&w=500&q=80", // ancient sky/stars
      "https://images.unsplash.com/photo-1490730141103-6cac27aaab94?auto=format&fit=crop&w=500&q=80"  // sunset field
    ];
  } else if (movie.category === 'Ficção Científica') {
    fallbackUnsplashes = [
      movie.backdropUrl || "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=500&q=80",
      "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=500&q=80", // cyberspace
      "https://images.unsplash.com/photo-1506318137071-a8e063b4bec0?auto=format&fit=crop&w=500&q=80", // starry galaxy
      "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&w=500&q=80", // earth horizon space
      "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=500&q=80", // celestial dark sky
      "https://images.unsplash.com/photo-1578301978018-3005759f48f7?auto=format&fit=crop&w=500&q=80", // futuristic retro cabin
      "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=500&q=80", // wireframe grid
      "https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?auto=format&fit=crop&w=500&q=80"  // glowing pink cyberpunk grid
    ];
  } else {
    fallbackUnsplashes = [
      movie.backdropUrl || "https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=500&q=80",
      "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=500&q=80", // nostalgic 80s room/tv
      "https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=500&q=80", // film project
      "https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?auto=format&fit=crop&w=500&q=80", // film projector rays shadow
      "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=500&q=80", // spotlight stage
      "https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=500&q=80", // reel cutter edit
      "https://images.unsplash.com/photo-1533928298208-27ff66555d8d?auto=format&fit=crop&w=500&q=80", // tape tech
      "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=500&q=80"  // starry darkness
    ];
  }

  for (let i = 1; i <= epCount; i++) {
    const tIdx = (baseSeed + i * 3) % genTitles.length;
    const dIdx = (baseSeed + i * 7) % genDescs.length;
    const thumbIdx = (baseSeed + i) % fallbackUnsplashes.length;
    
    episodes.push({
      number: i,
      title: genTitles[tIdx],
      description: genDescs[dIdx],
      duration: `${40 + ((baseSeed + i) % 20)} min`,
      releaseDate: `10 de mai. de ${movie.year || 2026}`,
      ratingCode: movie.category === 'Terror' ? 'A16' : 'A14',
      thumbnailUrl: fallbackUnsplashes[thumbIdx]
    });
  }

  return episodes;
}

interface MovieDetailModalProps {
  movie: Movie | null;
  isOpen: boolean;
  onClose: () => void;
  myList: string[];
  onToggleMyList: (movieId: string) => void;
  watchHistory: { [movieId: string]: WatchProgress };
  onUpdateProgress: (movieId: string, progress: number, currentTime: number, duration: number, isFinished: boolean) => void;
  adguardEnabled?: boolean;
  onVoteMovie?: (movieId: string, voteType: 'like' | 'dislike') => void;
  activeProfileId?: string;
  tmdbApiKey?: string;
  abyssApiKey?: string;
  movies?: Movie[];
  onSelectMovie?: (movie: Movie) => void;
}

const CATEGORY_COLORS: { [key: string]: string } = {
  'Ação': '#dc2626', // Vermelho
  'Aventura': '#059669', // Verde Esmeralda
  'Terror': '#7c3aed', // Roxo
  'Suspense': '#ea580c', // Laranja Escuro
  'Drama': '#db2777', // Rosa
  'Comédia': '#eab308', // Amarelo
  'Ficção Científica': '#06b6d4', // Ciano
  'Cristão': '#0ea5e9', // Azul Céu
  'Séries': '#10b981', // Verde Esmeralda
  'Reality': '#f43f5e', // Rosa Intenso
  'Documentário': '#71717a', // Cinza
  'Animação': '#fbbf24', // Amarelo Dourado
  'Família': '#22c55e', // Verde Claro
  'Fantasia': '#a855f7', // Roxo Claro
  'Crime': '#334155', // Chumbo Noir
  'Musical': '#ec4899', // Magenta
  'Guerra': '#78350f', // Castanho Cáqui
  'Faroeste': '#b45309', // Marrom Deserto
  'Romance': '#e11d48', // Vermelho Paixão
  'História': '#854d0e', // Bronze Histórico
  'Biografia': '#0d9488' // Teal Literário
};

const CATEGORY_TAPE_LABELS: { [key: string]: string } = {
  'Ação': 'Vermelho Vintage',
  'Aventura': 'Verde Selva Retro',
  'Terror': 'Roxo Sombrio',
  'Suspense': 'Laranja Tensão',
  'Drama': 'Rosa Clássico',
  'Comédia': 'Amarelo Radiante',
  'Ficção Científica': 'Ciano Galáctico',
  'Cristão': 'Azul Celestial',
  'Séries': 'Verde Brilhante',
  'Reality': 'Rosa Shocking',
  'Documentário': 'Chumbo Magnético',
  'Animação': 'Dourado Cartum',
  'Família': 'Neon Fraterno',
  'Fantasia': 'Místico Púrpura',
  'Crime': 'Rachadura Grafite',
  'Musical': 'Magenta Melodia',
  'Guerra': 'Verde Oliva Combate',
  'Faroeste': 'Marrom Areia',
  'Romance': 'Carmesim Paixão',
  'História': 'Cobre Antigo',
  'Biografia': 'Teal Documental'
};

export function getSeriesSeasonsData(movie: Movie) {
  // Se houver configuração manual de temporadas e episódios, usar prioritariamente
  if (movie.seasonsConfig && Object.keys(movie.seasonsConfig).length > 0) {
    const seasons: { seasonNumber: number; episodesCount: number }[] = [];
    const sortedSeasons = Object.keys(movie.seasonsConfig)
      .map(Number)
      .sort((a, b) => a - b);
    
    for (const sNum of sortedSeasons) {
      seasons.push({
        seasonNumber: sNum,
        episodesCount: movie.seasonsConfig[sNum] || 1
      });
    }
    return seasons;
  }

  // Tentar parsear o número de temporadas
  let numSeasons = 3; // Fallback
  const durationStr = movie.duration || '';
  const match = durationStr.match(/(\d+)/);
  if (match) {
    numSeasons = parseInt(match[1], 10);
  } else if (durationStr.toLowerCase().includes('uma') || durationStr.toLowerCase().includes('1')) {
    numSeasons = 1;
  }

  // Obter episódios de forma consistente
  const seasons: { seasonNumber: number; episodesCount: number }[] = [];
  
  // Séries conhecidas
  if (movie.tmdbId === 66732) { // Stranger Things
    const eps = [8, 9, 8, 9, 8];
    for (let i = 1; i <= numSeasons; i++) {
      seasons.push({
        seasonNumber: i,
        episodesCount: eps[(i - 1) % eps.length]
      });
    }
  } else if (movie.tmdbId === 97186) { // The Chosen
    for (let i = 1; i <= numSeasons; i++) {
      seasons.push({
        seasonNumber: i,
        episodesCount: 8
      });
    }
  } else {
    // Para qualquer outra série (pode ser criada pelo usuário)
    // Vamos usar o id do filme pra gerar algo consistente (pseudo-random reproduzível)
    const seed = movie.id ? movie.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) : 10;
    for (let i = 1; i <= numSeasons; i++) {
      // Gera episódios de 6 a 16 de forma consistente por temporada
      const episodesCount = 6 + ((seed * i + 3) % 11);
      seasons.push({
        seasonNumber: i,
        episodesCount: episodesCount
      });
    }
  }

  return seasons;
}

export default function MovieDetailModal({
  movie,
  isOpen,
  onClose,
  myList,
  onToggleMyList,
  watchHistory,
  onUpdateProgress,
  adguardEnabled = true,
  onVoteMovie,
  activeProfileId = '',
  tmdbApiKey,
  abyssApiKey,
  movies = [],
  onSelectMovie
}: MovieDetailModalProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [manualEmbedInput, setManualEmbedInput] = useState('');
  const [isTapeLoading, setIsTapeLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(120 * 60); // Default 2 horas em segundos
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1); // Retro 1x, 2x, 4x rewind index
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedPlayer] = useState<'embedmovies' | 'megaembed'>('embedmovies');
  const [isConfiguringPlayer, setIsConfiguringPlayer] = useState(false);
  const [season, setSeason] = useState<number>(1);
  const [episode, setEpisode] = useState<number>(1);
  const [activeTab, setActiveTab] = useState<'episodes' | 'related' | 'details'>('episodes');
  const [isSeasonDropdownOpen, setIsSeasonDropdownOpen] = useState(false);
  const [abyssEpisodeId, setAbyssEpisodeId] = useState<string>('');
  const [smartTrailerUrl, setSmartTrailerUrl] = useState<string>(movie?.trailerUrl || '');

  // Efeito para busca e sincronização inteligente de trailers
  useEffect(() => {
    if (!movie) return;

    if (movie.trailerUrl && movie.trailerUrl.includes('youtube.com/embed/')) {
      setSmartTrailerUrl(movie.trailerUrl);
    } else {
      fetch('/api/trailer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: movie.title,
          tmdbId: movie.tmdbId,
          type: movie.type,
          movieId: movie.id
        })
      })
        .then(res => res.json())
        .then(data => {
          if (data.success && data.trailerUrl) {
            setSmartTrailerUrl(data.trailerUrl);
            movie.trailerUrl = data.trailerUrl;
            movie.youtubeVideoId = data.videoId;
          }
        })
        .catch(err => {
          console.warn('[FRONTEND TRAILER] Erro ao carregar trailer inteligente:', err);
        });
    }
  }, [movie?.id, movie?.title, movie?.trailerUrl]);
  
  // Qualidade preferencial de reprodução (persiste em localStorage para máxima fluidez)
  const [preferredQuality, setPreferredQuality] = useState<string>(() => {
    return localStorage.getItem('vhsflix_preferred_quality') || '480p';
  });
  const [isMuted, setIsMuted] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [isCheckingSync, setIsCheckingSync] = useState(false);
  const [syncFailedMessage, setSyncFailedMessage] = useState<string | null>(null);

  const getQualityParams = (quality: string) => {
    const num = quality.replace('p', '');
    return `&quality=${quality}&res=${num}&q=${num}&quality_preferred=${num}&initial_resolution=${quality}&preload=auto&autoplay=1&buffering=fast&autoQuality=0`;
  };

  const getActiveVideoUrl = () => {
    if (!movie) return '';
    if (movie.type === 'series') {
      const key = `${season}_${episode}`;
      if (movie.episodeEmbeds && movie.episodeEmbeds[key]) {
        const url = movie.episodeEmbeds[key];
        return url.startsWith('http://') || url.startsWith('https://') ? url : `https://abyssplayer.com/${url}`;
      } else if (abyssEpisodeId) {
        return abyssEpisodeId.startsWith('http://') || abyssEpisodeId.startsWith('https://') ? abyssEpisodeId : `https://abyssplayer.com/${abyssEpisodeId}`;
      } else {
        return ''; // Retorna vazio se ainda não foi localizado no Abyss para evitar player quebrado
      }
    } else {
      if (movie.embedUrl) {
        return movie.embedUrl.startsWith('http://') || movie.embedUrl.startsWith('https://') ? movie.embedUrl : `https://abyssplayer.com/${movie.embedUrl}`;
      } else {
        return movie.abyssId ? `https://abyssplayer.com/${movie.abyssId}` : '';
      }
    }
  };

  const parsedVideo = (() => {
    const rawUrl = getActiveVideoUrl();
    if (!rawUrl) return { type: 'empty', url: '' };

    const urlTrim = rawUrl.trim();

    // Check direct video file formats (including general file stream links)
    const directVideoRegex = /\.(mp4|mkv|webm|ogg|mov|m3u8)(?:\?|$)/i;
    const isDirect = urlTrim.toLowerCase().match(directVideoRegex) || 
                     urlTrim.startsWith('blob:') || 
                     urlTrim.includes('/video/') || 
                     urlTrim.includes('.mp4') || 
                     urlTrim.includes('.mkv') || 
                     urlTrim.includes('stream');
                     
    if (isDirect) {
      return {
        type: 'direct',
        url: urlTrim
      };
    }

    return {
      type: 'iframe',
      url: urlTrim
    };
  })();

  // Sincronizar estado de reproducao, velocidade e volume com o elemento de video real
  useEffect(() => {
    if (parsedVideo.type === 'direct' && videoRef.current) {
      if (isPlaying) {
        videoRef.current.play().catch(err => {
          console.warn("Autoplay impedido ou arquivo nao suportado:", err);
        });
      } else {
        videoRef.current.pause();
      }
    }
  }, [isPlaying, parsedVideo.type]);

  useEffect(() => {
    if (parsedVideo.type === 'direct' && videoRef.current) {
      videoRef.current.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed, parsedVideo.type]);

  useEffect(() => {
    if (parsedVideo.type === 'direct' && videoRef.current) {
      videoRef.current.muted = isMuted;
    }
  }, [isMuted, parsedVideo.type]);
  
  // Real-time episode mapping from TMDB if applicable
  const [tmdbEpisodes, setTmdbEpisodes] = useState<{ [key: string]: Episode[] }>({});
  const [isLoadingEpisodes, setIsLoadingEpisodes] = useState(false);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const currentTimeRef = useRef(currentTime);
  const playerContainerRef = useRef<HTMLDivElement>(null);

  // Trava de rolagem do fundo da página (body scroll lock) quando o modal estiver aberto
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow || '';
      };
    }
  }, [isOpen]);

  // Reiniciar estados de reprodução e abas ativos quando altera o filme em exibição
  useEffect(() => {
    if (!movie) return;
    setIsPlaying(false);
    setSeason(1);
    setEpisode(1);
    setActiveTab(movie.type === 'series' ? 'episodes' : 'details');
  }, [movie?.id]);

  // Sintonizar automaticamente episódios de séries com Abyss em tempo real
  useEffect(() => {
    if (!movie) return;
    if (movie.type !== 'series') {
      setAbyssEpisodeId('');
      setSyncFailedMessage(null);
      return;
    }

    const key = `${season}_${episode}`;
    if (movie.episodeEmbeds && movie.episodeEmbeds[key]) {
      setAbyssEpisodeId(movie.episodeEmbeds[key]);
      setSyncFailedMessage(null);
      return;
    }

    setAbyssEpisodeId(''); // Reset temporário para sintonização
    setSyncFailedMessage(null);
    setIsCheckingSync(true);

    const effectiveApiKey = abyssApiKey || localStorage.getItem('vhsflix_abyss_key') || '';

    // Engine 1: Tenta backend Express (/api/abyss/register)
    fetch('/api/abyss/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        tmdbId: movie.tmdbId,
        type: 'series',
        title: movie.title,
        season,
        episode,
        apiKey: effectiveApiKey
      })
    })
    .then(async res => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    })
    .then(data => {
      if (data.success && data.abyssId && (data.usedRealAPI || data.embedUrl)) {
        setIsCheckingSync(false);
        setAbyssEpisodeId(data.abyssId);
        setSyncFailedMessage(null);
      } else {
        throw new Error(data.message || 'Need client fallback');
      }
    })
    .catch(async () => {
      // Engine 2: Client-side fallback direto via AbyssService (necessário no Netlify / hospedagem estática)
      try {
        const searchRes = await AbyssService.findEpisodePlayerUrl(
          movie.title,
          season,
          episode,
          effectiveApiKey
        );
        setIsCheckingSync(false);

        if (searchRes.success && (searchRes.playerUrl || searchRes.fileId)) {
          const targetId = searchRes.fileId || searchRes.playerUrl;
          setAbyssEpisodeId(targetId);
          setSyncFailedMessage(null);
          if (movie.episodeEmbeds) {
            movie.episodeEmbeds[`${season}_${episode}`] = targetId;
          } else {
            movie.episodeEmbeds = { [`${season}_${episode}`]: targetId };
          }
        } else {
          setSyncFailedMessage(searchRes.message || `A Temporada ${season}, Episódio ${episode} (S${season.toString().padStart(2, '0')}E${episode.toString().padStart(2, '0')}) de "${movie.title}" ainda não existe no seu painel do Abyss.`);
        }
      } catch (clientErr: any) {
        setIsCheckingSync(false);
        console.error('[Abyss Player Client Fallback] Erro ao sintonizar:', clientErr);
        setSyncFailedMessage(`O episódio S${season.toString().padStart(2, '0')}E${episode.toString().padStart(2, '0')} de "${movie.title}" aguarda envio no seu painel Abyss.`);
      }
    });
  }, [movie?.id, season, episode, abyssApiKey]);

  const handleReSyncCurrentEpisode = async () => {
    if (!movie || movie.type !== 'series') return;
    setIsCheckingSync(true);
    setSyncFailedMessage(null);

    const effectiveApiKey = abyssApiKey || localStorage.getItem('vhsflix_abyss_key') || '';

    try {
      const res = await fetch('/api/abyss/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tmdbId: movie.tmdbId,
          type: 'series',
          title: movie.title,
          season,
          episode,
          apiKey: effectiveApiKey
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.abyssId && (data.usedRealAPI || data.embedUrl)) {
          setIsCheckingSync(false);
          setAbyssEpisodeId(data.abyssId);
          setSyncFailedMessage(null);
          setIsPlaying(true);
          return;
        }
      }
    } catch (err) {
      console.warn('[Abyss Player] Backend indisponível para re-sync, testando client-side...');
    }

    // Client fallback se o backend falhar
    try {
      const searchRes = await AbyssService.findEpisodePlayerUrl(
        movie.title,
        season,
        episode,
        effectiveApiKey
      );
      setIsCheckingSync(false);

      if (searchRes.success && (searchRes.playerUrl || searchRes.fileId)) {
        const targetId = searchRes.fileId || searchRes.playerUrl;
        setAbyssEpisodeId(targetId);
        setSyncFailedMessage(null);
        setIsPlaying(true);
        if (movie.episodeEmbeds) {
          movie.episodeEmbeds[`${season}_${episode}`] = targetId;
        } else {
          movie.episodeEmbeds = { [`${season}_${episode}`]: targetId };
        }
      } else {
        setSyncFailedMessage(searchRes.message || `O vídeo do episódio (S${season.toString().padStart(2, '0')}E${episode.toString().padStart(2, '0')}) ainda não existe no Abyss.`);
      }
    } catch (clientErr: any) {
      setIsCheckingSync(false);
      setSyncFailedMessage(`Erro de conexão ao verificar o episódio S${season}E${episode} no Abyss.`);
    }
  };

  // Busca fitas correspondentes inteligentes sintonizadas na mesma categoria e tipo
  const relatedList = React.useMemo(() => {
    if (!movie) return [];
    const referenceList = (movies && movies.length > 0) ? movies : INITIAL_MOVIES;
    const candidates = referenceList.filter(m => m.id !== movie.id);
    
    const scoredList = candidates.map(m => {
      let score = 0;
      if (m.category === movie.category) score += 10;
      if (m.type === movie.type) score += 5;
      return { item: m, score };
    });

    return scoredList
      .filter(pair => pair.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(pair => pair.item)
      .slice(0, 4);
  }, [movie, movies]);

  // Monitor e atualiza episódios ativos do TMDB ou cache
  useEffect(() => {
    if (!movie || movie.type !== 'series' || !movie.tmdbId) {
      return;
    }

    const cacheKey = `${movie.id}_s${season}`;
    if (tmdbEpisodes[cacheKey]) return;

    let isCancelled = false;
    const fetchTmdbEpisodes = async () => {
      // Use the received API key or a robust known default fallback key
      const apiKey = tmdbApiKey || '9ba478ffe785bbc34fa2b10c46296580';
      if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') return;
      
      setIsLoadingEpisodes(true);
      try {
        const url = `https://api.themoviedb.org/3/tv/${movie.tmdbId}/season/${season}?api_key=${encodeURIComponent(apiKey)}&language=pt-BR`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('Falha ao buscar episódios no TMDB');
        const data = await res.json();
        
        if (data && data.episodes && !isCancelled) {
          const eps: Episode[] = data.episodes.map((ep: any) => {
            const fallbackPic = movie.backdropUrl || 'https://image.tmdb.org/t/p/original/vKof7jZ50vS2pYgO569ofCidG9y.jpg';
            const imageUrl = ep.still_path 
              ? `https://image.tmdb.org/t/p/w500${ep.still_path}`
              : fallbackPic;

            const releaseDateFormatted = ep.air_date
              ? new Date(ep.air_date).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' })
              : `15 de jul. de ${movie.year || 2026}`;

            return {
              number: ep.episode_number || ep.order || 1,
              title: ep.name || `Episódio ${ep.episode_number}`,
              description: ep.overview || 'Sem descrição cadastrada nesta fita documental.',
              duration: ep.runtime ? `${ep.runtime} min` : '50 min',
              releaseDate: releaseDateFormatted,
              ratingCode: movie.category === 'Terror' ? 'A16' : 'A14',
              thumbnailUrl: imageUrl
            };
          });

          setTmdbEpisodes(prev => ({
            ...prev,
            [cacheKey]: eps
          }));
        }
      } catch (err) {
        console.warn('Erro ao trazer dados de episódios dinâmicos do TMDB:', err);
      } finally {
        if (!isCancelled) {
          setIsLoadingEpisodes(false);
        }
      }
    };

    fetchTmdbEpisodes();
    return () => {
      isCancelled = true;
    };
  }, [movie, season, tmdbApiKey, tmdbEpisodes]);

  // Monitorar se mudou o estado de Fullscreen para sincronizar os ícones
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = () => {
    if (!playerContainerRef.current) return;
    
    if (!document.fullscreenElement) {
      playerContainerRef.current.requestFullscreen()
        .then(() => setIsFullscreen(true))
        .catch((err) => {
          console.warn(`Erro ao tentar ativar tela cheia: ${err.message}`);
        });
    } else {
      document.exitFullscreen()
        .then(() => setIsFullscreen(false))
        .catch((err) => {
          console.warn(`Erro ao tentar sair da tela cheia: ${err.message}`);
        });
    }
  };

  // Mantém currentTimeRef atualizado sem disparar re-render
  useEffect(() => {
    currentTimeRef.current = currentTime;
  }, [currentTime]);

  const isAddedToList = movie ? myList.includes(movie.id) : false;
  const progressState = movie ? watchHistory[movie.id] : undefined;

  // Converte string de duração do filme "1h 56m" ou "3 Temporadas" para segundos razoáveis
  useEffect(() => {
    if (movie) {
      setIsPlaying(false);
      setIsTapeLoading(false);
      setIsConfiguringPlayer(false);
      setSeason(1);
      setEpisode(1);
      setPlaybackSpeed(1);
      setIsSeasonDropdownOpen(false);
      setActiveTab(movie.type === 'series' ? 'episodes' : 'details');
      
      let seconds = 110 * 60; // default 1h 50m
      if (movie.duration.includes('h')) {
        const parts = movie.duration.split('h');
        const hours = parseInt(parts[0]) || 1;
        const minutes = parts[1] ? (parseInt(parts[1].replace('m', '')) || 0) : 0;
        seconds = (hours * 3600) + (minutes * 60);
      } else if (movie.duration.includes('Temporada')) {
        const seasons = parseInt(movie.duration) || 1;
        seconds = seasons * 10 * 45 * 60; // 10 caps de 45m cada temp
      }
      setTotalDuration(seconds);

      // Carrega progresso anterior uma única vez ao carregar o filme
      const initialProgress = watchHistory[movie.id];
      if (initialProgress) {
        setCurrentTime(initialProgress.currentTime);
      } else {
        setCurrentTime(0);
      }
    }
  }, [movie?.id]);

  // Simulador de Ticking de Tempo do Player (Relógio da fita VHS)
  useEffect(() => {
    if (isPlaying && movie && parsedVideo.type !== 'direct') {
      timerRef.current = setInterval(() => {
        const prev = currentTimeRef.current;
        let nextTime = prev + (1 * playbackSpeed);
        if (nextTime >= totalDuration) {
          nextTime = totalDuration;
          setIsPlaying(false);
          if (timerRef.current) clearInterval(timerRef.current);
          
          // Fim do filme!
          onUpdateProgress(movie.id, 100, totalDuration, totalDuration, true);
          setCurrentTime(totalDuration);
        } else {
          // Envia atualizações de progresso
          const percentage = (nextTime / totalDuration) * 100;
          onUpdateProgress(movie.id, percentage, nextTime, totalDuration, false);
          setCurrentTime(nextTime);
        }
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, totalDuration, movie?.id, playbackSpeed, onUpdateProgress, parsedVideo.type]);

  // --- SISTEMA DE PROTEÇÃO ROBUSTO ANTI-ANÚNCIOS, POPUPS E REDIRECIONAMENTOS ---
  useEffect(() => {
    if (!isPlaying) return;

    // 1. Bloquear abertura de novas abas via window.open
    const originalOpen = window.open;
    window.open = function() {
      console.warn("[VHSFLIX-SECURITY] Chamada para window.open bloqueada para prevenção de anúncios.");
      return null;
    };

    // 2. Interceptar tentativas de redirecionamento ou saída do aplicativo
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      const msg = "Prevenção de anúncios: Deseja realmente sair do VHSFLIX?";
      e.returnValue = msg;
      return msg;
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    // 3. Capturar e bloquear cliques em elementos de redirecionamento fantasma / anúncios flutuantes
    const handleWindowClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'A' || target.closest('a'))) {
        const anchor = target.tagName === 'A' ? (target as HTMLAnchorElement) : target.closest('a');
        if (anchor && anchor.href) {
          try {
            const destUrl = new URL(anchor.href);
            // Bloqueia se não for do próprio domínio vhsflix
            if (destUrl.hostname !== window.location.hostname && !destUrl.hostname.includes("youtube.com")) {
              e.preventDefault();
              e.stopPropagation();
              console.warn(`[VHSFLIX-SECURITY] Link externo suspeito bloqueado durante a reprodução: ${anchor.href}`);
            }
          } catch (err) {
            e.preventDefault();
            e.stopPropagation();
            console.warn("[VHSFLIX-SECURITY] URL inválida bloqueada.");
          }
        }
      }
    };
    window.addEventListener("click", handleWindowClick, true);

    return () => {
      window.open = originalOpen;
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("click", handleWindowClick, true);
    };
  }, [isPlaying]);

  // --- SISTEMA DE PRÉ-CARREGAMENTO (PREFETCHING) E PRECONNECT ---
  // Pré-conecta silenciosamente aos servidores de streaming e faz prefetch do player ativo e do próximo episódio
  useEffect(() => {
    if (!movie || !isOpen) return;

    // Calcular URLs que devem ser pré-carregadas
    const getUrlsToPrefetch = (): string[] => {
      const urls: string[] = [];
      
      if (movie.type === 'series') {
        // 1. URL do episódio atual
        const key = `${season}_${episode}`;
        if (movie.episodeEmbeds && movie.episodeEmbeds[key]) {
          urls.push(movie.episodeEmbeds[key]);
        } else if (abyssEpisodeId) {
          urls.push(abyssEpisodeId);
        } else {
          urls.push(`https://abyssplayer.com/series-${movie.tmdbId || '1396'}-${season}-${episode}`);
        }

        // 2. URL do próximo episódio (antecipação inteligente para reprodução contínua)
        const nextEpisode = episode + 1;
        const nextKey = `${season}_${nextEpisode}`;
        if (movie.episodeEmbeds && movie.episodeEmbeds[nextKey]) {
          urls.push(movie.episodeEmbeds[nextKey]);
        } else {
          urls.push(`https://abyssplayer.com/series-${movie.tmdbId || '1396'}-${season}-${nextEpisode}`);
        }
      } else {
        // URL do filme atual
        if (movie.embedUrl) {
          urls.push(movie.embedUrl);
        } else {
          urls.push(`https://abyssplayer.com/${movie.abyssId || movie.tmdbId || '105'}`);
        }
      }

      // Normalizar URLs completas
      return urls.map(u => {
        if (u.startsWith('http://') || u.startsWith('https://')) return u;
        return `https://abyssplayer.com/${u}`;
      });
    };

    const targetUrls = getUrlsToPrefetch();
    const createdElements: HTMLLinkElement[] = [];

    // Lista de CDNs e domínios comuns do player Abyss/Hydrax para pré-conexão imediata de DNS/Socket
    const streamingHosts = [
      'https://abyssplayer.com',
      'https://api.hydrax.net',
      'https://multi.hydrax.net',
      'https://play.abyss.to'
    ];

    streamingHosts.forEach(host => {
      // dns-prefetch
      const dnsLink = document.createElement('link');
      dnsLink.rel = 'dns-prefetch';
      dnsLink.href = host;
      document.head.appendChild(dnsLink);
      createdElements.push(dnsLink);

      // preconnect
      const connLink = document.createElement('link');
      connLink.rel = 'preconnect';
      connLink.href = host;
      connLink.crossOrigin = 'anonymous';
      document.head.appendChild(connLink);
      createdElements.push(connLink);
    });

    // Prefetch dos documentos/páginas dos players para encher o cache do navegador em segundo plano
    targetUrls.forEach(url => {
      const prefLink = document.createElement('link');
      prefLink.rel = 'prefetch';
      prefLink.as = 'document';
      prefLink.href = url;
      document.head.appendChild(prefLink);
      createdElements.push(prefLink);
    });

    return () => {
      // Limpar os elementos injetados ao desmontar ou trocar de filme/episódio
      createdElements.forEach(el => {
        if (el.parentNode) el.parentNode.removeChild(el);
      });
    };
  }, [movie, isOpen, season, episode, abyssEpisodeId]);

  const formatVCRTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handlePlayClick = () => {
    if (isPlaying) {
      setIsPlaying(false);
    } else {
      handleStartPlayback();
    }
  };

  const handleStartPlayback = () => {
    setIsConfiguringPlayer(false);
    setIsTapeLoading(true);
    setTimeout(() => {
      setIsTapeLoading(false);
      setIsPlaying(true);
    }, 1800); // Simulador de encaixar fita VCR
  };

  const handleEpisodeClick = (epNumber: number) => {
    setEpisode(epNumber);
    setIsConfiguringPlayer(false);
    setIsTapeLoading(true);
    setTimeout(() => {
      setIsTapeLoading(false);
      setIsPlaying(true);
    }, 1800); // Simulador de encaixar fita VCR
  };

  const handleScrubChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!movie) return;
    const targetSecs = parseInt(e.target.value);
    setCurrentTime(targetSecs);
    const percentage = (targetSecs / totalDuration) * 100;
    onUpdateProgress(movie.id, percentage, targetSecs, totalDuration, targetSecs >= totalDuration);
  };

  const handleResetProgress = () => {
    if (!movie) return;
    setCurrentTime(0);
    setIsPlaying(false);
    onUpdateProgress(movie.id, 0, 0, totalDuration, false);
  };

  if (!movie) return null;

  const tapeColor = CATEGORY_COLORS[movie.category] || movie.vhsTapeColor || '#dc2626';
  const tapeLabel = CATEGORY_TAPE_LABELS[movie.category] || 'Estojo Preto Clássico';

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25, ease: "easeInOut" }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md p-0 overflow-hidden h-[100dvh] w-screen"
        >
          {/* Backdrop apenas estético - Sem fechar ao clicar fora, fechamento exclusivo no X */}
          <div className="fixed inset-0 z-10 bg-black/80 backdrop-blur-sm pointer-events-none" />

          {/* Container Principal do Detalhe Full-Screen Estilo Prime Video / Netflix */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 10 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className={`relative z-20 bg-[#0f171e] transition-all duration-300 ${
              isPlaying && !isTapeLoading
                ? "w-screen h-[100dvh] max-w-none max-h-[100dvh] rounded-none border-0 m-0 p-0 overflow-hidden"
                : "w-full h-[100dvh] max-h-[100dvh] overflow-y-auto border-0 rounded-none m-0 p-0 shadow-2xl"
            }`}
            id="movie-detail-modal"
          >
            {/* REPRODUÇÃO DO PLAYER DE VÍDEO COMPLETO E REAL (OCUPA TODO O MODAL EM REPRODUÇÃO) */}
            {isPlaying && !isTapeLoading && (
              <div ref={playerContainerRef} className="absolute inset-0 bg-black flex flex-col text-white font-mono z-45 animate-fade-in h-full w-full overflow-hidden">
                {/* 1. Barra de Navegação Superior Moderna estilo Streaming (Completamente fora do iframe) */}
                <div className="min-h-[4.5rem] bg-zinc-950 border-b border-zinc-900/80 flex items-center justify-between px-3 sm:px-6 p-3 select-none shrink-0 z-50 gap-2.5 pt-[calc(env(safe-area-inset-top)+0.5rem)]">
                  {/* Esquerda: Botão Voltar gigante, super visível e fácil de clicar no mobile */}
                  <div className="flex items-center">
                    <button
                      onClick={() => setIsPlaying(false)}
                      className="bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-sans font-black text-sm h-12 px-5 rounded-lg transition-all flex items-center gap-2 shadow-lg shadow-rose-950/50 cursor-pointer focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:outline-none shrink-0 border border-rose-500/10"
                      aria-label="Voltar para Detalhes"
                      title="Voltar ao Catálogo"
                      id="btn-close-vhs-player"
                    >
                      <ArrowLeft className="w-5 h-5 stroke-[2.8]" />
                      <span className="font-black tracking-wider text-xs">VOLTAR</span>
                    </button>
                  </div>

                  {/* Centro: Título do Conteúdo */}
                  <div className="flex-1 text-center px-2 flex flex-col justify-center items-center overflow-hidden">
                    <span className="text-rose-500 font-mono text-[9px] font-black uppercase tracking-widest leading-none">ASSISTINDO AGORA</span>
                    <h2 className="text-zinc-100 text-xs sm:text-sm font-black font-sans mt-0.5 truncate uppercase tracking-wider max-w-[150px] xs:max-w-[190px] sm:max-w-md">
                      {movie.title}
                      {movie.type === 'series' && (
                        <span className="text-rose-400 ml-1.5 font-mono text-[10px] font-bold bg-rose-950/80 border border-rose-500/20 px-1.5 py-0.5 rounded">
                          S{season.toString().padStart(2, '0')}E{episode.toString().padStart(2, '0')}
                        </span>
                      )}
                    </h2>
                  </div>

                  {/* Direita: Controles Adicionais / Opções */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setIsPlaying(false);
                        setIsConfiguringPlayer(true);
                      }}
                      className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 font-sans font-bold text-[10px] sm:text-xs h-10 px-2.5 sm:px-3 rounded-lg transition-all flex items-center gap-1 cursor-pointer focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:outline-none"
                      title={movie.type === 'series' ? "Sintonizar canal (Episódio / Temporada)" : "Sintonizar qualidade de reprodução"}
                    >
                      <Settings className="w-3.5 h-3.5 text-rose-500" />
                      <span className="hidden xs:inline">{movie.type === 'series' ? 'MUDAR CAPÍTULO' : 'AJUSTAR SINAL'}</span>
                    </button>
                    <span className="hidden md:inline-flex items-center gap-1.5 uppercase font-mono text-[9px] text-zinc-400 bg-zinc-900 border border-zinc-850 px-2.5 py-1.5 rounded-lg select-none">
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span>
                      VHS_HD
                    </span>
                  </div>
                </div>

                {/* 2. Área do Reprodutor Inteligente (Detecção de Link Direto ou Iframe Tradicional) */}
                <div className="flex-1 w-full bg-black relative flex items-center justify-center overflow-hidden group">
                  {parsedVideo.type === 'direct' ? (
                    <div className="w-full h-full relative bg-black flex items-center justify-center overflow-hidden">
                      {/* Reprodutor HTML5 Nativo */}
                      <video
                        ref={videoRef}
                        src={parsedVideo.url}
                        className="w-full h-full max-h-full object-contain"
                        playsInline
                        preload="auto"
                        onPlay={() => setIsPlaying(true)}
                        onPause={() => setIsPlaying(false)}
                        onLoadedMetadata={() => {
                          if (videoRef.current) {
                            setTotalDuration(videoRef.current.duration || 110 * 60);
                          }
                        }}
                        onTimeUpdate={() => {
                          if (videoRef.current) {
                            const current = videoRef.current.currentTime;
                            const duration = videoRef.current.duration || totalDuration || 1;
                            const pct = (current / duration) * 100;
                            setCurrentTime(current);
                            onUpdateProgress(movie.id, pct, current, duration, current >= duration);
                          }
                        }}
                        onEnded={() => {
                          setIsPlaying(false);
                          onUpdateProgress(movie.id, 100, totalDuration, totalDuration, true);
                        }}
                      />

                      {/* Display de Status (OSD) Retro no canto superior esquerdo */}
                      <div className="absolute top-4 left-4 font-mono text-[10px] text-emerald-400 bg-black/80 px-3 py-1.5 rounded-lg border border-emerald-500/20 pointer-events-none select-none flex flex-col gap-0.5 z-20 shadow-lg shadow-black/80">
                        <div className="flex items-center gap-1.5 font-black uppercase tracking-widest">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                          VHS DIRECT
                        </div>
                        <div className="text-[9px] opacity-80 uppercase">VELOCIDADE: {playbackSpeed}x</div>
                        <div className="text-[9px] opacity-80 uppercase">SINAL: {preferredQuality.toUpperCase()}</div>
                      </div>

                      {/* Controles Customizados estilo Mesa de Som Retro */}
                      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-zinc-950 via-zinc-950/90 to-transparent p-4 sm:p-5 flex flex-col gap-3.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-300 z-30 select-none shadow-[0_-20px_50px_rgba(0,0,0,0.9)]">
                        {/* Linha da Barra de Progresso */}
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-[9px] sm:text-[10px] text-zinc-400 select-none min-w-[45px] text-right">
                            {formatVCRTime(currentTime)}
                          </span>
                          <input
                            type="range"
                            min={0}
                            max={totalDuration || 1}
                            step={0.1}
                            value={currentTime}
                            onChange={(e) => {
                              const newTime = parseFloat(e.target.value);
                              setCurrentTime(newTime);
                              if (videoRef.current) {
                                videoRef.current.currentTime = newTime;
                              }
                            }}
                            className="flex-1 h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-rose-500 hover:accent-rose-400 outline-none transition-all"
                          />
                          <span className="font-mono text-[9px] sm:text-[10px] text-zinc-400 select-none min-w-[45px]">
                            {formatVCRTime(totalDuration)}
                          </span>
                        </div>

                        {/* Linha dos Botões de Navegação */}
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-0">
                          {/* Esquerda: Play/Pause, Rebobinar/Avancar, e Ajuste de Sinal Rapido */}
                          <div className="flex items-center gap-3.5 w-full sm:w-auto justify-between sm:justify-start">
                            <div className="flex items-center gap-2">
                              {/* Botão de Rebobinar 10 Segundos */}
                              <button
                                onClick={() => {
                                  if (videoRef.current) {
                                    videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 10);
                                  }
                                }}
                                className="w-8 h-8 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 flex items-center justify-center transition-all cursor-pointer"
                                title="Rebobinar 10 segundos"
                              >
                                <span className="font-mono text-[10px] font-bold">⏪ 10s</span>
                              </button>

                              {/* Play / Pause Principal */}
                              <button
                                onClick={() => {
                                  if (videoRef.current) {
                                    if (isPlaying) {
                                      videoRef.current.pause();
                                    } else {
                                      videoRef.current.play().catch(err => console.log(err));
                                    }
                                  }
                                }}
                                className="w-10 h-10 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center transition-all cursor-pointer shadow shadow-rose-600/30 hover:scale-105 active:scale-95"
                              >
                                {isPlaying ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white translate-x-0.5" />}
                              </button>

                              {/* Botão de Avançar 10 Segundos */}
                              <button
                                onClick={() => {
                                  if (videoRef.current) {
                                    videoRef.current.currentTime = Math.min(totalDuration, videoRef.current.currentTime + 10);
                                  }
                                }}
                                className="w-8 h-8 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 flex items-center justify-center transition-all cursor-pointer"
                                title="Avançar 10 segundos"
                              >
                                <span className="font-mono text-[10px] font-bold">10s ⏩</span>
                              </button>
                            </div>

                            {/* Sintonizadores de Qualidade no HUD do Reprodutor */}
                            <div className="flex items-center gap-1 bg-zinc-950 border border-zinc-900 p-1 rounded-lg">
                              {['480p', '720p', '1080p'].map((q) => (
                                <button
                                  key={q}
                                  onClick={() => {
                                    setPreferredQuality(q);
                                    localStorage.setItem('vhsflix_preferred_quality', q);
                                  }}
                                  className={`px-2 py-1 text-[8px] sm:text-[9px] font-mono font-bold rounded transition-all cursor-pointer ${
                                    preferredQuality === q 
                                      ? 'bg-rose-600 text-white shadow-sm' 
                                      : 'text-zinc-500 hover:text-zinc-300'
                                  }`}
                                >
                                  {q.toUpperCase()}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Direita: Controles de Audio, Tela Cheia e Link Direto */}
                          <div className="flex items-center gap-3.5 w-full sm:w-auto justify-end">
                            {/* Link Direto Externo para rodar em reprodutores externos como VLC ou MX Player se quiser */}
                            <a
                              href={parsedVideo.url}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-1 text-zinc-400 hover:text-rose-400 text-[10px] font-mono font-bold bg-zinc-950 border border-zinc-850 px-3 py-1.5 rounded-lg transition-colors"
                              title="Abrir arquivo de vídeo direto em nova aba"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span className="hidden xs:inline">RODAR EXTERNO</span>
                            </a>

                            {/* Controles de Mudo / Volume */}
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => {
                                  setIsMuted(!isMuted);
                                }}
                                className="text-zinc-400 hover:text-white transition-colors cursor-pointer"
                                title={isMuted ? "Ativar som" : "Desativar som"}
                              >
                                {isMuted ? <VolumeX className="w-4 h-4 text-rose-500" /> : <Volume2 className="w-4 h-4" />}
                              </button>
                            </div>

                            {/* Botão Maximize de Tela Cheia */}
                            <button
                              onClick={() => {
                                if (videoRef.current) {
                                  if (document.fullscreenElement) {
                                    document.exitFullscreen();
                                  } else {
                                    videoRef.current.requestFullscreen().catch(err => {
                                      console.error(err);
                                    });
                                  }
                                }
                              }}
                              className="text-zinc-400 hover:text-white transition-colors cursor-pointer"
                              title="Tela cheia"
                            >
                              <Maximize className="w-4.5 h-4.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : parsedVideo.url ? (
                    <iframe
                      src={(() => {
                            const sep = parsedVideo.url.includes('?') ? '&' : '?';
                            return `${parsedVideo.url}${sep}autoplay=1${getQualityParams(preferredQuality)}`;
                          })()
                      }
                      title={`Reproduzindo ${movie.title}`}
                      className="w-full h-full border-0 absolute inset-0 video-player-iframe"
                      allowFullScreen
                      allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
                      referrerPolicy="origin"
                    />
                  ) : (
                    <div className="w-full max-w-md p-6 bg-zinc-900/90 border border-amber-500/30 rounded-2xl flex flex-col items-center justify-center text-center shadow-xl backdrop-blur-md">
                      <div className="w-14 h-14 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mb-3 text-amber-400">
                        <Tv className="w-7 h-7" />
                      </div>
                      <h3 className="text-lg font-bold text-white mb-2">Aguardando Envio no Abyss</h3>
                      <p className="text-zinc-400 text-xs leading-relaxed mb-5">
                        {syncFailedMessage || `A Temporada ${season}, Episódio ${episode} de "${movie.title}" ainda não está disponível no seu painel Abyss.`}
                      </p>
                      <button
                        onClick={handleReSyncCurrentEpisode}
                        disabled={isCheckingSync}
                        className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-2 transition-all shadow-lg shadow-amber-500/20 active:scale-95 disabled:opacity-50 cursor-pointer"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isCheckingSync ? 'animate-spin' : ''}`} />
                        {isCheckingSync ? 'Sintonizando no Abyss...' : 'Verificar Se Já Foi Adicionado'}
                      </button>

                      {/* Manual Link Input */}
                      <div className="w-full mt-4 pt-4 border-t border-zinc-800/80 text-left">
                        <label className="block text-[11px] font-mono font-semibold text-zinc-400 mb-1.5">
                          Ou vincule o ID / Link do Player Abyss manualmente:
                        </label>
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            if (!manualEmbedInput.trim()) return;
                            const input = manualEmbedInput.trim();
                            let cleanId = input;
                            if (input.includes('play.abyssplayer.com/')) {
                              cleanId = input.split('play.abyssplayer.com/')[1].split('?')[0].split('#')[0];
                            } else if (input.includes('abyssplayer.com/')) {
                              cleanId = input.split('abyssplayer.com/')[1].split('?')[0].split('#')[0];
                            }
                            
                            const playerUrl = `https://play.abyssplayer.com/${cleanId}`;

                            if (movie.type === 'series') {
                              const key = `${season}_${episode}`;
                              if (!movie.episodeEmbeds) movie.episodeEmbeds = {};
                              movie.episodeEmbeds[key] = playerUrl;
                              setAbyssEpisodeId(playerUrl);
                            } else {
                              movie.embedUrl = playerUrl;
                            }
                            setSyncFailedMessage(null);
                            setManualEmbedInput('');
                            setIsPlaying(true);
                          }}
                          className="flex gap-2"
                        >
                          <input
                            type="text"
                            value={manualEmbedInput}
                            onChange={(e) => setManualEmbedInput(e.target.value)}
                            placeholder="https://play.abyssplayer.com/{id} ou ID"
                            className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-rose-500 font-mono"
                          />
                          <button
                            type="submit"
                            className="bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs px-3 py-1.5 rounded-lg transition-all font-mono shrink-0 cursor-pointer"
                          >
                            Salvar
                          </button>
                        </form>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* CONFIGURADOR DO PLAYER RETRO (SOBREPÕE TODO O MODAL EM CONFIGURAÇÃO) */}
            {isConfiguringPlayer && (
              <div className="absolute inset-0 bg-zinc-950/98 backdrop-blur-md flex flex-col text-white font-mono z-45 animate-fade-in overflow-y-auto p-4 sm:p-8">
                {/* Botão de Fechar Configuração */}
                <div className="absolute top-4 right-4 z-50">
                  <button
                    onClick={() => setIsConfiguringPlayer(false)}
                    className="bg-black hover:bg-zinc-900 border border-zinc-850 text-zinc-440 hover:text-white p-2 text-xs sm:text-sm font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:outline-none"
                    aria-label="Voltar para Detalhes"
                  >
                    <X className="w-4 h-4 text-rose-500" />
                    <span className="hidden sm:inline">Voltar</span>
                  </button>
                </div>

                <div className="max-w-2xl w-full mx-auto my-auto flex flex-col gap-4 sm:gap-6 pt-10 pb-6 pr-1 pl-1">
                  {/* Header do Configurações */}
                  <div className="text-center select-none">
                    <span className="text-[10px] uppercase font-black tracking-widest text-rose-500 bg-rose-500/10 px-3 py-1 rounded-full border border-rose-500/20">
                      Sintonizador VHSFLIX v3.82
                    </span>
                    <h3 className="text-base sm:text-lg font-bold text-zinc-100 uppercase tracking-widest mt-3">
                      Sintonizar Reprodutor de Vídeo
                    </h3>
                    <p className="text-[10px] text-zinc-500 mt-1 max-w-sm mx-auto p-0">
                      Selecione o servidor, sintonizar canais de episódios e decole na fita retrô.
                    </p>
                  </div>

                  {/* Detalhes do Filme Selecionado */}
                  <div className="flex gap-4 p-3 rounded-lg border border-zinc-805/50 bg-zinc-900/40 items-center">
                    {movie.posterUrl && (
                      <img
                        src={movie.posterUrl}
                        alt={movie.title}
                        className="w-12 h-18 object-cover rounded border border-zinc-700 shadow animate-pulse"
                        referrerPolicy="no-referrer"
                      />
                    )}
                    <div className="text-left">
                      <p className="text-xs font-black font-sans text-rose-500 leading-none uppercase tracking-wider">
                        {movie.category}
                      </p>
                      <p className="text-sm font-bold text-white mt-1 leading-tight uppercase font-sans">
                        {movie.title}
                      </p>
                      <p className="text-[10px] text-zinc-400 mt-1">
                        Ano: {movie.year} • {movie.type === 'series' ? 'Série de TV' : 'Fita de Filme'}
                      </p>
                    </div>
                  </div>


                  {/* SELEÇÃO DE TEMPORADA / EPISÓDIO PARA SÉRIES */}
                  {movie.type === 'series' && (
                    <div className="flex flex-col gap-2.5 text-left">
                      <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-extrabold flex items-center gap-1.5">
                        <Tv className="w-3.5 h-3.5 text-rose-500" />
                        Sintonizar Canal (Temporada & Episódio)
                      </span>
                      <div className="flex flex-col sm:flex-row gap-4 w-full mt-1 font-mono">
                        {/* SELETOR DE TEMPORADA */}
                        <div className="flex-1 bg-zinc-900/60 p-4 rounded-xl border border-zinc-850 flex flex-col items-center select-none">
                          <span className="text-[9px] text-zinc-500 uppercase tracking-widest font-black mb-2 flex items-center gap-1">
                            <Tv className="w-3 h-3 text-rose-500" />
                            Temporada
                          </span>
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => setSeason(p => Math.max(1, p - 1))}
                              className="w-9 h-9 rounded bg-zinc-950 border border-zinc-800 hover:border-rose-500/40 text-zinc-400 hover:text-white flex items-center justify-center hover:bg-zinc-900 active:scale-95 transition-all font-black text-lg cursor-pointer"
                            >
                              -
                            </button>
                            <div className="w-16 h-10 bg-black border border-zinc-900 rounded flex items-center justify-center shadow-inner relative overflow-hidden">
                              <div className="absolute inset-x-0 top-0 h-[2px] bg-emerald-500/20 blur-[1px]"></div>
                              <span className="text-xl font-bold font-mono text-emerald-400 tracking-widest select-none drop-shadow-[0_0_6px_rgba(52,211,153,0.4)]">
                                {season.toString().padStart(2, '0')}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setSeason(p => p + 1)}
                              className="w-9 h-9 rounded bg-zinc-950 border border-zinc-800 hover:border-rose-500/40 text-zinc-400 hover:text-white flex items-center justify-center hover:bg-zinc-900 active:scale-95 transition-all font-black text-lg cursor-pointer animate-none"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        {/* SELETOR DE EPISÓDIO */}
                        <div className="flex-1 bg-zinc-900/60 p-4 rounded-xl border border-zinc-850 flex flex-col items-center select-none">
                          <span className="text-[9px] text-zinc-500 uppercase tracking-widest font-black mb-2 flex items-center gap-1">
                            <Film className="w-3 h-3 text-rose-500" />
                            Episódio
                          </span>
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => setEpisode(p => Math.max(1, p - 1))}
                              className="w-9 h-9 rounded bg-zinc-950 border border-zinc-800 hover:border-rose-500/40 text-zinc-400 hover:text-white flex items-center justify-center hover:bg-zinc-900 active:scale-95 transition-all font-black text-lg cursor-pointer animate-none"
                            >
                              -
                            </button>
                            <div className="w-16 h-10 bg-black border border-zinc-900 rounded flex items-center justify-center shadow-inner relative overflow-hidden">
                              <div className="absolute inset-x-0 top-0 h-[2px] bg-emerald-500/20 blur-[1px]"></div>
                              <span className="text-xl font-bold font-mono text-emerald-400 tracking-widest select-none drop-shadow-[0_0_6px_rgba(52,211,153,0.4)]">
                                {episode.toString().padStart(2, '0')}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setEpisode(p => p + 1)}
                              className="w-9 h-9 rounded bg-zinc-950 border border-zinc-800 hover:border-rose-500/40 text-zinc-400 hover:text-white flex items-center justify-center hover:bg-zinc-900 active:scale-95 transition-all font-black text-lg cursor-pointer animate-none"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* QUALIDADE DE SINAL & PRÉ-CARREGAMENTO (RETRO VHS STYLE) */}
                  <div className="flex flex-col gap-2.5 text-left">
                    <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-extrabold flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
                      Ajuste de Sinal / Velocidade do Buffer
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono">
                      {[
                        { id: '360p', label: 'LP (360p)', desc: 'Carrega Instantâneo' },
                        { id: '480p', label: 'SP (480p)', desc: 'Desempenho Fluido' },
                        { id: '720p', label: 'HQ (720p)', desc: 'Alta Definição' },
                        { id: '1080p', label: 'S-VHS (1080p)', desc: 'Qualidade Máxima' }
                      ].map(q => (
                        <button
                          key={q.id}
                          type="button"
                          onClick={() => {
                            setPreferredQuality(q.id);
                            localStorage.setItem('vhsflix_preferred_quality', q.id);
                          }}
                          className={`p-3 rounded-lg border text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-1 select-none ${
                            preferredQuality === q.id
                              ? 'bg-rose-500/10 border-rose-500 text-rose-400 shadow-md shadow-rose-600/15'
                              : 'bg-zinc-900/40 border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200'
                          }`}
                        >
                          <span className="text-[11px] font-bold uppercase tracking-widest">{q.label}</span>
                          <span className="text-[8px] opacity-50 tracking-normal font-sans font-medium">{q.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* BOTÃO DE INSERIR E REPRODUZIR */}
                  <button
                    type="button"
                    onClick={handleStartPlayback}
                    className="w-full bg-rose-600 hover:bg-rose-700 active:scale-[0.99] transition-all text-white font-black text-xs sm:text-sm uppercase tracking-widest py-4 sm:py-5 rounded-xl flex items-center justify-center gap-2.5 shadow-xl shadow-rose-950/20 cursor-pointer text-shadow mt-2 animate-none"
                  >
                    <Play className="w-4 h-4 fill-current text-white animate-pulse" />
                    <span>Inserir VHS e Iniciar Reprodução</span>
                  </button>
                </div>
              </div>
            )}

            {/* Botão de Fechar Modal (Visível em posição fixa no topo direito da tela) */}
            {(!isPlaying || isTapeLoading) && !isConfiguringPlayer && (
              <button
                onClick={onClose}
                className="fixed top-4 right-4 sm:top-6 sm:right-8 bg-zinc-900/90 hover:bg-rose-600 hover:text-white text-zinc-100 p-3.5 rounded-full z-[70] border border-zinc-700/80 shadow-2xl transition-all duration-200 active:scale-90 hover:scale-110 cursor-pointer focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:outline-none flex items-center justify-center"
                id="btn-close-modal"
                aria-label="Fechar Modal (Exclusivo)"
                title="Fechar Detalhes"
              >
                <X className="w-6 h-6 stroke-[2.5]" />
              </button>
            )}

            {/* --- ÁREA SUPERIOR: BANNER OU CARREGAMENTO DA FITA --- */}
            <div className="relative h-[42vh] min-h-[320px] xs:min-h-[360px] sm:h-[55vh] sm:min-h-[440px] md:h-[64vh] md:min-h-[500px] lg:h-[72vh] lg:min-h-[560px] w-full bg-zinc-950 overflow-hidden flex flex-col justify-end">
              {isTapeLoading ? (
                /* CASO 2: ANIMAÇÃO ESTÉTICA DE CARREGAMENTO DA FITA VHS */
                <div className="absolute inset-0 bg-black flex flex-col justify-center items-center font-mono text-zinc-400 z-30 select-none vhs-crt-flicker p-4">
                  <div className="w-40 h-10 border border-zinc-800 rounded-lg p-1.5 mb-4 flex gap-1 items-center bg-zinc-950">
                    <span className="w-2.5 h-2.5 bg-red-600 rounded-full animate-pulse"></span>
                    <div className="flex-1 bg-zinc-900 h-full rounded overflow-hidden relative">
                      <div className="absolute top-0 bottom-0 bg-zinc-800 animate-pulse" style={{ right: 0, left: '30%' }}></div>
                    </div>
                    <span className="text-[10px] text-zinc-600">VCR_HEAD</span>
                  </div>
                  <h3 className="text-sm font-bold text-amber-500 tracking-widest uppercase animate-pulse">INSERINDO FITA VHS...</h3>
                  <div className="flex flex-col gap-1 mt-4 text-center text-[10px] text-zinc-600 max-w-xs">
                    <p>SISTEMA VHSFLIX CO. EST. 1982</p>

                    <p className="font-mono">CARREGANDO DADOS {movie.title.substring(0, 15).toUpperCase()}...</p>
                  </div>
                </div>
              ) : (
                /* CASO 3: TELA DE DETALHE PADRÃO COM HERO BANNER CINEMATOGRÁFICO WIDESCREEN ESTILO PRIME VIDEO */
                <>
                  <img
                    src={movie.backdropUrl}
                    alt={movie.title}
                    className="w-full h-full object-cover object-center select-none scale-100 transform duration-700 hover:scale-105"
                    referrerPolicy="no-referrer"
                  />
                  
                  {/* Sombreado elegante estilo Prime Video / Netflix */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0f171e] via-[#0f171e]/60 via-40% to-black/30 z-10" />
                  <div className="absolute inset-0 bg-gradient-to-r from-[#0f171e]/90 via-[#0f171e]/40 to-transparent z-10 hidden sm:block" />
                  <div className="absolute top-0 inset-x-0 h-28 bg-gradient-to-b from-black/80 via-black/20 to-transparent z-10" />

                  {/* Detalhes Rápidos no Banner */}
                  <div className="absolute bottom-6 left-6 sm:bottom-12 sm:left-12 lg:bottom-14 lg:left-16 right-6 sm:right-12 lg:right-16 text-left z-20 flex flex-col items-start max-w-5xl">
                    
                    {/* Linha de Badges / Tags estilo Prime Video */}
                    <div className="flex items-center flex-wrap gap-2 mb-2 sm:mb-4">
                      <span className="bg-rose-600 text-white font-mono text-[10px] sm:text-xs font-black px-2.5 py-1 rounded-md tracking-wider uppercase shadow-lg border border-rose-500/30">
                        {movie.category}
                      </span>
                      {movie.rating && (
                        <span className="bg-zinc-900/90 border border-zinc-700/80 text-amber-400 font-bold text-[11px] sm:text-xs px-2.5 py-1 rounded-md flex items-center gap-1 shadow-md">
                          ★ {movie.rating} TMDB
                        </span>
                      )}
                      <span className="bg-zinc-900/80 border border-zinc-800 text-zinc-300 font-medium text-[11px] sm:text-xs px-2.5 py-1 rounded-md">
                        {movie.year}
                      </span>
                      {movie.type === 'series' ? (
                        <span className="bg-zinc-950/90 border border-rose-500/30 text-rose-400 font-bold text-[11px] sm:text-xs px-2.5 py-1 rounded-md uppercase tracking-wide">
                          Série de TV
                        </span>
                      ) : (
                        <span className="bg-zinc-900/80 border border-zinc-800 text-zinc-300 font-medium text-[11px] sm:text-xs px-2.5 py-1 rounded-md">
                          Filme
                        </span>
                      )}
                    </div>

                    {/* Título Principal Amplo e Imponente */}
                    <h2 className="text-2xl xs:text-3xl sm:text-5xl md:text-6xl font-black font-display text-white tracking-tight leading-[1.1] uppercase text-shadow drop-shadow-2xl">
                      {movie.title}
                    </h2>

                    {/* Botões Rápidos e Interativos */}
                    <div className="flex flex-col sm:flex-row items-center gap-2.5 sm:gap-4 mt-4 sm:mt-8 w-full sm:w-auto">
                      
                      <button
                        onClick={handlePlayClick}
                        className="w-full sm:w-auto bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs sm:text-base px-6 py-3 sm:px-8 sm:py-4 rounded-xl transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2.5 shadow-xl shadow-rose-600/30 cursor-pointer focus-visible:ring-4 focus-visible:ring-rose-500 focus-visible:outline-none tracking-wide"
                        id="btn-modal-play"
                      >
                        <Play className="w-5 h-5 sm:w-6 sm:h-6 fill-white" />
                        <span>
                          {progressState && progressState.progress > 0 
                            ? `Continuar (${Math.round(progressState.progress)}%)` 
                            : 'Assistir Trailer / Filme'
                          }
                        </span>
                      </button>

                      <button
                        onClick={() => onToggleMyList(movie.id)}
                        className={`w-full sm:w-auto text-xs sm:text-base font-semibold px-6 py-3 sm:px-7 sm:py-4 rounded-xl border transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2.5 cursor-pointer focus-visible:ring-4 focus-visible:ring-rose-500 focus-visible:outline-none ${
                          isAddedToList 
                            ? 'bg-rose-500/10 border-rose-500 text-rose-400' 
                            : 'border-zinc-700/80 text-zinc-200 hover:text-white hover:border-zinc-400 bg-zinc-900/80 backdrop-blur-md'
                        }`}
                        id="btn-modal-mylist"
                      >
                        {isAddedToList ? (
                          <>
                            <Check className="w-5 h-5 text-rose-500" />
                            <span>Remover da Lista</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-5 h-5" />
                            <span>Minha Lista</span>
                          </>
                        )}
                      </button>

                      {/* Se houver progresso, botão para rebobinar */}
                      {progressState && progressState.progress > 0 && (
                        <button
                          onClick={handleResetProgress}
                          className="w-full sm:w-auto bg-zinc-900/80 border border-zinc-800 text-zinc-400 hover:text-rose-500 px-5 py-3 sm:p-4 rounded-xl transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2 cursor-pointer focus-visible:ring-4 focus-visible:ring-rose-500 focus-visible:outline-none"
                          title="Recomeçar do início (Rebobinar de forma digital)"
                          id="btn-modal-rewind"
                        >
                          <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5" />
                          <span className="sm:hidden text-xs font-semibold">Rebobinar Fita</span>
                        </button>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* --- ÁREA INFERIOR: ABAS DE DETALHES E TRAILER EMBED (WIDE E ESPAÇOSO ESTILO STREAMING) --- */}
            <div className="w-full px-5 sm:px-10 lg:px-16 xl:px-20 py-8 sm:py-12 text-left bg-[#0f171e] text-zinc-300 font-sans border-t border-zinc-800/80 min-h-[50vh]">
              
              {/* Menu de Abas Estilo Prime Video */}
              <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4 mb-8">
                <div className="flex gap-8 sm:gap-12 font-sans font-bold text-base sm:text-lg">
                  {movie.type === 'series' && (
                    <button
                      onClick={() => setActiveTab('episodes')}
                      className={`relative pb-3 text-sm sm:text-base transition-all focus:outline-none cursor-pointer ${
                        activeTab === 'episodes' 
                          ? 'text-white font-bold' 
                          : 'text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      Episódios
                      {activeTab === 'episodes' && (
                        <motion.div layoutId="activeTabUnderline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-rose-500 rounded-full" />
                      )}
                    </button>
                  )}
                  <button
                    onClick={() => setActiveTab('related')}
                    className={`relative pb-3 text-sm sm:text-base transition-all focus:outline-none cursor-pointer ${
                        activeTab === 'related' 
                          ? 'text-white font-bold' 
                          : 'text-zinc-500 hover:text-zinc-300'
                      }`}
                  >
                    Relacionados
                    {activeTab === 'related' && (
                      <motion.div layoutId="activeTabUnderline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-rose-500 rounded-full" />
                    )}
                  </button>
                  <button
                    onClick={() => setActiveTab('details')}
                    className={`relative pb-3 text-sm sm:text-base transition-all focus:outline-none cursor-pointer ${
                        activeTab === 'details' 
                          ? 'text-white font-bold' 
                          : 'text-zinc-500 hover:text-zinc-300'
                      }`}
                  >
                    Detalhes
                    {activeTab === 'details' && (
                      <motion.div layoutId="activeTabUnderline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-rose-500 rounded-full" />
                    )}
                  </button>
                </div>

                {/* Rating Badge */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono px-3 py-1 bg-zinc-900 border border-zinc-800 rounded-md text-amber-400 font-bold">
                    TMDB ★ {movie.rating}
                  </span>
                </div>
              </div>

              {/* CONTEÚDO DAS ABAS */}
              {activeTab === 'episodes' && movie.type === 'series' && (
                <div className="space-y-6">
                  {/* Seletor de Temporadas Style Prime Video com Dropdown List */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="relative">
                      <button
                        onClick={() => setIsSeasonDropdownOpen(!isSeasonDropdownOpen)}
                        className="flex items-center justify-between gap-3 px-4.5 py-2.5 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-lg text-white font-bold text-sm transition-all focus:ring-2 focus:ring-rose-500 cursor-pointer"
                      >
                        <span className="font-sans">Temporada {season}</span>
                        <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform duration-300 ${isSeasonDropdownOpen ? 'rotate-180' : ''}`} />
                      </button>

                      {/* Dropdown Box (Segunda Foto do User - Prime Video Dropdown List) */}
                      <AnimatePresence>
                        {isSeasonDropdownOpen && (
                          <>
                            {/* Overlay invisível para fechar ao clicar fora */}
                            <div className="fixed inset-0 z-40" onClick={() => setIsSeasonDropdownOpen(false)} />
                            
                            <motion.div
                              initial={{ opacity: 0, y: -5 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -5 }}
                              transition={{ duration: 0.15 }}
                              className="absolute left-0 mt-2 w-52 bg-[#1a242f] border border-zinc-800 rounded-xl shadow-2xl overflow-hidden py-1.5 z-50 font-sans"
                            >
                              {getSeriesSeasonsData(movie).map((s) => (
                                <button
                                  key={s.seasonNumber}
                                  onClick={() => {
                                    setSeason(s.seasonNumber);
                                    setEpisode(1); // Reset ep to 1 on season switch
                                    setIsSeasonDropdownOpen(false);
                                  }}
                                  className={`w-full text-left px-4 py-2.5 text-xs sm:text-sm transition-all flex items-center justify-between cursor-pointer ${
                                    season === s.seasonNumber
                                      ? 'text-white font-black bg-rose-600/20 hover:bg-rose-600/30'
                                      : 'text-zinc-300 hover:text-white hover:bg-zinc-855'
                                  }`}
                                >
                                  <span>Temporada {s.seasonNumber}</span>
                                  <span className="text-[10px] text-zinc-500 font-mono">({s.episodesCount} eps)</span>
                                </button>
                              ))}
                            </motion.div>
                          </>
                        )}
                      </AnimatePresence>
                    </div>

                    <div className="text-zinc-500 text-xs font-mono lowercase tracking-wider">
                      {getSeriesSeasonsData(movie).find(s => s.seasonNumber === season)?.episodesCount || 8} episódios • Canal Sintonizado
                    </div>
                  </div>

                  {/* Grid de Episódios (Prime Video Quadrículas Format) */}
                  {isLoadingEpisodes ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center w-full space-y-3">
                      <RefreshCw className="w-8 h-8 text-rose-500 animate-spin" />
                      <p className="text-sm text-zinc-400 font-mono uppercase tracking-widest">Sintonizando episódios da fita...</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 sm:gap-8 mt-6">
                      {(tmdbEpisodes[`${movie.id}_s${season}`] || getEpisodesForSeries(movie, season)).map((ep) => (
                        <div
                          key={ep.number}
                          onClick={() => handleEpisodeClick(ep.number)}
                          className="group flex flex-col bg-[#1a242f]/40 border border-zinc-800/80 hover:border-rose-500/50 rounded-2xl overflow-hidden cursor-pointer hover:shadow-2xl hover:shadow-black/80 hover:scale-[1.03] transition-all duration-300 relative"
                        >
                          {/* Imagem do Capítulo (Thumbnail) */}
                          <div className="relative aspect-[16/9] w-full bg-zinc-950 overflow-hidden">
                            <img
                              src={ep.thumbnailUrl}
                              alt={`Episódio ${ep.number}`}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                            {/* Play HUD Overlay */}
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-300">
                              <div className="w-12 h-12 rounded-full bg-rose-600 flex items-center justify-center text-white shadow-2xl transform scale-75 group-hover:scale-100 transition-transform duration-300">
                                <Play className="w-6 h-6 fill-current ml-0.5" />
                              </div>
                            </div>

                            {/* Duração Badge */}
                            <div className="absolute bottom-2.5 right-2.5 px-2 py-0.5 bg-black/80 backdrop-blur-md rounded-md text-[10px] font-bold font-mono text-zinc-200">
                              {ep.duration}
                            </div>

                            {/* Número do Episódio Header Badge */}
                            <div className="absolute top-2.5 left-2.5 px-2.5 py-1 bg-black/80 backdrop-blur-md rounded-md font-sans text-[11px] font-extrabold uppercase tracking-wider text-rose-400 border border-rose-500/20">
                              EP {ep.number}
                            </div>
                          </div>

                          {/* Detalhes do Episódio */}
                          <div className="p-5 flex-1 flex flex-col justify-between">
                            <div className="space-y-2">
                              <h4 className="font-bold text-base text-zinc-100 group-hover:text-rose-400 transition-colors leading-snug line-clamp-1">
                                {ep.number}. {ep.title}
                              </h4>
                              <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed font-sans font-normal line-clamp-3">
                                {ep.description}
                              </p>
                            </div>

                            {/* Labels e stamps do episódio no rodapé do card */}
                            <div className="flex items-center gap-2.5 mt-5 pt-4 border-t border-zinc-800/60 text-[11px] text-zinc-400 font-mono font-medium">
                              <span className="px-1.5 py-0.5 bg-zinc-900 border border-zinc-800 text-zinc-300 rounded text-[10px] font-bold">
                                {ep.ratingCode}
                              </span>
                              <span>CC</span>
                              <span>•</span>
                              <span className="truncate">{ep.releaseDate}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Aba de Títulos Relacionados */}
              {activeTab === 'related' && (
                <div className="space-y-6">
                  <div className="flex flex-col">
                    <h3 className="text-zinc-300 text-sm font-sans font-bold uppercase mb-1 tracking-wider flex items-center gap-2 flex-wrap">
                      <Film className="w-4 h-4 text-rose-500 animate-pulse" /> Títulos Recomendados no Mesmo Segmento
                    </h3>
                    <p className="text-xs sm:text-sm text-zinc-400 font-sans mt-0.5">Obras recomendadas na mesma categoria: <span className="text-rose-400 font-semibold">{movie.category}</span></p>
                  </div>
 
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 sm:gap-8 mt-6">
                    {relatedList.length > 0 ? (
                      relatedList.map((rMovie) => (
                        <div 
                          key={rMovie.id}
                          className="group relative cursor-pointer overflow-hidden rounded-2xl bg-zinc-900/80 border border-zinc-800 hover:border-rose-500 hover:shadow-2xl hover:shadow-rose-600/20 focus-visible:ring-4 focus-visible:ring-rose-500 transition-all duration-300"
                          onClick={() => {
                            if (onSelectMovie) {
                              onSelectMovie(rMovie);
                            }
                          }}
                        >
                          <div className="relative aspect-[2/3] w-full bg-zinc-950 overflow-hidden">
                            <img 
                              src={rMovie.posterUrl || rMovie.backdropUrl || 'https://image.tmdb.org/t/p/original/vKof7jZ50vS2pYgO569ofCidG9y.jpg'} 
                              alt={rMovie.title} 
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-500"
                              loading="lazy"
                            />
                            
                            {/* Tape Sticker Badge in Card */}
                            <div className="absolute top-2 right-2 px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase text-zinc-950 z-20 bg-rose-500 select-none shadow-md">
                              {rMovie.category}
                            </div>

                            {/* Overlay no Hover */}
                            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/30 to-transparent flex flex-col justify-end p-3 sm:p-4 bg-black/20 group-hover:bg-black/60 transition-all">
                              <div>
                                <span className="text-[9px] font-mono font-black uppercase tracking-wider text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20 inline-block">
                                  {rMovie.type === 'movie' ? 'Filme' : 'Série'}
                                </span>
                                <h4 className="text-white font-bold text-xs sm:text-sm mt-1.5 font-sans truncate drop-shadow">{rMovie.title}</h4>
                                <div className="flex items-center justify-between mt-1 text-[10px] sm:text-xs text-zinc-300 font-mono">
                                  <span>{rMovie.year}</span>
                                  <span className="text-amber-400 font-bold">★ {rMovie.rating || '8.2'}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="col-span-full py-14 bg-zinc-900/20 rounded-2xl border border-dashed border-zinc-800 text-center text-zinc-500 text-sm font-mono uppercase">
                        Nenhuma outra obra cadastrada nesta categoria
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Aba de Detalhes Completo */}
              {activeTab === 'details' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 sm:gap-12 lg:gap-16 mt-6">
                  
                  {/* Lado Esquerdo/Centro: Sinopse, Opinião */}
                  <div className="md:col-span-2 flex flex-col gap-6">
                    
                    {/* Opinião do Espectador */}
                    <div className="bg-zinc-900/40 border border-zinc-800/60 p-4.5 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4 select-none">
                      <div className="flex flex-col items-center sm:items-start text-center sm:text-left">
                        <span className="text-[10px] uppercase font-mono font-bold tracking-widest text-[#10b981]">Feedback Relevante</span>
                        <h4 className="text-[12px] font-bold text-zinc-300 mt-0.5">O que você acha desta fita de vídeo retro?</h4>
                      </div>
                      
                      <div className="flex items-center gap-2.5">
                        <button
                          onClick={() => onVoteMovie && onVoteMovie(movie.id, 'like')}
                          className={`px-3.5 py-2 rounded-lg border text-xs font-mono font-bold flex items-center gap-2 transition-all active:scale-95 cursor-pointer ${
                            localStorage.getItem(`vote_${activeProfileId}_${movie.id}`) === 'like'
                              ? 'bg-[#10b981]/10 border-[#10b981] text-[#10b981] font-black'
                              : 'border-zinc-805 bg-zinc-950/60 text-zinc-400 hover:text-[#10b981] hover:border-[#10b981]/40'
                          }`}
                        >
                          <ThumbsUp className={`w-3.5 h-3.5 ${localStorage.getItem(`vote_${activeProfileId}_${movie.id}`) === 'like' ? 'fill-current text-[#10b981]' : ''}`} />
                          <span>{movie.votesLikes || 0}</span>
                        </button>

                        <button
                          onClick={() => onVoteMovie && onVoteMovie(movie.id, 'dislike')}
                          className={`px-3.5 py-2 rounded-lg border text-xs font-mono font-bold flex items-center gap-2 transition-all active:scale-95 cursor-pointer ${
                            localStorage.getItem(`vote_${activeProfileId}_${movie.id}`) === 'dislike'
                              ? 'bg-rose-500/10 border-rose-500 text-rose-400 font-black'
                              : 'border-zinc-805 bg-zinc-950/60 text-zinc-400 hover:text-rose-400 hover:border-rose-500/40'
                          }`}
                        >
                          <ThumbsDown className={`w-3.5 h-3.5 ${localStorage.getItem(`vote_${activeProfileId}_${movie.id}`) === 'dislike' ? 'fill-current text-rose-400' : ''}`} />
                          <span>{movie.votesDislikes || 0}</span>
                        </button>
                      </div>
                    </div>

                    {/* Fita Estojo */}
                    <div 
                      className="p-3.5 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono"
                      style={{ borderColor: `${tapeColor}30`, backgroundColor: `${tapeColor}08` }}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="w-3.5 h-3.5 rounded-full inline-block animate-pulse" style={{ backgroundColor: tapeColor }}></span>
                        <div>
                          <p className="text-zinc-200 font-bold uppercase tracking-wider">Edição Especial - Fita Videocassete</p>
                          <p className="text-zinc-400 text-[10px]">Gênero: <span className="font-bold" style={{ color: tapeColor }}>{movie.category}</span></p>
                        </div>
                      </div>
                      <div className="text-[10px] text-zinc-400">
                        <span>Cor: </span>
                        <span className="capitalize font-bold" style={{ color: tapeColor }}>{tapeLabel}</span>
                      </div>
                    </div>

                    {/* Sinopse */}
                    <div>
                      <h3 className="text-zinc-500 text-xs font-mono font-bold uppercase mb-2 tracking-wider">Sinopse da Obra</h3>
                      <p className="text-sm sm:text-base text-zinc-300 leading-relaxed font-sans font-normal">
                        {movie.description}
                      </p>
                    </div>

                    {/* Progresso */}
                    {progressState && progressState.progress > 0 && (
                      <div className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-850 flex justify-between items-center text-xs font-mono">
                        <div>
                          <p className="text-zinc-300 font-bold">ESTADO DE EXECUÇÃO VHS</p>
                          <p className="text-zinc-500 text-[11px] mt-0.5">
                            Parou em <span className="text-rose-400">{formatVCRTime(progressState.currentTime)}</span> de {formatVCRTime(totalDuration)}. ({Math.round(progressState.progress)}% concluído).
                          </p>
                        </div>
                        <button
                          onClick={handlePlayClick}
                          className="bg-rose-600/10 hover:bg-rose-600 text-rose-500 hover:text-white px-3 py-1.5 rounded transition-all text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                        >
                          <Play className="w-3 h-3 fill-current" /> Retomar fita
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Lado Direito: Especificações e Elenco */}
                  <div className="flex flex-col gap-6 border-t md:border-t-0 md:border-l border-zinc-900 pt-6 md:pt-0 md:pl-6">
                    <div>
                      <h3 className="text-zinc-500 text-xs font-mono font-bold uppercase mb-3.5 tracking-wider">
                        Ficha de Catalogação
                      </h3>
                      <div className="flex flex-col gap-4 text-xs sm:text-sm font-sans">
                        <div>
                          <span className="text-zinc-500 font-mono uppercase font-bold text-[10px] block mb-1 tracking-wider">Gênero / Categoria</span>
                          <span className="text-rose-400 font-semibold font-sans">{movie.category}</span>
                        </div>

                        <div>
                          <span className="text-zinc-500 font-mono uppercase font-bold text-[10px] block mb-1 tracking-wider">Lançamento VHS</span>
                          <span className="text-zinc-300 font-medium font-sans">{movie.year} ({movie.type === 'movie' ? 'Fita Cinematográfica' : 'Televisivo'})</span>
                        </div>

                        {movie.type === 'series' && (
                          <div className="border-t border-zinc-850 pt-3 mt-1">
                            <span className="text-zinc-500 font-mono uppercase font-bold text-[10px] block mb-2 tracking-wider flex items-center gap-1.5">
                              <Tv className="w-3.5 h-3.5 text-rose-500" /> Catalogação de Temporadas
                            </span>
                            
                            {(() => {
                              const seasonsData = getSeriesSeasonsData(movie);
                              const totalEpisodes = seasonsData.reduce((acc, s) => acc + s.episodesCount, 0);
                              return (
                                <div className="space-y-2.5">
                                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                                    Sinal sintonizado com <span className="text-rose-500 font-black">{seasonsData.length} temporada(s)</span> e <span className="text-[#10b981] font-bold">{totalEpisodes} episódios</span> no total.
                                  </p>
                                </div>
                              );
                            })()}
                          </div>
                        )}
                        
                        {/* Elenco Fictício ou Real com base nas imagens do Prime Video */}
                        <div className="border-t border-zinc-850 pt-3">
                          <span className="text-zinc-500 font-mono uppercase font-bold text-[10px] block mb-2.5 tracking-wider">
                            Elenco Principal
                          </span>
                          <p className="text-xs text-zinc-300 leading-relaxed">
                            {movie.id === 'm13' ? (
                              "Sadie Soverall, Matt Cornett, Michael Bradway"
                            ) : movie.tmdbId === 66732 ? (
                              "Millie Bobby Brown, Winona Ryder, David Harbour, Finn Wolfhard"
                            ) : (
                              "Atores da fita, Diretores independentes, Equipe de gravação VHS"
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Seção Widescreen para o Trailer - Ampla, Grande e Imersiva! */}
                  {!isPlaying && (
                    <div className="col-span-full border-t border-zinc-900 pt-6 mt-4">
                      <h3 className="text-zinc-400 text-xs font-mono font-bold uppercase mb-4 tracking-wider flex items-center gap-1.5 justify-center sm:justify-start font-bold">
                        <Film className="w-4 h-4 text-rose-500" /> Assistir Prévias / Trailer Oficial
                      </h3>
                      <div className="relative aspect-[16/9] w-full max-w-4xl mx-auto rounded-xl overflow-hidden border border-zinc-850 shadow-2xl shadow-black/90 bg-zinc-900">
                        <iframe
                          src={`${smartTrailerUrl || movie.trailerUrl || 'https://www.youtube.com/embed/mqq_H30_u5Q'}?controls=1&autoplay=0&mute=0&vq=hd1080&rel=0`}
                          title={`Trailer de ${movie.title}`}
                          className="w-full h-full border-0 absolute inset-0 font-sans"
                          allowFullScreen
                          webkitallowfullscreen="true"
                          mozallowfullscreen="true"
                          allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
                        />
                      </div>
                      <span className="text-[11px] text-zinc-500 font-mono mt-4 block text-center uppercase tracking-wider">
                        Alterne para Tela Cheia no player para melhor experiência cinematográfica
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
