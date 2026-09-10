import React, { useState } from 'react';
import { ConceptOption, PropItem, PropViewMode } from '../../types';
import { VitrinePlate } from '../VitrinePlate';
import { getPropArtwork } from '../../utils/propVisuals';
import { Box, Camera, Film } from 'lucide-react';

interface ProofSheetPageProps {
  prop: PropItem;
  onSelectOption: (optionId: string, notes: string) => void;
  onRequestMoreOptions: () => void;
  onRefineBrief: () => void;
  onSkip: () => void;
  viewMode?: PropViewMode;
  onViewModeChange?: (mode: PropViewMode) => void;
}

export function ProofSheetPage({
  prop,
  onSelectOption,
  onRequestMoreOptions,
  onRefineBrief,
  onSkip,
  viewMode = 'vitrine',
  onViewModeChange
}: ProofSheetPageProps) {
  const [selectedOptionId, setSelectedOptionId] = useState<string>(
    prop.selectedOptionId || (prop.options[0]?.id || 'A')
  );
  const [localViewMode, setLocalViewMode] = useState<PropViewMode>(viewMode);
  const [teamNotes, setTeamNotes] = useState<string>('');
  const [enlargedOption, setEnlargedOption] = useState<ConceptOption | null>(null);
  const [enlargeViewMode, setEnlargeViewMode] = useState<PropViewMode>(viewMode);
  const [comparingPair, setComparingPair] = useState<[ConceptOption, ConceptOption] | null>(null);
  const [isRegenerating, setIsRegenerating] = useState<string | null>(null);

  const isDemo = prop.source === 'demo';
  const hasRealOptions = prop.options.some(
    (o) => o.imageUrl && !o.imageUrl.startsWith('https://images.unsplash')
  );

  // Live prop that is still generating its concept options (or hit an error):
  // show honest loading placeholders / an error message instead of an empty or
  // fabricated grid. Deliverables fill in here as soon as the real images land.
  if (!isDemo && (prop.options.length === 0 || !hasRealOptions)) {
    const failed = prop.status === 'failed' || prop.status === 'budget_exceeded';
    const count = Math.max(1, Math.min(prop.optionsCount || 3, 6));
    return (
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="border-b border-[#D8E5E1] dark:border-[#223735] pb-4 mb-6">
          <div className="font-mono-tag text-xs text-[#12A79D] font-semibold tracking-widest uppercase mb-1">
            GATE 1 · THE PROOF SHEET · {prop.id}
          </div>
          <h1 className="font-fraunces text-3xl font-bold text-[#12201F] dark:text-[#EDF5F3]">
            Concept options
          </h1>
          <p className="font-inter text-sm text-[#48605E] dark:text-[#8BA4A1] mt-1">
            {failed
              ? 'Concept generation did not complete.'
              : 'Generating divergent concept directions — images appear here as soon as they render.'}
          </p>
        </div>

        {failed ? (
          <div className="max-w-xl bg-amber-500/10 border border-amber-500/40 p-5">
            <p className="font-inter text-sm text-amber-900 dark:text-amber-200 mb-4">
              {prop.pipelineError || 'Generation hit an error. Please try again.'}
            </p>
            <button
              type="button"
              onClick={onRefineBrief}
              className="bg-[#12A79D] hover:bg-[#0B5F5A] text-white px-5 py-2 text-xs font-mono-tag font-bold uppercase tracking-wider transition-colors cursor-pointer"
            >
              Refine brief &amp; retry
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-4xl">
            {Array.from({ length: count }).map((_, i) => (
              <div
                key={i}
                className="bg-white dark:bg-[#14201E] border border-[#D8E5E1] dark:border-[#223735] p-3"
              >
                <div className="h-[2px] w-full bg-[#12A79D]/30 mb-2" />
                <div className="aspect-video w-full bg-[#F7F4EC] dark:bg-[#0E1716] animate-pulse flex items-center justify-center">
                  <span className="font-mono-tag text-[10px] uppercase tracking-wider text-[#48605E]/70 dark:text-[#8BA4A1]/70">
                    Option {String.fromCharCode(65 + i)} · rendering…
                  </span>
                </div>
                <div className="mt-2 h-3 w-3/4 bg-[#F7F4EC] dark:bg-[#0E1716] animate-pulse" />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  const currentOption =
    prop.options.find((opt) => opt.id === selectedOptionId) || prop.options[0];

  const handleRegenerateOption = (optionId: string) => {
    setIsRegenerating(optionId);
    setTimeout(() => {
      setIsRegenerating(null);
    }, 1200);
  };

  const handleOpenCompare = (opt: ConceptOption) => {
    const other = prop.options.find((o) => o.id !== opt.id) || prop.options[1];
    if (other) {
      setComparingPair([opt, other]);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Page Title Header */}
      <div className="border-b border-[#D8E5E1] dark:border-[#223735] pb-4 mb-6 flex flex-col sm:flex-row sm:items-baseline justify-between gap-4">
        <div>
          <div className="font-mono-tag text-xs text-[#12A79D] font-semibold tracking-widest uppercase mb-1 flex items-center gap-2">
            <span>GATE 1 · THE PROOF SHEET · {prop.id}</span>
            <span className="text-[#D8E5E1] dark:text-[#223735]">·</span>
            <span className="text-[#48605E] dark:text-[#8BA4A1]">PRODUCTION WORKFLOW</span>
          </div>
          <h1 className="font-fraunces text-3xl font-bold text-[#12201F] dark:text-[#EDF5F3]">
            Concept options
          </h1>
          <p className="font-inter text-sm text-[#48605E] dark:text-[#8BA4A1] mt-1">
            Review the 4 divergent design directions below. View as archival vitrines or clean photographic artifacts.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start">
          {/* Dual View Mode Toggle */}
          <div className="flex items-center border border-[#D8E5E1] dark:border-[#223735] bg-white dark:bg-[#14201E] p-0.5">
            <button
              type="button"
              onClick={() => {
                setLocalViewMode('vitrine');
                onViewModeChange?.('vitrine');
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono-tag transition-colors cursor-pointer ${
                localViewMode === 'vitrine'
                  ? 'bg-[#12A79D] text-white font-medium shadow-xs'
                  : 'text-[#48605E] dark:text-[#8BA4A1] hover:text-[#12201F] dark:hover:text-[#EDF5F3]'
              }`}
              title="Vitrine Plate framing with technical drafting markers"
            >
              <Box className="w-3.5 h-3.5" />
              <span>Vitrine Plates</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setLocalViewMode('photo_artifact');
                onViewModeChange?.('photo_artifact');
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono-tag transition-colors cursor-pointer ${
                localViewMode === 'photo_artifact'
                  ? 'bg-[#12A79D] text-white font-medium shadow-xs'
                  : 'text-[#48605E] dark:text-[#8BA4A1] hover:text-[#12201F] dark:hover:text-[#EDF5F3]'
              }`}
              title="Clean Photographic Image Artifact"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Image Artifacts</span>
            </button>
          </div>

          <div className="font-mono-tag text-xs text-[#48605E] dark:text-[#8BA4A1] bg-white dark:bg-[#14201E] border border-[#D8E5E1] dark:border-[#223735] px-3 py-1.5">
            {prop.options.length} DIRECTIONS
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Area: 2x2 Option Grid matching Layout 3 (approx 8 columns) */}
        <div className="lg:col-span-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {prop.options.map((option) => {
              const isSelected = option.id === selectedOptionId;
              const isCurrentlyRegenerating = isRegenerating === option.id;

              return (
                <div key={option.id} className="relative flex flex-col">
                  {/* Vitrine Plate with Frame */}
                  <VitrinePlate
                    imageUrl={option.imageUrl}
                    label={`OPTION ${option.id}`}
                    selected={isSelected}
                    viewMode={localViewMode}
                    onToggleViewMode={() => {
                      const next = localViewMode === 'vitrine' ? 'photo_artifact' : 'vitrine';
                      setLocalViewMode(next);
                      onViewModeChange?.(next);
                    }}
                    onClick={() => setSelectedOptionId(option.id)}
                    onEnlarge={() => {
                      setEnlargeViewMode(localViewMode);
                      setEnlargedOption(option);
                    }}
                    onCompare={() => handleOpenCompare(option)}
                    onRegenerate={() => handleRegenerateOption(option.id)}
                    aspectRatio="video"
                  />

                  {/* Regenerating pulse state */}
                  {isCurrentlyRegenerating && (
                    <div className="absolute inset-0 bg-white/80 border border-[#12A79D] flex flex-col items-center justify-center z-20">
                      <span className="w-4 h-4 rounded-full border-2 border-[#12A79D] border-t-transparent animate-spin mb-2" />
                      <span className="font-mono-tag text-xs text-[#0B5F5A]">
                        Regenerating Option {option.id}...
                      </span>
                    </div>
                  )}

                  {/* One-line rationale under plate */}
                  <div className="mt-2 px-1">
                    <p className="font-inter text-xs text-[#48605E] line-clamp-2">
                      <strong className="text-[#12201F] font-semibold">{option.title}:</strong>{' '}
                      {option.rationale}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Detailed Selected Option Callout */}
          {currentOption && (
            <div className="mt-6 bg-white border border-[#D8E5E1] p-4 flex flex-col sm:flex-row items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="font-mono-tag text-xs font-semibold text-[#12A79D]">
                  ACTIVE INSPECTION: OPTION {currentOption.id} ({currentOption.code})
                </div>
                <div className="font-fraunces text-lg text-[#12201F]">
                  {currentOption.title}
                </div>
                <p className="font-inter text-xs text-[#48605E] max-w-2xl">
                  {currentOption.rationale}
                </p>
              </div>

              <div className="flex flex-wrap gap-1.5 self-end sm:self-center">
                {currentOption.highlights?.map((h, i) => (
                  <span
                    key={i}
                    className="font-mono-tag text-[10px] bg-[#BFE3F2]/40 text-[#0B5F5A] px-2 py-0.5 border border-[#8FCFEA]"
                  >
                    {h}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar: Gate Banner, Notes, and Actions (approx 4 columns) */}
        <div className="lg:col-span-4 space-y-5">
          {/* Gate Banner matching Layout 3 verbatim */}
          <div className="bg-[#BFE3F2] dark:bg-[#112F38] border border-[#8FCFEA] dark:border-[#1D5060] p-4 text-[#12201F] dark:text-[#E5F6FD] transition-colors">
            <h4 className="font-mono-tag text-xs font-bold uppercase tracking-wider text-[#0B5F5A] dark:text-[#38C7BD] mb-1">
              GATE — CHOOSE A DIRECTION
            </h4>
            <p className="font-inter text-xs text-[#12201F]/85 dark:text-[#EDF5F3]/85 leading-relaxed">
              Select one option to move forward, or request more options.
            </p>
          </div>

          {/* Notes Card matching Layout 3 */}
          <div className="bg-white dark:bg-[#14201E] border border-[#D8E5E1] dark:border-[#223735] p-4 transition-colors">
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-mono-tag text-xs font-semibold uppercase text-[#12201F] dark:text-[#EDF5F3]">
                NOTES
              </h4>
              <span className="font-mono-tag text-[11px] text-[#48605E] dark:text-[#8BA4A1]">
                {teamNotes.length}/300
              </span>
            </div>
            <textarea
              rows={4}
              maxLength={300}
              value={teamNotes}
              onChange={(e) => setTeamNotes(e.target.value)}
              className="w-full bg-[#F7F4EC]/40 dark:bg-[#0D1514] border border-[#D8E5E1] dark:border-[#223735] p-3 text-xs font-inter text-[#12201F] dark:text-[#EDF5F3] focus:outline-none focus:border-[#12A79D] focus:bg-white dark:focus:bg-[#14201E] resize-none"
              placeholder="Add notes about this set... (visible to your team)"
            />
          </div>

          {/* Actions Block matching Layout 3 */}
          <div className="space-y-2.5">
            <button
              type="button"
              onClick={() => onSelectOption(selectedOptionId, teamNotes)}
              className="w-full bg-[#12A79D] hover:bg-[#0B5F5A] text-white py-3 px-4 text-xs font-mono-tag font-bold tracking-wider uppercase transition-colors shadow-sm cursor-pointer"
            >
              Select this option ({selectedOptionId})
            </button>

            <button
              type="button"
              onClick={onRequestMoreOptions}
              className="w-full bg-white dark:bg-[#14201E] hover:bg-[#F7F4EC] dark:hover:bg-[#1D2B29] border border-[#D8E5E1] dark:border-[#223735] text-[#12A79D] hover:text-[#0B5F5A] py-2.5 px-4 text-xs font-mono-tag tracking-wider uppercase transition-colors cursor-pointer"
            >
              Request more options
            </button>

            <button
              type="button"
              onClick={onRefineBrief}
              className="w-full bg-white dark:bg-[#14201E] hover:bg-[#F7F4EC] dark:hover:bg-[#1D2B29] border border-[#D8E5E1] dark:border-[#223735] text-[#12201F] dark:text-[#EDF5F3] py-2.5 px-4 text-xs font-mono-tag tracking-wider uppercase transition-colors cursor-pointer"
            >
              Refine brief
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={onSkip}
                className="font-inter text-xs text-[#48605E] dark:text-[#8BA4A1] hover:text-[#12201F] dark:hover:text-[#EDF5F3] underline transition-colors cursor-pointer"
              >
                Skip for now
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Enlarge Lightbox Modal with Dual View Mode Support */}
      {enlargedOption && (
        <div
          className="fixed inset-0 z-50 bg-[#0D1514]/85 flex items-center justify-center p-4 backdrop-blur-xs"
          onClick={() => setEnlargedOption(null)}
        >
          <div
            className="bg-white dark:bg-[#14201E] border border-[#D8E5E1] dark:border-[#223735] max-w-3xl w-full p-6 shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#D8E5E1] dark:border-[#223735] pb-3 mb-4">
              <div>
                <span className="font-mono-tag text-xs text-[#12A79D] font-bold">
                  OPTION {enlargedOption.id} · {enlargedOption.code}
                </span>
                <h3 className="font-fraunces text-xl font-semibold text-[#12201F] dark:text-[#EDF5F3]">
                  {enlargedOption.title}
                </h3>
              </div>

              <div className="flex items-center gap-3">
                {/* Switcher inside Modal */}
                <div className="flex items-center border border-[#D8E5E1] dark:border-[#223735] p-0.5 bg-white dark:bg-[#0D1514]">
                  <button
                    type="button"
                    onClick={() => setEnlargeViewMode('vitrine')}
                    className={`flex items-center gap-1 px-2 py-1 text-xs font-mono-tag cursor-pointer ${
                      enlargeViewMode === 'vitrine'
                        ? 'bg-[#12A79D] text-white'
                        : 'text-[#48605E] dark:text-[#8BA4A1]'
                    }`}
                    title="Vitrine showcase frame"
                  >
                    <Box className="w-3 h-3" />
                    <span>Vitrine</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEnlargeViewMode('photo_artifact')}
                    className={`flex items-center gap-1 px-2 py-1 text-xs font-mono-tag cursor-pointer ${
                      enlargeViewMode === 'photo_artifact'
                        ? 'bg-[#12A79D] text-white'
                        : 'text-[#48605E] dark:text-[#8BA4A1]'
                    }`}
                    title="Clean photo artifact view"
                  >
                    <Camera className="w-3 h-3" />
                    <span>Photo</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setEnlargedOption(null)}
                  className="w-8 h-8 flex items-center justify-center text-xl text-[#48605E] dark:text-[#8BA4A1] hover:text-[#12201F] dark:hover:text-[#EDF5F3] cursor-pointer"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Display Stage based on enlargeViewMode */}
            <div
              className={`relative aspect-[16/10] overflow-hidden p-6 flex items-center justify-center mb-4 transition-colors ${
                enlargeViewMode === 'vitrine'
                  ? 'bg-white dark:bg-[#0F1A18] vitrine-stage-inner border border-[#D8E5E1] dark:border-[#223735]'
                  : 'bg-radial from-white via-[#F5EFE6] to-[#E3DCD0] dark:from-[#182725] dark:via-[#101918] dark:to-[#080E0D] border border-[#D8E5E1] dark:border-[#1F302D]'
              }`}
            >
              {enlargeViewMode === 'vitrine' ? (
                <>
                  <div className="absolute top-0 left-0 right-0 h-[2.5px] bg-[#12A79D]" />
                  <div className="absolute inset-3 pointer-events-none border border-[#12A79D]/20">
                    <span className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-[#12A79D]/50" />
                    <span className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-[#12A79D]/50" />
                    <span className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-[#12A79D]/50" />
                    <span className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-[#12A79D]/50" />
                  </div>
                  <div className="absolute bottom-2 left-3 font-mono-tag text-[10px] text-[#12A79D] uppercase">
                    ACCESSION NO. {enlargedOption.code} · SCALE 1:1 · ATELIER INSPECTION
                  </div>
                </>
              ) : (
                <>
                  <div className="absolute inset-0 pointer-events-none bg-radial from-transparent to-black/15 dark:to-black/40" />
                  <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2 py-0.5 bg-black/70 text-white font-mono-tag text-[9px] uppercase tracking-wider backdrop-blur-xs">
                    <Camera className="w-3 h-3 text-[#38C7BD]" />
                    <span>PRODUCTION STILL · CINEMATIC LENS 50MM</span>
                  </div>
                </>
              )}

              <img
                src={enlargedOption.imageUrl}
                alt={enlargedOption.title}
                className={`max-h-full max-w-full object-contain ${
                  enlargeViewMode === 'photo_artifact' ? 'drop-shadow-xl' : ''
                }`}
              />
            </div>

            <p className="font-inter text-sm text-[#48605E] dark:text-[#8BA4A1] mb-4">
              {enlargedOption.rationale}
            </p>

            <div className="flex justify-between items-center pt-3 border-t border-[#D8E5E1] dark:border-[#223735]">
              <span className="font-mono-tag text-xs text-[#48605E] dark:text-[#8BA4A1]">
                Viewing as {enlargeViewMode === 'vitrine' ? 'Museum Vitrine Plate' : 'Normal Image Artifact'}
              </span>
              <button
                type="button"
                onClick={() => {
                  setSelectedOptionId(enlargedOption.id);
                  setEnlargedOption(null);
                }}
                className="bg-[#12A79D] hover:bg-[#0B5F5A] text-white px-5 py-2 text-xs font-mono-tag uppercase cursor-pointer"
              >
                Choose Option {enlargedOption.id}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Compare Side-by-Side Modal */}
      {comparingPair && (
        <div
          className="fixed inset-0 z-50 bg-[#12201F]/70 flex items-center justify-center p-4 backdrop-blur-xs"
          onClick={() => setComparingPair(null)}
        >
          <div
            className="bg-white border border-[#D8E5E1] max-w-4xl w-full p-6 shadow-xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#D8E5E1] pb-3 mb-4">
              <h3 className="font-fraunces text-xl font-semibold text-[#12201F]">
                Side-by-Side Comparison: Option {comparingPair[0].id} vs Option {comparingPair[1].id}
              </h3>
              <button
                type="button"
                onClick={() => setComparingPair(null)}
                className="w-8 h-8 flex items-center justify-center text-lg text-[#48605E] hover:text-[#12201F]"
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-2 gap-6">
              {[comparingPair[0], comparingPair[1]].map((opt) => (
                <div key={opt.id} className="border border-[#D8E5E1] p-4 bg-[#F7F4EC]/20">
                  <div className="font-mono-tag text-xs font-bold text-[#12A79D] mb-1">
                    OPTION {opt.id} · {opt.code}
                  </div>
                  <div className="font-fraunces text-base font-semibold text-[#12201F] mb-3">
                    {opt.title}
                  </div>
                  <div className="aspect-[4/3] bg-white border border-[#D8E5E1] p-2 mb-3">
                    <img src={opt.imageUrl} alt={opt.title} className="w-full h-full object-contain" />
                  </div>
                  <p className="font-inter text-xs text-[#48605E] mb-3">{opt.rationale}</p>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedOptionId(opt.id);
                      setComparingPair(null);
                    }}
                    className="w-full bg-[#12A79D] hover:bg-[#0B5F5A] text-white py-2 text-xs font-mono-tag uppercase"
                  >
                    Select Option {opt.id}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
