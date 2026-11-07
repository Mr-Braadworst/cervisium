import React from 'react';
import { Star } from 'lucide-react';

interface RatingBadgeProps {
  rating: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export const getScoreLabel = (score: number): string => {
  if (score >= 9.5) return 'Legendarisch';
  if (score >= 9.0) return 'Uitmuntend';
  if (score >= 8.0) return 'Zeer Goed';
  if (score >= 7.0) return 'Lekker';
  if (score >= 6.0) return 'Voldoende';
  if (score >= 5.0) return 'Matig';
  return 'Ondermaats';
};

export const getScoreColorClass = (score: number) => {
  if (score >= 9.5) {
    return {
      bg: 'bg-emerald-500/30 text-emerald-200 border-emerald-400/60 shadow-emerald-500/20',
      star: 'text-emerald-300 fill-emerald-300',
      glow: 'shadow-[0_0_20px_rgba(16,185,129,0.35)]',
    };
  }
  if (score >= 9.0) {
    return {
      bg: 'bg-emerald-500/25 text-emerald-300 border-emerald-500/50 shadow-emerald-500/15',
      star: 'text-emerald-400 fill-emerald-400',
      glow: 'shadow-[0_0_15px_rgba(16,185,129,0.25)]',
    };
  }
  if (score >= 8.0) {
    return {
      bg: 'bg-green-500/20 text-green-300 border-green-500/40 shadow-green-500/10',
      star: 'text-green-400 fill-green-400',
      glow: '',
    };
  }
  if (score >= 7.0) {
    return {
      bg: 'bg-lime-500/20 text-lime-300 border-lime-500/40 shadow-lime-500/10',
      star: 'text-lime-400 fill-lime-400',
      glow: '',
    };
  }
  if (score >= 6.0) {
    return {
      bg: 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-amber-500/10',
      star: 'text-amber-400 fill-amber-400',
      glow: '',
    };
  }
  return {
    bg: 'bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-none',
    star: 'text-rose-400 fill-rose-400',
    glow: '',
  };
};

export const RatingBadge: React.FC<RatingBadgeProps> = ({
  rating,
  size = 'md',
  showLabel = false,
}) => {
  const colors = getScoreColorClass(rating);
  const formattedScore = rating % 1 === 0 ? rating.toFixed(0) : rating.toFixed(1);

  if (size === 'sm') {
    return (
      <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border font-semibold text-xs ${colors.bg}`}>
        <Star className={`w-3 h-3 ${colors.star}`} />
        <span>{formattedScore}</span>
        <span className="text-[10px] opacity-70">/10</span>
      </div>
    );
  }

  if (size === 'lg') {
    return (
      <div className={`inline-flex flex-col items-center justify-center p-3 rounded-xl border ${colors.bg} ${colors.glow}`}>
        <div className="flex items-center gap-1.5">
          <Star className={`w-5 h-5 ${colors.star}`} />
          <span className="text-2xl font-bold tracking-tight">{formattedScore}</span>
          <span className="text-xs opacity-70 mt-1">/10</span>
        </div>
        {showLabel && (
          <span className="text-[11px] font-medium tracking-wide uppercase mt-1 opacity-90">
            {getScoreLabel(rating)}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border font-semibold text-sm ${colors.bg} ${colors.glow}`}>
      <Star className={`w-3.5 h-3.5 ${colors.star}`} />
      <span>{formattedScore}</span>
      <span className="text-xs opacity-70">/10</span>
      {showLabel && (
        <span className="text-xs font-normal border-l border-white/20 pl-1.5 ml-0.5 opacity-90">
          {getScoreLabel(rating)}
        </span>
      )}
    </div>
  );
};
