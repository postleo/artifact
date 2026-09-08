import React, { useState } from 'react';
import { ProductionProfile } from '../types';
import { Sparkles, Layers, ArrowRight, Check, X, Shield, Film } from 'lucide-react';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (profile: ProductionProfile) => void;
  initialProfile?: ProductionProfile;
}

const GENRE_PRESETS = [
  {
    name: 'The Clockwork Empire',
    world: 'Gilded Steampunk, brass pneumatics, crystal optics',
    sampleProp: 'Astral Compass'
  },
  {
    name: 'Neo-Kyoto 2148',
    world: 'Cyberpunk underworld, carbon weave, sub-dermal neuro-links',
    sampleProp: 'Neural Deck'
  },
  {
    name: 'Deep Orbit Horizon',
    world: 'Hard Sci-Fi, vacuum-sealed titanium, orbital debris salvage',
    sampleProp: 'Void Harpoon'
  },
  {
    name: 'Eldritch Archive 1892',
    world: 'Gothic Victorian occult research, tarnished silver, reliquaries',
    sampleProp: 'Stasis Casket'
  }
];

export function OnboardingModal({
  isOpen,
  onClose,
  onComplete,
  initialProfile
}: OnboardingModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [projectName, setProjectName] = useState(initialProfile?.projectName || 'Chronicles of Aethelgard');
  const [worldLore, setWorldLore] = useState(initialProfile?.worldLore || 'Steampunk / Gilded Age of Drift');
  const [leadName, setLeadName] = useState(initialProfile?.leadName || 'Isla Venn');
  const [departmentRole, setDepartmentRole] = useState(initialProfile?.departmentRole || 'Lead Prop Master');
  const [startMode, setStartMode] = useState<'scratch' | 'demo'>(initialProfile?.startMode || 'scratch');

  if (!isOpen) return null;

  const handleNext = () => {
    if (step < 3) {
      setStep((prev) => (prev + 1) as 2 | 3);
    } else {
      onComplete({
        projectName: projectName.trim() || 'Untitled Production',
        worldLore: worldLore.trim() || 'Custom World',
        leadName: leadName.trim() || 'Art Department Lead',
        departmentRole: departmentRole.trim() || 'Prop Master',
        startMode
      });
    }
  };

  const handleSelectPreset = (preset: typeof GENRE_PRESETS[0]) => {
    setProjectName(preset.name);
    setWorldLore(preset.world);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A1211]/80 dark:bg-[#050A09]/90 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white dark:bg-[#14201E] border border-[#D8E5E1] dark:border-[#223735] shadow-2xl overflow-hidden my-8 transition-colors">
        {/* Signature top turquoise rule */}
        <div className="h-[3px] w-full bg-[#12A79D]" />

        {/* Modal Header */}
        <div className="p-6 border-b border-[#D8E5E1] dark:border-[#223735] flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono-tag text-[10px] uppercase tracking-widest text-[#12A79D] font-bold">
                ARTIFACT ATELIER · ONBOARDING
              </span>
              <span className="text-[#D8E5E1] dark:text-[#223735]">|</span>
              <span className="font-mono-tag text-[10px] text-[#48605E] dark:text-[#8BA4A1]">
                STEP {step} OF 3
              </span>
            </div>
            <h2 className="font-fraunces text-2xl font-bold text-[#12201F] dark:text-[#EDF5F3]">
              {step === 1 && 'Production & Department Setup'}
              {step === 2 && 'Choose Your Starting Slate'}
              {step === 3 && 'Confirm & Launch Atelier'}
            </h2>
            <p className="font-inter text-xs text-[#48605E] dark:text-[#8BA4A1] mt-1">
              {step === 1 && 'Initialize your production metadata, universe lore, and lead credentials.'}
              {step === 2 && 'Start from a clean slate or explore the pre-built studio archive demo.'}
              {step === 3 && 'Review your production manifest and enter the prop fabrication workspace.'}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#48605E] dark:text-[#8BA4A1] hover:text-[#12201F] dark:hover:text-[#EDF5F3] hover:bg-[#F7F4EC] dark:hover:bg-[#1D2B29] transition-colors"
            title="Dismiss"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6">
          {/* STEP 1: Production Details */}
          {step === 1 && (
            <div className="space-y-5">
              {/* Project Title */}
              <div>
                <label className="block font-mono-tag text-xs font-semibold uppercase tracking-wider text-[#12201F] dark:text-[#EDF5F3] mb-1.5">
                  Production / Film Title
                </label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="e.g. Chronicles of Aethelgard, Blade & Brass..."
                  className="w-full bg-[#F7F4EC]/50 dark:bg-[#0F1A18] border border-[#D8E5E1] dark:border-[#223735] px-3.5 py-2.5 text-sm font-inter text-[#12201F] dark:text-[#EDF5F3] focus:outline-none focus:border-[#12A79D]"
                />
              </div>

              {/* Genre Presets */}
              <div>
                <span className="block font-mono-tag text-[11px] text-[#48605E] dark:text-[#8BA4A1] uppercase tracking-wider mb-2">
                  Quick Genre Presets:
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {GENRE_PRESETS.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectPreset(preset)}
                      className={`p-2.5 text-left border text-xs transition-colors cursor-pointer ${
                        projectName === preset.name
                          ? 'border-[#12A79D] bg-[#12A79D]/10 text-[#0B5F5A] dark:text-[#38C7BD]'
                          : 'border-[#D8E5E1] dark:border-[#223735] bg-white dark:bg-[#14201E] hover:border-[#12A79D]/60'
                      }`}
                    >
                      <div className="font-semibold font-fraunces text-[#12201F] dark:text-[#EDF5F3]">
                        {preset.name}
                      </div>
                      <div className="text-[10px] text-[#48605E] dark:text-[#8BA4A1] line-clamp-1 mt-0.5">
                        {preset.world}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Universe & World Lore */}
              <div>
                <label className="block font-mono-tag text-xs font-semibold uppercase tracking-wider text-[#12201F] dark:text-[#EDF5F3] mb-1.5">
                  World Setting & Visual Rules
                </label>
                <textarea
                  rows={2}
                  value={worldLore}
                  onChange={(e) => setWorldLore(e.target.value)}
                  placeholder="Describe material culture, aesthetic era, or key technology..."
                  className="w-full bg-[#F7F4EC]/50 dark:bg-[#0F1A18] border border-[#D8E5E1] dark:border-[#223735] p-3 text-xs font-inter text-[#12201F] dark:text-[#EDF5F3] focus:outline-none focus:border-[#12A79D] resize-none"
                />
              </div>

              {/* Lead Name & Role */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-mono-tag text-xs font-semibold uppercase tracking-wider text-[#12201F] dark:text-[#EDF5F3] mb-1.5">
                    Lead Designer / Prop Master
                  </label>
                  <input
                    type="text"
                    value={leadName}
                    onChange={(e) => setLeadName(e.target.value)}
                    placeholder="Your name..."
                    className="w-full bg-[#F7F4EC]/50 dark:bg-[#0F1A18] border border-[#D8E5E1] dark:border-[#223735] px-3.5 py-2 text-xs font-inter text-[#12201F] dark:text-[#EDF5F3] focus:outline-none focus:border-[#12A79D]"
                  />
                </div>

                <div>
                  <label className="block font-mono-tag text-xs font-semibold uppercase tracking-wider text-[#12201F] dark:text-[#EDF5F3] mb-1.5">
                    Department Role
                  </label>
                  <select
                    value={departmentRole}
                    onChange={(e) => setDepartmentRole(e.target.value)}
                    className="w-full bg-[#F7F4EC]/50 dark:bg-[#0F1A18] border border-[#D8E5E1] dark:border-[#223735] px-3.5 py-2 text-xs font-mono-tag text-[#12201F] dark:text-[#EDF5F3] focus:outline-none focus:border-[#12A79D] cursor-pointer"
                  >
                    <option value="Lead Prop Master">Lead Prop Master</option>
                    <option value="Production Designer">Production Designer</option>
                    <option value="Art Director">Art Director</option>
                    <option value="Senior Concept Artist">Senior Concept Artist</option>
                    <option value="Fabrication Specialist">Fabrication Specialist</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Slate Mode (Start from Scratch vs Demo) */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Option 1: Start From Scratch */}
                <div
                  onClick={() => setStartMode('scratch')}
                  className={`p-5 border cursor-pointer transition-all flex flex-col justify-between ${
                    startMode === 'scratch'
                      ? 'border-[#12A79D] bg-[#12A79D]/5 dark:bg-[#12A79D]/10 ring-1 ring-[#12A79D]'
                      : 'border-[#D8E5E1] dark:border-[#223735] bg-white dark:bg-[#14201E] hover:border-[#12A79D]/60'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-9 h-9 rounded-none bg-[#12A79D]/15 dark:bg-[#12A79D]/25 flex items-center justify-center text-[#12A79D]">
                        <Sparkles className="w-5 h-5" />
                      </div>
                      {startMode === 'scratch' && (
                        <span className="w-5 h-5 rounded-full bg-[#12A79D] text-white flex items-center justify-center text-xs">
                          <Check className="w-3 h-3" />
                        </span>
                      )}
                    </div>
                    <h3 className="font-fraunces text-base font-bold text-[#12201F] dark:text-[#EDF5F3] mb-1">
                      Start From Scratch
                    </h3>
                    <p className="font-inter text-xs text-[#48605E] dark:text-[#8BA4A1] leading-relaxed mb-3">
                      Clean slate with 0 props. You will begin by drafting your own custom hero prop brief directly in the Designer Worksheet.
                    </p>
                  </div>
                  <div className="pt-3 border-t border-[#D8E5E1]/60 dark:border-[#223735]/70 font-mono-tag text-[10px] text-[#12A79D] uppercase tracking-wider">
                    Recommended for real projects
                  </div>
                </div>

                {/* Option 2: Explore Studio Archive */}
                <div
                  onClick={() => setStartMode('demo')}
                  className={`p-5 border cursor-pointer transition-all flex flex-col justify-between ${
                    startMode === 'demo'
                      ? 'border-[#12A79D] bg-[#12A79D]/5 dark:bg-[#12A79D]/10 ring-1 ring-[#12A79D]'
                      : 'border-[#D8E5E1] dark:border-[#223735] bg-white dark:bg-[#14201E] hover:border-[#12A79D]/60'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-9 h-9 rounded-none bg-[#0B5F5A]/15 dark:bg-[#0B5F5A]/30 flex items-center justify-center text-[#0B5F5A] dark:text-[#38C7BD]">
                        <Layers className="w-5 h-5" />
                      </div>
                      {startMode === 'demo' && (
                        <span className="w-5 h-5 rounded-full bg-[#12A79D] text-white flex items-center justify-center text-xs">
                          <Check className="w-3 h-3" />
                        </span>
                      )}
                    </div>
                    <h3 className="font-fraunces text-base font-bold text-[#12201F] dark:text-[#EDF5F3] mb-1">
                      Studio Archive Demo
                    </h3>
                    <p className="font-inter text-xs text-[#48605E] dark:text-[#8BA4A1] leading-relaxed mb-3">
                      Pre-populates 12 hero props across all 5 production stages (Astral Compass, Neural Jack, Void Harpoon, Stasis Lantern, etc.).
                    </p>
                  </div>
                  <div className="pt-3 border-t border-[#D8E5E1]/60 dark:border-[#223735]/70 font-mono-tag text-[10px] text-[#48605E] dark:text-[#8BA4A1] uppercase tracking-wider">
                    Instant demonstration
                  </div>
                </div>
              </div>

              <div className="p-3 bg-[#BFE3F2]/20 dark:bg-[#112F38]/30 border border-[#8FCFEA] dark:border-[#1D5060] text-xs font-inter text-[#48605E] dark:text-[#8BA4A1] flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#12A79D] shrink-0" />
                <span>
                  You can reset to a clean slate or restore the demo archive at any time from the Studio Settings menu.
                </span>
              </div>
            </div>
          )}

          {/* STEP 3: Manifest & Launch */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="bg-[#F7F4EC]/60 dark:bg-[#0F1A18] border border-[#D8E5E1] dark:border-[#223735] p-4">
                <div className="font-mono-tag text-[11px] text-[#12A79D] font-bold uppercase tracking-wider mb-2">
                  PRODUCTION MANIFEST
                </div>

                <div className="divide-y divide-[#D8E5E1]/60 dark:divide-[#223735]/80 text-xs">
                  <div className="py-2 flex justify-between">
                    <span className="font-mono-tag text-[#48605E] dark:text-[#8BA4A1]">PRODUCTION:</span>
                    <span className="font-semibold text-[#12201F] dark:text-[#EDF5F3]">{projectName}</span>
                  </div>
                  <div className="py-2 flex justify-between">
                    <span className="font-mono-tag text-[#48605E] dark:text-[#8BA4A1]">WORLD / ERA:</span>
                    <span className="text-[#12201F] dark:text-[#EDF5F3] text-right">{worldLore}</span>
                  </div>
                  <div className="py-2 flex justify-between">
                    <span className="font-mono-tag text-[#48605E] dark:text-[#8BA4A1]">DEPARTMENT LEAD:</span>
                    <span className="text-[#12201F] dark:text-[#EDF5F3]">{leadName} ({departmentRole})</span>
                  </div>
                  <div className="py-2 flex justify-between">
                    <span className="font-mono-tag text-[#48605E] dark:text-[#8BA4A1]">INITIAL SLATE:</span>
                    <span className="font-mono-tag font-bold text-[#12A79D]">
                      {startMode === 'scratch' ? 'BLANK SLATE (0 PROPS)' : 'PRELOADED ARCHIVE (12 PROPS)'}
                    </span>
                  </div>
                </div>
              </div>

              <p className="font-inter text-xs text-[#48605E] dark:text-[#8BA4A1] leading-relaxed">
                {startMode === 'scratch'
                  ? 'Clicking "Launch Atelier" will open the clean catalogue where you can immediately create your first hero prop specification.'
                  : 'Clicking "Launch Atelier" will load the full archive for your production.'}
              </p>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="p-6 border-t border-[#D8E5E1] dark:border-[#223735] bg-[#F7F4EC]/30 dark:bg-[#0D1514]/40 flex items-center justify-between">
          <div>
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep((prev) => (prev - 1) as 1 | 2)}
                className="px-4 py-2 text-xs font-mono-tag text-[#48605E] dark:text-[#8BA4A1] hover:text-[#12201F] dark:hover:text-[#EDF5F3] transition-colors"
              >
                ← Back
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-mono-tag text-[#48605E] dark:text-[#8BA4A1] hover:text-[#12201F] dark:hover:text-[#EDF5F3] transition-colors"
              >
                Skip setup
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={handleNext}
            className="bg-[#12A79D] hover:bg-[#0B5F5A] text-white px-6 py-2.5 text-xs font-mono-tag font-bold tracking-wider uppercase transition-colors shadow-xs flex items-center gap-2 cursor-pointer"
          >
            {step < 3 ? (
              <>
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </>
            ) : (
              <>
                <Film className="w-4 h-4" />
                <span>Launch Atelier</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
