import React from 'react';

interface VhsTapeIconProps {
  className?: string;
  size?: number | string;
  animated?: boolean;
}

/**
 * Ícone elegante e estilizado de fita VHS retrô preta com carretéis giratórios animados.
 * Homenageia a identidade estética do VHSFLIX.
 */
export const VhsTapeIcon: React.FC<VhsTapeIconProps> = ({
  className = '',
  size = 24,
  animated = true
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block select-none ${className}`}
      aria-label="Fita VHS Animada"
    >
      <defs>
        {/* Gradiente do chassi da fita VHS preta */}
        <linearGradient id="vhsChassisGrad" x1="0" y1="0" x2="0" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#27272a" />
          <stop offset="12%" stopColor="#18181b" />
          <stop offset="85%" stopColor="#09090b" />
          <stop offset="100%" stopColor="#040405" />
        </linearGradient>

        {/* Gradiente da janela transparente da fita */}
        <linearGradient id="vhsWindowGrad" x1="0" y1="9" x2="0" y2="23" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0c0a09" />
          <stop offset="100%" stopColor="#1c1917" />
        </linearGradient>

        {/* Gradiente do rolo de fita magnética marrom-escuro */}
        <linearGradient id="vhsTapeSpoolGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#451a03" />
          <stop offset="100%" stopColor="#1c1917" />
        </linearGradient>

        {/* Etiqueta VHS clássica com faixa vermelha */}
        <linearGradient id="vhsLabelStrip" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#ef4444" />
          <stop offset="50%" stopColor="#dc2626" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>

        {/* Efeito de brilho neon sutil */}
        <filter id="vhsGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="0" stdDeviation="1" floodColor="#ef4444" floodOpacity="0.4" />
        </filter>
      </defs>

      {/* 1. CORPO EXTERNO DA FITA VHS (Preto Retrô com Bordas Chanfradas) */}
      <rect
        x="1.5"
        y="2"
        width="45"
        height="28"
        rx="2.5"
        fill="url(#vhsChassisGrad)"
        stroke="#3f3f46"
        strokeWidth="1.2"
      />

      {/* Ranhuras de pegada tátil e detalhes de injeção plástica da carcaça */}
      <line x1="3.5" y1="5" x2="3.5" y2="27" stroke="#27272a" strokeWidth="0.8" />
      <line x1="44.5" y1="5" x2="44.5" y2="27" stroke="#27272a" strokeWidth="0.8" />
      <rect x="2" y="3" width="44" height="1" fill="#52525b" opacity="0.3" />

      {/* 2. ETIQUETA SUPERIOR CLÁSSICA COM FAIXA COLORIDA RETRÔ */}
      <rect x="7" y="4.5" width="34" height="3" rx="0.5" fill="#18181b" stroke="#27272a" strokeWidth="0.5" />
      <rect x="7.5" y="5" width="9" height="1.8" rx="0.3" fill="url(#vhsLabelStrip)" />
      {/* Texto minúsculo VHS estilizado na etiqueta */}
      <text x="17.5" y="6.6" fill="#e4e4e7" fontSize="2" fontWeight="900" fontFamily="monospace" letterSpacing="0.4">
        VHS
      </text>
      <text x="32" y="6.6" fill="#a1a1aa" fontSize="1.8" fontWeight="bold" fontFamily="monospace">
        HQ
      </text>

      {/* 3. JANELA CENTRAL DE ACRÍLICO COM A FITA MAGNÉTICA */}
      <rect
        x="10"
        y="9.5"
        width="28"
        height="14"
        rx="1.8"
        fill="url(#vhsWindowGrad)"
        stroke="#27272a"
        strokeWidth="1"
      />

      {/* Faixa de fita magnética que conecta os dois carretéis */}
      <path
        d="M 17 19.5 L 31 19.5"
        stroke="#78350f"
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.85"
      />
      <path
        d="M 17 19.5 L 31 19.5"
        stroke="#451a03"
        strokeWidth="1.2"
        strokeLinecap="round"
      />

      {/* 4. CARRETEL ESQUERDO (SUPPLY REEL) */}
      {/* Rolo de fita enrolada no carretel esquerdo */}
      <circle cx="17.5" cy="16.5" r="5.2" fill="url(#vhsTapeSpoolGrad)" stroke="#78350f" strokeWidth="0.4" />
      
      {/* Carretel central branco dentado giratório */}
      <g
        className={animated ? 'origin-[17.5px_16.5px] animate-[spin_3.5s_linear_infinite]' : ''}
        style={{ transformOrigin: '17.5px 16.5px' }}
      >
        <circle cx="17.5" cy="16.5" r="3.4" fill="#f4f4f5" stroke="#d4d4d8" strokeWidth="0.5" />
        <circle cx="17.5" cy="16.5" r="1.3" fill="#18181b" />
        {/* Dentes do carretel (engrenagem interna da fita) */}
        <line x1="17.5" y1="13.3" x2="17.5" y2="15.2" stroke="#71717a" strokeWidth="0.8" strokeLinecap="round" />
        <line x1="17.5" y1="17.8" x2="17.5" y2="19.7" stroke="#71717a" strokeWidth="0.8" strokeLinecap="round" />
        <line x1="14.3" y1="16.5" x2="16.2" y2="16.5" stroke="#71717a" strokeWidth="0.8" strokeLinecap="round" />
        <line x1="18.8" y1="16.5" x2="20.7" y2="16.5" stroke="#71717a" strokeWidth="0.8" strokeLinecap="round" />
      </g>

      {/* 5. CARRETEL DIREITO (TAKE-UP REEL) */}
      {/* Rolo de fita enrolada no carretel direito */}
      <circle cx="30.5" cy="16.5" r="4.6" fill="url(#vhsTapeSpoolGrad)" stroke="#78350f" strokeWidth="0.4" />

      {/* Carretel central branco dentado giratório */}
      <g
        className={animated ? 'origin-[30.5px_16.5px] animate-[spin_3.5s_linear_infinite]' : ''}
        style={{ transformOrigin: '30.5px 16.5px' }}
      >
        <circle cx="30.5" cy="16.5" r="3.4" fill="#f4f4f5" stroke="#d4d4d8" strokeWidth="0.5" />
        <circle cx="30.5" cy="16.5" r="1.3" fill="#18181b" />
        {/* Dentes do carretel (engrenagem interna da fita) */}
        <line x1="30.5" y1="13.3" x2="30.5" y2="15.2" stroke="#71717a" strokeWidth="0.8" strokeLinecap="round" />
        <line x1="30.5" y1="17.8" x2="30.5" y2="19.7" stroke="#71717a" strokeWidth="0.8" strokeLinecap="round" />
        <line x1="27.3" y1="16.5" x2="29.2" y2="16.5" stroke="#71717a" strokeWidth="0.8" strokeLinecap="round" />
        <line x1="31.8" y1="16.5" x2="33.7" y2="16.5" stroke="#71717a" strokeWidth="0.8" strokeLinecap="round" />
      </g>

      {/* 6. TRAVAS E CHANFROS INFERIORES DA FITA VHS */}
      {/* Encaixes do cabeçote e travas de proteção contra gravação */}
      <rect x="11" y="25" width="26" height="2" rx="0.5" fill="#18181b" stroke="#27272a" strokeWidth="0.4" />
      <circle cx="7" cy="25.5" r="1" fill="#09090b" stroke="#27272a" strokeWidth="0.5" />
      <circle cx="41" cy="25.5" r="1" fill="#09090b" stroke="#27272a" strokeWidth="0.5" />
      
      {/* Luz piloto / detalhe indicador neon da marca */}
      <circle cx="24" cy="26" r="0.7" fill="#ef4444" />
    </svg>
  );
};
