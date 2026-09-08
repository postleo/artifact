import React, { useState } from 'react';
import { PropItem, PropViewMode } from '../../types';
import { VitrinePlate } from '../VitrinePlate';
import { Box, Camera, Film, CheckCircle2 } from 'lucide-react';

interface SelectionPageProps {
  prop: PropItem;
  onBuildFinalAssets: () => void;
  onBackToOptions: () => void;
  viewMode?: PropViewMode;
  onViewModeChange?: (mode: PropViewMode) => void;
}

export function SelectionPage({
  prop,
  onBuildFinalAssets,
  onBackToOptions,
  viewMode = 'vitrine',
  onViewModeChange
}: SelectionPageProps) {
  const [localViewMode, setLocalViewMode] = useState<PropViewMode>(viewMode);
  const selectedOption =
    prop.options.find((o) => o.id === (prop.selectedOptionId || 'A')) ||
    prop.options[0];

  const handleToggleMode = (mode: PropViewMode) => {
    setLocalViewMode(mode);
    onViewModeChange?.(mode);
  };

  const decision = prop.decision || {
    optionId: selectedOption?.id || 'A',
    whyWeChoseThis:
      selectedOption?.rationale ||
      'Option A best balances readability and visual sophistication. The open ring structure clearly communicates celestial alignment and allows room for hero engravings. It reflects the world\'s brasswork aesthetic and performs well in silhouette.',
    date: 'May 14, 2024',
    approvers: [
      {
        name: 'Isla Venn',
        role: 'Art Director',
        avatar:
          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'
      },
      {
        name: 'Rohan Patel',
        role: 'Creative Director',
        avatar:
          'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80'
      },
      {
        name: 'Mira Solis',
        role: 'Production Designer',
        avatar:
          'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&auto=format&fit=crop&q=80'
      }
    ],
    notes: [
      'Open structure supports key lighting moments',
      'Outer ring can carry runes for storytelling',
      'Stunt variant will replace sharp finials with rounded caps',
      'Mechanism to include subtle magnetic resistance'
    ]
  };

  const [isBuilding, setIsBuilding] = useState(false);

  const handleBuildClick = () => {
    setIsBuilding(true);
    setTimeout(() => {
      setIsBuilding(false);
      onBuildFinalAssets();
    }, 1000);
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Top Banner Row matching Layout 4 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#D8E5E1] dark:border-[#223735] pb-5 mb-8">
        <div>
          <button
            type="button"
            onClick={onBackToOptions}
            className="font-mono-tag text-xs text-[#48605E] dark:text-[#8BA4A1] hover:text-[#12201F] dark:hover:text-[#EDF5F3] flex items-center gap-1.5 transition-colors mb-1"
          >
            ← Back to Proof Sheet
          </button>
          <h1 className="font-fraunces text-2xl sm:text-3xl font-bold text-[#12201F] dark:text-[#EDF5F3]">
            Selection & Rationale
          </h1>
        </div>

        {/* Gate Banner: DECISION RECORDED matching Layout 4 */}
        <div className="bg-[#BFE3F2] dark:bg-[#112F38] border border-[#8FCFEA] dark:border-[#1D5060] px-4 py-2.5 text-[#12201F] dark:text-[#E5F6FD] sm:max-w-md self-stretch sm:self-auto transition-colors">
          <div className="font-mono-tag text-[11px] font-bold tracking-wider text-[#0B5F5A] dark:text-[#38C7BD] uppercase">
            GATE — DECISION RECORDED
          </div>
          <div className="font-inter text-xs text-[#12201F]/90 dark:text-[#EDF5F3]/90 mt-0.5">
            Direction approved. Ready to build final asset package.
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Side: Large Hero Vitrine Plate / Photo Artifact (approx 5 columns) */}
        <div className="lg:col-span-5 space-y-3">
          {/* Dual View Toggle */}
          <div className="flex items-center justify-between border border-[#D8E5E1] dark:border-[#223735] bg-white dark:bg-[#14201E] px-3 py-1.5">
            <span className="font-mono-tag text-[10px] text-[#48605E] dark:text-[#8BA4A1] uppercase tracking-wider">
              DISPLAY PRESENTATION
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleToggleMode('vitrine')}
                className={`flex items-center gap-1 px-2 py-0.5 text-xs font-mono-tag cursor-pointer ${
                  localViewMode === 'vitrine'
                    ? 'bg-[#12A79D] text-white font-medium'
                    : 'text-[#48605E] dark:text-[#8BA4A1] hover:text-[#12201F] dark:hover:text-[#EDF5F3]'
                }`}
                title="Vitrine plate casing"
              >
                <Box className="w-3 h-3" />
                <span>Vitrine</span>
              </button>
              <button
                type="button"
                onClick={() => handleToggleMode('photo_artifact')}
                className={`flex items-center gap-1 px-2 py-0.5 text-xs font-mono-tag cursor-pointer ${
                  localViewMode === 'photo_artifact'
                    ? 'bg-[#12A79D] text-white font-medium'
                    : 'text-[#48605E] dark:text-[#8BA4A1] hover:text-[#12201F] dark:hover:text-[#EDF5F3]'
                }`}
                title="Photographic image artifact"
              >
                <Camera className="w-3 h-3" />
                <span>Photo</span>
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-[#14201E] border border-[#D8E5E1] dark:border-[#223735] p-3 shadow-xs transition-colors">
            {/* Signature Top Turquoise Rule (in vitrine mode) */}
            {localViewMode === 'vitrine' ? (
              <div className="h-[2px] w-full bg-[#12A79D] mb-2" />
            ) : (
              <div className="h-[2px] w-full bg-[#12A79D]/30 mb-2" />
            )}

            <div
              className={`relative aspect-[4/3] p-4 flex items-center justify-center overflow-hidden transition-colors ${
                localViewMode === 'vitrine'
                  ? 'bg-white dark:bg-[#0F1A18] vitrine-stage-inner border border-[#D8E5E1] dark:border-[#223735]'
                  : 'bg-radial from-white via-[#F5EFE6] to-[#E5DFD4] dark:from-[#1A2624] dark:via-[#101A19] dark:to-[#080E0D] border border-[#D8E5E1] dark:border-[#1F302D]'
              }`}
            >
              {localViewMode === 'vitrine' ? (
                <>
                  <div className="absolute inset-2 pointer-events-none border border-[#12A79D]/15 dark:border-[#12A79D]/25" />
                  <span className="absolute top-2 left-2 font-mono-tag text-[9px] text-[#12A79D]">
                    ORTHO REF: 1:1
                  </span>
                </>
              ) : (
                <>
                  <div className="absolute inset-0 pointer-events-none bg-radial from-transparent to-black/15 dark:to-black/35" />
                  <div className="absolute top-2 left-2 flex items-center gap-1 px-1.5 py-0.5 bg-black/60 text-white font-mono-tag text-[8px] uppercase tracking-wider backdrop-blur-xs">
                    <Camera className="w-2.5 h-2.5 text-[#38C7BD]" />
                    <span>PRODUCTION STILL</span>
                  </div>
                </>
              )}

              <img
                src={selectedOption.imageUrl}
                alt={selectedOption.title}
                className={`w-full h-full object-contain ${
                  localViewMode === 'photo_artifact' ? 'drop-shadow-md' : ''
                }`}
              />
            </div>

            {/* Mono Labels matching Layout 4 */}
            <div className="mt-4 pt-3 border-t border-[#D8E5E1] dark:border-[#223735] text-center">
              <div className="font-mono-tag text-sm font-bold uppercase tracking-wider text-[#12201F] dark:text-[#EDF5F3]">
                OPTION {selectedOption.id} · APPROVED MASTER
              </div>
              <div className="font-mono-tag text-xs text-[#48605E] dark:text-[#8BA4A1] mt-0.5 tracking-wider">
                {selectedOption.code || `${prop.id}-OPT-${selectedOption.id}`}
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Rationale, Approvals, and Build Action (approx 7 columns) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Section: Why We Chose This */}
          <div>
            <h3 className="font-mono-tag text-xs font-semibold text-[#12201F] dark:text-[#EDF5F3] uppercase tracking-wider border-b border-[#D8E5E1] dark:border-[#223735] pb-1.5 mb-2.5">
              WHY WE CHOSE THIS
            </h3>
            <p className="font-inter text-sm text-[#12201F] dark:text-[#EDF5F3] leading-relaxed">
              {decision.whyWeChoseThis}
            </p>
          </div>

          {/* Section: Approved By */}
          <div>
            <h3 className="font-mono-tag text-xs font-semibold text-[#12201F] dark:text-[#EDF5F3] uppercase tracking-wider border-b border-[#D8E5E1] dark:border-[#223735] pb-1.5 mb-3">
              APPROVED BY
            </h3>
            <div className="flex flex-wrap gap-6">
              {decision.approvers.map((approver, idx) => (
                <div key={idx} className="flex items-center gap-2.5">
                  <img
                    src={approver.avatar}
                    alt={approver.name}
                    className="w-8 h-8 rounded-full object-cover border border-[#D8E5E1] dark:border-[#223735]"
                  />
                  <div>
                    <div className="font-inter text-xs font-semibold text-[#12201F] dark:text-[#EDF5F3]">
                      {approver.name}
                    </div>
                    <div className="font-inter text-[11px] text-[#48605E] dark:text-[#8BA4A1]">
                      {approver.role}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section: Date */}
          <div>
            <h3 className="font-mono-tag text-xs font-semibold text-[#12201F] dark:text-[#EDF5F3] uppercase tracking-wider border-b border-[#D8E5E1] dark:border-[#223735] pb-1.5 mb-1.5">
              DATE
            </h3>
            <div className="font-inter text-xs text-[#12201F] dark:text-[#EDF5F3]">
              {decision.date}
            </div>
          </div>

          {/* Section: Notes */}
          <div>
            <h3 className="font-mono-tag text-xs font-semibold text-[#12201F] dark:text-[#EDF5F3] uppercase tracking-wider border-b border-[#D8E5E1] dark:border-[#223735] pb-1.5 mb-2">
              NOTES
            </h3>
            <ul className="space-y-1.5">
              {decision.notes.map((note, idx) => (
                <li key={idx} className="font-inter text-xs text-[#48605E] dark:text-[#8BA4A1] flex items-start gap-2">
                  <span className="text-[#12A79D] font-bold">•</span>
                  <span>{note}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Primary Action Button: Build final asset package */}
          <div className="pt-4 border-t border-[#D8E5E1] dark:border-[#223735]">
            <button
              type="button"
              disabled={isBuilding}
              onClick={handleBuildClick}
              className="w-full sm:w-auto bg-[#12A79D] hover:bg-[#0B5F5A] text-white px-8 py-3.5 text-xs font-mono-tag font-bold uppercase tracking-wider transition-colors shadow-sm cursor-pointer flex items-center justify-center gap-2"
            >
              {isBuilding ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                  <span>Compiling Turnarounds & Fabrication Specs...</span>
                </>
              ) : (
                <span>Build final asset package</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
