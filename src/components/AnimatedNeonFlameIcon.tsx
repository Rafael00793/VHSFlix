import React from 'react';

interface AnimatedNeonFlameIconProps {
  className?: string;
  size?: number | string;
  glow?: boolean;
}

/**
 * Ícone animado em formato de Chama/Fogo Neon em tons de Verde Neon Esmeralda (#10b981 / #34d399 / #00ff88).
 * Possui animações orgânicas de chama (flicker, oscilação de altura, partículas de centelhas que sobem
 * e um núcleo brilhante pulsante com filtro neon glow).
 */
export const AnimatedNeonFlameIcon: React.FC<AnimatedNeonFlameIconProps> = ({
  className = '',
  size = 24,
  glow = true,
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block select-none overflow-visible ${className}`}
      aria-label="Fogo Animado Verde Neon"
    >
      <defs>
        {/* Gradiente da Chama Principal Externa */}
        <linearGradient id="neonFlameOuter" x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="#059669" />
          <stop offset="45%" stopColor="#10b981" />
          <stop offset="85%" stopColor="#34d399" />
          <stop offset="100%" stopColor="#6ee7b7" />
        </linearGradient>

        {/* Gradiente do Núcleo da Chama Interna (Mais claro e vibrante) */}
        <linearGradient id="neonFlameInner" x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="#10b981" />
          <stop offset="50%" stopColor="#6ee7b7" />
          <stop offset="100%" stopColor="#ecfdf5" />
        </linearGradient>

        {/* Gradiente das Línguas Secundárias de Fogo */}
        <linearGradient id="neonFlameTongue" x1="0%" y1="100%" x2="50%" y2="0%">
          <stop offset="0%" stopColor="#047857" />
          <stop offset="70%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#a7f3d0" />
        </linearGradient>

        {/* Filtro Neon Glow Intenso */}
        {glow && (
          <filter id="neonFlameGlow" x="-35%" y="-35%" width="170%" height="170%">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        )}

        <style>{`
          /* Animação Orgânica da Chama Principal (Flicker, Respiração e Dança) */
          @keyframes flameDance {
            0% {
              transform: scaleY(1) scaleX(1) rotate(0deg);
            }
            20% {
              transform: scaleY(1.08) scaleX(0.96) rotate(-1.5deg);
            }
            40% {
              transform: scaleY(0.95) scaleX(1.03) rotate(2deg);
            }
            60% {
              transform: scaleY(1.05) scaleX(0.98) rotate(-1deg);
            }
            80% {
              transform: scaleY(0.98) scaleX(1.02) rotate(1.5deg);
            }
            100% {
              transform: scaleY(1) scaleX(1) rotate(0deg);
            }
          }

          /* Animação do Núcleo Interno */
          @keyframes flameInnerPulse {
            0%, 100% {
              transform: scaleY(1) scaleX(1) translateY(0);
              opacity: 0.95;
            }
            50% {
              transform: scaleY(1.15) scaleX(0.92) translateY(-1px);
              opacity: 1;
            }
          }

          /* Animação da Ponta da Chama (Língua Dançante) */
          @keyframes flameTipWiggle {
            0%, 100% {
              transform: rotate(0deg) skewX(0deg);
            }
            25% {
              transform: rotate(-3.5deg) skewX(-2deg);
            }
            75% {
              transform: rotate(3.5deg) skewX(2deg);
            }
          }

          /* Animação de Centelhas / Faíscas que sobem e somem */
          @keyframes sparkRise1 {
            0% {
              transform: translate(0, 0) scale(0.6);
              opacity: 0;
            }
            30% {
              opacity: 0.9;
            }
            80% {
              transform: translate(-3px, -11px) scale(1);
              opacity: 0.6;
            }
            100% {
              transform: translate(-4px, -15px) scale(0.3);
              opacity: 0;
            }
          }

          @keyframes sparkRise2 {
            0% {
              transform: translate(0, 0) scale(0.5);
              opacity: 0;
            }
            35% {
              opacity: 1;
            }
            85% {
              transform: translate(3.5px, -12px) scale(1.1);
              opacity: 0.5;
            }
            100% {
              transform: translate(5px, -16px) scale(0.2);
              opacity: 0;
            }
          }

          .anim-flame-main {
            transform-origin: 16px 28px;
            animation: flameDance 1.6s ease-in-out infinite;
          }

          .anim-flame-inner {
            transform-origin: 16px 27px;
            animation: flameInnerPulse 1.2s ease-in-out infinite;
          }

          .anim-flame-tip {
            transform-origin: 16px 14px;
            animation: flameTipWiggle 1.4s ease-in-out infinite alternate;
          }

          .anim-spark-1 {
            animation: sparkRise1 1.8s cubic-bezier(0.2, 0.8, 0.4, 1) infinite;
          }

          .anim-spark-2 {
            animation: sparkRise2 2.1s cubic-bezier(0.2, 0.8, 0.4, 1) 0.7s infinite;
          }
        `}</style>
      </defs>

      {/* Faísca / Centelha Neon Esquerda */}
      <circle
        cx="14"
        cy="12"
        r="1.2"
        fill="#34d399"
        className="anim-spark-1"
        filter={glow ? "url(#neonFlameGlow)" : undefined}
      />

      {/* Faísca / Centelha Neon Direita */}
      <circle
        cx="18"
        cy="10"
        r="1.4"
        fill="#a7f3d0"
        className="anim-spark-2"
        filter={glow ? "url(#neonFlameGlow)" : undefined}
      />

      {/* Grupo Principal da Chama com Animação */}
      <g className="anim-flame-main" filter={glow ? "url(#neonFlameGlow)" : undefined}>
        {/* Corpo Externo da Chama */}
        <path
          d="M16 2.5C15.2 4.2 13.8 6.5 12.2 8.3C10.2 10.6 8 13.4 8 17.2C8 22.8 11.6 27.5 16 27.5C20.4 27.5 24 22.8 24 17.2C24 14.5 22.6 12 21.2 10C20.4 8.8 19.4 7.5 18.5 6C18.1 5.4 17.8 4.7 17.5 4C17.2 3.4 16.7 2.8 16 2.5Z"
          fill="url(#neonFlameOuter)"
        />

        {/* Língua de fogo lateral esquerda dinâmica */}
        <path
          d="M11 17C11 14 12.8 11.5 14.2 9.8C13.2 11.2 12.5 12.8 12.5 14.5C12.5 15.5 12.8 16.5 13.3 17.3C12.4 16.7 11.6 16.8 11 17Z"
          fill="url(#neonFlameTongue)"
          opacity="0.85"
        />

        {/* Núcleo de Fogo Interno Pulsante */}
        <path
          className="anim-flame-inner"
          d="M16 11.5C15.3 13 14 15 13.2 16.8C12.5 18.3 12.2 19.7 12.2 21.2C12.2 24.3 13.9 26.5 16 26.5C18.1 26.5 19.8 24.3 19.8 21.2C19.8 19.4 19.2 17.8 18.2 16.2C17.4 14.9 16.7 13.4 16.4 12.2C16.3 11.9 16.1 11.7 16 11.5Z"
          fill="url(#neonFlameInner)"
        />

        {/* Ponta da Chama com Wiggle Animado */}
        <g className="anim-flame-tip">
          <path
            d="M16 2.8C16.3 3.6 16.8 4.6 17.2 5.5C17.8 6.9 18.7 8.2 19.4 9.4C18.8 8.4 18.1 7.2 17.5 6C16.9 4.8 16.4 3.8 16 2.8Z"
            fill="#ecfdf5"
            opacity="0.9"
          />
        </g>
      </g>
    </svg>
  );
};
