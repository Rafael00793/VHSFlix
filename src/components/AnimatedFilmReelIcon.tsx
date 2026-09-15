import React from 'react';

interface AnimatedFilmReelIconProps {
  className?: string;
  size?: number | string;
}

/**
 * Ícone animado retrô de rolo de filme de cinema (Film Reel).
 * Possui carretel giratório suave com furos de perfuração de película,
 * faixa de filme saindo e brilho neon cinematográfico.
 */
export const AnimatedFilmReelIcon: React.FC<AnimatedFilmReelIconProps> = ({
  className = '',
  size = 22,
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block select-none ${className}`}
      aria-label="Rolo de Filme Animado"
    >
      <defs>
        {/* Gradiente Metálico do Rolo de Filme */}
        <linearGradient id="reelMetalGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f43f5e" />
          <stop offset="50%" stopColor="#e11d48" />
          <stop offset="100%" stopColor="#881337" />
        </linearGradient>

        {/* Gradiente do Núcleo do Rolo */}
        <radialGradient id="reelCenterGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fda4af" />
          <stop offset="70%" stopColor="#e11d48" />
          <stop offset="100%" stopColor="#4c0519" />
        </radialGradient>

        {/* Brilho Neon Rosa/Vermelho */}
        <filter id="reelGlowFilter" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="1.2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* 1. Tira de Filme Película desenrolando na borda direita inferior com animação sutil */}
      <path
        d="M 23 23 C 26 25 29 23 31 27"
        stroke="#fda4af"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="2 1.5"
        className="animate-pulse"
        style={{ animationDuration: '1.8s' }}
      />
      <path
        d="M 21 21 C 24 23 27 21 29 25"
        stroke="#e11d48"
        strokeWidth="1.2"
        strokeLinecap="round"
      />

      {/* 2. Rolo Principal Externo (Carcaça Externa) */}
      <circle
        cx="16"
        cy="16"
        r="14"
        fill="#18181b"
        stroke="url(#reelMetalGrad)"
        strokeWidth="1.8"
        filter="url(#reelGlowFilter)"
      />

      {/* Roda da Película Enrolada Interna (Camada de Filme) */}
      <circle
        cx="16"
        cy="16"
        r="11.5"
        fill="#27272a"
        stroke="#4c0519"
        strokeWidth="1"
      />

      {/* 3. Carretel Giratório com os Furos do Rolo Cinematográfico */}
      <g
        className="animate-[spin_4s_linear_infinite]"
        style={{ transformOrigin: '16px 16px' }}
      >
        {/* Aro intermediário */}
        <circle cx="16" cy="16" r="8.5" stroke="#f43f5e" strokeWidth="0.8" opacity="0.6" />

        {/* Os 5 Furos Circulares Típicos de Rolo de Filme Vintage de 35mm */}
        <circle cx="16" cy="9.5" r="2.2" fill="#09090b" stroke="#f43f5e" strokeWidth="0.7" />
        <circle cx="22.2" cy="14" r="2.2" fill="#09090b" stroke="#f43f5e" strokeWidth="0.7" />
        <circle cx="19.8" cy="21.2" r="2.2" fill="#09090b" stroke="#f43f5e" strokeWidth="0.7" />
        <circle cx="12.2" cy="21.2" r="2.2" fill="#09090b" stroke="#f43f5e" strokeWidth="0.7" />
        <circle cx="9.8" cy="14" r="2.2" fill="#09090b" stroke="#f43f5e" strokeWidth="0.7" />

        {/* Furos menores decorativos adicionais */}
        <circle cx="16" cy="6.2" r="0.9" fill="#fda4af" />
        <circle cx="25.3" cy="13" r="0.9" fill="#fda4af" />
        <circle cx="21.7" cy="24.2" r="0.9" fill="#fda4af" />
        <circle cx="10.3" cy="24.2" r="0.9" fill="#fda4af" />
        <circle cx="6.7" cy="13" r="0.9" fill="#fda4af" />

        {/* Raios / Eixos de sustentação do carretel */}
        <line x1="16" y1="12" x2="16" y2="14" stroke="#fb7185" strokeWidth="1" />
        <line x1="19.8" y1="14.8" x2="17.9" y2="15.4" stroke="#fb7185" strokeWidth="1" />
        <line x1="18.3" y1="19.2" x2="17.2" y2="17.6" stroke="#fb7185" strokeWidth="1" />
        <line x1="13.7" y1="19.2" x2="14.8" y2="17.6" stroke="#fb7185" strokeWidth="1" />
        <line x1="12.2" y1="14.8" x2="14.1" y2="15.4" stroke="#fb7185" strokeWidth="1" />
      </g>

      {/* 4. Eixo Central Fixo do Projetor */}
      <circle cx="16" cy="16" r="3.2" fill="url(#reelCenterGrad)" stroke="#fecdd3" strokeWidth="0.8" />
      <circle cx="16" cy="16" r="1.2" fill="#ffffff" />
    </svg>
  );
};
