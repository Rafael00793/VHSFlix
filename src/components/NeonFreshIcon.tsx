import React from 'react';

interface NeonFreshIconProps {
  className?: string;
  size?: number | string;
}

/**
 * Ícone animado retrô em verde neon para a seção de títulos "Recém Adicionados".
 * Combina estrela de brilho estelar neon, anel orbital com pulso e partículas cintilantes.
 */
export const NeonFreshIcon: React.FC<NeonFreshIconProps> = ({
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
      aria-label="Recém Adicionados Neon"
    >
      <defs>
        {/* Gradiente Verde Neon Principal */}
        <linearGradient id="neonGreenGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#4ade80" />
          <stop offset="50%" stopColor="#22c55e" />
          <stop offset="100%" stopColor="#15803d" />
        </linearGradient>

        {/* Gradiente do Brilho Central Neon */}
        <radialGradient id="neonCoreGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#86efac" stopOpacity="1" />
          <stop offset="45%" stopColor="#22c55e" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#14532d" stopOpacity="0" />
        </radialGradient>

        {/* Filtro Neon Glow Verde Intenso */}
        <filter id="neonGreenFilter" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* 1. Halo / Brilho de Fundo Pulsante */}
      <circle
        cx="16"
        cy="16"
        r="11"
        fill="url(#neonCoreGlow)"
        className="animate-pulse"
        style={{ animationDuration: '2s' }}
      />

      {/* 2. Anel Orbital tracejado girando suavemente */}
      <circle
        cx="16"
        cy="16"
        r="12"
        stroke="#4ade80"
        strokeWidth="1.2"
        strokeDasharray="4 3"
        opacity="0.75"
        className="animate-[spin_7s_linear_infinite]"
        style={{ transformOrigin: '16px 16px' }}
      />

      {/* 3. Estrela de 4 Pontas Geométrica Retrô (Estilo Centelha de Novidade Neon) */}
      <g
        filter="url(#neonGreenFilter)"
        className="animate-[spin_10s_linear_infinite]"
        style={{ transformOrigin: '16px 16px' }}
      >
        {/* Forma da estrela de diamante estelar */}
        <path
          d="M 16 3 C 16 10 10 16 3 16 C 10 16 16 22 16 29 C 16 22 22 16 29 16 C 22 16 16 10 16 3 Z"
          fill="url(#neonGreenGrad)"
          stroke="#bbf7d0"
          strokeWidth="0.6"
        />
      </g>

      {/* 4. Segunda Centelha Menor em contra-rotação rápida para dinamismo vivo */}
      <g
        className="animate-[spin_5s_linear_infinite_reverse]"
        style={{ transformOrigin: '16px 16px' }}
      >
        <path
          d="M 16 8 C 16 12 12 16 8 16 C 12 16 16 20 16 24 C 16 20 20 16 24 16 C 20 16 16 12 16 8 Z"
          fill="#86efac"
          opacity="0.9"
        />
        <circle cx="16" cy="16" r="2.2" fill="#ffffff" />
      </g>

      {/* 5. Partículas Cintilantes / Pontos de Luz Neon */}
      <circle cx="25" cy="7" r="1.4" fill="#4ade80" className="animate-ping" style={{ animationDuration: '1.8s' }} />
      <circle cx="7" cy="24" r="1.2" fill="#86efac" className="animate-pulse" style={{ animationDuration: '1.4s' }} />
    </svg>
  );
};
