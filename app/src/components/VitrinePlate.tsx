import React from 'react';
import { PropViewMode } from '../types';
import { Camera, Box, Maximize2, RefreshCw, Columns } from 'lucide-react';

interface VitrinePlateProps {
  key?: React.Key;
  imageUrl: string;
  label?: string;
  sublabel?: string;
  selected?: boolean;
  viewMode?: PropViewMode;
  onToggleViewMode?: () => void;
  onClick?: () => void;
  onEnlarge?: () => void;
  onCompare?: () => void;
  onRegenerate?: () => void;
  aspectRatio?: 'square' | 'video' | 'portrait' | 'wide';
  showGlassOverlay?: boolean;
  interactive?: boolean;
  className?: string;
}

export function VitrinePlate({
  imageUrl,
  label,
  sublabel,
  selected = false,
  viewMode = 'vitrine',
  onToggleViewMode,
  onClick,
  onEnlarge,
  onCompare,
  onRegenerate,
  aspectRatio = 'video',
  showGlassOverlay = true,
  interactive = true,
  className = ''
}: VitrinePlateProps) {
  let aspectClass = 'aspect-[4/3]';
  if (aspectRatio === 'square') aspectClass = 'aspect-square';
  if (aspectRatio === 'video') aspectClass = 'aspect-[16/11]';
  if (aspectRatio === 'portrait') aspectClass = 'aspect-[3/4]';
  if (aspectRatio === 'wide') aspectClass = 'aspect-[16/9]';

  const isVitrine = viewMode === 'vitrine';

  return (
    <div
      onClick={onClick}
      className={`group relative flex flex-col transition-all duration-200 ${
        isVitrine
          ? `bg-white dark:bg-[#14201E] border ${
              selected
                ? 'border-[#12A79D] shadow-sm ring-1 ring-[#12A79D]'
                : 'border-[#D8E5E1] dark:border-[#223735] hover:border-[#8FCFEA] dark:hover:border-[#12A79D]/60'
            }`
          : `bg-[#F0EDE3] dark:bg-[#0B1312] border ${
              selected
                ? 'border-[#12A79D] shadow-md ring-2 ring-[#12A79D]/50'
                : 'border-[#D8E5E1] dark:border-[#1D2B29] hover:border-[#12A79D]/60'
            } shadow-xs`
      } ${interactive ? 'cursor-pointer' : ''} ${className}`}
    >
      {/* Top Accent: Turquoise rule for Vitrine, or Film Still strip for Photo Artifact */}
      {isVitrine ? (
        <div
          className={`h-[2.5px] w-full transition-colors ${
            selected ? 'bg-[#12A79D]' : 'bg-[#12A79D] group-hover:bg-[#0B5F5A]'
          }`}
        />
      ) : (
        <div className="h-[2px] w-full bg-linear-to-r from-[#48605E]/40 via-[#12A79D]/50 to-[#48605E]/40" />
      )}

      {/* Stage / Display Container */}
      <div
        className={`relative w-full ${aspectClass} overflow-hidden flex items-center justify-center p-3 transition-colors ${
          isVitrine
            ? 'bg-[#FFFFFF] dark:bg-[#0F1A18] vitrine-stage-inner'
            : 'bg-radial from-[#FFFFFF] via-[#F4EFE6] to-[#E5DFD3] dark:from-[#152320] dark:via-[#0F1817] dark:to-[#080E0D]'
        }`}
      >
        {/* Vitrine Subtle Glass Case Geometry (only in vitrine mode) */}
        {isVitrine && showGlassOverlay && (
          <div className="absolute inset-2 pointer-events-none border border-[#12A79D]/15 dark:border-[#12A79D]/25">
            {/* Corner brackets */}
            <span className="absolute top-0 left-0 w-2 h-2 border-t border-l border-[#12A79D]/40" />
            <span className="absolute top-0 right-0 w-2 h-2 border-t border-r border-[#12A79D]/40" />
            <span className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-[#12A79D]/40" />
            <span className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-[#12A79D]/40" />
          </div>
        )}

        {/* Photo Artifact Mode: Photographic sweep vignette & subtle drop-shadow floor */}
        {!isVitrine && (
          <>
            <div className="absolute inset-0 pointer-events-none bg-radial from-transparent via-black/3 to-black/8 dark:via-transparent dark:to-black/30" />
            {/* Photographic watermark badge */}
            <div className="absolute top-2 left-2 pointer-events-none flex items-center gap-1 px-1.5 py-0.5 bg-black/60 text-white font-mono-tag text-[9px] uppercase tracking-wider backdrop-blur-xs">
              <Camera className="w-2.5 h-2.5 text-[#38C7BD]" />
              <span>STILL ARTIFACT</span>
            </div>
          </>
        )}

        {/* Prop Artwork Image */}
        <div className="relative w-full h-full flex items-center justify-center">
          <img
            src={imageUrl}
            alt={label || 'Hero prop artifact'}
            className={`w-full h-full object-contain select-none transition-transform duration-300 ${
              isVitrine
                ? 'group-hover:scale-[1.02]'
                : 'group-hover:scale-[1.03] drop-shadow-md'
            }`}
            loading="lazy"
          />
        </div>

        {/* Hover Quick Actions (Toggle View Mode / Enlarge / Compare / Regenerate) */}
        <div className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex items-center gap-1 bg-white/95 dark:bg-[#14201E]/95 border border-[#D8E5E1] dark:border-[#223735] px-1.5 py-1 shadow-sm z-20">
          {onToggleViewMode && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleViewMode();
              }}
              className="px-1.5 py-0.5 text-[10px] font-mono-tag text-[#12201F] dark:text-[#EDF5F3] hover:bg-[#BFE3F2] dark:hover:bg-[#112F38] transition-colors flex items-center gap-1"
              title={isVitrine ? 'Switch to Raw Photo Artifact' : 'Switch to Vitrine Showcase'}
            >
              {isVitrine ? (
                <>
                  <Camera className="w-3 h-3 text-[#12A79D]" />
                  <span className="hidden sm:inline">Photo</span>
                </>
              ) : (
                <>
                  <Box className="w-3 h-3 text-[#12A79D]" />
                  <span className="hidden sm:inline">Vitrine</span>
                </>
              )}
            </button>
          )}

          {onEnlarge && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEnlarge();
              }}
              className="p-1 text-[11px] font-mono-tag text-[#12201F] dark:text-[#EDF5F3] hover:bg-[#BFE3F2] dark:hover:bg-[#112F38] transition-colors"
              title="Enlarge artifact"
            >
              <Maximize2 className="w-3 h-3 text-[#48605E] dark:text-[#8BA4A1]" />
            </button>
          )}

          {onCompare && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onCompare();
              }}
              className="p-1 text-[11px] font-mono-tag text-[#12201F] dark:text-[#EDF5F3] hover:bg-[#BFE3F2] dark:hover:bg-[#112F38] transition-colors"
              title="Compare side-by-side"
            >
              <Columns className="w-3 h-3 text-[#48605E] dark:text-[#8BA4A1]" />
            </button>
          )}

          {onRegenerate && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRegenerate();
              }}
              className="p-1 text-[11px] font-mono-tag text-[#12201F] dark:text-[#EDF5F3] hover:bg-[#BFE3F2] dark:hover:bg-[#112F38] transition-colors"
              title="Regenerate this direction"
            >
              <RefreshCw className="w-3 h-3 text-[#48605E] dark:text-[#8BA4A1]" />
            </button>
          )}
        </div>
      </div>

      {/* Label Under Plate */}
      {(label || sublabel) && (
        <div className={`border-t border-[#D8E5E1] dark:border-[#223735] px-3 py-2 text-center transition-colors ${
          isVitrine ? 'bg-white dark:bg-[#14201E]' : 'bg-[#FAF8F3] dark:bg-[#101918]'
        }`}>
          {label && (
            <div className="font-mono-tag text-xs font-semibold uppercase tracking-wider text-[#12201F] dark:text-[#EDF5F3]">
              {label}
            </div>
          )}
          {sublabel && (
            <div className="font-mono-tag text-[11px] text-[#48605E] dark:text-[#8BA4A1] mt-0.5 tracking-wide">
              {sublabel}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

