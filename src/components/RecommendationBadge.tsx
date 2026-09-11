import React from 'react';
import { Award, Sparkles } from 'lucide-react';

interface RecommendationBadgeProps {
  variant?: 'banner' | 'card' | 'detail' | 'compact';
  className?: string;
  showText?: boolean;
}

export const RecommendationBadge: React.FC<RecommendationBadgeProps> = ({
  variant = 'card',
  className = '',
  showText = true,
}) => {
  if (variant === 'banner') {
    return (
      <div
        className={`inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-gradient-to-r from-amber-500/20 via-yellow-500/25 to-amber-600/20 border border-amber-400/80 text-amber-300 font-sans text-[11px] sm:text-xs font-black uppercase tracking-wider shadow-[0_0_15px_rgba(245,158,11,0.35)] backdrop-blur-md animate-fade-in select-none ${className}`}
        title="Selo de Garantia VHSFLIX • Recomendado e Indicado Oficialmente pelo Administrador Rafael"
      >
        <Award className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400 fill-amber-400 shrink-0 filter drop-shadow-[0_0_4px_rgba(251,191,36,0.6)]" />
        <span className="font-extrabold tracking-wide text-amber-200 drop-shadow-sm">
          INDICAÇÃO VHSFLIX
        </span>
        <Sparkles className="w-3 h-3 text-amber-300/80 shrink-0 hidden xs:inline" />
      </div>
    );
  }

  if (variant === 'detail') {
    return (
      <div
        className={`inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-xl bg-gradient-to-r from-amber-950/60 via-yellow-950/40 to-amber-950/60 border border-amber-500/60 text-amber-300 font-sans shadow-[0_0_20px_rgba(245,158,11,0.2)] backdrop-blur-md select-none ${className}`}
        title="Este título foi pessoalmente avaliado e recomendado com o Selo de Ouro pelo Administrador Rafael"
      >
        <div className="p-1 rounded-lg bg-amber-500/20 border border-amber-400/40 text-amber-400 shrink-0">
          <Award className="w-4 h-4 fill-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.7)]" />
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-amber-300 flex items-center gap-1">
            SELO DE GARANTIA VHSFLIX
            <Sparkles className="w-2.5 h-2.5 text-amber-400" />
          </span>
          <span className="text-[9px] font-mono text-amber-400/80 font-medium hidden sm:inline">
            Indicação do Administrador Rafael
          </span>
        </div>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-950/90 border border-amber-400/80 text-amber-300 font-mono text-[9px] font-black uppercase tracking-wider shadow-[0_0_10px_rgba(245,158,11,0.3)] backdrop-blur-sm select-none ${className}`}
        title="Título Indicado pelo Rafael Gusmão (Selo VHSFLIX)"
      >
        <Award className="w-3 h-3 text-amber-400 fill-amber-400 shrink-0" />
        {showText && <span>INDICADO</span>}
      </div>
    );
  }

  // Padrão: Card das capas (estilo selo de locadora clássica refinado)
  return (
    <div
      className={`inline-flex items-center gap-1 px-1.5 xs:px-2 py-0.5 rounded-md bg-gradient-to-r from-amber-950/95 via-zinc-950/95 to-amber-950/95 border border-amber-400/90 text-amber-300 font-sans text-[8px] xs:text-[9px] font-black uppercase tracking-wider shadow-[0_0_12px_rgba(245,158,11,0.5)] backdrop-blur-md select-none z-30 ${className}`}
      title="Selo de Garantia VHSFLIX: Recomendado pelo Administrador Rafael"
    >
      <Award className="w-2.5 h-2.5 xs:w-3 xs:h-3 text-amber-400 fill-amber-400 shrink-0 drop-shadow-[0_0_3px_rgba(251,191,36,0.8)]" />
      {showText && (
        <span className="font-extrabold text-amber-200 tracking-tight">
          INDICAÇÃO
        </span>
      )}
    </div>
  );
};

export default RecommendationBadge;
