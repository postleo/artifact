import React from 'react';
import { PropItem, PropViewMode } from '../types';
import { StatusChip } from './StatusChip';
import { Camera, Trash2 } from 'lucide-react';

interface CatalogueCardProps {
  key?: React.Key;
  prop: PropItem;
  onClick: () => void;
  viewMode?: PropViewMode;
  onDelete?: () => void;
}

export function CatalogueCard({ prop, onClick, viewMode = 'vitrine', onDelete }: CatalogueCardProps) {
  const isVitrine = viewMode === 'vitrine';

  return (
    <div
      onClick={onClick}
      className={`group relative flex flex-col transition-all duration-200 cursor-pointer p-3 ${
        isVitrine
          ? 'bg-white dark:bg-[#14201E] border border-[#D8E5E1] dark:border-[#223735] hover:border-[#12A79D]'
          : 'bg-[#F4EFE6]/60 dark:bg-[#0E1716] border border-[#D8E5E1] dark:border-[#1F302D] hover:border-[#12A79D] shadow-xs'
      }`}
    >
      {onDelete && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="absolute top-2 right-2 z-20 w-7 h-7 flex items-center justify-center bg-white/90 dark:bg-[#0D1514]/90 border border-[#D8E5E1] dark:border-[#223735] text-[#48605E] dark:text-[#8BA4A1] opacity-0 group-hover:opacity-100 hover:text-red-600 hover:border-red-400 transition-all cursor-pointer"
          title={`Delete ${prop.name}`}
          aria-label={`Delete ${prop.name}`}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
      {/* Plate / Photo Container */}
      <div
        className={`relative w-full aspect-[4/3] overflow-hidden flex items-center justify-center mb-3 border transition-colors ${
          isVitrine
            ? 'bg-white dark:bg-[#0F1A18] vitrine-stage-inner border-[#D8E5E1] dark:border-[#223735]'
            : 'bg-radial from-white via-[#FAF7F0] to-[#EAE4D7] dark:from-[#172523] dark:via-[#0F1817] dark:to-[#09100F] border-[#D8E5E1] dark:border-[#1D2B29]'
        }`}
      >
        {isVitrine ? (
          <>
            {/* Signature top turquoise rule on vitrine */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-[#12A79D] group-hover:bg-[#0B5F5A] transition-colors z-10" />

            {/* Casing edge lines */}
            <div className="absolute inset-1 pointer-events-none border border-[#12A79D]/15 dark:border-[#12A79D]/25" />
          </>
        ) : (
          <>
            {/* Subtle photo vignette */}
            <div className="absolute inset-0 pointer-events-none bg-radial from-transparent to-black/5 dark:to-black/30" />
            <div className="absolute top-1.5 left-1.5 pointer-events-none flex items-center gap-1 px-1 py-0.5 bg-black/50 text-white font-mono-tag text-[8px] uppercase tracking-wider">
              <Camera className="w-2 h-2 text-[#38C7BD]" />
              <span>STILL</span>
            </div>
          </>
        )}

        {/* Thumbnail (or a neutral placeholder while a live prop is still generating) */}
        {prop.thumbnailUrl ? (
          <img
            src={prop.thumbnailUrl}
            alt={prop.name}
            className={`w-full h-full object-contain p-2 transition-transform duration-300 ${
              isVitrine
                ? 'group-hover:scale-105'
                : 'group-hover:scale-106 drop-shadow-md'
            }`}
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 text-[#48605E]/50 dark:text-[#8BA4A1]/50">
            <Camera className="w-6 h-6" />
            <span className="font-mono-tag text-[9px] uppercase tracking-wider">
              {prop.status === 'generating' ? 'Rendering…' : 'No image yet'}
            </span>
          </div>
        )}
      </div>

      {/* Prop Information */}
      <div className="flex flex-col flex-1">
        <h3 className="font-fraunces text-base font-semibold text-[#12201F] dark:text-[#EDF5F3] leading-tight line-clamp-1 group-hover:text-[#12A79D] transition-colors">
          {prop.name}
        </h3>
        
        <span className="font-mono-tag text-[11px] text-[#48605E] dark:text-[#8BA4A1] mt-0.5 tracking-wider">
          {prop.id}
        </span>

        {/* Status chip anchored at bottom */}
        <div className="mt-3 pt-2 border-t border-[#D8E5E1]/60 dark:border-[#223735]/80 flex items-center justify-between">
          <StatusChip status={prop.status} size="sm" />
          <span className="font-mono-tag text-[10px] text-[#48605E] dark:text-[#8BA4A1] opacity-0 group-hover:opacity-100 transition-opacity">
            Open →
          </span>
        </div>
      </div>
    </div>
  );
}

