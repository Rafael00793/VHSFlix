import React from 'react';
import { Award, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';

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
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={{ scale: 1.05 }}
        className={`relative overflow-hidden inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-gradient-to-r from-amber-500/25 via-yellow-500/30 to-amber-600/25 border border-amber-400/90 text-amber-300 font-sans text-[11px] sm:text-xs font-black uppercase tracking-wider shadow-[0_0_18px_rgba(245,158,11,0.45)] backdrop-blur-md select-none ${className}`}
        title="Indicação do Administrador Rafael"
      >
        <motion.div
          className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none"
          animate={{ x: ['-100%', '200%'] }}
          transition={{ repeat: Infinity, duration: 2.4, ease: 'easeInOut' }}
        />
        <Award className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400 fill-amber-400 shrink-0 filter drop-shadow-[0_0_5px_rgba(251,191,36,0.8)]" />
        <span className="font-black tracking-wider text-amber-200 drop-shadow-sm uppercase">
          INDICAÇÃO
        </span>
        <Sparkles className="w-3 h-3 text-amber-300 shrink-0" />
      </motion.div>
    );
  }

  if (variant === 'detail') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={{ scale: 1.03 }}
        className={`relative overflow-hidden inline-flex items-center gap-2 px-3.5 sm:px-4 py-1.5 rounded-xl bg-gradient-to-r from-amber-950/80 via-yellow-950/60 to-amber-950/80 border border-amber-400/80 text-amber-300 font-sans shadow-[0_0_22px_rgba(245,158,11,0.35)] backdrop-blur-md select-none ${className}`}
        title="Indicação do Administrador Rafael"
      >
        <motion.div
          className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-amber-200/20 to-transparent pointer-events-none"
          animate={{ x: ['-100%', '200%'] }}
          transition={{ repeat: Infinity, duration: 2.8, ease: 'easeInOut' }}
        />
        <div className="p-1 rounded-lg bg-amber-500/25 border border-amber-400/60 text-amber-300 shrink-0 shadow-[0_0_10px_rgba(245,158,11,0.4)]">
          <Award className="w-4 h-4 fill-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.9)]" />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-amber-200 flex items-center gap-1 drop-shadow-sm">
            INDICAÇÃO
          </span>
          <Sparkles className="w-3 h-3 text-amber-400 animate-pulse" />
        </div>
      </motion.div>
    );
  }

  if (variant === 'compact') {
    return (
      <div
        className={`relative overflow-hidden inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-950/95 border border-amber-400/90 text-amber-300 font-sans text-[9px] font-black uppercase tracking-wider shadow-[0_0_10px_rgba(245,158,11,0.4)] backdrop-blur-sm select-none ${className}`}
        title="Indicação do Administrador Rafael"
      >
        <Award className="w-3 h-3 text-amber-400 fill-amber-400 shrink-0" />
        {showText && <span>INDICAÇÃO</span>}
      </div>
    );
  }

  // Padrão: Card das capas (estilo selo animado e chamativo)
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.08 }}
      className={`relative overflow-hidden inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gradient-to-r from-amber-950/95 via-zinc-950/95 to-amber-950/95 border border-amber-400 text-amber-300 font-sans text-[8px] xs:text-[9px] font-black uppercase tracking-wider shadow-[0_0_14px_rgba(245,158,11,0.6)] backdrop-blur-md select-none z-30 ${className}`}
      title="Indicação do Administrador Rafael"
    >
      {/* Sheen de luz passando pelo selo */}
      <motion.div
        className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-amber-300/30 to-transparent pointer-events-none"
        animate={{ x: ['-100%', '200%'] }}
        transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
      />
      <Award className="w-2.5 h-2.5 xs:w-3 xs:h-3 text-amber-400 fill-amber-400 shrink-0 drop-shadow-[0_0_4px_rgba(251,191,36,0.9)]" />
      {showText && (
        <span className="font-black text-amber-200 tracking-tight">
          INDICAÇÃO
        </span>
      )}
    </motion.div>
  );
};

export default RecommendationBadge;
