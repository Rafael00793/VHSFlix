import React from 'react';

interface AnimatedTvIconProps {
  className?: string;
  size?: number | string;
}

/**
 * Ícone animado retrô de Televisão Tubo CRT com antenas e tela animada.
 * Possui scanlines pulsantes, sinal de transmissão e antenas no estilo clássico anos 80/90.
 */
export const AnimatedTvIcon: React.FC<AnimatedTvIconProps> = ({
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
      aria-label="Televisão Retrô Animada"
    >
      <defs>
        {/* Gradiente da Carcaça da TV */}
        <linearGradient id="tvChassisGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#27272a" />
          <stop offset="50%" stopColor="#18181b" />
          <stop offset="100%" stopColor="#09090b" />
        </linearGradient>

        {/* Gradiente da Tela CRT Verde Neon / Esmeralda */}
        <linearGradient id="tvScreenGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#064e3b" />
          <stop offset="50%" stopColor="#047857" />
          <stop offset="100%" stopColor="#022c22" />
        </linearGradient>

        {/* Brilho da Tela da TV */}
        <filter id="tvGlowFilter" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="1" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* 1. Antenas V Metálicas no Topo */}
      {/* Haste Esquerda */}
      <line x1="16" y1="9" x2="10" y2="2" stroke="#a1a1aa" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="10" cy="2" r="1.1" fill="#34d399" className="animate-ping" style={{ animationDuration: '2s' }} />
      <circle cx="10" cy="2" r="1.1" fill="#10b981" />

      {/* Haste Direita */}
      <line x1="16" y1="9" x2="22" y2="2" stroke="#a1a1aa" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="22" cy="2" r="1.1" fill="#34d399" className="animate-ping" style={{ animationDuration: '2.5s' }} />
      <circle cx="22" cy="2" r="1.1" fill="#10b981" />

      {/* Base da Antena */}
      <circle cx="16" cy="9" r="1.5" fill="#52525b" stroke="#71717a" strokeWidth="0.6" />

      {/* 2. Gabinete / Carcaça Externa da TV */}
      <rect
        x="3"
        y="9"
        width="26"
        height="19"
        rx="3.5"
        fill="url(#tvChassisGrad)"
        stroke="#3f3f46"
        strokeWidth="1.2"
      />

      {/* 3. Pés da TV */}
      <line x1="8" y1="28" x2="6" y2="31" stroke="#52525b" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="24" y1="28" x2="26" y2="31" stroke="#52525b" strokeWidth="1.5" strokeLinecap="round" />

      {/* 4. Tela Tubo CRT com cantos abaulados */}
      <rect
        x="5.5"
        y="11.5"
        width="17"
        height="14"
        rx="2"
        fill="url(#tvScreenGrad)"
        stroke="#10b981"
        strokeWidth="0.8"
        filter="url(#tvGlowFilter)"
      />

      {/* Linhas de Varredura (Scanlines CRT) Animadas */}
      <g className="animate-pulse" style={{ animationDuration: '1.2s' }}>
        <line x1="7" y1="13.5" x2="21" y2="13.5" stroke="#34d399" strokeWidth="0.7" opacity="0.6" />
        <line x1="7" y1="16" x2="21" y2="16" stroke="#6ee7b7" strokeWidth="0.8" opacity="0.8" />
        <line x1="7" y1="18.5" x2="21" y2="18.5" stroke="#34d399" strokeWidth="0.7" opacity="0.6" />
        <line x1="7" y1="21" x2="21" y2="21" stroke="#a7f3d0" strokeWidth="0.9" opacity="0.9" />
        <line x1="7" y1="23.5" x2="21" y2="23.5" stroke="#34d399" strokeWidth="0.7" opacity="0.5" />
      </g>

      {/* Reflexo de vidro curvo no canto superior esquerdo da tela */}
      <path
        d="M 6.5 12.5 Q 11 12.5 14 15"
        stroke="#ffffff"
        strokeWidth="0.7"
        strokeLinecap="round"
        opacity="0.4"
      />

      {/* 5. Painel Lateral Direito de Controles da TV */}
      <rect x="23.5" y="11.5" width="4.5" height="14" rx="1" fill="#18181b" stroke="#27272a" strokeWidth="0.5" />

      {/* Botão Seletor Giratório Superior (Canal) com animação */}
      <g className="animate-[spin_6s_linear_infinite]" style={{ transformOrigin: '25.75px 14.5px' }}>
        <circle cx="25.75" cy="14.5" r="1.5" fill="#3f3f46" stroke="#71717a" strokeWidth="0.5" />
        <line x1="25.75" y1="13.5" x2="25.75" y2="14.5" stroke="#10b981" strokeWidth="0.7" />
      </g>

      {/* Botão Seletor Giratório Inferior (Volume) */}
      <circle cx="25.75" cy="18.5" r="1.5" fill="#3f3f46" stroke="#71717a" strokeWidth="0.5" />
      <line x1="25" y1="18.5" x2="26" y2="18.5" stroke="#d4d4d8" strokeWidth="0.6" />

      {/* Grade de Ventilação / Alto-falante Lateral */}
      <line x1="24.5" y1="22" x2="27" y2="22" stroke="#52525b" strokeWidth="0.6" />
      <line x1="24.5" y1="23.5" x2="27" y2="23.5" stroke="#52525b" strokeWidth="0.6" />

      {/* LED de Ligado (Power) */}
      <circle cx="25.75" cy="25" r="0.6" fill="#10b981" className="animate-pulse" />
    </svg>
  );
};
