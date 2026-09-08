import { PropStatus } from '../types';

interface StatusChipProps {
  status: PropStatus | 'budget' | 'on_budget' | 'over_budget';
  label?: string;
  size?: 'sm' | 'md';
}

export function StatusChip({ status, label, size = 'md' }: StatusChipProps) {
  let bgClass = 'bg-[#BFE3F2] text-[#12201F]'; // default awaiting review
  let displayLabel = label;
  let hasPulse = false;

  switch (status) {
    case 'assets_ready':
      bgClass = 'bg-[#0B5F5A] text-[#FFFFFF]';
      displayLabel = displayLabel || 'ASSETS READY';
      break;
    case 'awaiting_review':
      bgClass = 'bg-[#BFE3F2] dark:bg-[#112F38] text-[#12201F] dark:text-[#E5F6FD] border border-[#8FCFEA] dark:border-[#1D5060]';
      displayLabel = displayLabel || 'AWAITING REVIEW';
      break;
    case 'generating':
      bgClass = 'bg-[#12A79D] text-[#FFFFFF]';
      displayLabel = displayLabel || 'GENERATING';
      hasPulse = true;
      break;
    case 'exported':
      bgClass = 'bg-[#2E8B6F] text-[#FFFFFF]';
      displayLabel = displayLabel || 'EXPORTED';
      break;
    case 'on_budget':
    case 'budget':
      bgClass = 'bg-[#12A79D] text-[#FFFFFF]';
      displayLabel = displayLabel || 'ON BUDGET';
      break;
    case 'over_budget':
      bgClass = 'bg-[#C6792E] text-[#FFFFFF]';
      displayLabel = displayLabel || 'OVER BUDGET';
      break;
  }

  const paddingClass = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-[11px]';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-mono-tag font-semibold tracking-wider uppercase whitespace-nowrap rounded-none ${paddingClass} ${bgClass}`}
    >
      {hasPulse && (
        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
      )}
      {displayLabel}
    </span>
  );
}
