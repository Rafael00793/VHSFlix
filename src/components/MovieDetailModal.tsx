/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Movie, WatchProgress } from '../types';
import { X, Play, Pause, Plus, Check, Star, RefreshCw, Tv, Clock, HelpCircle, Film, Sparkles, AlertCircle, ExternalLink, Maximize, Shield, Sliders, ThumbsUp, ThumbsDown, ChevronDown, ArrowLeft, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { INITIAL_MOVIES } from '../data';

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
  tmdbApiKey
}: MovieDetailModalProps) {
  const [isPlaying, setIsPlaying] = useState(false);
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
  
  // Real-time episode mapping from TMDB if applicable
  const [tmdbEpisodes, setTmdbEpisodes] = useState<{ [key: string]: Episode[] }>({});
  const [isLoadingEpisodes, setIsLoadingEpisodes] = useState(false);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const currentTimeRef = useRef(currentTime);
  const playerContainerRef = useRef<HTMLDivElement>(null);

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

  // AdGuard Active Protection Engine (Anti-Ads / Anti-Popups / Anti-Redirection)
  useEffect(() => {
    if (!isPlaying || !adguardEnabled) return;

    // Intercepta tentativas automáticas de redirecionar ou sair da página principal
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "AdGuard Pro bloqueou um redirecionamento de anúncio externo.";
      return e.returnValue;
    };

    // Bloqueia qualquer clique ou evento que tente de alguma forma iniciar abertura de abas externas/popups
    const preventPopups = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement;
      const closestLink = target.closest('a');
      if (closestLink) {
        const href = closestLink.getAttribute('href') || '';
        const targetAttr = closestLink.getAttribute('target') || '';

        if (targetAttr === '_blank' || href.startsWith('http') || href.startsWith('//')) {
          try {
            const urlObj = new URL(href, window.location.href);
            if (urlObj.hostname !== window.location.hostname) {
              e.preventDefault();
              e.stopPropagation();
              console.warn("[AdGuard Pro] Link ou Popup bloqueado com sucesso:", href);
            }
          } catch (err) {
            e.preventDefault();
            e.stopPropagation();
          }
        }
      }
    };

    // Sobrescreve com segurança o window.open para evitar novos popups de abrirem via script
    const originalOpen = window.open;
    // @ts-ignore
    window.open = function() {
      console.warn("[AdGuard Pro] Tentativa bloqueada de criar uma nova aba/janela.");
      return {
        focus: () => {},
        blur: () => {},
        close: () => {},
        postMessage: () => {}
      }; // Retorna objeto proxy inofensivo para evitar erros de compilação/execução em scripts invasivos
    };

    // Bloqueia manipulações de window.top para redirecionar a página inteira
    const preventFrameEscape = () => {
      try {
        if (window.top && window.top !== window.self) {
          window.top.onbeforeunload = function() {
            return "O AdGuard impediu que o reprodutor nativo tentasse escapar da página.";
          };
        }
      } catch (e) {}
    };

    const intervalId = setInterval(preventFrameEscape, 1000);

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('click', preventPopups, true);
    document.addEventListener('mousedown', preventPopups, true);
    document.addEventListener('mouseup', preventPopups, true);

    return () => {
      // @ts-ignore
      window.open = originalOpen;
      clearInterval(intervalId);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('click', preventPopups, true);
      document.removeEventListener('mousedown', preventPopups, true);
      document.removeEventListener('mouseup', preventPopups, true);
    };
  }, [isPlaying, adguardEnabled]);

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
    if (isPlaying && movie) {
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
  }, [isPlaying, totalDuration, movie?.id, playbackSpeed, onUpdateProgress]);

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
        <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md transition-all duration-300 ${
          isPlaying && !isTapeLoading ? 'p-0 overflow-hidden' : 'p-0 md:p-4 overflow-y-auto'
        }`}>
          {/* Backdrop de click para fechar */}
          <div className="absolute inset-0 z-10 hidden md:block" onClick={onClose} />

          {/* Card Principal do Detalhe (Estilo Caixa Estojo VHS) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ duration: 0.25 }}
            className={`relative z-20 bg-zinc-950 overflow-hidden shadow-2xl flex flex-col transition-all duration-300 ${
              isPlaying && !isTapeLoading
                ? "w-screen h-screen md:h-screen max-w-none max-h-none rounded-none border-0 m-0 p-0"
                : "w-full max-w-4xl border-0 md:border border-zinc-800 rounded-none md:rounded-xl h-[100dvh] md:h-auto md:max-h-[92vh]"
            }`}
            id={`detail-modal-${movie.id}`}
          >
            {/* REPRODUÇÃO DO PLAYER DE VÍDEO COMPLETO E REAL (OCUPA TODO O MODAL EM REPRODUÇÃO) */}
            {isPlaying && !isTapeLoading && (
              <div ref={playerContainerRef} className="absolute inset-0 bg-black flex flex-col text-white font-mono z-45 animate-fade-in h-full w-full overflow-hidden">
                {/* 1. Barra de Navegação Superior Moderna estilo Streaming (Completamente fora do iframe) */}
                <div className="h-16 bg-zinc-950 border-b border-zinc-900/80 flex items-center justify-between px-3 sm:px-6 z-50 shrink-0 select-none">
                  {/* Esquerda: Botão Voltar gigante, super visível e fácil de clicar no mobile */}
                  <div className="flex items-center">
                    <button
                      onClick={() => setIsPlaying(false)}
                      className="bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-sans font-bold text-xs h-11 px-4 sm:px-5 rounded-lg transition-all flex items-center gap-2 shadow-lg shadow-rose-950/50 cursor-pointer focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:outline-none"
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
                    {movie.type === 'series' && (
                      <button
                        onClick={() => {
                          setIsPlaying(false);
                          setIsConfiguringPlayer(true);
                        }}
                        className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 font-sans font-bold text-[10px] sm:text-xs h-10 px-2.5 sm:px-3 rounded-lg transition-all flex items-center gap-1 cursor-pointer focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:outline-none"
                        title="Sintonizar canal (Episódio / Temporada)"
                      >
                        <Settings className="w-3.5 h-3.5 text-rose-500" />
                        <span className="hidden xs:inline">MUDAR CAPÍTULO</span>
                      </button>
                    )}
                    <span className="hidden md:inline-flex items-center gap-1.5 uppercase font-mono text-[9px] text-zinc-400 bg-zinc-900 border border-zinc-850 px-2.5 py-1.5 rounded-lg select-none">
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span>
                      VHS_HD
                    </span>
                  </div>
                </div>

                {/* 2. Área do Iframe com altura flex-1 restrita para nunca vazar ou rolar e evitar adoverlays de roubar cliques no topo */}
                <div className="flex-1 w-full bg-black relative">
                  <iframe
                    src={movie.type === 'series' 
                      ? `https://myembed.biz/serie/${movie.tmdbId || '1396'}/${season}/${episode}`
                      : `https://myembed.biz/filme/${movie.tmdbId || '105'}`
                    }
                    title={`Reproduzindo ${movie.title}`}
                    className="w-full h-full border-0 absolute inset-0 video-player-iframe"
                    allowFullScreen
                    webkitallowfullscreen="true"
                    mozallowfullscreen="true"
                    allow="autoplay *; encrypted-media *; picture-in-picture *; fullscreen *; clipboard-write *; accelerometer *; gyroscope *; web-share *"
                    sandbox="allow-scripts allow-same-origin allow-forms allow-presentation"
                    referrerPolicy="no-referrer"
                  />
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

                  {/* DETALHE DO ADGUARD POPUP BLOCKER */}
                  <div className="border border-zinc-900 bg-zinc-900/20 rounded-xl p-3.5 flex items-center justify-between font-mono text-xs text-left">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-500 animate-pulse">
                        <Shield className="w-4 h-4 text-rose-500" />
                      </div>
                      <div>
                        <p className="text-zinc-200 font-black text-[10px] sm:text-xs uppercase tracking-wider">Filtro de Popups Estrito (AdGuard Ativo)</p>
                        <p className="text-zinc-500 text-[9px] sm:text-[10px] mt-0.5">Iframe sintonizado sob sandbox protegida. Popups externos bloqueados.</p>
                      </div>
                    </div>
                    <span className="text-[9px] font-black uppercase text-emerald-400 bg-emerald-400/5 py-1 px-2.5 rounded border border-emerald-400/10 select-none animate-pulse">
                      PROTEGIDO
                    </span>
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

            {/* Botão de Fechar Modal (Visível apenas quando não está reproduzindo o vídeo real ou configurando) */}
            {(!isPlaying || isTapeLoading) && !isConfiguringPlayer && (
              <button
                onClick={onClose}
                className="absolute top-4 right-4 bg-black/80 hover:bg-rose-600 hover:text-white text-zinc-450 p-3 sm:p-2 rounded-full z-45 border border-zinc-800 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:outline-none"
                id="btn-close-modal"
                aria-label="Fechar Modal"
              >
                <X className="w-5 h-5" />
              </button>
            )}

            {/* --- ÁREA SUPERIOR: BANNER OU CARREGAMENTO DA FITA --- */}
            <div className="relative min-h-[350px] xs:min-h-[290px] sm:min-h-0 sm:aspect-[16/9] w-full bg-zinc-950 border-b border-zinc-900 overflow-hidden flex flex-col justify-end">
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
                /* CASO 3: TELA DE DETALHE PADRÃO COM HERO BANNER */
                <>
                  <img
                    src={movie.backdropUrl}
                    alt={movie.title}
                    className="w-full h-full object-cover select-none"
                    referrerPolicy="no-referrer"
                  />
                  {/* Sombreado elegante estilo cinema */}
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-black/40" />

                  {/* Detalhes Rápidos no Banner */}
                  <div className="absolute bottom-3 left-3 sm:bottom-8 sm:left-8 right-3 text-left z-20 flex flex-col items-start">
                    
                    {/* Categoria */}
                    <span className="bg-rose-600 text-white font-mono text-[9px] sm:text-xs font-black px-2 py-0.5 sm:px-2.5 sm:py-1 rounded tracking-wider uppercase mb-1.5 sm:mb-4 shadow-lg border border-rose-500/20">
                      {movie.category}
                    </span>

                    {/* Título Principal */}
                    <h2 className="text-xl xs:text-2xl sm:text-4xl md:text-5xl font-black font-display text-white tracking-tight leading-tight uppercase text-shadow">
                      {movie.title}
                    </h2>

                    {/* Botões Rápidos */}
                    <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 mt-3 sm:mt-6 w-full sm:w-auto">
                      
                      <button
                        onClick={handlePlayClick}
                        className="w-full sm:w-auto bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs sm:text-sm px-5 py-2.5 sm:px-7 sm:py-3.5 rounded-lg transition-transform active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-rose-600/20 cursor-pointer focus-visible:ring-4 focus-visible:ring-rose-500 focus-visible:outline-none focus-visible:scale-[1.02]"
                        id="btn-modal-play"
                      >
                        <Play className="w-4.5 h-4.5 sm:w-5 sm:h-5 fill-white" />
                        <span>
                          {progressState && progressState.progress > 0 
                            ? `Continuar (${Math.round(progressState.progress)}%)` 
                            : 'Assistir Trailer / Filme'
                          }
                        </span>
                      </button>

                      <button
                        onClick={() => onToggleMyList(movie.id)}
                        className={`w-full sm:w-auto text-xs sm:text-sm font-semibold px-5 py-2.5 sm:px-5 sm:py-3.5 rounded-lg border transition-all active:scale-95 flex items-center justify-center gap-2 focus-visible:ring-4 focus-visible:ring-rose-500 focus-visible:outline-none focus-visible:scale-[1.02] ${
                          isAddedToList 
                            ? 'bg-rose-500/10 border-rose-500 text-rose-400' 
                            : 'border-zinc-700 text-zinc-300 hover:text-white hover:border-zinc-400 bg-zinc-900/60'
                        }`}
                        id="btn-modal-mylist"
                      >
                        {isAddedToList ? (
                          <>
                            <Check className="w-4 h-4 text-rose-500" />
                            <span>Remover da Lista</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-4 h-4" />
                            <span>Minha Lista</span>
                          </>
                        )}
                      </button>

                      {/* Se houver progresso, botão para rebobinar */}
                      {progressState && progressState.progress > 0 && (
                        <button
                          onClick={handleResetProgress}
                          className="w-full sm:w-auto bg-zinc-900/80 border border-zinc-800 text-zinc-400 hover:text-rose-500 px-5 py-2.5 sm:p-3.5 rounded-lg transition-transform active:scale-95 flex items-center justify-center gap-2 focus-visible:ring-4 focus-visible:ring-rose-500 focus-visible:outline-none focus-visible:scale-[1.02]"
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

            {/* --- ÁREA INFERIOR: ABAS DE DETALHES E TRAILER EMBED --- */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-8 text-left bg-[#0f171e] text-zinc-300 font-sans border-t border-zinc-900">
              
              {/* Menu de Abas Estilo Prime Video */}
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-6">
                <div className="flex gap-6 sm:gap-8 font-sans font-medium text-sm">
                  {movie.type === 'series' && (
                    <button
                      onClick={() => setActiveTab('episodes')}
                      className={`relative pb-3 text-sm transition-all focus:outline-none cursor-pointer ${
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
                    className={`relative pb-3 text-sm transition-all focus:outline-none cursor-pointer ${
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
                    className={`relative pb-3 text-sm transition-all focus:outline-none cursor-pointer ${
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
                  <span className="text-[10px] sm:text-[11px] font-mono px-2 py-0.5 bg-zinc-900 border border-zinc-800 rounded-md text-zinc-400">
                    TMDB {movie.rating}
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mt-4">
                      {(tmdbEpisodes[`${movie.id}_s${season}`] || getEpisodesForSeries(movie, season)).map((ep) => (
                        <div
                          key={ep.number}
                          onClick={() => handleEpisodeClick(ep.number)}
                          className="group flex flex-col bg-[#1a242f]/30 border border-zinc-850 hover:border-rose-500/40 rounded-xl overflow-hidden cursor-pointer hover:shadow-lg hover:shadow-black/60 hover:scale-[1.02] transition-all duration-300 relative"
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
                              <div className="w-10 h-10 rounded-full bg-rose-600 flex items-center justify-center text-white shadow-xl transform scale-75 group-hover:scale-100 transition-transform duration-300">
                                <Play className="w-5 h-5 fill-current ml-0.5" />
                              </div>
                            </div>

                            {/* Duração Badge */}
                            <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/80 rounded text-[9px] font-bold font-mono text-zinc-300">
                              {ep.duration}
                            </div>

                            {/* Número do Episódio Header Badge */}
                            <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/80 rounded font-serif text-[10px] font-black italic tracking-widest text-[#10b981]">
                              EP {ep.number}
                            </div>
                          </div>

                          {/* Detalhes do Episódio */}
                          <div className="p-4 flex-1 flex flex-col justify-between">
                            <div className="space-y-1.5">
                              <h4 className="font-bold text-sm text-zinc-100 group-hover:text-rose-400 transition-colors leading-snug line-clamp-1">
                                {ep.number}. {ep.title}
                              </h4>
                              <p className="text-zinc-400 text-xs leading-relaxed font-sans font-normal line-clamp-2">
                                {ep.description}
                              </p>
                            </div>

                            {/* Labels e stamps do episódio no rodapé do card */}
                            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-zinc-900 text-[10px] text-zinc-500 font-mono font-semibold">
                              <span className="px-1 bg-zinc-900 border border-zinc-800 text-zinc-400 rounded text-[9px] font-bold">
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
                    <h3 className="text-zinc-400 text-xs font-mono font-bold uppercase mb-1 tracking-wider flex items-center gap-1.5">
                      <Film className="w-3.5 h-3.5 text-rose-500" /> Tópicos e Fitas Recomendadas no Mesmo Segmento
                    </h3>
                    <p className="text-xs text-zinc-500 font-sans mt-0.5">Espécimes catalogados na mesma categoria: <span className="text-rose-400 font-bold">{movie.category}</span></p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
                    {INITIAL_MOVIES.filter(m => m.category === movie.category && m.id !== movie.id).slice(0, 4).length > 0 ? (
                      INITIAL_MOVIES.filter(m => m.category === movie.category && m.id !== movie.id).slice(0, 4).map((rMovie) => (
                        <div 
                          key={rMovie.id}
                          className="group relative cursor-pointer overflow-hidden rounded-xl bg-zinc-900 border border-zinc-850 hover:border-zinc-650 transition-all duration-300"
                        >
                          <div className="relative aspect-[16/9] w-full bg-zinc-950 overflow-hidden">
                            <img 
                              src={rMovie.backdropUrl || rMovie.posterUrl} 
                              alt={rMovie.title} 
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent flex items-end p-2.5 sm:p-3.5 bg-black/40">
                              <div>
                                <span className="text-[9px] font-bold uppercase tracking-wider text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20">{rMovie.type === 'movie' ? 'Filme' : 'Série'}</span>
                                <h4 className="text-white font-bold text-xs mt-1 font-sans truncate drop-shadow">{rMovie.title}</h4>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="col-span-full py-10 bg-zinc-900/10 rounded-xl border border-dashed border-zinc-850 text-center text-zinc-500 text-xs font-mono uppercase">
                        Nenhuma outra fita cadastrada nesta categoria
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Aba de Detalhes Completo */}
              {activeTab === 'details' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-10">
                  
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
                          src={`${movie.trailerUrl}?controls=1&autoplay=0&mute=0&vq=hd1080&rel=0`}
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
        </div>
      )}
    </AnimatePresence>
  );
}
