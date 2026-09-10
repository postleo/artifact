import React, { useState } from 'react';
import {
  PropItem,
  PropViewMode,
  ExportMetadata,
  HistoryLogEntry,
  AssetVersion,
  SceneUsageRecord,
  FranchiseContinuityBible
} from '../../types';
import {
  Download,
  FileCode,
  FileText,
  Clock,
  CheckCircle2,
  ShieldCheck,
  Plus,
  Copy,
  Check,
  Film,
  Box,
  Maximize2,
  Layers,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
  AlertTriangle,
  Archive,
  MapPin,
  Camera,
  SlidersHorizontal
} from 'lucide-react';

interface DossierPageProps {
  prop: PropItem;
  onExport: () => void;
  onBackToSelection: () => void;
  onUpdateProp?: (updatedProp: PropItem) => void;
  viewMode?: PropViewMode;
  onViewModeChange?: (mode: PropViewMode) => void;
}

type SecondaryTab = 'specs' | 'scene_continuity' | 'franchise_bible' | 'export_metadata' | 'history_logs';

export function DossierPage({
  prop,
  onExport,
  onBackToSelection,
  onUpdateProp,
  viewMode = 'vitrine',
  onViewModeChange
}: DossierPageProps) {
  const assets = prop.finalAssets;
  // Demo props keep their rich showcase metadata (versions, scene timeline,
  // franchise bible, camera package). Live props only ever show real recorded
  // data — never fabricated versions/approvers/lenses.
  const isDemo = prop.source === 'demo';
  const isLive = !isDemo && (prop.source === 'live' || prop.id.startsWith('prop_'));

  // Live props: the end-of-Stage-3 physical spec fields are user-fillable and
  // persist onto the prop (no hardcoded demo values baked in).
  const updateSpec = (field: string, value: string) => {
    if (!assets || !onUpdateProp) return;
    onUpdateProp({
      ...prop,
      finalAssets: { ...assets, specTable: { ...assets.specTable, [field]: value } as any },
    });
  };
  const specField = (label: string, field: string, opts?: { accent?: boolean }) => (
    <div>
      <span className="font-mono-tag text-[10px] text-[#48605E] dark:text-[#8BA4A1] uppercase block">
        {label}
      </span>
      <input
        type="text"
        value={(assets?.specTable as any)?.[field] ?? ''}
        placeholder="Add…"
        onChange={(e) => updateSpec(field, e.target.value)}
        className={`w-full mt-0.5 bg-[#F7F4EC] dark:bg-[#0E1716] border border-[#D8E5E1] dark:border-[#223735] px-2 py-1 text-xs focus:outline-hidden focus:border-[#12A79D] ${
          opts?.accent ? 'text-[#12A79D] font-medium' : 'text-[#12201F] dark:text-[#EDF5F3] font-semibold'
        }`}
      />
    </div>
  );
  const [localViewMode, setLocalViewMode] = useState<PropViewMode>(viewMode);
  const [exportState, setExportState] = useState<'ready' | 'exporting' | 'exported'>(
    assets?.exportStatus === 'Exported ✓' ? 'exported' : 'ready'
  );
  const [activeCallout, setActiveCallout] = useState<string | null>(null);
  const [inspectedImage, setInspectedImage] = useState<{ url: string; title: string; subtitle?: string } | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Active secondary tab
  const [secondaryTab, setSecondaryTab] = useState<SecondaryTab>('specs');

  // Version management
  const availableVersions: AssetVersion[] = prop.versions && prop.versions.length > 0
    ? prop.versions
    : !isDemo
    ? []
    : [
        {
          versionId: 'v1.0-HERO',
          label: 'Film 1 Hero Master',
          filmTitle: 'Original Feature Film',
          author: 'Isla Venn (Lead Prop Master)',
          date: 'May 2024',
          status: 'ACTIVE_HERO',
          changelog: 'Hand-crafted hero archetype with optical components for A-camera close-ups.',
          scenesUsed: [prop.sceneNumber || 'Scene 14'],
          checksum: 'sha256:7c9e102f...e481',
          isCurrent: true
        },
        {
          versionId: 'v1.1-STUNT',
          label: 'Stunt Impact / Water Duplicate',
          filmTitle: 'Original Feature Film',
          author: 'Kael Thorne (Stunt Fabrication Lead)',
          date: 'June 2024',
          status: 'STUNT_ACTIVE',
          changelog: 'Shore 45A soft urethane cast duplicate for dynamic actor running and impact sequences.',
          scenesUsed: ['Scene 22 (Stunt)'],
          checksum: 'sha256:4b22c89d...110a',
          isCurrent: false
        },
        {
          versionId: 'v2.0-SEQUEL',
          label: 'Sequel Franchise Upgrade Specification',
          filmTitle: 'Sequel Franchise Master',
          author: 'Studio Continuity Department',
          date: 'Pre-Production',
          status: 'SEQUEL_PLANNED',
          changelog: 'Permitted verdigris patina and strap wear reflecting story time jump; core silhouette locked.',
          scenesUsed: ['Sequel Scenes'],
          checksum: 'sha256:9a01f5e3...772d',
          isCurrent: false
        }
      ];

  const [selectedVersionId, setSelectedVersionId] = useState<string>(
    prop.currentVersionId || availableVersions[0]?.versionId || 'v1.0-HERO'
  );

  const currentVersionObj = availableVersions.find((v) => v.versionId === selectedVersionId) || availableVersions[0];

  // Scene Usage Records
  const sceneTimeline: SceneUsageRecord[] = prop.sceneUsageTimeline && prop.sceneUsageTimeline.length > 0
    ? prop.sceneUsageTimeline
    : !isDemo
    ? []
    : [
        {
          sceneId: 'sc-14',
          sceneNumber: prop.sceneNumber || 'SCENE 14',
          sceneSlug: 'EXT. ARCHAEOLOGICAL DIG - NIGHT',
          productionPhase: 'PRINCIPAL_PHOTOGRAPHY',
          actionDescription: 'Protagonist aligns compass needle with constellation Draco under torchlight.',
          crewHandlingNotes: 'Handle with cotton gloves. Inspect glass lens before rolling take.',
          characterUsing: 'Evelyn Croft (Lead)',
          lightingCameraNotes: '50mm Anamorphic Lens · Specular torch reflection pass.'
        },
        {
          sceneId: 'sc-22',
          sceneNumber: 'SCENE 22',
          sceneSlug: 'INT. COLLAPSING CATACOMB - NIGHT',
          productionPhase: 'PRINCIPAL_PHOTOGRAPHY',
          actionDescription: 'Stunt sequence: Evelyn drops compass onto stone steps during tremor.',
          crewHandlingNotes: 'SUBSTITUTE WITH V1.1-STUNT SOFT URETHANE DUPLICATE TO PREVENT HERO GLASS SHATTER.',
          characterUsing: 'Stunt Double',
          lightingCameraNotes: 'High-speed camera 120fps.'
        },
        {
          sceneId: 'sc-post',
          sceneNumber: 'POST-PROD',
          sceneSlug: 'ARCHIVAL ACCESSION & VAULT STOWAGE',
          productionPhase: 'POST_PRODUCTION_ARCHIVAL',
          actionDescription: 'Hero compass catalogued and preserved for franchise continuity and promotional tours.',
          crewHandlingNotes: 'Stowed in climate-controlled Pelican Case at 45% relative humidity.',
          characterUsing: 'Art Department Archival Caretaker',
          lightingCameraNotes: 'Archival photogrammetry scan complete.',
          archivalLocation: 'Pinewood Studio Stage 4 Archival Vault A · Locker 14'
        }
      ];

  // Franchise Continuity Bible
  const liveFranchiseBible: FranchiseContinuityBible = {
    filmCanonBaseline:
      'No franchise continuity has been recorded for this prop yet. Once the hero prop is locked, canon constraints and permitted sequel evolutions can be captured here.',
    strictContinuityConstraints: [],
    allowedSequelEvolutions: [],
    sequelWarningAlerts: [],
    previousFilmsReferences: [],
  };
  const franchiseBible: FranchiseContinuityBible = prop.franchiseContinuity || (isDemo ? {
    filmCanonBaseline: `Film 1 established ${prop.name} as an authentic in-world artifact in ${prop.world} (${prop.era}) with specific mechanical traits: ${prop.functionOnScreen}.`,
    strictContinuityConstraints: [
      'CORE SILHOUETTE & ENGRAVED RUNES: The celestial coordinates engraved on the outer brass ring are locked narrative canon. Must NOT be altered in sequels.',
      'SPECULAR WAVELENGTH & EMISSIVE DIAL: Phosphor luminescence wavelength (525nm cyan-green) must match VFX compositing LUTs from Film 1.',
      'DIMENSIONAL ENVELOPE: Overall diameter must remain Ø 14.8 cm to fit original custom leather holster fabricated for Evelyn.'
    ],
    allowedSequelEvolutions: [
      'Weathering, edge scuffs, and verdigris patina reflecting chronological passage of 5 years between films.',
      'Practical field repairs (e.g. replacement brass rivet or reinforced hinge) reflecting in-world character journey.'
    ],
    sequelWarningAlerts: [
      'CRITICAL: If fabricating new units for sequels, reference Master CAD file and physical silicone mold SV-01 in Pinewood Vault A. Do NOT remodel from camera frame grabs.',
      'CONTINUITY WARNING: Ensure brass alloy matches C36000 standard to prevent hue shifts under daylight tungsten lighting.'
    ],
    previousFilmsReferences: [
      {
        filmTitle: 'The Astral Meridian (Film 1)',
        year: '2024',
        sceneOccurrences: 'Scene 14, Scene 22, Scene 54',
        keyMoments: 'Unlocking the vault gate at the temple zenith.'
      }
    ]
  } : liveFranchiseBible);

  // New log entry state
  const [newLogNote, setNewLogNote] = useState('');
  const [newLogUser, setNewLogUser] = useState('Isla Venn');
  const [newLogRole, setNewLogRole] = useState('Lead Prop Master');

  // New scene usage state
  const [newSceneNum, setNewSceneNum] = useState('');
  const [newSceneSlug, setNewSceneSlug] = useState('');
  const [newSceneAction, setNewSceneAction] = useState('');
  const [newSceneNotes, setNewSceneNotes] = useState('');

  // Fallback default metadata if not set
  const exportMeta: ExportMetadata = prop.exportMetadata || (isDemo ? {
    slateCode: `PRP-${prop.id.replace('ARF-', '')}-HRO-${prop.sceneNumber || 'SC01'}-V1`,
    sceneCues: `${prop.sceneNumber || 'SCENE 14'} · SLATE 04 · ROLL B`,
    rollTake: 'ROLL 04 / TAKE 02',
    cameraLens: 'Cooke Anamorphic /i 50mm T2.3',
    colorSpace: 'ACEScg (Linear AP1)',
    aspectRatio: '2.39:1 Anamorphic Scope',
    lutTarget: 'KODAK_5219_PRINT_FILM_D55',
    checksum: 'sha256:8f4c21...b930',
    version: selectedVersionId,
    stuntDurometer: 'Shore 45A Soft Urethane Duplicate',
    damDestination: assets?.libraryDestination || `/Library/Props/${prop.id}_${prop.name.replace(/\s+/g, '_')}`
  } : {
    // Honest placeholders for live props — the camera/color package is only
    // filled in once the production actually records it, so we don't fabricate it.
    slateCode: `PRP-${prop.id.replace('ARF-', '').replace('prop_', '')}-HRO`,
    sceneCues: prop.sceneNumber || '—',
    rollTake: '—',
    cameraLens: 'Not recorded',
    colorSpace: 'Not recorded',
    aspectRatio: 'Not recorded',
    lutTarget: 'Not recorded',
    checksum: '—',
    version: selectedVersionId || 'v1',
    stuntDurometer: 'Not recorded',
    damDestination: assets?.libraryDestination || `/Library/Props/${prop.id}_${prop.name.replace(/\s+/g, '_')}`
  });

  // Fallback history if not present
  const historyLogs: HistoryLogEntry[] = prop.history || (isDemo ? [
    {
      id: 'hist-init',
      timestamp: 'May 12, 2024 · 09:15 AM',
      action: 'Hero Prop Brief Extracted & Initialized',
      user: 'Isla Venn',
      role: 'Lead Prop Master',
      notes: 'Dimensional envelope and stunt parameters established from script breakdown.',
      type: 'creation'
    },
    {
      id: 'hist-gen',
      timestamp: 'May 12, 2024 · 09:18 AM',
      action: 'Gate 1 Divergent Concept Options Synthesized',
      user: 'Artifact Studio Engine',
      role: 'System Agent',
      notes: `${prop.optionsCount || 4} candidate silhouettes generated.`,
      type: 'generation'
    },
    {
      id: 'hist-sel',
      timestamp: 'May 14, 2024 · 11:30 AM',
      action: `Gate 2 Hero Selection Locked (Option ${prop.selectedOptionId || 'A'})`,
      user: 'Rohan Patel',
      role: 'Creative Director',
      notes: prop.decision?.whyWeChoseThis || 'Balanced silhouette readability and key hero engravings.',
      type: 'selection'
    },
    {
      id: 'hist-pkg',
      timestamp: 'May 20, 2024 · 04:15 PM',
      action: 'Gate 3 Turnarounds & Orthographic Dossier Compiled',
      user: 'Artifact Studio Engine',
      role: 'System Agent',
      notes: '4-angle turnarounds, 6 macro callout plates, and CMF table verified.',
      type: 'dossier'
    }
  ] : []);

  const handleToggleMode = (mode: PropViewMode) => {
    setLocalViewMode(mode);
    if (onViewModeChange) {
      onViewModeChange(mode);
    }
  };

  const handleTriggerExport = () => {
    setExportState('exporting');
    setTimeout(() => {
      setExportState('exported');
      onExport();

      const exportEntry: HistoryLogEntry = {
        id: `hist-exp-${Date.now()}`,
        timestamp: 'Just Now',
        action: 'Exported to Digital Asset Management (DAM)',
        user: newLogUser,
        role: newLogRole,
        notes: `Production package catalogued to ${exportMeta.damDestination}`,
        type: 'export'
      };
      if (onUpdateProp) {
        onUpdateProp({
          ...prop,
          history: [exportEntry, ...historyLogs]
        });
      }
    }, 1100);
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  const handleAddHistoryNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLogNote.trim()) return;

    const newEntry: HistoryLogEntry = {
      id: `hist-user-${Date.now()}`,
      timestamp: 'Just Now',
      action: 'Production Note Logged',
      user: newLogUser,
      role: newLogRole,
      notes: newLogNote.trim(),
      type: 'review'
    };

    const updatedHistory = [newEntry, ...historyLogs];
    if (onUpdateProp) {
      onUpdateProp({
        ...prop,
        history: updatedHistory
      });
    }
    setNewLogNote('');
  };

  const handleAddSceneUsageRecord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSceneNum.trim() || !newSceneSlug.trim()) return;

    const newRecord: SceneUsageRecord = {
      sceneId: `sc-${Date.now()}`,
      sceneNumber: newSceneNum.trim(),
      sceneSlug: newSceneSlug.trim(),
      productionPhase: 'PRINCIPAL_PHOTOGRAPHY',
      actionDescription: newSceneAction.trim() || 'On-set scene usage recorded.',
      crewHandlingNotes: newSceneNotes.trim() || 'Hero care protocol.',
      characterUsing: 'Lead Actor',
      lightingCameraNotes: 'Standard camera setup.'
    };

    const updatedTimeline = [...sceneTimeline, newRecord];
    if (onUpdateProp) {
      onUpdateProp({
        ...prop,
        sceneUsageTimeline: updatedTimeline
      });
    }
    setNewSceneNum('');
    setNewSceneSlug('');
    setNewSceneAction('');
    setNewSceneNotes('');
  };

  const handleSelectVersion = (versionId: string) => {
    setSelectedVersionId(versionId);
    if (onUpdateProp) {
      onUpdateProp({
        ...prop,
        currentVersionId: versionId
      });
    }
  };

  const handleDownloadSpecJSON = () => {
    const specBlob = new Blob(
      [
        JSON.stringify(
          {
            prop: prop.name,
            id: prop.id,
            world: prop.world,
            era: prop.era,
            sceneNumber: prop.sceneNumber,
            currentVersionId: selectedVersionId,
            versions: availableVersions,
            sceneUsageTimeline: sceneTimeline,
            franchiseContinuity: franchiseBible,
            scriptExcerpt: prop.scriptExcerpt,
            specTable: assets?.specTable,
            decision: prop.decision,
            exportMetadata: exportMeta,
            history: historyLogs,
            exportedAt: new Date().toISOString()
          },
          null,
          2
        )
      ],
      { type: 'application/json' }
    );
    const url = URL.createObjectURL(specBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${prop.id}_${prop.name.replace(/\s+/g, '_')}_Complete_Dossier.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadCameraXML = () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<PropProductionSlate>
  <AssetID>${prop.id}</AssetID>
  <Name>${prop.name}</Name>
  <SlateCode>${exportMeta.slateCode}</SlateCode>
  <SceneCues>${exportMeta.sceneCues}</SceneCues>
  <CurrentVersion>${selectedVersionId}</CurrentVersion>
  <CameraLens>${exportMeta.cameraLens}</CameraLens>
  <ColorSpace>${exportMeta.colorSpace}</ColorSpace>
  <AspectRatio>${exportMeta.aspectRatio}</AspectRatio>
  <LUT>${exportMeta.lutTarget}</LUT>
  <StuntDurometer>${exportMeta.stuntDurometer}</StuntDurometer>
  <Checksum>${exportMeta.checksum}</Checksum>
  <Destination>${exportMeta.damDestination}</Destination>
</PropProductionSlate>`;

    const blob = new Blob([xml], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${prop.id}_Camera_Slate.xml`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadArchivalMarkdown = () => {
    const md = `# PRODUCTION DOSSIER & CONTINUITY SPEC SHEET: ${prop.name}
**Catalogue ID:** ${prop.id}
**Production World:** ${prop.world} (${prop.era})
**Active Version:** ${selectedVersionId}
**Primary Scene Cues:** ${prop.sceneNumber || 'Scene 14'}
**Export Date:** ${new Date().toISOString()}

---

## 1. PHYSICAL SPECIFICATIONS (CMF TABLE)
- **Dimensions (Closed):** ${assets?.specTable.dimensionsClosed}
- **Dimensions (Open):** ${assets?.specTable.dimensionsOpen}
- **Weight:** ${assets?.specTable.weight}
- **Materials:** ${assets?.specTable.materials}
- **Finishes:** ${assets?.specTable.finishes}
- **Stunt Safety Variant:** ${assets?.specTable.stuntVariant}
- **Mechanism:** ${assets?.specTable.mechanism}
- **Caregiving Notes:** ${assets?.specTable.caregivingNotes}

---

## 2. FRANCHISE CONTINUITY RULES (FOR SEQUELS)
### Strict Constraints (NEVER Change):
${franchiseBible.strictContinuityConstraints.map((c) => `- ${c}`).join('\n')}

### Allowed Evolutions (Patina / Time Jumps):
${franchiseBible.allowedSequelEvolutions.map((e) => `- ${e}`).join('\n')}

---

## 3. CAMERA & LIGHTING METADATA
- **Camera Lens:** ${exportMeta.cameraLens}
- **Color Space:** ${exportMeta.colorSpace}
- **Aspect Ratio:** ${exportMeta.aspectRatio}
- **Target LUT:** ${exportMeta.lutTarget}
- **Checksum:** ${exportMeta.checksum}

*Generated by Artifact Prop Atelier Engine · ${new Date().toLocaleDateString()}*
`;

    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${prop.id}_Archival_Spec_Sheet.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!assets) {
    const building = prop.status === 'generating';
    const failed = prop.status === 'failed' || prop.status === 'budget_exceeded';

    // Live prop actively building its final assets (or hit an error): show the
    // real building state with placeholders that fill in as deliverables land —
    // never a fabricated dossier. Text specs (materials / mechanism) surface as
    // soon as the agent produces them, before the images finish.
    if (isLive && (building || failed)) {
      const specMaterials = (prop as any).finalAssets?.specTable?.materials as string | undefined;
      const specMechanism = (prop as any).finalAssets?.specTable?.mechanism as string | undefined;
      return (
        <div className="max-w-7xl mx-auto px-6 py-8">
          <button
            type="button"
            onClick={onBackToSelection}
            className="font-mono-tag text-xs text-[#48605E] dark:text-[#8BA4A1] hover:text-[#12201F] dark:hover:text-[#EDF5F3] flex items-center gap-1.5 transition-colors mb-3 cursor-pointer"
          >
            ← Back to Gate 2 (Selection)
          </button>
          <h1 className="font-fraunces text-3xl font-bold text-[#12201F] dark:text-[#EDF5F3] mb-1">
            {prop.name}
          </h1>
          <p className="font-inter text-sm text-[#48605E] dark:text-[#8BA4A1] mb-6">
            {failed
              ? 'Final asset generation did not complete.'
              : 'Building the final asset package — turnarounds and fabrication callouts appear here as they render.'}
          </p>

          {failed ? (
            <div className="max-w-xl bg-amber-500/10 border border-amber-500/40 p-5">
              <p className="font-inter text-sm text-amber-900 dark:text-amber-200 mb-4">
                {prop.pipelineError || 'Generation hit an error. Please try again.'}
              </p>
              <button
                type="button"
                onClick={onBackToSelection}
                className="bg-[#12A79D] hover:bg-[#0B5F5A] text-white px-5 py-2 text-xs font-mono-tag font-bold uppercase tracking-wider transition-colors cursor-pointer"
              >
                Back to selection &amp; retry
              </button>
            </div>
          ) : (
            <div className="space-y-8">
              <div>
                <h3 className="font-mono-tag text-xs font-semibold text-[#12201F] dark:text-[#EDF5F3] uppercase tracking-wider mb-3">
                  Turnarounds (4 angles)
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {['FRONT', 'SIDE', 'BACK', 'THREE-QUARTER'].map((angle) => (
                    <div key={angle} className="bg-white dark:bg-[#14201E] border border-[#D8E5E1] dark:border-[#223735] p-2">
                      <div className="aspect-square w-full bg-[#F7F4EC] dark:bg-[#0E1716] animate-pulse" />
                      <div className="pt-2 text-center font-mono-tag text-[11px] font-bold text-[#48605E]/70 dark:text-[#8BA4A1]/70 uppercase tracking-wider">
                        {angle}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-mono-tag text-xs font-semibold text-[#12201F] dark:text-[#EDF5F3] uppercase tracking-wider mb-3">
                  Fabrication callouts
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="bg-white dark:bg-[#14201E] border border-[#D8E5E1] dark:border-[#223735] p-2">
                      <div className="aspect-video w-full bg-[#F7F4EC] dark:bg-[#0E1716] animate-pulse" />
                      <div className="mt-2 h-3 w-2/3 bg-[#F7F4EC] dark:bg-[#0E1716] animate-pulse" />
                    </div>
                  ))}
                </div>
              </div>

              {(specMaterials || specMechanism) && (
                <div className="bg-white dark:bg-[#14201E] border border-[#D8E5E1] dark:border-[#223735] p-4">
                  <h3 className="font-mono-tag text-xs font-semibold text-[#12201F] dark:text-[#EDF5F3] uppercase tracking-wider mb-2">
                    Build spec (drafted)
                  </h3>
                  {specMaterials && (
                    <p className="font-inter text-xs text-[#48605E] dark:text-[#8BA4A1] mb-1">
                      <span className="font-semibold text-[#12201F] dark:text-[#EDF5F3]">Materials: </span>
                      {specMaterials}
                    </p>
                  )}
                  {specMechanism && (
                    <p className="font-inter text-xs text-[#48605E] dark:text-[#8BA4A1]">
                      <span className="font-semibold text-[#12201F] dark:text-[#EDF5F3]">Mechanism: </span>
                      {specMechanism}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="max-w-7xl mx-auto px-6 py-12 text-center">
        <h2 className="font-fraunces text-2xl text-[#12201F] dark:text-[#EDF5F3] mb-4">
          Dossier Not Yet Generated
        </h2>
        <p className="font-inter text-sm text-[#48605E] dark:text-[#8BA4A1] mb-6">
          This prop is awaiting Gate 2 Hero Selection and build.
        </p>
        <button
          type="button"
          onClick={onBackToSelection}
          className="bg-[#12A79D] hover:bg-[#0B5F5A] text-white px-6 py-2.5 font-mono-tag text-xs uppercase transition-colors cursor-pointer"
        >
          Go to Gate 2 (Selection)
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Top Header */}
      <div className="border-b border-[#D8E5E1] dark:border-[#223735] pb-5 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <button
              type="button"
              onClick={onBackToSelection}
              className="font-mono-tag text-xs text-[#48605E] dark:text-[#8BA4A1] hover:text-[#12201F] dark:hover:text-[#EDF5F3] flex items-center gap-1.5 transition-colors mb-1 cursor-pointer"
            >
              ← Back to Gate 2 (Selection)
            </button>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-fraunces text-3xl sm:text-4xl font-bold text-[#12201F] dark:text-[#EDF5F3]">
                {prop.name}
              </h1>
              {prop.sceneNumber && (
                <span className="font-mono-tag text-xs px-2 py-0.5 bg-[#12A79D]/15 text-[#12A79D] font-bold">
                  {prop.sceneNumber}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 font-mono-tag text-sm text-[#12A79D] font-semibold mt-1 tracking-wider">
              <span>{prop.id}</span>
              <span className="text-[#D8E5E1] dark:text-[#223735]">·</span>
              <span className="text-xs text-[#48605E] dark:text-[#8BA4A1]">
                {prop.world} ({prop.era})
              </span>
            </div>
          </div>

          {/* Catalogue Entry Box & Active Version */}
          <div className="bg-white dark:bg-[#14201E] border border-[#D8E5E1] dark:border-[#223735] p-3 sm:text-right min-w-[240px] transition-colors shadow-xs">
            {availableVersions.length > 0 && (
              <div className="flex items-center sm:justify-end gap-2 mb-1">
                <span className="font-mono-tag text-[10px] font-bold text-[#48605E] dark:text-[#8BA4A1] uppercase tracking-wider">
                  ACTIVE VERSION:
                </span>
                <span className="font-mono-tag text-xs font-bold text-[#12A79D] px-2 py-0.5 bg-[#12A79D]/15">
                  {selectedVersionId}
                </span>
              </div>
            )}
            <div className="font-mono-tag text-[11px] text-[#48605E] dark:text-[#8BA4A1]">
              Created: {assets.createdDate} · Updated: {assets.updatedDate}
            </div>
            <div className="font-mono-tag text-[11px] text-[#48605E] dark:text-[#8BA4A1] mt-0.5">
              By: <span className="text-[#12201F] dark:text-[#EDF5F3] font-semibold">{assets.author}</span>
            </div>
          </div>
        </div>

        {/* ASSET VERSIONING SELECTOR BAR */}
        {availableVersions.length > 0 && (
        <div className="mt-4 pt-3 border-t border-[#D8E5E1]/60 dark:border-[#223735]/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono-tag text-[11px] font-bold text-[#48605E] dark:text-[#8BA4A1] uppercase flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-[#12A79D]" />
              <span>Asset Versions ({availableVersions.length}):</span>
            </span>

            {availableVersions.map((v) => {
              const isSelected = v.versionId === selectedVersionId;
              return (
                <button
                  key={v.versionId}
                  type="button"
                  onClick={() => handleSelectVersion(v.versionId)}
                  className={`px-3 py-1 text-xs font-mono-tag transition-all cursor-pointer flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-[#12A79D] text-white font-bold shadow-xs'
                      : 'bg-[#F7F4EC] dark:bg-[#0E1716] border border-[#D8E5E1] dark:border-[#223735] text-[#12201F] dark:text-[#EDF5F3] hover:border-[#12A79D]'
                  }`}
                >
                  <span>{v.versionId}</span>
                  <span className="text-[10px] opacity-80">({v.label.split(' ')[0]})</span>
                  {isSelected && <CheckCircle2 className="w-3 h-3" />}
                </button>
              );
            })}
          </div>

          <div className="text-[11px] font-mono-tag text-[#48605E] dark:text-[#8BA4A1] truncate">
            Status: <strong className="text-[#12201F] dark:text-[#EDF5F3]">{currentVersionObj?.status}</strong> · {currentVersionObj?.changelog}
          </div>
        </div>
        )}
      </div>

      {/* PRIMARY SECTION: IMAGES OF THE PROP & KEY PRODUCTION DETAILS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start mb-10">
        {/* Left: Turnaround & Detail Callout Images (8 columns) */}
        <div className="lg:col-span-8 space-y-8">
          {/* Section: Turnarounds */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Film className="w-4 h-4 text-[#12A79D]" />
                <h3 className="font-mono-tag text-xs font-semibold text-[#12201F] dark:text-[#EDF5F3] uppercase tracking-wider">
                  HERO PROP ORTHOGRAPHICS & TURNAROUNDS (4 ANGLES)
                </h3>
              </div>
              <div className="flex items-center gap-1 border border-[#D8E5E1] dark:border-[#223735] bg-white dark:bg-[#14201E] p-0.5">
                <button
                  type="button"
                  onClick={() => handleToggleMode('vitrine')}
                  className={`flex items-center gap-1 px-2 py-0.5 text-xs font-mono-tag cursor-pointer ${
                    localViewMode === 'vitrine'
                      ? 'bg-[#12A79D] text-white font-medium'
                      : 'text-[#48605E] dark:text-[#8BA4A1] hover:text-[#12201F] dark:hover:text-[#EDF5F3]'
                  }`}
                  title="Vitrine plate framing with orthographic scale marks"
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
                  title="Physical cinema artifact photo presentation"
                >
                  <Camera className="w-3 h-3" />
                  <span>Photo Artifact</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {assets.turnarounds.map((view, idx) => (
                <div
                  key={idx}
                  onClick={() => setInspectedImage({ url: view.imageUrl, title: `${prop.name} - ${view.angle}` })}
                  className="bg-white dark:bg-[#14201E] border border-[#D8E5E1] dark:border-[#223735] p-2 flex flex-col justify-between group hover:border-[#12A79D] transition-colors cursor-pointer shadow-xs"
                >
                  <div className="aspect-square w-full bg-[#F7F4EC] dark:bg-[#0E1716] overflow-hidden flex items-center justify-center relative">
                    <img
                      src={view.imageUrl}
                      alt={view.angle}
                      className={`w-full h-full object-contain p-2 transition-transform duration-300 group-hover:scale-105 ${
                        localViewMode === 'vitrine' ? 'contrast-105' : ''
                      }`}
                    />
                    <div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 p-1 text-white">
                      <Maximize2 className="w-3.5 h-3.5" />
                    </div>
                  </div>
                  <div className="pt-2 text-center border-t border-[#D8E5E1]/60 dark:border-[#223735]/60 mt-1">
                    <span className="font-mono-tag text-[11px] font-bold text-[#12201F] dark:text-[#EDF5F3] uppercase tracking-wider">
                      {view.angle}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section: Macro Callouts (6 details) */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-mono-tag text-xs font-semibold text-[#12201F] dark:text-[#EDF5F3] uppercase tracking-wider flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#12A79D]" />
                <span>FABRICATION CALLOUTS & HERO DETAILS (6 PLATES)</span>
              </h3>
              <span className="font-mono-tag text-[11px] text-[#48605E] dark:text-[#8BA4A1]">
                CLICK TO INSPECT MACRO PLATE
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {assets.callouts.map((callout) => {
                const isActive = activeCallout === callout.id;
                return (
                  <div
                    key={callout.id}
                    onClick={() => {
                      setActiveCallout(isActive ? null : callout.id);
                      setInspectedImage({
                        url: callout.imageUrl,
                        title: callout.title,
                        subtitle: callout.subtitle
                      });
                    }}
                    className={`bg-white dark:bg-[#14201E] border p-2 flex flex-col justify-between transition-all cursor-pointer shadow-xs ${
                      isActive
                        ? 'border-[#12A79D] ring-2 ring-[#12A79D]/20'
                        : 'border-[#D8E5E1] dark:border-[#223735] hover:border-[#12A79D]/70'
                    }`}
                  >
                    <div className="aspect-video w-full bg-[#F7F4EC] dark:bg-[#0E1716] overflow-hidden flex items-center justify-center relative">
                      <img
                        src={callout.imageUrl}
                        alt={callout.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <div className="absolute top-1 left-1 bg-black/70 text-white font-mono-tag text-[9px] px-1.5 py-0.5">
                        {callout.id.toUpperCase()}
                      </div>
                    </div>
                    <div className="pt-2">
                      <h4 className="font-fraunces text-xs font-bold text-[#12201F] dark:text-[#EDF5F3] truncate">
                        {callout.title}
                      </h4>
                      <p className="font-inter text-[11px] text-[#48605E] dark:text-[#8BA4A1] line-clamp-2 mt-0.5 leading-relaxed">
                        {callout.subtitle}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Key Production Details / CMF Specification Table (4 columns) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white dark:bg-[#14201E] border border-[#D8E5E1] dark:border-[#223735] p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-[#D8E5E1] dark:border-[#223735] mb-4">
              <h3 className="font-mono-tag text-xs font-bold uppercase tracking-wider text-[#12201F] dark:text-[#EDF5F3] flex items-center gap-1.5">
                <Box className="w-4 h-4 text-[#12A79D]" />
                <span>PHYSICAL CMF SPECIFICATION</span>
              </h3>
              <span className="font-mono-tag text-[10px] text-[#12A79D] font-bold">
                GATE 3 VERIFIED
              </span>
            </div>

            <div className="space-y-3 font-inter text-xs">
              {isLive ? (
                <>
                  <p className="font-inter text-[11px] text-[#48605E] dark:text-[#8BA4A1] -mt-1 mb-1">
                    Fill in the physical spec — changes save to this prop.
                  </p>
                  {specField('Dimensions (Closed)', 'dimensionsClosed')}
                  {specField('Dimensions (Open)', 'dimensionsOpen')}
                  {specField('Hero Weight', 'weight')}
                  {specField('Primary Materials', 'materials')}
                  {specField('Finishes & Weathering', 'finishes')}
                  {specField('Stunt Safety Variant Spec', 'stuntVariant', { accent: true })}
                  {specField('Scripted States', 'scriptedStates')}
                  {specField('On-Set Mechanism', 'mechanism')}
                  {specField('Caregiving & Camera Prep', 'caregivingNotes')}
                </>
              ) : (
                <>
                  <div>
                    <span className="font-mono-tag text-[10px] text-[#48605E] dark:text-[#8BA4A1] uppercase block">
                      Dimensions (Closed / Open)
                    </span>
                    <span className="font-semibold text-[#12201F] dark:text-[#EDF5F3]">
                      {assets.specTable.dimensionsClosed} / {assets.specTable.dimensionsOpen}
                    </span>
                  </div>

                  <div>
                    <span className="font-mono-tag text-[10px] text-[#48605E] dark:text-[#8BA4A1] uppercase block">
                      Hero Weight
                    </span>
                    <span className="font-semibold text-[#12201F] dark:text-[#EDF5F3]">
                      {assets.specTable.weight}
                    </span>
                  </div>

                  <div>
                    <span className="font-mono-tag text-[10px] text-[#48605E] dark:text-[#8BA4A1] uppercase block">
                      Primary Materials
                    </span>
                    <span className="font-semibold text-[#12201F] dark:text-[#EDF5F3]">
                      {assets.specTable.materials}
                    </span>
                  </div>

                  <div>
                    <span className="font-mono-tag text-[10px] text-[#48605E] dark:text-[#8BA4A1] uppercase block">
                      Finishes & Weathering
                    </span>
                    <span className="text-[#12201F] dark:text-[#EDF5F3] leading-relaxed block">
                      {assets.specTable.finishes}
                    </span>
                  </div>

                  <div>
                    <span className="font-mono-tag text-[10px] text-[#48605E] dark:text-[#8BA4A1] uppercase block">
                      Stunt Safety Variant Spec
                    </span>
                    <span className="text-[#12A79D] font-medium leading-relaxed block">
                      {assets.specTable.stuntVariant}
                    </span>
                  </div>

                  <div>
                    <span className="font-mono-tag text-[10px] text-[#48605E] dark:text-[#8BA4A1] uppercase block">
                      On-Set Mechanism
                    </span>
                    <span className="text-[#12201F] dark:text-[#EDF5F3] leading-relaxed block">
                      {assets.specTable.mechanism}
                    </span>
                  </div>

                  <div>
                    <span className="font-mono-tag text-[10px] text-[#48605E] dark:text-[#8BA4A1] uppercase block">
                      Caregiving & Camera Prep
                    </span>
                    <span className="text-[#48605E] dark:text-[#8BA4A1] leading-relaxed block">
                      {assets.specTable.caregivingNotes}
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Export & Download Quick Actions */}
            <div className="pt-4 border-t border-[#D8E5E1] dark:border-[#223735] mt-4 space-y-2">
              <button
                type="button"
                onClick={handleTriggerExport}
                disabled={exportState !== 'ready'}
                className={`w-full py-2.5 px-3 text-xs font-mono-tag uppercase tracking-wider font-bold transition-colors cursor-pointer flex items-center justify-center gap-2 ${
                  exportState === 'exported'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-[#12A79D] hover:bg-[#0B5F5A] text-white shadow-xs'
                }`}
              >
                {exportState === 'exporting' ? (
                  <span>Exporting to DAM...</span>
                ) : exportState === 'exported' ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-white" />
                    <span>Catalogued in DAM ✓</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 text-white" />
                    <span>Export to Asset Library</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleDownloadSpecJSON}
                className="w-full bg-white dark:bg-[#14201E] hover:bg-[#F7F4EC] dark:hover:bg-[#1D2B29] border border-[#D8E5E1] dark:border-[#223735] text-[#12201F] dark:text-[#EDF5F3] py-2 px-3 text-xs font-mono-tag uppercase tracking-wider transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <FileCode className="w-3.5 h-3.5 text-[#12A79D]" />
                <span>Download Package JSON</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* SECONDARY VALUED SECTIONS: TABBED PANELS FOR METADATA, CONTINUITY, & HISTORY */}
      <div className="bg-white dark:bg-[#14201E] border border-[#D8E5E1] dark:border-[#223735] transition-colors shadow-xs mb-8">
        {/* Secondary Navigation Bar */}
        <div className="flex border-b border-[#D8E5E1] dark:border-[#223735] px-6 pt-3 gap-6 overflow-x-auto">
          <button
            type="button"
            onClick={() => setSecondaryTab('specs')}
            className={`pb-3 font-mono-tag text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              secondaryTab === 'specs'
                ? 'border-[#12A79D] text-[#12A79D]'
                : 'border-transparent text-[#48605E] dark:text-[#8BA4A1] hover:text-[#12201F] dark:hover:text-[#EDF5F3]'
            }`}
          >
            Gate 2 Sign-Off & Notes
          </button>

          <button
            type="button"
            onClick={() => setSecondaryTab('scene_continuity')}
            className={`pb-3 font-mono-tag text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              secondaryTab === 'scene_continuity'
                ? 'border-[#12A79D] text-[#12A79D]'
                : 'border-transparent text-[#48605E] dark:text-[#8BA4A1] hover:text-[#12201F] dark:hover:text-[#EDF5F3]'
            }`}
          >
            <Film className="w-3.5 h-3.5 text-[#12A79D]" />
            <span>Scene Breakdown & Crew Notes ({sceneTimeline.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setSecondaryTab('franchise_bible')}
            className={`pb-3 font-mono-tag text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              secondaryTab === 'franchise_bible'
                ? 'border-[#12A79D] text-[#12A79D]'
                : 'border-transparent text-[#48605E] dark:text-[#8BA4A1] hover:text-[#12201F] dark:hover:text-[#EDF5F3]'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5 text-[#12A79D]" />
            <span>Franchise & Sequel Bible</span>
          </button>

          <button
            type="button"
            onClick={() => setSecondaryTab('export_metadata')}
            className={`pb-3 font-mono-tag text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              secondaryTab === 'export_metadata'
                ? 'border-[#12A79D] text-[#12A79D]'
                : 'border-transparent text-[#48605E] dark:text-[#8BA4A1] hover:text-[#12201F] dark:hover:text-[#EDF5F3]'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-[#12A79D]" />
            <span>Export Metadata & Camera Package</span>
          </button>

          <button
            type="button"
            onClick={() => setSecondaryTab('history_logs')}
            className={`pb-3 font-mono-tag text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              secondaryTab === 'history_logs'
                ? 'border-[#12A79D] text-[#12A79D]'
                : 'border-transparent text-[#48605E] dark:text-[#8BA4A1] hover:text-[#12201F] dark:hover:text-[#EDF5F3]'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-[#12A79D]" />
            <span>Production History & Audit Trail ({historyLogs.length})</span>
          </button>
        </div>

        {/* TAB 1: SELECTION SIGN-OFF & NOTES */}
        {secondaryTab === 'specs' && (
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-mono-tag text-xs font-bold text-[#12201F] dark:text-[#EDF5F3] uppercase tracking-wider mb-2">
                  Art Director & Director Decision Rationale
                </h4>
                <p className="font-inter text-xs text-[#48605E] dark:text-[#8BA4A1] leading-relaxed bg-[#F7F4EC] dark:bg-[#0E1716] p-4 border border-[#D8E5E1] dark:border-[#223735]">
                  "{prop.decision?.whyWeChoseThis || 'Option A selected for optimal silhouette reading and alignment with hero constellation engravings.'}"
                </p>

                <div className="mt-4">
                  <h5 className="font-mono-tag text-[11px] font-bold text-[#48605E] dark:text-[#8BA4A1] uppercase tracking-wider mb-2">
                    Authorized Sign-Off Approvers
                  </h5>
                  <div className="flex flex-wrap gap-2">
                    {(prop.decision?.approvers || (isDemo ? [
                      { name: 'Isla Venn', role: 'Art Director' },
                      { name: 'Rohan Patel', role: 'Creative Director' }
                    ] : [])).map((approver, idx) => (
                      <div
                        key={idx}
                        className="px-3 py-1.5 bg-[#F7F4EC] dark:bg-[#0E1716] border border-[#D8E5E1] dark:border-[#223735] flex items-center gap-2 text-xs"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#12A79D]" />
                        <span className="font-semibold text-[#12201F] dark:text-[#EDF5F3]">{approver.name}</span>
                        <span className="text-[10px] text-[#48605E] dark:text-[#8BA4A1]">({approver.role})</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-mono-tag text-xs font-bold text-[#12201F] dark:text-[#EDF5F3] uppercase tracking-wider mb-2">
                  Fabrication & On-Set Notes
                </h4>
                <ul className="space-y-2 text-xs font-inter text-[#48605E] dark:text-[#8BA4A1]">
                  {(prop.decision?.notes || (isDemo ? [
                    'Open structure supports key lighting moments on actors\' faces',
                    'Outer ring can carry runes for storytelling and lore hints',
                    'Stunt variant will replace sharp finials with rounded caps',
                    'Mechanism to include subtle magnetic resistance for tactile feel'
                  ] : [])).map((note, idx) => (
                    <li key={idx} className="flex items-start gap-2 bg-[#F7F4EC] dark:bg-[#0E1716] p-2.5 border border-[#D8E5E1] dark:border-[#223735]">
                      <span className="text-[#12A79D] font-bold">•</span>
                      <span>{note}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: SCENE BREAKDOWN & CREW NOTES */}
        {secondaryTab === 'scene_continuity' && (
          <div className="p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#D8E5E1] dark:border-[#223735]">
              <div>
                <h4 className="font-fraunces text-base font-bold text-[#12201F] dark:text-[#EDF5F3]">
                  Scene-by-Scene Usage & Crew Handling Ledger
                </h4>
                <p className="font-inter text-xs text-[#48605E] dark:text-[#8BA4A1]">
                  Tracks every scene where this prop appears, actor handling instructions, camera/lighting notes, and archival preservation status.
                </p>
              </div>
            </div>

            {/* Add Scene Usage Form */}
            <form onSubmit={handleAddSceneUsageRecord} className="p-4 bg-[#F7F4EC] dark:bg-[#0E1716] border border-[#D8E5E1] dark:border-[#223735]">
              <div className="font-mono-tag text-xs font-bold uppercase tracking-wider text-[#12201F] dark:text-[#EDF5F3] mb-2 flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5 text-[#12A79D]" />
                <span>Log Scene Occurrence / Crew Note</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-2.5">
                <input
                  type="text"
                  placeholder="Scene Number (e.g. SCENE 38)"
                  value={newSceneNum}
                  onChange={(e) => setNewSceneNum(e.target.value)}
                  className="bg-white dark:bg-[#14201E] border border-[#D8E5E1] dark:border-[#223735] px-3 py-1.5 text-xs text-[#12201F] dark:text-[#EDF5F3] focus:outline-hidden focus:border-[#12A79D]"
                />
                <input
                  type="text"
                  placeholder="Slugline (e.g. INT. TEMPLE VAULT - DAY)"
                  value={newSceneSlug}
                  onChange={(e) => setNewSceneSlug(e.target.value)}
                  className="sm:col-span-2 bg-white dark:bg-[#14201E] border border-[#D8E5E1] dark:border-[#223735] px-3 py-1.5 text-xs text-[#12201F] dark:text-[#EDF5F3] focus:outline-hidden focus:border-[#12A79D]"
                />
                <button
                  type="submit"
                  className="bg-[#12A79D] hover:bg-[#0B5F5A] text-white px-4 py-1.5 text-xs font-mono-tag uppercase font-bold transition-colors cursor-pointer"
                >
                  Add Scene Log
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="Action Description (e.g. Hero reveals compass from pouch)"
                  value={newSceneAction}
                  onChange={(e) => setNewSceneAction(e.target.value)}
                  className="bg-white dark:bg-[#14201E] border border-[#D8E5E1] dark:border-[#223735] px-3 py-1.5 text-xs text-[#12201F] dark:text-[#EDF5F3] focus:outline-hidden focus:border-[#12A79D]"
                />
                <input
                  type="text"
                  placeholder="Crew Care Note (e.g. Wipe dust before close-up)"
                  value={newSceneNotes}
                  onChange={(e) => setNewSceneNotes(e.target.value)}
                  className="bg-white dark:bg-[#14201E] border border-[#D8E5E1] dark:border-[#223735] px-3 py-1.5 text-xs text-[#12201F] dark:text-[#EDF5F3] focus:outline-hidden focus:border-[#12A79D]"
                />
              </div>
            </form>

            {/* List of Scenes */}
            <div className="space-y-3">
              {sceneTimeline.map((item) => (
                <div
                  key={item.sceneId}
                  className="p-4 bg-[#F7F4EC]/60 dark:bg-[#0E1716]/60 border border-[#D8E5E1] dark:border-[#223735] text-xs space-y-2"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono-tag text-xs px-2 py-0.5 bg-[#12A79D] text-white font-bold">
                        {item.sceneNumber}
                      </span>
                      <span className="font-fraunces font-bold text-sm text-[#12201F] dark:text-[#EDF5F3]">
                        {item.sceneSlug}
                      </span>
                    </div>
                    <span className="font-mono-tag text-[10px] px-2 py-0.5 bg-[#D8E5E1] dark:bg-[#223735] text-[#12201F] dark:text-[#EDF5F3]">
                      {item.productionPhase}
                    </span>
                  </div>

                  <p className="text-xs text-[#48605E] dark:text-[#8BA4A1] italic">
                    "{item.actionDescription}"
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-[#D8E5E1]/60 dark:border-[#223735]/60 text-[11px]">
                    <div>
                      <strong className="text-[#12201F] dark:text-[#EDF5F3]">Character: </strong>
                      <span className="text-[#48605E] dark:text-[#8BA4A1]">{item.characterUsing}</span>
                    </div>
                    <div>
                      <strong className="text-[#12201F] dark:text-[#EDF5F3]">Camera / Light: </strong>
                      <span className="text-[#48605E] dark:text-[#8BA4A1]">{item.lightingCameraNotes}</span>
                    </div>
                    <div>
                      <strong className="text-[#12201F] dark:text-[#EDF5F3]">Crew Directive: </strong>
                      <span className="text-[#12A79D] font-medium">{item.crewHandlingNotes}</span>
                    </div>
                  </div>

                  {item.archivalLocation && (
                    <div className="text-[11px] font-mono-tag text-[#12A79D] flex items-center gap-1.5 pt-1">
                      <Archive className="w-3 h-3" />
                      <span>Archival Preservation Location: {item.archivalLocation}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: FRANCHISE & SEQUEL CONTINUITY BIBLE */}
        {secondaryTab === 'franchise_bible' && (
          <div className="p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#D8E5E1] dark:border-[#223735]">
              <div>
                <h4 className="font-fraunces text-base font-bold text-[#12201F] dark:text-[#EDF5F3]">
                  Franchise & Sequel Continuity Bible
                </h4>
                <p className="font-inter text-xs text-[#48605E] dark:text-[#8BA4A1]">
                  Crucial guidelines for filmmaking crews on sequels or franchise spin-offs to ensure newly constructed props remain perfectly in sync with previous film canon.
                </p>
              </div>

              <span className="font-mono-tag text-xs text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" />
                <span>CANON BIBLE LOCKED</span>
              </span>
            </div>

            {/* Baseline Canon Statement */}
            <div className="p-4 bg-[#F7F4EC] dark:bg-[#0E1716] border border-[#D8E5E1] dark:border-[#223735]">
              <h5 className="font-mono-tag text-xs font-bold text-[#12201F] dark:text-[#EDF5F3] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Film className="w-3.5 h-3.5 text-[#12A79D]" />
                <span>Original Film Canon Baseline</span>
              </h5>
              <p className="font-inter text-xs text-[#48605E] dark:text-[#8BA4A1] leading-relaxed">
                {franchiseBible.filmCanonBaseline}
              </p>
            </div>

            {/* Strict Constraints vs Allowed Evolutions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-[#F7F4EC] dark:bg-[#0E1716] border border-[#D8E5E1] dark:border-[#223735]">
                <h5 className="font-mono-tag text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                  <span>Strict Canon Constraints (NEVER Change in Sequels)</span>
                </h5>
                <ul className="space-y-2 text-xs text-[#48605E] dark:text-[#8BA4A1]">
                  {franchiseBible.strictContinuityConstraints.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-red-500 font-bold shrink-0">✕</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-4 bg-[#F7F4EC] dark:bg-[#0E1716] border border-[#D8E5E1] dark:border-[#223735]">
                <h5 className="font-mono-tag text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Allowed Sequel Evolutions (Permitted Aging & Repairs)</span>
                </h5>
                <ul className="space-y-2 text-xs text-[#48605E] dark:text-[#8BA4A1]">
                  {franchiseBible.allowedSequelEvolutions.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-emerald-500 font-bold shrink-0">✓</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Sequel Warning Alerts for Prop Builders */}
            <div className="p-4 bg-amber-500/10 border border-amber-500/30">
              <h5 className="font-mono-tag text-xs font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-amber-600" />
                <span>Sequel Warning Alerts for New Prop Builders</span>
              </h5>
              <ul className="space-y-1.5 text-xs text-amber-900 dark:text-amber-200">
                {franchiseBible.sequelWarningAlerts.map((alert, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="font-bold">⚠</span>
                    <span>{alert}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Historical Film References */}
            {franchiseBible.previousFilmsReferences && franchiseBible.previousFilmsReferences.length > 0 && (
              <div className="p-4 bg-[#F7F4EC] dark:bg-[#0E1716] border border-[#D8E5E1] dark:border-[#223735]">
                <h5 className="font-mono-tag text-xs font-bold text-[#12201F] dark:text-[#EDF5F3] uppercase tracking-wider mb-2">
                  Historical Franchise Film Log
                </h5>
                <div className="divide-y divide-[#D8E5E1]/60 dark:divide-[#223735]/60 text-xs">
                  {franchiseBible.previousFilmsReferences.map((ref, idx) => (
                    <div key={idx} className="py-2 flex items-center justify-between">
                      <div>
                        <strong className="text-[#12201F] dark:text-[#EDF5F3]">{ref.filmTitle}</strong>
                        <span className="text-[#48605E] dark:text-[#8BA4A1]"> ({ref.year}) · Scenes: {ref.sceneOccurrences}</span>
                      </div>
                      <span className="text-[#12A79D] font-mono-tag text-[11px]">{ref.keyMoments}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: EXPORT METADATA & CAMERA PACKAGE */}
        {secondaryTab === 'export_metadata' && (
          <div className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#D8E5E1] dark:border-[#223735] mb-6">
              <div>
                <h4 className="font-fraunces text-base font-bold text-[#12201F] dark:text-[#EDF5F3]">
                  Production Slate & Camera Calibration Metadata
                </h4>
                <p className="font-inter text-xs text-[#48605E] dark:text-[#8BA4A1]">
                  Standardized interchange metadata for Art Department, VFX, and Color Grading conform.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadCameraXML}
                  className="px-3 py-1.5 bg-white dark:bg-[#14201E] border border-[#D8E5E1] dark:border-[#223735] hover:border-[#12A79D] text-xs font-mono-tag text-[#12201F] dark:text-[#EDF5F3] flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <FileCode className="w-3.5 h-3.5 text-[#12A79D]" />
                  <span>Download XML Spec</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadArchivalMarkdown}
                  className="px-3 py-1.5 bg-white dark:bg-[#14201E] border border-[#D8E5E1] dark:border-[#223735] hover:border-[#12A79D] text-xs font-mono-tag text-[#12201F] dark:text-[#EDF5F3] flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5 text-[#12A79D]" />
                  <span>Archival Markdown</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
              <div className="p-3 bg-[#F7F4EC] dark:bg-[#0E1716] border border-[#D8E5E1] dark:border-[#223735]">
                <span className="block font-mono-tag text-[10px] text-[#48605E] dark:text-[#8BA4A1] uppercase">
                  SLATE CODE
                </span>
                <span className="font-mono text-xs font-bold text-[#12201F] dark:text-[#EDF5F3]">
                  {exportMeta.slateCode}
                </span>
              </div>

              <div className="p-3 bg-[#F7F4EC] dark:bg-[#0E1716] border border-[#D8E5E1] dark:border-[#223735]">
                <span className="block font-mono-tag text-[10px] text-[#48605E] dark:text-[#8BA4A1] uppercase">
                  SCENE & ROLL CUES
                </span>
                <span className="font-mono text-xs font-semibold text-[#12201F] dark:text-[#EDF5F3]">
                  {exportMeta.sceneCues}
                </span>
              </div>

              <div className="p-3 bg-[#F7F4EC] dark:bg-[#0E1716] border border-[#D8E5E1] dark:border-[#223735]">
                <span className="block font-mono-tag text-[10px] text-[#48605E] dark:text-[#8BA4A1] uppercase">
                  CAMERA & LENS PACKAGE
                </span>
                <span className="font-inter text-xs font-semibold text-[#12201F] dark:text-[#EDF5F3]">
                  {exportMeta.cameraLens}
                </span>
              </div>

              <div className="p-3 bg-[#F7F4EC] dark:bg-[#0E1716] border border-[#D8E5E1] dark:border-[#223735]">
                <span className="block font-mono-tag text-[10px] text-[#48605E] dark:text-[#8BA4A1] uppercase">
                  COLOR SPACE & TARGET LUT
                </span>
                <span className="font-mono text-xs font-semibold text-[#12201F] dark:text-[#EDF5F3]">
                  {exportMeta.colorSpace} · {exportMeta.lutTarget}
                </span>
              </div>

              <div className="p-3 bg-[#F7F4EC] dark:bg-[#0E1716] border border-[#D8E5E1] dark:border-[#223735]">
                <span className="block font-mono-tag text-[10px] text-[#48605E] dark:text-[#8BA4A1] uppercase">
                  STUNT DUPLICATE DUROMETER
                </span>
                <span className="font-inter text-xs text-[#12A79D] font-semibold">
                  {exportMeta.stuntDurometer}
                </span>
              </div>

              <div className="p-3 bg-[#F7F4EC] dark:bg-[#0E1716] border border-[#D8E5E1] dark:border-[#223735]">
                <span className="block font-mono-tag text-[10px] text-[#48605E] dark:text-[#8BA4A1] uppercase">
                  ASSET CHECKSUM & VERSION
                </span>
                <span className="font-mono text-[11px] text-[#12201F] dark:text-[#EDF5F3]">
                  {exportMeta.checksum} ({selectedVersionId})
                </span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: PRODUCTION HISTORY & AUDIT TRAIL */}
        {secondaryTab === 'history_logs' && (
          <div className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#D8E5E1] dark:border-[#223735] mb-6">
              <div>
                <h4 className="font-fraunces text-base font-bold text-[#12201F] dark:text-[#EDF5F3]">
                  Production History & Audit Trail
                </h4>
                <p className="font-inter text-xs text-[#48605E] dark:text-[#8BA4A1]">
                  Complete chronological trace of all gate reviews, approvals, and on-set modification notes.
                </p>
              </div>
            </div>

            {/* Append Note Form */}
            <form onSubmit={handleAddHistoryNote} className="mb-6 p-4 bg-[#F7F4EC] dark:bg-[#0E1716] border border-[#D8E5E1] dark:border-[#223735]">
              <div className="font-mono-tag text-xs font-bold uppercase tracking-wider text-[#12201F] dark:text-[#EDF5F3] mb-2 flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5 text-[#12A79D]" />
                <span>Append Art Dept Production Note</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-2.5">
                <input
                  type="text"
                  placeholder="Your Name (e.g. Isla Venn)"
                  value={newLogUser}
                  onChange={(e) => setNewLogUser(e.target.value)}
                  className="bg-white dark:bg-[#14201E] border border-[#D8E5E1] dark:border-[#223735] px-3 py-1.5 text-xs text-[#12201F] dark:text-[#EDF5F3] focus:outline-hidden focus:border-[#12A79D]"
                />
                <input
                  type="text"
                  placeholder="Role (e.g. Lead Prop Master / DP)"
                  value={newLogRole}
                  onChange={(e) => setNewLogRole(e.target.value)}
                  className="bg-white dark:bg-[#14201E] border border-[#D8E5E1] dark:border-[#223735] px-3 py-1.5 text-xs text-[#12201F] dark:text-[#EDF5F3] focus:outline-hidden focus:border-[#12A79D]"
                />
                <button
                  type="submit"
                  className="bg-[#12A79D] hover:bg-[#0B5F5A] text-white px-4 py-1.5 text-xs font-mono-tag uppercase font-bold transition-colors cursor-pointer"
                >
                  Post Production Note
                </button>
              </div>
              <textarea
                placeholder="Type modification note, camera test observations, or director requests..."
                value={newLogNote}
                onChange={(e) => setNewLogNote(e.target.value)}
                rows={2}
                className="w-full bg-white dark:bg-[#14201E] border border-[#D8E5E1] dark:border-[#223735] p-2.5 text-xs text-[#12201F] dark:text-[#EDF5F3] focus:outline-hidden focus:border-[#12A79D] resize-none"
              />
            </form>

            {/* Chronological Timeline */}
            <div className="space-y-3">
              {historyLogs.map((entry) => (
                <div
                  key={entry.id}
                  className="p-3.5 bg-[#F7F4EC]/60 dark:bg-[#0E1716]/60 border border-[#D8E5E1] dark:border-[#223735] flex flex-col sm:flex-row sm:items-start justify-between gap-3 text-xs"
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono-tag text-[10px] font-bold px-1.5 py-0.5 bg-[#12A79D]/15 text-[#12A79D] uppercase">
                        {entry.type}
                      </span>
                      <span className="font-fraunces font-bold text-[#12201F] dark:text-[#EDF5F3]">
                        {entry.action}
                      </span>
                    </div>
                    <p className="font-inter text-xs text-[#48605E] dark:text-[#8BA4A1] leading-relaxed">
                      {entry.notes}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-semibold text-[#12201F] dark:text-[#EDF5F3]">
                      {entry.user}
                    </div>
                    <div className="text-[10px] text-[#48605E] dark:text-[#8BA4A1]">
                      {entry.role}
                    </div>
                    <div className="font-mono-tag text-[10px] text-[#12A79D] mt-0.5">
                      {entry.timestamp}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* MODAL: HIGH-RESOLUTION PLATE INSPECTOR */}
      {inspectedImage && (
        <div
          className="fixed inset-0 z-50 bg-[#0D1514]/80 flex items-center justify-center p-4 backdrop-blur-xs"
          onClick={() => setInspectedImage(null)}
        >
          <div
            className="bg-white dark:bg-[#14201E] border border-[#D8E5E1] dark:border-[#223735] max-w-4xl w-full p-4 shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#D8E5E1] dark:border-[#223735] pb-2 mb-3">
              <div>
                <h4 className="font-fraunces text-base font-bold text-[#12201F] dark:text-[#EDF5F3]">
                  {inspectedImage.title}
                </h4>
                {inspectedImage.subtitle && (
                  <p className="font-inter text-xs text-[#48605E] dark:text-[#8BA4A1]">
                    {inspectedImage.subtitle}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setInspectedImage(null)}
                className="w-7 h-7 flex items-center justify-center text-lg text-[#48605E] hover:text-[#12201F] dark:hover:text-[#EDF5F3] cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="max-h-[70vh] flex items-center justify-center bg-[#F7F4EC] dark:bg-[#0E1716] p-4 border border-[#D8E5E1] dark:border-[#223735]">
              <img
                src={inspectedImage.url}
                alt={inspectedImage.title}
                className="max-h-[65vh] w-auto object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
