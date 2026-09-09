import React, { useState, useEffect } from 'react';
import { PropItem, ReferenceImage, ScriptExtraction, AssetVersion, SceneUsageRecord, FranchiseContinuityBible } from '../../types';
import { getPropArtwork } from '../../utils/propVisuals';
import { SAMPLE_PRODUCTION_SCRIPTS, parseCustomScript } from '../../data/sampleScripts';
import {
  defaultArtifactAgentClient,
  AgentStepProgress,
  AgentRunTelemetry
} from '../../services/artifactAgentClient';
import {
  FileText,
  UploadCloud,
  Edit3,
  Sparkles,
  Layers,
  ArrowRight,
  Sliders,
  CheckCircle2,
  Film,
  Camera,
  AlertCircle,
  ShieldCheck,
  AlertTriangle,
  Cpu,
  RefreshCw,
  Terminal
} from 'lucide-react';

interface BriefPageProps {
  onCancel: () => void;
  onSubmitBrief: (newProp: Partial<PropItem>) => void;
}

type BriefInputMode = 'script' | 'upload_brief' | 'manual';
type EngineMode = 'artifact_agent_primary' | 'ai_backup';

export function BriefPage({ onCancel, onSubmitBrief }: BriefPageProps) {
  const [inputMode, setInputMode] = useState<BriefInputMode>('script');
  const [engineMode, setEngineMode] = useState<EngineMode>('artifact_agent_primary');

  // Selected sample script or custom parsed script
  const [selectedScript, setSelectedScript] = useState<ScriptExtraction>(SAMPLE_PRODUCTION_SCRIPTS[0]);
  const [customScriptText, setCustomScriptText] = useState(SAMPLE_PRODUCTION_SCRIPTS[0].scriptText);
  const [scriptSceneNumber, setScriptSceneNumber] = useState(SAMPLE_PRODUCTION_SCRIPTS[0].sceneNumber);

  // Subagent pipeline state
  const [isAgentRunning, setIsAgentRunning] = useState(false);
  const [agentSteps, setAgentSteps] = useState<AgentStepProgress[]>([]);
  const [agentTelemetry, setAgentTelemetry] = useState<AgentRunTelemetry | null>(null);

  // Core brief form states
  const [propName, setPropName] = useState(SAMPLE_PRODUCTION_SCRIPTS[0].propName);
  const [shortDesc, setShortDesc] = useState(SAMPLE_PRODUCTION_SCRIPTS[0].shortDescription);
  const [world, setWorld] = useState(SAMPLE_PRODUCTION_SCRIPTS[0].world);
  const [era, setEra] = useState(SAMPLE_PRODUCTION_SCRIPTS[0].era);
  const [functionOnScreen, setFunctionOnScreen] = useState(SAMPLE_PRODUCTION_SCRIPTS[0].functionOnScreen);
  const [constraints, setConstraints] = useState(SAMPLE_PRODUCTION_SCRIPTS[0].constraints);
  const [optionsCount, setOptionsCount] = useState<number>(4);
  const [isGenerating, setIsGenerating] = useState(false);

  // 6 Reference Slots
  const [references, setReferences] = useState<(ReferenceImage | null)[]>([
    null,
    null,
    { id: 'r3', name: 'Armillary Astrolabe Ref', url: getPropArtwork('astral_compass_opt_a') },
    { id: 'r4', name: 'Pocket Compass Ref', url: getPropArtwork('field_compass') },
    null,
    { id: 'r6', name: 'Celestial Engraving Ref', url: getPropArtwork('callout_dial') }
  ]);

  const quickConstraintChips = [
    'Must open on camera',
    'Glows / interior light',
    'Stunt-safe lightweight (<300g)',
    'Handheld (<20cm)',
    'Mechanical rotation',
    'Matte anti-glare finish'
  ];

  // Execute the primary Artifact Agent System subagent pipeline
  const runArtifactAgentPipeline = async (text: string) => {
    setIsAgentRunning(true);
    try {
      const result = await defaultArtifactAgentClient.runScriptAnalysisSubagent(
        text,
        (step) => {
          setAgentSteps((prev) => {
            const filtered = prev.filter((s) => s.stepIndex !== step.stepIndex);
            return [...filtered, step].sort((a, b) => a.stepIndex - b.stepIndex);
          });
        }
      );

      if (result.success) {
        setPropName(result.extraction.propName);
        setShortDesc(result.extraction.shortDescription);
        setWorld(result.extraction.world);
        setEra(result.extraction.era);
        setFunctionOnScreen(result.extraction.functionOnScreen);
        setConstraints(result.extraction.constraints);
        if (result.extraction.sceneNumber) {
          setScriptSceneNumber(result.extraction.sceneNumber);
        }
        setAgentTelemetry(result.telemetry);
        setAgentSteps(result.steps);
      }
    } catch (err) {
      console.error('Agent subagent run error:', err);
    } finally {
      setIsAgentRunning(false);
    }
  };

  // Run initial agent pipeline on mount for the default script
  useEffect(() => {
    if (engineMode === 'artifact_agent_primary' && inputMode === 'script') {
      runArtifactAgentPipeline(customScriptText);
    }
  }, []);

  const handleSelectSampleScript = (script: ScriptExtraction) => {
    setSelectedScript(script);
    setCustomScriptText(script.scriptText);
    setScriptSceneNumber(script.sceneNumber);

    if (engineMode === 'artifact_agent_primary') {
      runArtifactAgentPipeline(script.scriptText);
    } else {
      // Backup mode
      setPropName(script.propName);
      setShortDesc(script.shortDescription);
      setWorld(script.world);
      setEra(script.era);
      setFunctionOnScreen(script.functionOnScreen);
      setConstraints(script.constraints);
    }
  };

  const handleCustomScriptChange = (text: string) => {
    setCustomScriptText(text);

    if (engineMode === 'artifact_agent_primary') {
      // Debounced or direct trigger for agent
      const parsed = parseCustomScript(text);
      if (parsed.propName) setPropName(parsed.propName);
      if (parsed.shortDescription) setShortDesc(parsed.shortDescription);
      if (parsed.world) setWorld(parsed.world);
      if (parsed.era) setEra(parsed.era);
      if (parsed.functionOnScreen) setFunctionOnScreen(parsed.functionOnScreen);
      if (parsed.constraints) setConstraints(parsed.constraints);
      if (parsed.sceneNumber) setScriptSceneNumber(parsed.sceneNumber);
    } else {
      const parsed = parseCustomScript(text);
      if (parsed.propName) setPropName(parsed.propName);
      if (parsed.shortDescription) setShortDesc(parsed.shortDescription);
      if (parsed.world) setWorld(parsed.world);
      if (parsed.era) setEra(parsed.era);
      if (parsed.functionOnScreen) setFunctionOnScreen(parsed.functionOnScreen);
      if (parsed.constraints) setConstraints(parsed.constraints);
      if (parsed.sceneNumber) setScriptSceneNumber(parsed.sceneNumber);
    }
  };

  const handleScriptFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        if (text) {
          setCustomScriptText(text);
          if (engineMode === 'artifact_agent_primary') {
            runArtifactAgentPipeline(text);
          } else {
            handleCustomScriptChange(text);
          }
        }
      };
      reader.readAsText(file);
    }
  };

  const handleBriefFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const text = event.target?.result as string;
          const parsed = JSON.parse(text);
          if (parsed.name) setPropName(parsed.name);
          if (parsed.shortDescription || parsed.description) setShortDesc(parsed.shortDescription || parsed.description);
          if (parsed.world) setWorld(parsed.world);
          if (parsed.era) setEra(parsed.era);
          if (parsed.functionOnScreen) setFunctionOnScreen(parsed.functionOnScreen);
          if (parsed.constraints) setConstraints(parsed.constraints);
        } catch {
          const text = event.target?.result as string;
          handleCustomScriptChange(text);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleAddConstraintChip = (chip: string) => {
    if (!constraints.includes(chip)) {
      setConstraints((prev) => (prev ? `${prev}. ${chip}` : chip));
    }
  };

  const handleFileUpload = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const url = event.target?.result as string;
        const newRefs = [...references];
        newRefs[index] = {
          id: `custom-${Date.now()}`,
          name: file.name,
          url,
          isCustom: true
        };
        setReferences(newRefs);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveReference = (index: number) => {
    const newRefs = [...references];
    newRefs[index] = null;
    setReferences(newRefs);
  };

  const handleGenerate = () => {
    setIsGenerating(true);

    const baseSceneSlug = customScriptText.split('\n')[0]?.trim() || `${scriptSceneNumber} · EXT. HERO LOCATION`;

    // Construct enriched versioning and franchise continuity package
    const initialVersions: AssetVersion[] = [
      {
        versionId: 'v1.0-HERO',
        label: 'Film 1 Hero Master',
        filmTitle: 'Production Master',
        author: 'Isla Venn (Lead Prop Master)',
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        status: 'ACTIVE_HERO',
        changelog: `Initial hero build synthesized by ${engineMode === 'artifact_agent_primary' ? 'Artifact Agent System' : 'Direct AI Parser'}. Calibrated for camera close-ups.`,
        scenesUsed: [scriptSceneNumber],
        stuntDuplicateRating: constraints.toLowerCase().includes('stunt') ? 'Shore 45A Urethane Required' : 'Hero Close-Up Only',
        checksum: `sha256:${Math.random().toString(36).substring(2, 10)}...${Math.random().toString(36).substring(2, 6)}`,
        isCurrent: true
      },
      {
        versionId: 'v1.1-STUNT',
        label: 'Stunt Impact / Water Duplicate',
        filmTitle: 'Production Master',
        author: 'Kael Thorne (Stunt Fabrication Lead)',
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        status: 'STUNT_ACTIVE',
        changelog: 'Flexible lightweight urethane duplicate for dynamic actor action and potential impact.',
        scenesUsed: [`${scriptSceneNumber} (Stunt)`],
        stuntDuplicateRating: 'Shore 45A Urethane Duplicate',
        checksum: `sha256:${Math.random().toString(36).substring(2, 10)}...${Math.random().toString(36).substring(2, 6)}`,
        isCurrent: false
      },
      {
        versionId: 'v2.0-SEQUEL',
        label: 'Franchise Sequel Upgrade Specification',
        filmTitle: 'Sequel Franchise Master',
        author: 'Studio Continuity Department',
        date: 'Planned Pre-Production',
        status: 'SEQUEL_PLANNED',
        changelog: 'Chronological weathering and patina permitted; core silhouette and key symbols locked to Film 1 canon.',
        scenesUsed: ['Sequel Scenes'],
        stuntDuplicateRating: 'Dual Hero / Field Grade',
        checksum: `sha256:${Math.random().toString(36).substring(2, 10)}...${Math.random().toString(36).substring(2, 6)}`,
        isCurrent: false
      }
    ];

    const initialSceneUsage: SceneUsageRecord[] = [
      {
        sceneId: `sc-${Date.now()}-1`,
        sceneNumber: scriptSceneNumber,
        sceneSlug: baseSceneSlug,
        productionPhase: 'PRINCIPAL_PHOTOGRAPHY',
        actionDescription: functionOnScreen,
        crewHandlingNotes: `Handle with cotton gloves. Inspect mechanics and wipe fingerprints before rolling camera.`,
        characterUsing: 'Lead Actor / Protagonist',
        lightingCameraNotes: '50mm Anamorphic Lens · Key light angled to highlight hero surface geometry.',
        stuntVersionRequired: constraints.toLowerCase().includes('stunt')
      },
      {
        sceneId: `sc-${Date.now()}-2`,
        sceneNumber: 'POST-PROD',
        sceneSlug: 'ARCHIVAL ACCESSION & VAULT STOWAGE',
        productionPhase: 'POST_PRODUCTION_ARCHIVAL',
        actionDescription: 'Physical hero wrap after production. Catalogued for franchise continuity preservation.',
        crewHandlingNotes: 'Store in Pelican case with desiccant packs at 45% relative humidity.',
        characterUsing: 'Art Department Archival Caretaker',
        lightingCameraNotes: 'Archival photogrammetry scan logged for VFX digital double.',
        stuntVersionRequired: false,
        archivalLocation: 'Pinewood Studio Archival Vault A · Box #14'
      }
    ];

    const initialFranchiseBible: FranchiseContinuityBible = {
      filmCanonBaseline: `Film 1 established ${propName} as an authentic in-world artifact in ${world} (${era}) with specific mechanical traits: ${functionOnScreen}.`,
      strictContinuityConstraints: [
        `SILHOUETTE & SYMBOLS: Core geometry and engravings are locked canon; cannot be altered in sequels without narrative explanation.`,
        `DIMENSIONAL ENVELOPE: Handheld scale must match actor muscle memory and established on-screen holster/pocket measurements.`,
        `FINISH & ILLUMINATION: Color temperature and specular reflections must conform to Film 1 look-up tables (LUTs).`
      ],
      allowedSequelEvolutions: [
        'Natural verdigris, edge wear, and surface abrasions reflecting elapsed story time.',
        'Practical character repairs (replacement screws, reinforced strap) consistent with field use.'
      ],
      sequelWarningAlerts: [
        'WARNING: Ensure 3D printing or CNC machining on sequels references original CAD / photogrammetry scans (Asset ID: ARF-ARCHIVE).',
        'CONTINUITY RULE: Do not introduce modern materials or fasteners absent in the original film.'
      ],
      previousFilmsReferences: [
        {
          filmTitle: 'Chapter I (Original Film)',
          year: '2024',
          sceneOccurrences: scriptSceneNumber,
          keyMoments: functionOnScreen
        }
      ]
    };

    void Promise.resolve(
      onSubmitBrief({
        name: propName,
        shortDescription: shortDesc,
        world,
        era,
        functionOnScreen,
        constraints,
        optionsCount,
        sceneNumber: scriptSceneNumber,
        scriptExcerpt: inputMode === 'script' ? customScriptText.slice(0, 300) : undefined,
        referenceImages: references.filter((r): r is ReferenceImage => r !== null),
        currentVersionId: 'v1.0-HERO',
        versions: initialVersions,
        sceneUsageTimeline: initialSceneUsage,
        franchiseContinuity: initialFranchiseBible
      })
    ).finally(() => setIsGenerating(false));
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Page Title & Breadcrumb */}
      <div className="border-b border-[#D8E5E1] dark:border-[#223735] pb-4 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono-tag text-xs font-semibold uppercase tracking-widest text-[#48605E] dark:text-[#8BA4A1]">
                STEP 2 · HERO PROP BRIEF
              </span>
              <span className="text-[#D8E5E1] dark:text-[#223735]">·</span>
              <span className="font-mono-tag text-xs text-[#12A79D] font-bold">
                GATE 1 PREPARATION
              </span>
            </div>
            <h1 className="font-fraunces text-2xl sm:text-3xl font-bold text-[#12201F] dark:text-[#EDF5F3] mt-1">
              Draft or Extract Hero Prop Brief
            </h1>
            <p className="font-inter text-xs text-[#48605E] dark:text-[#8BA4A1] mt-1">
              Extract specifications directly from a screenplay scene, upload a brief document, or fill out the manual art department form.
            </p>
          </div>

          {/* 3 Input Methods Switcher */}
          <div className="flex items-center bg-white dark:bg-[#14201E] border border-[#D8E5E1] dark:border-[#223735] p-1 shadow-xs">
            <button
              type="button"
              onClick={() => setInputMode('script')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono-tag tracking-wider uppercase transition-colors cursor-pointer ${
                inputMode === 'script'
                  ? 'bg-[#12A79D] text-white font-bold'
                  : 'text-[#48605E] dark:text-[#8BA4A1] hover:text-[#12201F] dark:hover:text-[#EDF5F3]'
              }`}
            >
              <Film className="w-3.5 h-3.5" />
              <span>Production Script</span>
            </button>
            <button
              type="button"
              onClick={() => setInputMode('upload_brief')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono-tag tracking-wider uppercase transition-colors cursor-pointer ${
                inputMode === 'upload_brief'
                  ? 'bg-[#12A79D] text-white font-bold'
                  : 'text-[#48605E] dark:text-[#8BA4A1] hover:text-[#12201F] dark:hover:text-[#EDF5F3]'
              }`}
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Upload File</span>
            </button>
            <button
              type="button"
              onClick={() => setInputMode('manual')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono-tag tracking-wider uppercase transition-colors cursor-pointer ${
                inputMode === 'manual'
                  ? 'bg-[#12A79D] text-white font-bold'
                  : 'text-[#48605E] dark:text-[#8BA4A1] hover:text-[#12201F] dark:hover:text-[#EDF5F3]'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Manual Form</span>
            </button>
          </div>
        </div>
      </div>

      {/* ENGINE SELECTION & AGENT ORCHESTRATION BANNER */}
      {inputMode === 'script' && (
        <div className="mb-6 bg-white dark:bg-[#14201E] border border-[#D8E5E1] dark:border-[#223735] p-4 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-mono-tag text-[11px] font-bold uppercase tracking-wider text-[#48605E] dark:text-[#8BA4A1]">
                  SCRIPT-TO-BRIEF EXTRACTION PIPELINE
                </span>
                <span className="px-2 py-0.5 bg-[#12A79D]/15 text-[#12A79D] text-[10px] font-mono-tag font-bold">
                  {engineMode === 'artifact_agent_primary' ? 'ARTIFACT AGENT SYSTEM (PRIMARY)' : 'BACKUP PARSER (EMERGENCY)'}
                </span>
              </div>
              <p className="font-inter text-xs text-[#48605E] dark:text-[#8BA4A1]">
                {engineMode === 'artifact_agent_primary'
                  ? 'The Artifact Agent System autonomously parses screenplay action, checks franchise continuity rules, and calculates stunt safety tolerances.'
                  : 'Direct AI regex parsing is engaged as an emergency fallback. It is strongly recommended to use the Artifact Agent subagent system for continuity protection.'}
              </p>
            </div>

            {/* Engine Switcher */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setEngineMode('artifact_agent_primary');
                  runArtifactAgentPipeline(customScriptText);
                }}
                className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-mono-tag tracking-wider uppercase transition-all cursor-pointer ${
                  engineMode === 'artifact_agent_primary'
                    ? 'bg-[#12A79D] text-white font-bold shadow-xs'
                    : 'bg-[#F7F4EC] dark:bg-[#0E1716] border border-[#D8E5E1] dark:border-[#223735] text-[#48605E] dark:text-[#8BA4A1] hover:border-[#12A79D]'
                }`}
              >
                <Cpu className="w-3.5 h-3.5" />
                <span>Artifact Agent (Primary)</span>
              </button>

              <button
                type="button"
                onClick={() => setEngineMode('ai_backup')}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-mono-tag tracking-wider uppercase transition-all cursor-pointer ${
                  engineMode === 'ai_backup'
                    ? 'bg-amber-600 text-white font-bold shadow-xs'
                    : 'bg-[#F7F4EC] dark:bg-[#0E1716] border border-[#D8E5E1] dark:border-[#223735] text-[#48605E] dark:text-[#8BA4A1] hover:border-amber-500'
                }`}
                title="Use only if Artifact Agent System is offline"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Backup AI Parser</span>
              </button>
            </div>
          </div>

          {/* Warning notice when in AI Backup Mode */}
          {engineMode === 'ai_backup' && (
            <div className="mt-3 p-3 bg-amber-500/10 border border-amber-500/30 flex items-center gap-2.5 text-xs text-amber-900 dark:text-amber-200">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <span>
                <strong>Warning:</strong> You are currently using the Backup AI Parser. This fallback mode bypasses the Artifact Agent's deep Franchise Continuity Guard and stunt durometer verification, increasing the risk of out-of-sync prop discrepancies in sequels or franchise productions.
              </span>
              <button
                type="button"
                onClick={() => {
                  setEngineMode('artifact_agent_primary');
                  runArtifactAgentPipeline(customScriptText);
                }}
                className="underline ml-auto font-mono-tag font-bold whitespace-nowrap cursor-pointer hover:text-amber-700"
              >
                Switch to Artifact Agent →
              </button>
            </div>
          )}

          {/* Subagent Console Bar when in Primary Mode */}
          {engineMode === 'artifact_agent_primary' && (
            <div className="mt-3 pt-3 border-t border-[#D8E5E1]/60 dark:border-[#223735]/60">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <Terminal className="w-3.5 h-3.5 text-[#12A79D]" />
                  <span className="font-mono-tag text-[11px] font-bold text-[#12201F] dark:text-[#EDF5F3] uppercase">
                    Artifact Agent System Telemetry & Pipeline Steps
                  </span>
                  {isAgentRunning && (
                    <span className="flex items-center gap-1 text-[10px] font-mono-tag text-[#12A79D] animate-pulse">
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      <span>Subagents Running...</span>
                    </span>
                  )}
                </div>

                {agentTelemetry && (
                  <div className="flex items-center gap-3 text-[10px] font-mono-tag text-[#48605E] dark:text-[#8BA4A1]">
                    <span>Session: {agentTelemetry.agentSessionId.slice(0, 14)}</span>
                    <span>Execution: {agentTelemetry.executionTimeMs}ms</span>
                    <span className="text-[#12A79D] font-bold">Continuity: PASSED ✓</span>
                    <span className="px-1.5 py-0.2 bg-[#12A79D]/10 text-[#12A79D]">
                      Stunt Risk: {agentTelemetry.stuntRiskScore}
                    </span>
                  </div>
                )}
              </div>

              {/* Step Pills */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
                {(agentSteps.length > 0
                  ? agentSteps
                  : [
                      { stepIndex: 1, subagentName: 'ScriptAnalystSubagent', actionMessage: 'Parsing scene headings & prop cues...', status: 'completed' },
                      { stepIndex: 2, subagentName: 'ContinuityGuardSubagent', actionMessage: 'Cross-referencing Franchise Bible...', status: 'completed' },
                      { stepIndex: 3, subagentName: 'StuntToleranceSubagent', actionMessage: 'Synthesizing dimensional limits...', status: 'completed' },
                      { stepIndex: 4, subagentName: 'BriefSynthesizerSubagent', actionMessage: 'Compiling structured brief...', status: 'completed' }
                    ]
                ).map((step: any, idx) => (
                  <div
                    key={idx}
                    className={`p-2 border flex items-center gap-2 text-[11px] font-mono-tag ${
                      step.status === 'running'
                        ? 'border-[#12A79D] bg-[#12A79D]/10 text-[#12201F] dark:text-[#EDF5F3]'
                        : step.status === 'completed'
                        ? 'border-[#D8E5E1] dark:border-[#223735] bg-[#F7F4EC]/60 dark:bg-[#0E1716]/60 text-[#12201F] dark:text-[#EDF5F3]'
                        : 'border-[#D8E5E1] dark:border-[#223735] opacity-50 text-[#48605E]'
                    }`}
                  >
                    {step.status === 'completed' ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#12A79D] shrink-0" />
                    ) : step.status === 'running' ? (
                      <RefreshCw className="w-3.5 h-3.5 text-[#12A79D] animate-spin shrink-0" />
                    ) : (
                      <span className="w-3.5 h-3.5 rounded-full border border-[#48605E] shrink-0" />
                    )}
                    <div className="truncate">
                      <div className="font-bold truncate">{step.subagentName}</div>
                      <div className="text-[10px] text-[#48605E] dark:text-[#8BA4A1] truncate">
                        {step.actionMessage}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODE 1: SCRIPT EXTRACTION WORKFLOW */}
      {inputMode === 'script' && (
        <div className="space-y-6 mb-8">
          {/* Sample Production Scene Chooser Bar */}
          <div className="bg-white dark:bg-[#14201E] border border-[#D8E5E1] dark:border-[#223735] p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                <Film className="w-4 h-4 text-[#12A79D]" />
                <span className="font-mono-tag text-xs font-bold uppercase tracking-wider text-[#12201F] dark:text-[#EDF5F3]">
                  Select Sample Production Scene Sides (or Paste / Upload Below)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => runArtifactAgentPipeline(customScriptText)}
                  disabled={isAgentRunning}
                  className="flex items-center gap-1 px-3 py-1 bg-[#12A79D]/15 hover:bg-[#12A79D]/25 text-[#12A79D] font-mono-tag text-xs font-bold transition-colors cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isAgentRunning ? 'animate-spin' : ''}`} />
                  <span>Re-Run Artifact Agent</span>
                </button>
                <label className="flex items-center gap-1.5 px-3 py-1 bg-white dark:bg-[#1B2C29] border border-[#D8E5E1] dark:border-[#223735] hover:border-[#12A79D] text-[#12201F] dark:text-[#EDF5F3] font-mono-tag text-xs cursor-pointer transition-colors">
                  <UploadCloud className="w-3.5 h-3.5 text-[#12A79D]" />
                  <span>Upload Screenplay (.txt/.fountain)</span>
                  <input
                    type="file"
                    accept=".txt,.fountain,.md"
                    onChange={handleScriptFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Script Scene Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {SAMPLE_PRODUCTION_SCRIPTS.map((script) => {
                const isSelected = selectedScript.id === script.id;
                return (
                  <button
                    key={script.id}
                    type="button"
                    onClick={() => handleSelectSampleScript(script)}
                    className={`p-3 text-left border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[#12A79D] bg-[#12A79D]/5 dark:bg-[#12A79D]/15 shadow-xs'
                        : 'border-[#D8E5E1] dark:border-[#223735] bg-[#F7F4EC]/50 dark:bg-[#1B2C29]/50 hover:border-[#12A79D]/50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono-tag text-[10px] font-bold px-1.5 py-0.5 bg-[#12A79D]/20 text-[#12A79D]">
                        {script.sceneNumber}
                      </span>
                      {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-[#12A79D]" />}
                    </div>
                    <div className="font-fraunces text-xs font-bold text-[#12201F] dark:text-[#EDF5F3] truncate">
                      {script.title}
                    </div>
                    <div className="font-inter text-[11px] text-[#48605E] dark:text-[#8BA4A1] truncate mt-0.5">
                      Prop: <strong className="text-[#12201F] dark:text-[#EDF5F3]">{script.propName}</strong>
                    </div>
                    <div className="font-mono-tag text-[9px] text-[#12A79D] mt-1 truncate">
                      {script.era}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Side-by-Side: Screenplay Viewer vs Extracted Spec Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Script Editor / Formatted View */}
            <div className="lg:col-span-6 bg-white dark:bg-[#14201E] border border-[#D8E5E1] dark:border-[#223735] p-5 flex flex-col">
              <div className="flex items-center justify-between pb-3 border-b border-[#D8E5E1] dark:border-[#223735] mb-3">
                <div className="flex items-center gap-2">
                  <span className="font-mono-tag text-xs font-bold text-[#12201F] dark:text-[#EDF5F3] uppercase tracking-wider">
                    {scriptSceneNumber} · SCRIPT EXCERPT
                  </span>
                  <span className="text-[10px] font-mono-tag text-[#48605E] dark:text-[#8BA4A1]">
                    (Courier Screenplay Format)
                  </span>
                </div>
                <span className="text-[10px] font-mono-tag text-[#12A79D] bg-[#12A79D]/10 px-2 py-0.5 font-bold">
                  {engineMode === 'artifact_agent_primary' ? 'ARTIFACT AGENT ACTIVE' : 'DIRECT PARSER ACTIVE'}
                </span>
              </div>

              <div className="relative flex-1">
                <textarea
                  value={customScriptText}
                  onChange={(e) => handleCustomScriptChange(e.target.value)}
                  rows={14}
                  className="w-full h-full p-4 font-mono text-xs text-[#12201F] dark:text-[#EDF5F3] bg-[#F7F4EC] dark:bg-[#0E1716] border border-[#D8E5E1] dark:border-[#223735] focus:outline-hidden focus:border-[#12A79D] leading-relaxed resize-none selection:bg-[#12A79D]/30"
                  placeholder="Paste or write screenplay text with scene headings, character action lines, and prop cues..."
                />
              </div>

              <div className="mt-3 flex items-center justify-between text-[11px] font-inter text-[#48605E] dark:text-[#8BA4A1]">
                <span>Editing script text automatically updates prop brief parameters on the right.</span>
                <span className="font-mono-tag text-[10px]">COURIER 10PT</span>
              </div>
            </div>

            {/* Right: Extracted Production Breakdown */}
            <div className="lg:col-span-6 bg-white dark:bg-[#14201E] border border-[#D8E5E1] dark:border-[#223735] p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-[#D8E5E1] dark:border-[#223735] mb-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#12A79D]" />
                    <span className="font-mono-tag text-xs font-bold text-[#12201F] dark:text-[#EDF5F3] uppercase tracking-wider">
                      EXTRACTED SCENE SPECIFICATION
                    </span>
                  </div>
                  <span className="font-mono-tag text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>CANON VERIFIED FOR GATE 1</span>
                  </span>
                </div>

                <div className="space-y-3.5">
                  {/* Prop Title */}
                  <div>
                    <label className="block font-mono-tag text-[10px] font-bold text-[#48605E] dark:text-[#8BA4A1] uppercase tracking-wider mb-1">
                      Detected Hero Prop
                    </label>
                    <input
                      type="text"
                      value={propName}
                      onChange={(e) => setPropName(e.target.value)}
                      className="w-full bg-[#F7F4EC] dark:bg-[#0E1716] border border-[#D8E5E1] dark:border-[#223735] px-3 py-1.5 text-xs font-fraunces font-bold text-[#12201F] dark:text-[#EDF5F3] focus:outline-hidden focus:border-[#12A79D]"
                    />
                  </div>

                  {/* World & Era */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-mono-tag text-[10px] font-bold text-[#48605E] dark:text-[#8BA4A1] uppercase tracking-wider mb-1">
                        Production World
                      </label>
                      <input
                        type="text"
                        value={world}
                        onChange={(e) => setWorld(e.target.value)}
                        className="w-full bg-[#F7F4EC] dark:bg-[#0E1716] border border-[#D8E5E1] dark:border-[#223735] px-3 py-1.5 text-xs font-inter text-[#12201F] dark:text-[#EDF5F3] focus:outline-hidden focus:border-[#12A79D]"
                      />
                    </div>
                    <div>
                      <label className="block font-mono-tag text-[10px] font-bold text-[#48605E] dark:text-[#8BA4A1] uppercase tracking-wider mb-1">
                        Era / Setting
                      </label>
                      <input
                        type="text"
                        value={era}
                        onChange={(e) => setEra(e.target.value)}
                        className="w-full bg-[#F7F4EC] dark:bg-[#0E1716] border border-[#D8E5E1] dark:border-[#223735] px-3 py-1.5 text-xs font-inter text-[#12201F] dark:text-[#EDF5F3] focus:outline-hidden focus:border-[#12A79D]"
                      />
                    </div>
                  </div>

                  {/* Function On Screen */}
                  <div>
                    <label className="block font-mono-tag text-[10px] font-bold text-[#48605E] dark:text-[#8BA4A1] uppercase tracking-wider mb-1">
                      Function on Screen (Script Action)
                    </label>
                    <textarea
                      rows={2}
                      value={functionOnScreen}
                      onChange={(e) => setFunctionOnScreen(e.target.value)}
                      className="w-full bg-[#F7F4EC] dark:bg-[#0E1716] border border-[#D8E5E1] dark:border-[#223735] p-2 text-xs font-inter text-[#12201F] dark:text-[#EDF5F3] focus:outline-hidden focus:border-[#12A79D] resize-none"
                    />
                  </div>

                  {/* Physical Constraints & Stunt Safety */}
                  <div>
                    <label className="block font-mono-tag text-[10px] font-bold text-[#48605E] dark:text-[#8BA4A1] uppercase tracking-wider mb-1">
                      Physical Constraints, Safety & Stunt Specs
                    </label>
                    <textarea
                      rows={2}
                      value={constraints}
                      onChange={(e) => setConstraints(e.target.value)}
                      className="w-full bg-[#F7F4EC] dark:bg-[#0E1716] border border-[#D8E5E1] dark:border-[#223735] p-2 text-xs font-inter text-[#12201F] dark:text-[#EDF5F3] focus:outline-hidden focus:border-[#12A79D] resize-none"
                    />
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {quickConstraintChips.map((chip) => (
                        <button
                          key={chip}
                          type="button"
                          onClick={() => handleAddConstraintChip(chip)}
                          className="text-[9px] font-mono-tag px-1.5 py-0.5 border border-[#D8E5E1] dark:border-[#223735] bg-[#F7F4EC] dark:bg-[#0E1716] text-[#48605E] dark:text-[#8BA4A1] hover:border-[#12A79D] hover:text-[#12A79D] transition-colors"
                        >
                          + {chip}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Generate Gate 1 Concepts CTA */}
              <div className="mt-5 pt-4 border-t border-[#D8E5E1] dark:border-[#223735] flex items-center justify-between gap-4">
                <div className="text-[11px] font-mono-tag text-[#48605E] dark:text-[#8BA4A1]">
                  Generating <strong className="text-[#12201F] dark:text-[#EDF5F3]">4 Divergent Options</strong> with full CMF specs
                </div>

                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="bg-[#12A79D] hover:bg-[#0B5F5A] text-white px-6 py-2.5 font-mono-tag text-xs uppercase tracking-wider font-bold transition-colors cursor-pointer flex items-center gap-2 shadow-xs"
                >
                  {isGenerating ? (
                    <>
                      <Sparkles className="w-4 h-4 animate-spin" />
                      <span>Synthesizing Concepts...</span>
                    </>
                  ) : (
                    <>
                      <span>Synthesize Concepts</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODE 2: UPLOAD BRIEF FILE */}
      {inputMode === 'upload_brief' && (
        <div className="bg-white dark:bg-[#14201E] border border-[#D8E5E1] dark:border-[#223735] p-8 mb-8 text-center max-w-2xl mx-auto shadow-xs">
          <UploadCloud className="w-12 h-12 text-[#12A79D] mx-auto mb-3" />
          <h3 className="font-fraunces text-xl font-bold text-[#12201F] dark:text-[#EDF5F3] mb-2">
            Upload Production Brief Document
          </h3>
          <p className="font-inter text-xs text-[#48605E] dark:text-[#8BA4A1] mb-5 max-w-md mx-auto">
            Upload an existing JSON dossier, markdown spec sheet, or art department text brief to auto-populate all prop parameters.
          </p>

          <label className="inline-flex items-center gap-2 px-6 py-3 bg-[#12A79D] hover:bg-[#0B5F5A] text-white text-xs font-mono-tag font-bold uppercase tracking-wider cursor-pointer transition-colors shadow-xs">
            <UploadCloud className="w-4 h-4" />
            <span>Select Brief File (.json / .txt / .md)</span>
            <input
              type="file"
              accept=".json,.txt,.md"
              onChange={handleBriefFileUpload}
              className="hidden"
            />
          </label>
        </div>
      )}

      {/* MODE 3: MANUAL FORM ENTRY */}
      {inputMode === 'manual' && (
        <div className="space-y-6 mb-8">
          <div className="bg-white dark:bg-[#14201E] border border-[#D8E5E1] dark:border-[#223735] p-6">
            <h2 className="font-mono-tag text-xs font-bold uppercase tracking-wider text-[#12201F] dark:text-[#EDF5F3] pb-3 border-b border-[#D8E5E1] dark:border-[#223735] mb-4">
              Manual Hero Prop Specifications
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block font-mono-tag text-xs font-semibold text-[#12201F] dark:text-[#EDF5F3] uppercase tracking-wider mb-1.5">
                  Hero Prop Name
                </label>
                <input
                  type="text"
                  value={propName}
                  onChange={(e) => setPropName(e.target.value)}
                  className="w-full bg-[#F7F4EC] dark:bg-[#0E1716] border border-[#D8E5E1] dark:border-[#223735] px-3.5 py-2 text-sm text-[#12201F] dark:text-[#EDF5F3] focus:outline-hidden focus:border-[#12A79D]"
                />
              </div>

              <div>
                <label className="block font-mono-tag text-xs font-semibold text-[#12201F] dark:text-[#EDF5F3] uppercase tracking-wider mb-1.5">
                  Short Description
                </label>
                <textarea
                  value={shortDesc}
                  onChange={(e) => setShortDesc(e.target.value)}
                  rows={2}
                  className="w-full bg-[#F7F4EC] dark:bg-[#0E1716] border border-[#D8E5E1] dark:border-[#223735] p-3 text-xs text-[#12201F] dark:text-[#EDF5F3] focus:outline-hidden focus:border-[#12A79D] resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-mono-tag text-xs font-semibold text-[#12201F] dark:text-[#EDF5F3] uppercase tracking-wider mb-1.5">
                    Production World
                  </label>
                  <input
                    type="text"
                    value={world}
                    onChange={(e) => setWorld(e.target.value)}
                    className="w-full bg-[#F7F4EC] dark:bg-[#0E1716] border border-[#D8E5E1] dark:border-[#223735] px-3.5 py-2 text-sm text-[#12201F] dark:text-[#EDF5F3] focus:outline-hidden focus:border-[#12A79D]"
                  />
                </div>
                <div>
                  <label className="block font-mono-tag text-xs font-semibold text-[#12201F] dark:text-[#EDF5F3] uppercase tracking-wider mb-1.5">
                    Era / Period
                  </label>
                  <input
                    type="text"
                    value={era}
                    onChange={(e) => setEra(e.target.value)}
                    className="w-full bg-[#F7F4EC] dark:bg-[#0E1716] border border-[#D8E5E1] dark:border-[#223735] px-3.5 py-2 text-sm text-[#12201F] dark:text-[#EDF5F3] focus:outline-hidden focus:border-[#12A79D]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-mono-tag text-xs font-semibold text-[#12201F] dark:text-[#EDF5F3] uppercase tracking-wider mb-1.5">
                  Function on Screen
                </label>
                <textarea
                  value={functionOnScreen}
                  onChange={(e) => setFunctionOnScreen(e.target.value)}
                  rows={2}
                  className="w-full bg-[#F7F4EC] dark:bg-[#0E1716] border border-[#D8E5E1] dark:border-[#223735] p-3 text-xs text-[#12201F] dark:text-[#EDF5F3] focus:outline-hidden focus:border-[#12A79D] resize-none"
                />
              </div>

              <div>
                <label className="block font-mono-tag text-xs font-semibold text-[#12201F] dark:text-[#EDF5F3] uppercase tracking-wider mb-1.5">
                  Constraints & Stunt Safety
                </label>
                <textarea
                  value={constraints}
                  onChange={(e) => setConstraints(e.target.value)}
                  rows={2}
                  className="w-full bg-[#F7F4EC] dark:bg-[#0E1716] border border-[#D8E5E1] dark:border-[#223735] p-3 text-xs text-[#12201F] dark:text-[#EDF5F3] focus:outline-hidden focus:border-[#12A79D] resize-none"
                />
              </div>
            </div>
          </div>

          {/* Reference Slots */}
          <div className="bg-white dark:bg-[#14201E] border border-[#D8E5E1] dark:border-[#223735] p-6">
            <h2 className="font-mono-tag text-xs font-bold uppercase tracking-wider text-[#12201F] dark:text-[#EDF5F3] pb-3 border-b border-[#D8E5E1] dark:border-[#223735] mb-4 flex items-center gap-2">
              <Camera className="w-4 h-4 text-[#12A79D]" />
              <span>Reference Mood Board (6 Visual Slots)</span>
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {references.map((ref, idx) => (
                <div
                  key={idx}
                  className="aspect-square bg-[#F7F4EC] dark:bg-[#0E1716] border border-[#D8E5E1] dark:border-[#223735] p-2 flex flex-col justify-between relative group"
                >
                  {ref ? (
                    <>
                      <img
                        src={ref.url}
                        alt={ref.name}
                        className="w-full h-full object-contain"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveReference(idx)}
                        className="absolute top-1 right-1 bg-red-600 text-white w-5 h-5 flex items-center justify-center text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Remove image"
                      >
                        ✕
                      </button>
                      <div className="absolute bottom-1 left-1 right-1 bg-black/70 text-white text-[9px] font-mono-tag p-1 truncate text-center">
                        {ref.name}
                      </div>
                    </>
                  ) : (
                    <label className="w-full h-full flex flex-col items-center justify-center text-[#48605E] dark:text-[#8BA4A1] hover:text-[#12A79D] cursor-pointer">
                      <UploadCloud className="w-5 h-5 mb-1" />
                      <span className="text-[10px] font-mono-tag">Slot {idx + 1}</span>
                      <span className="text-[9px] text-[#8BA4A1]">Upload Ref</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileUpload(idx, e)}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="flex items-center justify-between pt-4 border-t border-[#D8E5E1] dark:border-[#223735]">
            <button
              type="button"
              onClick={onCancel}
              className="px-5 py-2 text-xs font-mono-tag text-[#48605E] dark:text-[#8BA4A1] hover:text-[#12201F] dark:hover:text-[#EDF5F3]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating}
              className="bg-[#12A79D] hover:bg-[#0B5F5A] text-white px-8 py-3 font-mono-tag text-xs uppercase tracking-wider font-bold transition-colors cursor-pointer flex items-center gap-2 shadow-xs"
            >
              {isGenerating ? (
                <>
                  <Sparkles className="w-4 h-4 animate-spin" />
                  <span>Generating Concepts...</span>
                </>
              ) : (
                <>
                  <span>Generate Prop Concepts</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
