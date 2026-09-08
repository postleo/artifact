import React, { useState, useMemo } from 'react';
import { PropItem, PropStatus, AssetVersion, SceneUsageRecord } from '../../types';
import { StatusChip } from '../StatusChip';
import {
  Search,
  Filter,
  Download,
  FileCode,
  Film,
  Layers,
  ShieldAlert,
  ShieldCheck,
  Clock,
  Box,
  SlidersHorizontal,
  X,
  Eye,
  CheckCircle2,
  AlertTriangle,
  MapPin,
  Camera,
  Archive
} from 'lucide-react';

interface RegistryPageProps {
  propsList: PropItem[];
  onSelectProp: (prop: PropItem) => void;
}

type PhaseFilter = 'all' | 'PRE_PRODUCTION' | 'PRINCIPAL_PHOTOGRAPHY' | 'POST_PRODUCTION_ARCHIVAL' | 'SEQUEL_REUSE';

export function RegistryPage({ propsList, onSelectProp }: RegistryPageProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [worldFilter, setWorldFilter] = useState<string>('all');
  const [phaseFilter, setPhaseFilter] = useState<PhaseFilter>('all');
  const [versionFilter, setVersionFilter] = useState<string>('all');

  // Selected prop for quick modal inspection
  const [inspectingProp, setInspectingProp] = useState<PropItem | null>(null);
  const [activeModalTab, setActiveModalTab] = useState<'crew_notes' | 'scene_timeline' | 'franchise_bible' | 'versions'>('crew_notes');

  const totalCost = propsList.reduce((acc, p) => acc + (p.costEstUsd || 0), 0);
  const maxCost = Math.max(...propsList.map((p) => p.costEstUsd || 1500));

  // Unique worlds
  const uniqueWorlds = useMemo(() => {
    const set = new Set<string>();
    propsList.forEach((p) => {
      if (p.world) set.add(p.world);
    });
    return Array.from(set);
  }, [propsList]);

  // Filtered props list
  const filteredProps = useMemo(() => {
    return propsList.filter((item) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.id.toLowerCase().includes(q) ||
        item.world.toLowerCase().includes(q) ||
        item.era.toLowerCase().includes(q) ||
        (item.sceneNumber && item.sceneNumber.toLowerCase().includes(q)) ||
        (item.currentVersionId && item.currentVersionId.toLowerCase().includes(q)) ||
        (item.sceneUsageTimeline &&
          item.sceneUsageTimeline.some(
            (s) =>
              s.sceneNumber.toLowerCase().includes(q) ||
              s.sceneSlug.toLowerCase().includes(q) ||
              s.characterUsing.toLowerCase().includes(q) ||
              (s.archivalLocation && s.archivalLocation.toLowerCase().includes(q))
          ));

      const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
      const matchesWorld = worldFilter === 'all' || item.world === worldFilter;

      const matchesPhase =
        phaseFilter === 'all' ||
        (item.sceneUsageTimeline &&
          item.sceneUsageTimeline.some((s) => s.productionPhase === phaseFilter));

      const matchesVersion =
        versionFilter === 'all' ||
        (item.versions && item.versions.some((v) => v.versionId === versionFilter)) ||
        (item.currentVersionId && item.currentVersionId === versionFilter);

      return matchesSearch && matchesStatus && matchesWorld && matchesPhase && matchesVersion;
    });
  }, [propsList, searchQuery, statusFilter, worldFilter, phaseFilter, versionFilter]);

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    statusFilter !== 'all' ||
    worldFilter !== 'all' ||
    phaseFilter !== 'all' ||
    versionFilter !== 'all';

  const handleClearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setWorldFilter('all');
    setPhaseFilter('all');
    setVersionFilter('all');
  };

  // Export full registry JSON
  const handleExportFullRegistryJSON = () => {
    const fullData = {
      exportTitle: 'Artifact Studio Master Prop Registry & Continuity Ledger',
      exportedAt: new Date().toISOString(),
      totalProps: propsList.length,
      totalEstimatedCommitmentUSD: totalCost,
      props: propsList.map((p) => ({
        id: p.id,
        name: p.name,
        status: p.status,
        world: p.world,
        era: p.era,
        sceneNumber: p.sceneNumber,
        currentVersionId: p.currentVersionId || 'v1.0-HERO',
        versions: p.versions || [
          {
            versionId: 'v1.0-HERO',
            label: 'Original Hero Master',
            filmTitle: 'Production Master',
            status: 'ACTIVE_HERO',
            changelog: 'Base fabrication package.'
          }
        ],
        sceneUsageTimeline: p.sceneUsageTimeline || [],
        franchiseContinuity: p.franchiseContinuity || null,
        specTable: p.finalAssets?.specTable || null,
        exportMetadata: p.exportMetadata || null,
        costEstUsd: p.costEstUsd,
        timeEstDays: p.timeEstDays,
        history: p.history || []
      }))
    };

    const blob = new Blob([JSON.stringify(fullData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Artifact_Master_Prop_Registry_Continuity_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export single prop JSON
  const handleExportSinglePropJSON = (prop: PropItem, e: React.MouseEvent) => {
    e.stopPropagation();
    const singleData = {
      propName: prop.name,
      id: prop.id,
      world: prop.world,
      era: prop.era,
      currentVersionId: prop.currentVersionId || 'v1.0-HERO',
      versions: prop.versions || [],
      sceneUsageTimeline: prop.sceneUsageTimeline || [],
      franchiseContinuity: prop.franchiseContinuity || null,
      specTable: prop.finalAssets?.specTable || null,
      exportMetadata: prop.exportMetadata || null,
      history: prop.history || [],
      exportedAt: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(singleData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${prop.id}_${prop.name.replace(/\s+/g, '_')}_Continuity_Dossier.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="border-b border-[#D8E5E1] dark:border-[#223735] pb-5 mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono-tag text-xs text-[#12A79D] font-bold tracking-widest uppercase">
              OPERATIONS & CONTINUITY BOARD
            </span>
            <span className="text-[#D8E5E1] dark:text-[#223735]">·</span>
            <span className="font-mono-tag text-xs text-[#48605E] dark:text-[#8BA4A1]">
              FRANCHISE BIBLE
            </span>
          </div>
          <h1 className="font-fraunces text-3xl font-bold text-[#12201F] dark:text-[#EDF5F3] mt-1">
            Filterable Master Prop Registry
          </h1>
          <p className="font-inter text-xs text-[#48605E] dark:text-[#8BA4A1] mt-1 max-w-2xl leading-relaxed">
            Reference notes for filmmaking crew, scene-by-scene tracking (pre/during/post-production), asset versioning, and sequel continuity rules to ensure new films remain in sync with previous productions.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-white dark:bg-[#14201E] border border-[#D8E5E1] dark:border-[#223735] px-3 py-2 text-xs font-mono-tag text-[#12201F] dark:text-[#EDF5F3]">
            <span>TOTAL EST. COMMITMENT: </span>
            <span className="font-bold text-[#12A79D]">${totalCost.toLocaleString()} USD</span>
          </div>

          <button
            type="button"
            onClick={handleExportFullRegistryJSON}
            className="bg-[#12A79D] hover:bg-[#0B5F5A] text-white px-3.5 py-2 text-xs font-mono-tag font-bold tracking-wider uppercase transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
            title="Download complete continuity and prop registry schema"
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>Export Registry JSON</span>
          </button>
        </div>
      </div>

      {/* FILTER & SEARCH TOOLBAR */}
      <div className="bg-white dark:bg-[#14201E] border border-[#D8E5E1] dark:border-[#223735] p-4 mb-6 space-y-3 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
          {/* Search */}
          <div className="relative lg:col-span-4">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#48605E] dark:text-[#8BA4A1]" />
            <input
              type="text"
              placeholder="Search registry by prop, scene, version, character, or vault..."
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

          {/* Status Filter */}
          <div className="lg:col-span-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-[#F7F4EC] dark:bg-[#0E1716] border border-[#D8E5E1] dark:border-[#223735] px-2.5 py-2 text-xs font-mono-tag text-[#12201F] dark:text-[#EDF5F3] focus:outline-hidden focus:border-[#12A79D] cursor-pointer"
            >
              <option value="all">Status: All</option>
              <option value="assets_ready">Assets Ready (Gate 3)</option>
              <option value="awaiting_review">Awaiting Review</option>
              <option value="generating">Generating</option>
              <option value="exported">Exported</option>
            </select>
          </div>

          {/* Production Phase Filter */}
          <div className="lg:col-span-3">
            <select
              value={phaseFilter}
              onChange={(e) => setPhaseFilter(e.target.value as PhaseFilter)}
              className="w-full bg-[#F7F4EC] dark:bg-[#0E1716] border border-[#D8E5E1] dark:border-[#223735] px-2.5 py-2 text-xs font-mono-tag text-[#12201F] dark:text-[#EDF5F3] focus:outline-hidden focus:border-[#12A79D] cursor-pointer"
            >
              <option value="all">Phase: All Film Phases</option>
              <option value="PRE_PRODUCTION">Pre-Production Testing</option>
              <option value="PRINCIPAL_PHOTOGRAPHY">Principal Photography (Scenes)</option>
              <option value="POST_PRODUCTION_ARCHIVAL">Post-Production Archival Vault</option>
              <option value="SEQUEL_REUSE">Sequel / Franchise Reuse</option>
            </select>
          </div>

          {/* Version Filter */}
          <div className="lg:col-span-3 flex items-center gap-2">
            <select
              value={versionFilter}
              onChange={(e) => setVersionFilter(e.target.value)}
              className="w-full bg-[#F7F4EC] dark:bg-[#0E1716] border border-[#D8E5E1] dark:border-[#223735] px-2.5 py-2 text-xs font-mono-tag text-[#12201F] dark:text-[#EDF5F3] focus:outline-hidden focus:border-[#12A79D] cursor-pointer"
            >
              <option value="all">Version: All Assets</option>
              <option value="v1.0-HERO">v1.0-HERO (Master)</option>
              <option value="v1.1-STUNT">v1.1-STUNT (Urethane)</option>
              <option value="v2.0-SEQUEL">v2.0-SEQUEL (Time Jump)</option>
            </select>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="px-2.5 py-2 text-xs font-mono-tag text-[#12A79D] hover:bg-[#12A79D]/10 border border-[#12A79D] whitespace-nowrap cursor-pointer transition-colors"
                title="Clear all filters"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Live Filter Counter Bar */}
        <div className="flex items-center justify-between pt-2 border-t border-[#D8E5E1]/60 dark:border-[#223735]/60 text-[11px] font-mono-tag text-[#48605E] dark:text-[#8BA4A1]">
          <span>
            Displaying <strong className="text-[#12201F] dark:text-[#EDF5F3]">{filteredProps.length}</strong> of {propsList.length} Props Registered
          </span>
          <span className="flex items-center gap-1.5 text-[#12A79D]">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Continuity Sync Engine Active</span>
          </span>
        </div>
      </div>

      {/* REGISTRY TABLE */}
      <div className="bg-white dark:bg-[#14201E] border border-[#D8E5E1] dark:border-[#223735] overflow-x-auto shadow-xs">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-[#D8E5E1] dark:border-[#223735] bg-[#F7F4EC]/60 dark:bg-[#0E1716]/60 font-mono-tag text-[#48605E] dark:text-[#8BA4A1] text-[11px] uppercase tracking-wider">
              <th className="py-3 px-4">Catalogue ID</th>
              <th className="py-3 px-4">Hero Prop</th>
              <th className="py-3 px-4">Asset Version</th>
              <th className="py-3 px-4">Scenes Used</th>
              <th className="py-3 px-4">Stage Status</th>
              <th className="py-3 px-4">Franchise Continuity</th>
              <th className="py-3 px-4">Archival Storage</th>
              <th className="py-3 px-4 min-w-[130px]">Cost (USD)</th>
              <th className="py-3 px-4 text-right">Crew Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D8E5E1]/70 dark:divide-[#223735]/70 font-inter">
            {filteredProps.map((prop) => {
              const costPct = Math.min(100, Math.round(((prop.costEstUsd || 0) / maxCost) * 100));
              const currentVer = prop.currentVersionId || (prop.versions ? prop.versions[0]?.versionId : 'v1.0-HERO');
              const scenes = prop.sceneUsageTimeline
                ? prop.sceneUsageTimeline.map((s) => s.sceneNumber).filter((s) => s !== 'POST-PROD').join(', ')
                : prop.sceneNumber || 'Scene 14';
              const vaultLocation = prop.sceneUsageTimeline?.find((s) => s.archivalLocation)?.archivalLocation || 'Stage 4 Vault';

              return (
                <tr
                  key={prop.id}
                  onClick={() => setInspectingProp(prop)}
                  className="hover:bg-[#F7F4EC]/40 dark:hover:bg-[#1B2C29]/40 transition-colors cursor-pointer group"
                >
                  <td className="py-3 px-4 font-mono-tag text-[#48605E] dark:text-[#8BA4A1] whitespace-nowrap">
                    {prop.id}
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-semibold text-[#12201F] dark:text-[#EDF5F3] group-hover:text-[#12A79D] transition-colors">
                      {prop.name}
                    </div>
                    <div className="text-[11px] text-[#48605E] dark:text-[#8BA4A1]">
                      {prop.world} · {prop.era}
                    </div>
                  </td>
                  <td className="py-3 px-4 font-mono-tag">
                    <span className="px-2 py-0.5 bg-[#12A79D]/15 text-[#12A79D] text-[10px] font-bold">
                      {currentVer}
                    </span>
                    {prop.versions && prop.versions.length > 1 && (
                      <span className="block text-[10px] text-[#48605E] dark:text-[#8BA4A1] mt-0.5">
                        +{prop.versions.length - 1} variant(s)
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 font-mono-tag text-[#12201F] dark:text-[#EDF5F3] text-[11px]">
                    <div className="flex items-center gap-1">
                      <Film className="w-3 h-3 text-[#12A79D]" />
                      <span>{scenes}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <StatusChip status={prop.status} size="sm" />
                  </td>
                  <td className="py-3 px-4">
                    {prop.franchiseContinuity ? (
                      <div className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold font-mono-tag">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Canon Bible Synced</span>
                      </div>
                    ) : (
                      <span className="text-[11px] font-mono-tag text-[#48605E] dark:text-[#8BA4A1]">
                        Film 1 Standard
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 font-mono-tag text-[10px] text-[#48605E] dark:text-[#8BA4A1] truncate max-w-[140px]" title={vaultLocation}>
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-[#12A79D]" />
                      <span className="truncate">{vaultLocation}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <span className="font-mono-tag text-[11px] w-12 text-[#12201F] dark:text-[#EDF5F3]">
                        ${prop.costEstUsd}
                      </span>
                      <div className="w-14 h-1.5 bg-[#D8E5E1] dark:bg-[#223735] overflow-hidden">
                        <div
                          className="h-full bg-[#12A79D]"
                          style={{ width: `${costPct}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => handleExportSinglePropJSON(prop, e)}
                        className="p-1 text-[#48605E] hover:text-[#12A79D] hover:bg-[#12A79D]/10 transition-colors"
                        title="Export this prop's continuity JSON"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setInspectingProp(prop);
                        }}
                        className="px-2.5 py-1 bg-white dark:bg-[#14201E] border border-[#D8E5E1] dark:border-[#223735] group-hover:border-[#12A79D] font-mono-tag text-[10px] uppercase text-[#12201F] dark:text-[#EDF5F3] hover:bg-[#12A79D] hover:text-white transition-colors flex items-center gap-1"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Crew Ref</span>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* CREW REFERENCE NOTES & FRANCHISE BIBLE MODAL */}
      {inspectingProp && (
        <div
          className="fixed inset-0 z-50 bg-[#0D1514]/80 flex items-center justify-center p-4 backdrop-blur-xs"
          onClick={() => setInspectingProp(null)}
        >
          <div
            className="bg-white dark:bg-[#14201E] border border-[#D8E5E1] dark:border-[#223735] max-w-4xl w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-[#D8E5E1] dark:border-[#223735] pb-4 mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono-tag text-xs text-[#12A79D] font-bold">
                    {inspectingProp.id} · ON-SET CREW REFERENCE & FRANCHISE BIBLE
                  </span>
                  <span className="text-[10px] font-mono-tag px-2 py-0.5 bg-[#12A79D]/15 text-[#12A79D] font-bold">
                    {inspectingProp.currentVersionId || 'v1.0-HERO'}
                  </span>
                </div>
                <h2 className="font-fraunces text-2xl font-bold text-[#12201F] dark:text-[#EDF5F3] mt-1">
                  {inspectingProp.name}
                </h2>
                <div className="font-inter text-xs text-[#48605E] dark:text-[#8BA4A1]">
                  {inspectingProp.world} · {inspectingProp.era} · On-screen role: {inspectingProp.functionOnScreen}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={(e) => handleExportSinglePropJSON(inspectingProp, e)}
                  className="px-3 py-1.5 bg-[#12A79D] hover:bg-[#0B5F5A] text-white text-xs font-mono-tag font-bold uppercase transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Continuity JSON</span>
                </button>
                <button
                  type="button"
                  onClick={() => setInspectingProp(null)}
                  className="w-8 h-8 flex items-center justify-center text-xl text-[#48605E] hover:text-[#12201F] dark:hover:text-[#EDF5F3] cursor-pointer"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Modal Navigation Tabs */}
            <div className="flex border-b border-[#D8E5E1] dark:border-[#223735] gap-4 mb-4 text-xs font-mono-tag">
              <button
                type="button"
                onClick={() => setActiveModalTab('crew_notes')}
                className={`pb-2.5 font-bold uppercase tracking-wider border-b-2 transition-colors cursor-pointer ${
                  activeModalTab === 'crew_notes'
                    ? 'border-[#12A79D] text-[#12A79D]'
                    : 'border-transparent text-[#48605E] dark:text-[#8BA4A1]'
                }`}
              >
                On-Set Crew Notes & CMF
              </button>
              <button
                type="button"
                onClick={() => setActiveModalTab('scene_timeline')}
                className={`pb-2.5 font-bold uppercase tracking-wider border-b-2 transition-colors cursor-pointer flex items-center gap-1 ${
                  activeModalTab === 'scene_timeline'
                    ? 'border-[#12A79D] text-[#12A79D]'
                    : 'border-transparent text-[#48605E] dark:text-[#8BA4A1]'
                }`}
              >
                <Film className="w-3.5 h-3.5" />
                <span>Scene Usage (Pre/During/Post)</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveModalTab('franchise_bible')}
                className={`pb-2.5 font-bold uppercase tracking-wider border-b-2 transition-colors cursor-pointer flex items-center gap-1 ${
                  activeModalTab === 'franchise_bible'
                    ? 'border-[#12A79D] text-[#12A79D]'
                    : 'border-transparent text-[#48605E] dark:text-[#8BA4A1]'
                }`}
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Franchise & Sequel Sync Bible</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveModalTab('versions')}
                className={`pb-2.5 font-bold uppercase tracking-wider border-b-2 transition-colors cursor-pointer flex items-center gap-1 ${
                  activeModalTab === 'versions'
                    ? 'border-[#12A79D] text-[#12A79D]'
                    : 'border-transparent text-[#48605E] dark:text-[#8BA4A1]'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Asset Versions ({inspectingProp.versions?.length || 1})</span>
              </button>
            </div>

            {/* TAB 1: ON-SET CREW NOTES */}
            {activeModalTab === 'crew_notes' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="p-4 bg-[#F7F4EC] dark:bg-[#0E1716] border border-[#D8E5E1] dark:border-[#223735] space-y-2">
                    <h4 className="font-mono-tag text-xs font-bold text-[#12201F] dark:text-[#EDF5F3] uppercase tracking-wider">
                      Physical CMF & Stunt Ratings
                    </h4>
                    <div>
                      <span className="text-[#48605E] dark:text-[#8BA4A1]">Materials: </span>
                      <span className="font-semibold text-[#12201F] dark:text-[#EDF5F3]">
                        {inspectingProp.finalAssets?.specTable.materials || 'Brass, Sapphire Lens, Leather'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#48605E] dark:text-[#8BA4A1]">Dimensions: </span>
                      <span className="font-semibold text-[#12201F] dark:text-[#EDF5F3]">
                        {inspectingProp.finalAssets?.specTable.dimensionsClosed || 'Ø 14.8 cm × H 6.2 cm'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#48605E] dark:text-[#8BA4A1]">Weight: </span>
                      <span className="font-semibold text-[#12201F] dark:text-[#EDF5F3]">
                        {inspectingProp.finalAssets?.specTable.weight || '1.28 kg'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#48605E] dark:text-[#8BA4A1]">Stunt Variant: </span>
                      <span className="font-semibold text-[#12A79D]">
                        {inspectingProp.finalAssets?.specTable.stuntVariant || 'Shore 45A Soft Urethane Cast (SV-01)'}
                      </span>
                    </div>
                  </div>

                  <div className="p-4 bg-[#F7F4EC] dark:bg-[#0E1716] border border-[#D8E5E1] dark:border-[#223735] space-y-2">
                    <h4 className="font-mono-tag text-xs font-bold text-[#12201F] dark:text-[#EDF5F3] uppercase tracking-wider">
                      Camera & Set Care Protocol
                    </h4>
                    <p className="text-xs text-[#48605E] dark:text-[#8BA4A1] leading-relaxed">
                      {inspectingProp.finalAssets?.specTable.caregivingNotes ||
                        'Store in dry velvet-lined box. Clean fingerprints before A-camera roll with microfiber lens cloth.'}
                    </p>
                    <div className="pt-2 border-t border-[#D8E5E1] dark:border-[#223735] text-[11px] font-mono-tag text-[#12A79D]">
                      ✓ Camera Package: {inspectingProp.exportMetadata?.cameraLens || 'Cooke Anamorphic /i 50mm T2.3'}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-3 border-t border-[#D8E5E1] dark:border-[#223735]">
                  <button
                    type="button"
                    onClick={() => {
                      onSelectProp(inspectingProp);
                      setInspectingProp(null);
                    }}
                    className="bg-[#12A79D] text-white px-5 py-2 text-xs font-mono-tag font-bold uppercase tracking-wider"
                  >
                    Open Full Prop Dossier Page →
                  </button>
                </div>
              </div>
            )}

            {/* TAB 2: SCENE USAGE TIMELINE */}
            {activeModalTab === 'scene_timeline' && (
              <div className="space-y-4">
                <div className="p-3 bg-[#12A79D]/10 border border-[#12A79D]/30 text-xs text-[#12201F] dark:text-[#EDF5F3]">
                  <strong>Scene-by-Scene Tracking:</strong> Details which scenes this prop was or is scheduled to be used in during principal photography, plus post-production preservation status.
                </div>

                <div className="space-y-3">
                  {(
                    inspectingProp.sceneUsageTimeline || [
                      {
                        sceneId: 'default-1',
                        sceneNumber: inspectingProp.sceneNumber || 'SCENE 14',
                        sceneSlug: 'EXT. PRIMARY LOCATION - DAY',
                        productionPhase: 'PRINCIPAL_PHOTOGRAPHY',
                        actionDescription: inspectingProp.functionOnScreen,
                        crewHandlingNotes: 'Hero close-up. Inspect optical lens before take.',
                        characterUsing: 'Lead Actor',
                        lightingCameraNotes: 'Anamorphic 50mm'
                      },
                      {
                        sceneId: 'default-post',
                        sceneNumber: 'POST-PROD',
                        sceneSlug: 'ARCHIVAL ACCESSION',
                        productionPhase: 'POST_PRODUCTION_ARCHIVAL',
                        actionDescription: 'Archived for franchise sequel continuity.',
                        crewHandlingNotes: 'Pelican box stowage at 45% relative humidity.',
                        characterUsing: 'Prop Caretaker',
                        lightingCameraNotes: 'Archival 360 scan logged'
                      }
                    ]
                  ).map((usage) => (
                    <div
                      key={usage.sceneId}
                      className="p-4 bg-[#F7F4EC] dark:bg-[#0E1716] border border-[#D8E5E1] dark:border-[#223735] text-xs space-y-2"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-[#12A79D] text-white font-mono-tag text-[10px] font-bold">
                            {usage.sceneNumber}
                          </span>
                          <span className="font-fraunces font-bold text-sm text-[#12201F] dark:text-[#EDF5F3]">
                            {usage.sceneSlug}
                          </span>
                        </div>
                        <span className="font-mono-tag text-[10px] px-2 py-0.5 bg-[#D8E5E1] dark:bg-[#223735] text-[#12201F] dark:text-[#EDF5F3]">
                          {usage.productionPhase}
                        </span>
                      </div>

                      <p className="text-[#48605E] dark:text-[#8BA4A1] text-xs italic">
                        "{usage.actionDescription}"
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-[#D8E5E1]/60 dark:border-[#223735]/60 text-[11px]">
                        <div>
                          <strong className="text-[#12201F] dark:text-[#EDF5F3]">Character: </strong>
                          <span className="text-[#48605E] dark:text-[#8BA4A1]">{usage.characterUsing}</span>
                        </div>
                        <div>
                          <strong className="text-[#12201F] dark:text-[#EDF5F3]">Camera Note: </strong>
                          <span className="text-[#48605E] dark:text-[#8BA4A1]">{usage.lightingCameraNotes}</span>
                        </div>
                        <div>
                          <strong className="text-[#12201F] dark:text-[#EDF5F3]">Crew Directive: </strong>
                          <span className="text-[#12A79D]">{usage.crewHandlingNotes}</span>
                        </div>
                      </div>

                      {usage.archivalLocation && (
                        <div className="mt-1 text-[11px] font-mono-tag text-[#12A79D] flex items-center gap-1">
                          <Archive className="w-3 h-3" />
                          <span>Storage: {usage.archivalLocation}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 3: FRANCHISE & SEQUEL SYNC BIBLE */}
            {activeModalTab === 'franchise_bible' && (
              <div className="space-y-4">
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 text-xs text-[#12201F] dark:text-[#EDF5F3]">
                  <strong className="text-amber-700 dark:text-amber-400">Franchise & Sequel Continuity Guard:</strong>
                  {' '}When building this prop for sequels or spin-offs, adhere strictly to the rules below to prevent out-of-sync discrepancies with previous film scenes.
                </div>

                <div className="space-y-3">
                  {/* Canon Baseline */}
                  <div className="p-4 bg-[#F7F4EC] dark:bg-[#0E1716] border border-[#D8E5E1] dark:border-[#223735]">
                    <h4 className="font-mono-tag text-xs font-bold text-[#12201F] dark:text-[#EDF5F3] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-[#12A79D]" />
                      <span>Original Film Canon Baseline</span>
                    </h4>
                    <p className="text-xs text-[#48605E] dark:text-[#8BA4A1] leading-relaxed">
                      {inspectingProp.franchiseContinuity?.filmCanonBaseline ||
                        'Film 1 established this prop as an authentic in-world artifact with specific engraved geometry, dimensional limits, and calibrated lighting luminescence.'}
                    </p>
                  </div>

                  {/* Strict Constraints */}
                  <div className="p-4 bg-[#F7F4EC] dark:bg-[#0E1716] border border-[#D8E5E1] dark:border-[#223735]">
                    <h4 className="font-mono-tag text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-red-500" />
                      <span>Strict Continuity Constraints (NEVER Change in Sequels)</span>
                    </h4>
                    <ul className="space-y-1.5 text-xs text-[#48605E] dark:text-[#8BA4A1]">
                      {(
                        inspectingProp.franchiseContinuity?.strictContinuityConstraints || [
                          'Geometry & Core Inscriptions: Crucial for narrative continuity and VFX tracking alignment.',
                          'Luminescence Wavelength: VFX color conform depends on exact color space match.',
                          'Dimensional Envelope: Must fit existing actor holsters and hand scale.'
                        ]
                      ).map((rule, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <span className="text-red-500 font-bold">✕</span>
                          <span>{rule}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Allowed Evolutions */}
                  <div className="p-4 bg-[#F7F4EC] dark:bg-[#0E1716] border border-[#D8E5E1] dark:border-[#223735]">
                    <h4 className="font-mono-tag text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      <span>Allowed Sequel Evolutions (Permitted Aging & Upgrades)</span>
                    </h4>
                    <ul className="space-y-1.5 text-xs text-[#48605E] dark:text-[#8BA4A1]">
                      {(
                        inspectingProp.franchiseContinuity?.allowedSequelEvolutions || [
                          'Natural patina, weathering, and edge scuffs corresponding to story time jumps.',
                          'Subtle field repairs (rivets, strap stitching) reflecting in-world character history.'
                        ]
                      ).map((rule, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <span className="text-emerald-500 font-bold">✓</span>
                          <span>{rule}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: ASSET VERSIONS */}
            {activeModalTab === 'versions' && (
              <div className="space-y-3">
                {(
                  inspectingProp.versions || [
                    {
                      versionId: 'v1.0-HERO',
                      label: 'Film 1 Hero Master',
                      filmTitle: 'Original Feature Film',
                      author: 'Lead Prop Master',
                      date: 'May 2024',
                      status: 'ACTIVE_HERO',
                      changelog: 'Hand-crafted hero archetype with optical components.',
                      scenesUsed: ['Scene 14', 'Scene 54'],
                      checksum: 'sha256:7c9e102f...e481',
                      isCurrent: true
                    }
                  ]
                ).map((ver) => (
                  <div
                    key={ver.versionId}
                    className="p-4 bg-[#F7F4EC] dark:bg-[#0E1716] border border-[#D8E5E1] dark:border-[#223735] text-xs space-y-2"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono-tag text-xs px-2 py-0.5 bg-[#12A79D] text-white font-bold">
                          {ver.versionId}
                        </span>
                        <span className="font-fraunces font-bold text-sm text-[#12201F] dark:text-[#EDF5F3]">
                          {ver.label}
                        </span>
                      </div>
                      <span className="font-mono-tag text-[10px] px-2 py-0.5 bg-[#D8E5E1] dark:bg-[#223735]">
                        {ver.status}
                      </span>
                    </div>

                    <div className="text-[11px] font-mono-tag text-[#48605E] dark:text-[#8BA4A1]">
                      Film: <strong className="text-[#12201F] dark:text-[#EDF5F3]">{ver.filmTitle}</strong> · Author: {ver.author} · {ver.date}
                    </div>

                    <p className="text-xs text-[#48605E] dark:text-[#8BA4A1]">
                      <strong>Changelog: </strong>{ver.changelog}
                    </p>

                    <div className="pt-2 border-t border-[#D8E5E1]/60 dark:border-[#223735]/60 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono-tag text-[#12A79D]">
                      <span>Scenes: {ver.scenesUsed.join(', ')}</span>
                      <span>Checksum: {ver.checksum}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
