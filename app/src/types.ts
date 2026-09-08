export type PropStatus = 'awaiting_review' | 'generating' | 'assets_ready' | 'exported';

export interface ReferenceImage {
  id: string;
  name: string;
  url: string;
  isCustom?: boolean;
}

export interface ConceptOption {
  id: string; // 'A' | 'B' | 'C' | 'D'
  code: string; // e.g. 'ARF-00123-OPT-A'
  title: string;
  rationale: string;
  imageUrl: string;
  silhouette: string;
  highlights: string[];
}

export interface Approver {
  name: string;
  role: string;
  avatar: string;
}

export interface SelectionDecision {
  optionId: string;
  whyWeChoseThis: string;
  approvers: Approver[];
  date: string;
  notes: string[];
}

export interface TurnaroundView {
  angle: 'FRONT' | 'SIDE' | 'BACK' | 'THREE-QUARTER';
  imageUrl: string;
  dimensionsNote?: string;
}

export interface DetailCallout {
  id: string;
  title: string;
  subtitle: string;
  imageUrl: string;
}

export interface SpecTableData {
  dimensionsClosed: string;
  dimensionsOpen: string;
  weight: string;
  materials: string;
  finishes: string;
  stuntVariant: string;
  scriptedStates: string;
  mechanism: string;
  caregivingNotes: string;
}

export interface FinalAssetPackage {
  turnarounds: TurnaroundView[];
  callouts: DetailCallout[];
  specTable: SpecTableData;
  exportStatus: 'Ready to export' | 'Exporting...' | 'Exported ✓';
  libraryDestination: string;
  budgetCode: string;
  budgetStatus: 'ON BUDGET' | 'REVISED' | 'OVER BUDGET';
  createdDate: string;
  updatedDate: string;
  author: string;
}

export interface HistoryLogEntry {
  id: string;
  timestamp: string;
  action: string;
  user: string;
  role: string;
  notes?: string;
  type: 'creation' | 'generation' | 'review' | 'selection' | 'dossier' | 'export';
}

export interface ExportMetadata {
  slateCode: string;
  sceneCues: string;
  rollTake: string;
  cameraLens: string;
  colorSpace: string;
  aspectRatio: string;
  lutTarget: string;
  checksum: string;
  version: string;
  stuntDurometer: string;
  damDestination: string;
  exportedAt?: string;
}

export interface ScriptExtraction {
  id: string;
  title: string;
  sceneHeading: string;
  sceneNumber: string;
  propName: string;
  world: string;
  era: string;
  shortDescription: string;
  functionOnScreen: string;
  constraints: string;
  scriptText: string;
  dialogueCue?: string;
  actionCue?: string;
  suggestedMaterials: string[];
}

export interface AssetVersion {
  versionId: string; // e.g. 'v1.0-HERO', 'v1.1-STUNT', 'v2.0-SEQUEL'
  label: string; // e.g. 'Film 1 Hero Master', 'Stunt Urethane Casting', 'Sequel Upgrade (3-Yr Jump)'
  filmTitle: string;
  author: string;
  date: string;
  status: 'ACTIVE_HERO' | 'ARCHIVED' | 'STUNT_ACTIVE' | 'SEQUEL_PLANNED';
  changelog: string;
  scenesUsed: string[];
  stuntDuplicateRating?: string;
  checksum: string;
  isCurrent?: boolean;
}

export interface SceneUsageRecord {
  sceneId: string;
  sceneNumber: string; // e.g. 'SCENE 14'
  sceneSlug: string; // e.g. 'EXT. CYCLADES ARCHIPELAGO - DAWN'
  productionPhase: 'PRE_PRODUCTION' | 'PRINCIPAL_PHOTOGRAPHY' | 'POST_PRODUCTION_ARCHIVAL' | 'SEQUEL_REUSE';
  actionDescription: string;
  crewHandlingNotes: string;
  characterUsing: string;
  lightingCameraNotes: string;
  stuntVersionRequired?: boolean;
  archivalLocation?: string; // e.g. 'Stage 4 Vault A, Box #12'
}

export interface FranchiseContinuityBible {
  filmCanonBaseline: string;
  strictContinuityConstraints: string[];
  allowedSequelEvolutions: string[];
  sequelWarningAlerts: string[];
  previousFilmsReferences: {
    filmTitle: string;
    year: string;
    sceneOccurrences: string;
    keyMoments: string;
  }[];
}

export interface PropItem {
  id: string; // e.g. "ARF-00123"
  name: string;
  status: PropStatus;
  shortDescription: string;
  world: string;
  era: string;
  functionOnScreen: string;
  constraints: string;
  optionsCount: number;
  thumbnailUrl: string;
  referenceImages: ReferenceImage[];
  options: ConceptOption[];
  selectedOptionId?: string;
  decision?: SelectionDecision;
  finalAssets?: FinalAssetPackage;
  costEstUsd: number;
  timeEstDays: number;
  sceneNumber?: string;
  scriptExcerpt?: string;
  history?: HistoryLogEntry[];
  exportMetadata?: ExportMetadata;
  currentVersionId?: string;
  versions?: AssetVersion[];
  sceneUsageTimeline?: SceneUsageRecord[];
  franchiseContinuity?: FranchiseContinuityBible;
}

export type ActiveTab = 'catalogue' | 'brief' | 'options' | 'selection' | 'dossier' | 'registry';

export type PropViewMode = 'vitrine' | 'photo_artifact';

export interface ProductionProfile {
  projectName: string;
  worldLore: string;
  departmentRole: string;
  leadName: string;
  startMode: 'scratch' | 'demo';
}
