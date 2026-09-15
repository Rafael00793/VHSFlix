import React from 'react';

interface AnimatedResumeIconProps {
  className?: string;
  size?: number | string;
}

/**
 * Ícone animado profissional de "Continuar Assistindo" / "Retomar Reprodução".
 * Combina um medidor circular de progresso pulsante (estilo playhead em andamento),
 * botão Play central em neon vibrante com ondas de avanço (forward wave ripples),
 * e brilho dinâmico sincronizado para chamar atenção visualmente de forma elegante.
 */
export const AnimatedResumeIcon: React.FC<AnimatedResumeIconProps> = ({
  className = '',
  size = 24,
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block select-none ${className}`}
      aria-label="Continuar Assistindo Animado"
    >
      <defs>
        {/* Gradiente do Anel de Progresso Ativo (Âmbar para Ouro Neon / Laranja vibrante) */}
        <linearGradient id="resumeRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f59e0b" />
          <stop offset="50%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#f97316" />
        </linearGradient>

        {/* Gradiente do Botão Play Central */}
        <linearGradient id="resumePlayGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="60%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>

        {/* Filtro de Brilho Neon Quente */}
        <filter id="resumeGlowFilter" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="1.2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <style>{`
          @keyframes resumeSweep {
            0% {
              stroke-dashoffset: 65;
            }
            50% {
              stroke-dashoffset: 20;
            }
            100% {
              stroke-dashoffset: 65;
            }
          }

          @keyframes resumePulsePlay {
            0%, 100% {
              transform: scale(1);
              opacity: 0.95;
            }
            50% {
              transform: scale(1.12);
              opacity: 1;
            }
          }

          @keyframes resumeWave1 {
            0%, 100% {
              opacity: 0.25;
              transform: translateX(0);
            }
            50% {
              opacity: 0.95;
              transform: translateX(1.5px);
            }
          }

          @keyframes resumeWave2 {
            0%, 100% {
              opacity: 0.15;
              transform: translateX(0);
            }
            50% {
              opacity: 0.85;
              transform: translateX(2px);
            }
          }

          @keyframes resumeDotPulse {
            0%, 100% {
              transform: scale(1);
              opacity: 0.8;
            }
            50% {
              transform: scale(1.35);
              opacity: 1;
            }
          }
        `}</style>
      </defs>

      {/* 1. Anel Base de Fundo (Track inativo cinza grafite) */}
      <circle
        cx="16"
        cy="16"
        r="13"
        stroke="#27272a"
        strokeWidth="2.2"
        strokeLinecap="round"
        opacity="0.8"
      />

      {/* 2. Anel de Progresso Ativo Dinâmico (Simula a barra de progresso do vídeo sendo continuado) */}
      <circle
        cx="16"
        cy="16"
        r="13"
        stroke="url(#resumeRingGrad)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray="81.68"
        strokeDashoffset="26"
        filter="url(#resumeGlowFilter)"
        style={{
          transformOrigin: '16px 16px',
          transform: 'rotate(-90deg)',
          animation: 'resumeSweep 4s ease-in-out infinite'
        }}
      />

      {/* 3. Marcador / Playhead brilhante na ponta do progresso */}
      <circle
        cx="25.2"
        cy="7.8"
        r="1.8"
        fill="#fef08a"
        filter="url(#resumeGlowFilter)"
        style={{
          transformOrigin: '25.2px 7.8px',
          animation: 'resumeDotPulse 2s ease-in-out infinite'
        }}
      />

      {/* 4. Botão Play Central Pulsante */}
      <g
        filter="url(#resumeGlowFilter)"
        style={{
          transformOrigin: '15px 16px',
          animation: 'resumePulsePlay 2.5s ease-in-out infinite'
        }}
      >
        <path
          d="M12.5 10.5C12.5 9.7 13.4 9.2 14.1 9.65L20.8 14.65C21.4 15.05 21.4 16.0 20.8 16.4L14.1 21.4C13.4 21.85 12.5 21.35 12.5 20.5V10.5Z"
          fill="url(#resumePlayGrad)"
        />
      </g>

      {/* 5. Ondas Sutis de Reprodução Contínua / Fast-Forward na Lateral Direita */}
      <path
        d="M23 12C24.2 13.2 24.8 14.5 24.8 16C24.8 17.5 24.2 18.8 23 20"
        stroke="#fde047"
        strokeWidth="1.6"
        strokeLinecap="round"
        style={{
          transformOrigin: '23px 16px',
          animation: 'resumeWave1 1.8s ease-in-out infinite'
        }}
      />
      <path
        d="M26 10C27.8 11.8 28.5 13.8 28.5 16C28.5 18.2 27.8 20.2 26 22"
        stroke="#f59e0b"
        strokeWidth="1.4"
        strokeLinecap="round"
        style={{
          transformOrigin: '26px 16px',
          animation: 'resumeWave2 1.8s ease-in-out 0.25s infinite'
        }}
      />
    </svg>
  );
};
