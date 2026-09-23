import React from 'react';

interface ConfidenceMeterProps {
  score: number; // 0.0 - 1.0 or 0 - 100
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  isAmbiguous?: boolean;
  gap?: number;
}

export const ConfidenceMeter: React.FC<ConfidenceMeterProps> = ({
  score,
  showLabel = true,
  size = 'md',
  isAmbiguous = false,
  gap,
}) => {
  // Normalize to 0 - 100
  const percentage = Math.round(score <= 1.0 ? score * 100 : score);

  let barColor = 'bg-emerald-500';
  let textColor = 'text-emerald-700';

  if (percentage < 60) {
    barColor = 'bg-rose-500';
    textColor = 'text-rose-700';
  } else if (percentage < 80) {
    barColor = 'bg-amber-500';
    textColor = 'text-amber-700';
  }

  const heightClass = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-3.5',
  }[size];

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-1">
        {showLabel && (
          <span className="text-xs font-medium text-slate-600 flex items-center gap-1.5">
            AI Classification Confidence
            {isAmbiguous && (
              <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                Narrow Gap ({gap ? `${Math.round(gap <= 1 ? gap * 100 : gap)}%` : 'Ambiguous'})
              </span>
            )}
          </span>
        )}
        <span className={`text-xs font-bold ${textColor}`}>
          {percentage}%
        </span>
      </div>
      <div className={`w-full bg-slate-200 rounded-full overflow-hidden ${heightClass}`}>
        <div
          className={`${barColor} ${heightClass} rounded-full transition-all duration-500`}
          style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
        />
      </div>
    </div>
  );
};
