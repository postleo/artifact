import React, { useState, useMemo } from 'react';
import { PropItem, PropStatus, ProductionProfile, PropViewMode } from '../../types';
import { CatalogueCard } from '../CatalogueCard';
import { Sparkles, Layers, SlidersHorizontal, Plus, Box, Camera, Search, X, Filter, ArrowUpDown } from 'lucide-react';

interface CataloguePageProps {
  propsList: PropItem[];
  onSelectProp: (prop: PropItem) => void;
  onNewProp: () => void;
  productionProfile?: ProductionProfile;
  onResetDemo?: () => void;
  onOpenOnboarding?: () => void;
  viewMode?: PropViewMode;
  onViewModeChange?: (mode: PropViewMode) => void;
}

type SortOption = 'newest' | 'oldest' | 'name_asc' | 'cost_desc';

export function CataloguePage({
  propsList,
  onSelectProp,
  onNewProp,
  productionProfile,
  onResetDemo,
  onOpenOnboarding,
  viewMode = 'vitrine',
  onViewModeChange
}: CataloguePageProps) {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [worldFilter, setWorldFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<SortOption>('newest');

  // Available unique worlds from the dataset
  const uniqueWorlds = useMemo(() => {
    const worlds = new Set<string>();
    propsList.forEach((p) => {
      if (p.world) worlds.add(p.world);
    });
    return Array.from(worlds);
  }, [propsList]);

  // Counts by status
  const statusCounts = useMemo(() => {
    const counts = {
      all: propsList.length,
      awaiting_review: 0,
      generating: 0,
      assets_ready: 0,
      exported: 0
    };
    propsList.forEach((p) => {
      if (counts[p.status as keyof typeof counts] !== undefined) {
        counts[p.status as keyof typeof counts]++;
      }
    });
    return counts;
  }, [propsList]);

  // Filter and sort props
  const filteredProps = useMemo(() => {
    return propsList
      .filter((item) => {
        const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
        const matchesWorld = worldFilter === 'all' || item.world === worldFilter;
        const q = searchQuery.toLowerCase().trim();
        const matchesSearch =
          !q ||
          item.name.toLowerCase().includes(q) ||
          item.id.toLowerCase().includes(q) ||
          item.world.toLowerCase().includes(q) ||
          item.era.toLowerCase().includes(q) ||
          (item.sceneNumber && item.sceneNumber.toLowerCase().includes(q)) ||
          item.functionOnScreen.toLowerCase().includes(q) ||
          item.constraints.toLowerCase().includes(q);
        return matchesStatus && matchesWorld && matchesSearch;
      })
      .sort((a, b) => {
        if (sortBy === 'name_asc') return a.name.localeCompare(b.name);
        if (sortBy === 'cost_desc') return b.costEstUsd - a.costEstUsd;
        if (sortBy === 'oldest') return a.id.localeCompare(b.id);
        // Default: newest (reverse ID or order)
        return b.id.localeCompare(a.id);
      });
  }, [propsList, statusFilter, worldFilter, searchQuery, sortBy]);

  const hasActiveFilters = statusFilter !== 'all' || worldFilter !== 'all' || searchQuery.trim() !== '';

  const handleClearFilters = () => {
    setStatusFilter('all');
    setWorldFilter('all');
    setSearchQuery('');
  };

  const isBlankSlate = propsList.length === 0;

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Sub-header bar */}
      <div className="border-b border-[#D8E5E1] dark:border-[#223735] pb-4 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-mono-tag text-xs font-semibold uppercase tracking-widest text-[#48605E] dark:text-[#8BA4A1]">
                PROP CATALOGUE & REPOSITORY
              </h2>
              {productionProfile?.projectName && (
                <>
                  <span className="text-[#D8E5E1] dark:text-[#223735]">·</span>
                  <span className="font-mono-tag text-xs text-[#12A79D] font-bold">
                    {productionProfile.projectName}
                  </span>
                </>
              )}
            </div>
            <div className="font-inter text-sm text-[#48605E] dark:text-[#8BA4A1] mt-1">
              {isBlankSlate ? (
                <span>Fresh Production Slate · 0 Hero Props Registered</span>
              ) : (
                <span>
                  Showing {filteredProps.length} of {propsList.length} Hero Props · {viewMode === 'vitrine' ? 'Vitrine Showcase View' : 'Photographic Still View'}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Quick View Mode Toggle */}
            {onViewModeChange && !isBlankSlate && (
              <div className="flex items-center border border-[#D8E5E1] dark:border-[#223735] bg-white dark:bg-[#14201E] p-0.5">
                <button
                  type="button"
                  onClick={() => onViewModeChange('vitrine')}
                  className={`flex items-center gap-1 px-2 py-1 text-[11px] font-mono-tag transition-colors ${
                    viewMode === 'vitrine'
                      ? 'bg-[#12A79D] text-white font-medium'
                      : 'text-[#48605E] dark:text-[#8BA4A1] hover:text-[#12201F] dark:hover:text-[#EDF5F3]'
                  }`}
                  title="Vitrine Plate framing"
                >
                  <Box className="w-3 h-3" />
                  <span className="hidden sm:inline">Vitrine</span>
                </button>
                <button
                  type="button"
                  onClick={() => onViewModeChange('photo_artifact')}
                  className={`flex items-center gap-1 px-2 py-1 text-[11px] font-mono-tag transition-colors ${
                    viewMode === 'photo_artifact'
                      ? 'bg-[#12A79D] text-white font-medium'
                      : 'text-[#48605E] dark:text-[#8BA4A1] hover:text-[#12201F] dark:hover:text-[#EDF5F3]'
                  }`}
                  title="Raw Image Artifact still"
                >
                  <Camera className="w-3 h-3" />
                  <span className="hidden sm:inline">Photo</span>
                </button>
              </div>
            )}

            {/* Quick onboarding / setup button */}
            {onOpenOnboarding && (
              <button
                type="button"
                onClick={onOpenOnboarding}
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-mono-tag border border-[#D8E5E1] dark:border-[#223735] bg-white dark:bg-[#14201E] text-[#48605E] dark:text-[#8BA4A1] hover:text-[#12201F] dark:hover:text-[#EDF5F3] hover:border-[#12A79D] transition-colors"
                title="Configure production slate or restart onboarding"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-[#12A79D]" />
                <span>Studio Setup</span>
              </button>
            )}

            <button
              type="button"
              onClick={onNewProp}
              className="bg-[#12A79D] hover:bg-[#0B5F5A] text-white px-3 py-1.5 text-xs font-mono-tag font-bold tracking-wider uppercase transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Prop</span>
            </button>
          </div>
        </div>
      </div>

      {/* FILTER & SEARCH TOOLBAR */}
      {!isBlankSlate && (
        <div className="bg-white dark:bg-[#14201E] border border-[#D8E5E1] dark:border-[#223735] p-3.5 mb-6 space-y-3 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#48605E] dark:text-[#8BA4A1]" />
              <input
                type="text"
                placeholder="Search by prop name, slate ID, scene number, world, era, materials..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#F7F4EC] dark:bg-[#0E1716] border border-[#D8E5E1] dark:border-[#223735] pl-9 pr-8 py-2 text-xs font-inter text-[#12201F] dark:text-[#EDF5F3] focus:outline-hidden focus:border-[#12A79D]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#48605E] hover:text-[#12201F] dark:hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Dropdown Filters: World & Sort */}
            <div className="flex items-center gap-2">
              {/* World Filter */}
              {uniqueWorlds.length > 1 && (
                <select
                  value={worldFilter}
                  onChange={(e) => setWorldFilter(e.target.value)}
                  className="bg-[#F7F4EC] dark:bg-[#0E1716] border border-[#D8E5E1] dark:border-[#223735] px-2.5 py-2 text-xs font-mono-tag text-[#12201F] dark:text-[#EDF5F3] focus:outline-hidden focus:border-[#12A79D] cursor-pointer"
                >
                  <option value="all">World: All Universes</option>
                  {uniqueWorlds.map((w) => (
                    <option key={w} value={w}>
                      {w}
                    </option>
                  ))}
                </select>
              )}

              {/* Sort By */}
              <div className="flex items-center gap-1">
                <ArrowUpDown className="w-3.5 h-3.5 text-[#48605E] dark:text-[#8BA4A1]" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="bg-[#F7F4EC] dark:bg-[#0E1716] border border-[#D8E5E1] dark:border-[#223735] px-2.5 py-2 text-xs font-mono-tag text-[#12201F] dark:text-[#EDF5F3] focus:outline-hidden focus:border-[#12A79D] cursor-pointer"
                >
                  <option value="newest">Sort: Newest First</option>
                  <option value="oldest">Sort: Oldest First</option>
                  <option value="name_asc">Sort: Name (A-Z)</option>
                  <option value="cost_desc">Sort: Budget (High-Low)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Status Filter Chips */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#D8E5E1]/60 dark:border-[#223735]/60">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-mono-tag text-[10px] text-[#48605E] dark:text-[#8BA4A1] uppercase mr-1">
                Status:
              </span>
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`px-2.5 py-1 text-[11px] font-mono-tag tracking-wider transition-colors cursor-pointer ${
                  statusFilter === 'all'
                    ? 'bg-[#12A79D] text-white font-bold'
                    : 'bg-[#F7F4EC] dark:bg-[#0E1716] text-[#48605E] dark:text-[#8BA4A1] hover:text-[#12201F] dark:hover:text-[#EDF5F3]'
                }`}
              >
                All ({statusCounts.all})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('awaiting_review')}
                className={`px-2.5 py-1 text-[11px] font-mono-tag tracking-wider transition-colors cursor-pointer ${
                  statusFilter === 'awaiting_review'
                    ? 'bg-[#12A79D] text-white font-bold'
                    : 'bg-[#F7F4EC] dark:bg-[#0E1716] text-[#48605E] dark:text-[#8BA4A1] hover:text-[#12201F] dark:hover:text-[#EDF5F3]'
                }`}
              >
                Awaiting Review ({statusCounts.awaiting_review})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('generating')}
                className={`px-2.5 py-1 text-[11px] font-mono-tag tracking-wider transition-colors cursor-pointer ${
                  statusFilter === 'generating'
                    ? 'bg-[#12A79D] text-white font-bold'
                    : 'bg-[#F7F4EC] dark:bg-[#0E1716] text-[#48605E] dark:text-[#8BA4A1] hover:text-[#12201F] dark:hover:text-[#EDF5F3]'
                }`}
              >
                Generating ({statusCounts.generating})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('assets_ready')}
                className={`px-2.5 py-1 text-[11px] font-mono-tag tracking-wider transition-colors cursor-pointer ${
                  statusFilter === 'assets_ready'
                    ? 'bg-[#12A79D] text-white font-bold'
                    : 'bg-[#F7F4EC] dark:bg-[#0E1716] text-[#48605E] dark:text-[#8BA4A1] hover:text-[#12201F] dark:hover:text-[#EDF5F3]'
                }`}
              >
                Assets Ready ({statusCounts.assets_ready})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('exported')}
                className={`px-2.5 py-1 text-[11px] font-mono-tag tracking-wider transition-colors cursor-pointer ${
                  statusFilter === 'exported'
                    ? 'bg-[#12A79D] text-white font-bold'
                    : 'bg-[#F7F4EC] dark:bg-[#0E1716] text-[#48605E] dark:text-[#8BA4A1] hover:text-[#12201F] dark:hover:text-[#EDF5F3]'
                }`}
              >
                Exported ({statusCounts.exported})
              </button>
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="text-[11px] font-mono-tag text-[#12A79D] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <X className="w-3 h-3" />
                <span>Reset Filters</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* BLANK SLATE CARD */}
      {isBlankSlate ? (
        <div className="my-8 bg-white dark:bg-[#14201E] border border-[#D8E5E1] dark:border-[#223735] p-8 sm:p-12 text-center max-w-3xl mx-auto shadow-xs transition-colors">
          <div className="h-[2px] w-24 bg-[#12A79D] mx-auto mb-6" />

          <div className="w-14 h-14 mx-auto mb-4 bg-[#12A79D]/10 dark:bg-[#12A79D]/20 border border-[#12A79D]/30 flex items-center justify-center text-[#12A79D]">
            <Sparkles className="w-7 h-7" />
          </div>

          <span className="font-mono-tag text-xs text-[#12A79D] font-bold tracking-widest uppercase">
            CLEAN PRODUCTION SLATE INITIALIZED
          </span>
          <h2 className="font-fraunces text-2xl sm:text-3xl font-bold text-[#12201F] dark:text-[#EDF5F3] mt-2 mb-3">
            {productionProfile?.projectName || 'New Hero Prop Atelier'}
          </h2>
          <p className="font-inter text-sm text-[#48605E] dark:text-[#8BA4A1] max-w-lg mx-auto mb-8 leading-relaxed">
            Your workspace is clean with 0 props. Extract a brief from a screenplay scene or fill out the art department form to begin generating concept options, vitrines, and fabrication specs.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={onNewProp}
              className="w-full sm:w-auto bg-[#12A79D] hover:bg-[#0B5F5A] text-white px-6 py-3 text-xs font-mono-tag font-bold tracking-wider uppercase transition-colors shadow-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Draft First Hero Prop</span>
            </button>

            {onResetDemo && (
              <button
                type="button"
                onClick={onResetDemo}
                className="w-full sm:w-auto bg-white dark:bg-[#14201E] border border-[#D8E5E1] dark:border-[#223735] text-[#12201F] dark:text-[#EDF5F3] px-6 py-3 text-xs font-mono-tag tracking-wider uppercase hover:border-[#12A79D] transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Layers className="w-4 h-4 text-[#48605E] dark:text-[#8BA4A1]" />
                <span>Load Studio Demo Slate</span>
              </button>
            )}
          </div>
        </div>
      ) : filteredProps.length === 0 ? (
        /* NO FILTER MATCHES STATE */
        <div className="my-12 bg-white dark:bg-[#14201E] border border-[#D8E5E1] dark:border-[#223735] p-12 text-center max-w-xl mx-auto">
          <Filter className="w-8 h-8 mx-auto mb-3 text-[#48605E] dark:text-[#8BA4A1]" />
          <h3 className="font-fraunces text-lg font-bold text-[#12201F] dark:text-[#EDF5F3] mb-1">
            No Matching Hero Props Found
          </h3>
          <p className="font-inter text-xs text-[#48605E] dark:text-[#8BA4A1] mb-5">
            No props matched your current search and filter criteria.
          </p>
          <button
            type="button"
            onClick={handleClearFilters}
            className="bg-[#12A79D] hover:bg-[#0B5F5A] text-white px-4 py-2 text-xs font-mono-tag font-bold uppercase transition-colors cursor-pointer"
          >
            Reset All Filters
          </button>
        </div>
      ) : (
        /* PROPS GRID */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProps.map((prop) => (
            <CatalogueCard
              key={prop.id}
              prop={prop}
              onClick={() => onSelectProp(prop)}
              viewMode={viewMode}
            />
          ))}
        </div>
      )}
    </div>
  );
}
