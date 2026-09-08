import React from 'react';
import { ActiveTab, PropItem, ProductionProfile, PropViewMode } from '../types';
import { Moon, Sun, SlidersHorizontal, Box, Camera, Film } from 'lucide-react';

interface HeaderProps {
  currentTab: ActiveTab;
  onNavigate: (tab: ActiveTab) => void;
  onNewProp: () => void;
  activeProp?: PropItem | null;
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
  productionProfile?: ProductionProfile;
  onOpenOnboarding?: () => void;
  viewMode?: PropViewMode;
  onViewModeChange?: (mode: PropViewMode) => void;
}

export function Header({
  currentTab,
  onNavigate,
  onNewProp,
  activeProp,
  theme = 'dark',
  onToggleTheme,
  productionProfile,
  onOpenOnboarding,
  viewMode = 'vitrine',
  onViewModeChange
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 bg-[#F7F4EC] dark:bg-[#0D1514] border-b border-[#D8E5E1] dark:border-[#223735] transition-colors">
      {/* Primary Top Bar */}
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Brand & Production Film Slate */}
        <div className="flex items-center gap-4 sm:gap-5">
          <button
            type="button"
            onClick={() => onNavigate('catalogue')}
            className="flex items-center gap-2.5 group text-left cursor-pointer"
          >
            <span className="font-fraunces text-2xl font-bold tracking-tight text-[#12201F] dark:text-[#EDF5F3] group-hover:text-[#12A79D] transition-colors">
              Artifact
            </span>
            <span className="font-mono-tag text-[10px] uppercase px-1.5 py-0.5 border border-[#12A79D]/40 text-[#12A79D] tracking-wider hidden sm:inline-block">
              Prop Atelier
            </span>
          </button>

          {/* Film Production Slate Indicator */}
          {productionProfile?.projectName && (
            <button
              type="button"
              onClick={onOpenOnboarding}
              className="hidden lg:flex items-center gap-2 px-2.5 py-1 border border-[#D8E5E1] dark:border-[#223735] text-[10px] font-mono-tag text-[#48605E] dark:text-[#8BA4A1] hover:border-[#12A79D] transition-colors cursor-pointer bg-white/50 dark:bg-[#14201E]/50"
              title="Click to view production details or configure slate"
            >
              <Film className="w-3 h-3 text-[#12A79D]" />
              <span className="truncate max-w-[150px] text-[#12201F] dark:text-[#EDF5F3] font-semibold">
                {productionProfile.projectName}
              </span>
              <span className="text-[#12A79D] text-[9px] border-l border-[#D8E5E1] dark:border-[#223735] pl-1.5 uppercase">
                {productionProfile.departmentRole || 'Art Dept'}
              </span>
            </button>
          )}
        </div>

        {/* Navigation, View Switcher & Action */}
        <div className="flex items-center gap-2.5 sm:gap-4">
          <nav className="flex items-center gap-3 sm:gap-5">
            <button
              type="button"
              onClick={() => onNavigate('catalogue')}
              className={`font-inter text-sm font-medium transition-colors cursor-pointer relative py-2 ${
                currentTab === 'catalogue'
                  ? 'text-[#12A79D] font-semibold'
                  : 'text-[#48605E] dark:text-[#8BA4A1] hover:text-[#12201F] dark:hover:text-[#EDF5F3]'
              }`}
            >
              Catalogue
              {currentTab === 'catalogue' && (
                <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#12A79D]" />
              )}
            </button>

            <button
              type="button"
              onClick={() => onNavigate('options')}
              className={`font-inter text-sm font-medium transition-colors cursor-pointer relative py-2 ${
                ['brief', 'options', 'selection', 'dossier'].includes(currentTab)
                  ? 'text-[#12A79D] font-semibold'
                  : 'text-[#48605E] dark:text-[#8BA4A1] hover:text-[#12201F] dark:hover:text-[#EDF5F3]'
              }`}
            >
              Atelier
              {['brief', 'options', 'selection', 'dossier'].includes(currentTab) && (
                <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#12A79D]" />
              )}
            </button>

            <button
              type="button"
              onClick={() => onNavigate('registry')}
              className={`font-inter text-sm font-medium transition-colors cursor-pointer relative py-2 ${
                currentTab === 'registry'
                  ? 'text-[#12A79D] font-semibold'
                  : 'text-[#48605E] dark:text-[#8BA4A1] hover:text-[#12201F] dark:hover:text-[#EDF5F3]'
              }`}
            >
              Library
              {currentTab === 'registry' && (
                <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#12A79D]" />
              )}
            </button>
          </nav>

          {/* View Mode Switcher: Vitrine Showcase vs. Photo Artifact */}
          {onViewModeChange && (
            <div
              className="flex items-center border border-[#D8E5E1] dark:border-[#223735] bg-white dark:bg-[#14201E] p-0.5"
              title="Switch between Museum Vitrine Plate and Clean Image Artifact view"
            >
              <button
                type="button"
                onClick={() => onViewModeChange('vitrine')}
                className={`flex items-center gap-1 px-2 py-1 text-[11px] font-mono-tag transition-colors cursor-pointer ${
                  viewMode === 'vitrine'
                    ? 'bg-[#12A79D] text-white font-medium shadow-xs'
                    : 'text-[#48605E] dark:text-[#8BA4A1] hover:text-[#12201F] dark:hover:text-[#EDF5F3]'
                }`}
                title="Vitrine Plate: Archival drafting case with crosshairs & technical markings"
              >
                <Box className="w-3 h-3" />
                <span className="hidden md:inline">Vitrine</span>
              </button>
              <button
                type="button"
                onClick={() => onViewModeChange('photo_artifact')}
                className={`flex items-center gap-1 px-2 py-1 text-[11px] font-mono-tag transition-colors cursor-pointer ${
                  viewMode === 'photo_artifact'
                    ? 'bg-[#12A79D] text-white font-medium shadow-xs'
                    : 'text-[#48605E] dark:text-[#8BA4A1] hover:text-[#12201F] dark:hover:text-[#EDF5F3]'
                }`}
                title="Image Artifact: Clean photographic still with studio lighting"
              >
                <Camera className="w-3 h-3" />
                <span className="hidden md:inline">Image Artifact</span>
              </button>
            </div>
          )}

          {/* Setup / Onboarding Button */}
          {onOpenOnboarding && (
            <button
              type="button"
              onClick={onOpenOnboarding}
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-mono-tag border border-[#D8E5E1] dark:border-[#223735] bg-white dark:bg-[#14201E] text-[#12201F] dark:text-[#EDF5F3] hover:border-[#12A79D] transition-colors cursor-pointer"
              title="Studio Setup & Onboarding"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#12A79D]" />
              <span className="hidden lg:inline">Studio Setup</span>
            </button>
          )}

          {/* Theme Toggle Button */}
          {onToggleTheme && (
            <button
              type="button"
              onClick={onToggleTheme}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-mono-tag border border-[#D8E5E1] dark:border-[#223735] bg-white dark:bg-[#14201E] text-[#12201F] dark:text-[#EDF5F3] hover:border-[#12A79D] transition-colors cursor-pointer"
              title={`Switch to ${theme === 'dark' ? 'Light Paper' : 'Dark Atelier'} theme`}
              aria-label="Toggle visual theme"
            >
              {theme === 'dark' ? (
                <>
                  <Moon className="w-3.5 h-3.5 text-[#12A79D]" />
                  <span className="hidden xl:inline">Dark</span>
                </>
              ) : (
                <>
                  <Sun className="w-3.5 h-3.5 text-[#C6792E]" />
                  <span className="hidden xl:inline">Light</span>
                </>
              )}
            </button>
          )}

          {/* Primary Action Button: "New hero prop" */}
          <button
            type="button"
            onClick={onNewProp}
            className="bg-[#12A79D] hover:bg-[#0B5F5A] text-white px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-medium transition-colors cursor-pointer shadow-xs whitespace-nowrap"
          >
            New hero prop
          </button>
        </div>
      </div>


      {/* 5-Stage Guided Walkthrough Bar (directly matches the 5 Pages Layout from the user request) */}
      <div className="bg-[#FFFFFF] dark:bg-[#14201E] border-t border-[#D8E5E1] dark:border-[#223735] px-6 py-2 transition-colors">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-xs">
          <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar py-0.5">
            <span className="font-mono-tag text-[#48605E] dark:text-[#8BA4A1] uppercase text-[11px] pr-2 whitespace-nowrap">
              Layout View:
            </span>

            <button
              type="button"
              onClick={() => onNavigate('catalogue')}
              className={`px-2.5 py-1 font-mono-tag text-[11px] whitespace-nowrap transition-colors ${
                currentTab === 'catalogue'
                  ? 'bg-[#12A79D] text-white font-medium'
                  : 'text-[#48605E] dark:text-[#8BA4A1] hover:bg-[#F7F4EC] dark:hover:bg-[#1D2B29] hover:text-[#12201F] dark:hover:text-[#EDF5F3]'
              }`}
            >
              1. Home / Catalogue
            </button>

            <span className="text-[#D8E5E1] dark:text-[#223735]">/</span>

            <button
              type="button"
              onClick={() => onNavigate('brief')}
              className={`px-2.5 py-1 font-mono-tag text-[11px] whitespace-nowrap transition-colors ${
                currentTab === 'brief'
                  ? 'bg-[#12A79D] text-white font-medium'
                  : 'text-[#48605E] dark:text-[#8BA4A1] hover:bg-[#F7F4EC] dark:hover:bg-[#1D2B29] hover:text-[#12201F] dark:hover:text-[#EDF5F3]'
              }`}
            >
              2. New Prop Brief
            </button>

            <span className="text-[#D8E5E1] dark:text-[#223735]">/</span>

            <button
              type="button"
              onClick={() => onNavigate('options')}
              className={`px-2.5 py-1 font-mono-tag text-[11px] whitespace-nowrap transition-colors ${
                currentTab === 'options'
                  ? 'bg-[#12A79D] text-white font-medium'
                  : 'text-[#48605E] dark:text-[#8BA4A1] hover:bg-[#F7F4EC] dark:hover:bg-[#1D2B29] hover:text-[#12201F] dark:hover:text-[#EDF5F3]'
              }`}
            >
              3. Options / Gate 1
            </button>

            <span className="text-[#D8E5E1] dark:text-[#223735]">/</span>

            <button
              type="button"
              onClick={() => onNavigate('selection')}
              className={`px-2.5 py-1 font-mono-tag text-[11px] whitespace-nowrap transition-colors ${
                currentTab === 'selection'
                  ? 'bg-[#12A79D] text-white font-medium'
                  : 'text-[#48605E] dark:text-[#8BA4A1] hover:bg-[#F7F4EC] dark:hover:bg-[#1D2B29] hover:text-[#12201F] dark:hover:text-[#EDF5F3]'
              }`}
            >
              4. Selection / Gate 2
            </button>

            <span className="text-[#D8E5E1] dark:text-[#223735]">/</span>

            <button
              type="button"
              onClick={() => onNavigate('dossier')}
              className={`px-2.5 py-1 font-mono-tag text-[11px] whitespace-nowrap transition-colors ${
                currentTab === 'dossier'
                  ? 'bg-[#12A79D] text-white font-medium'
                  : 'text-[#48605E] dark:text-[#8BA4A1] hover:bg-[#F7F4EC] dark:hover:bg-[#1D2B29] hover:text-[#12201F] dark:hover:text-[#EDF5F3]'
              }`}
            >
              5. Final Asset Dossier
            </button>
          </div>

          {activeProp && (
            <div className="hidden md:flex items-center gap-2 font-mono-tag text-[11px] text-[#48605E] dark:text-[#8BA4A1] pl-3 whitespace-nowrap">
              <span>Active:</span>
              <span className="text-[#12201F] dark:text-[#EDF5F3] font-semibold">{activeProp.name}</span>
              <span className="text-[#12A79D]">({activeProp.id})</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
