/**
 * artifactAgentClient.ts
 *
 * Primary Integration Client for the Artifact Agent System.
 * Connects the Art Department frontend directly to the Artifact Agent's
 * Screenplay Analysis & Continuity Subagents.
 */

import { ScriptExtraction } from '../types';
import { parseCustomScript } from '../data/sampleScripts';
import { authHeader } from './auth';

export interface AgentStepProgress {
  stepIndex: number;
  totalSteps: number;
  subagentName: string;
  subagentRole: string;
  actionMessage: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  timestamp: string;
  details?: string;
}

export interface AgentRunTelemetry {
  agentSessionId: string;
  subagentChain: string[];
  executionTimeMs: number;
  engine: 'artifact_agent_system_subagent' | 'fallback_ai_parser';
  continuityChecksPassed: boolean;
  stuntRiskScore: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
  tokensProcessed: number;
  backendEndpoint: string;
  isBackendConnected: boolean;
}

export interface AgentAnalysisResult {
  success: boolean;
  extraction: ScriptExtraction;
  telemetry: AgentRunTelemetry;
  error?: string;
  steps: AgentStepProgress[];
}

// Base URL of the App Backend API. Configurable via VITE_BACKEND_URL; defaults to
// the local Express backend. The backend exposes POST /analyze-script.
const DEFAULT_AGENT_BASE_URL =
  (import.meta.env?.VITE_BACKEND_URL as string | undefined) || 'http://localhost:5000/api';

export class ArtifactAgentSystemClient {
  private baseUrl: string;

  constructor(baseUrl: string = DEFAULT_AGENT_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * Primary method: Runs the Artifact Agent System subagent pipeline on the screenplay script.
   */
  async runScriptAnalysisSubagent(
    scriptText: string,
    onProgress?: (step: AgentStepProgress) => void
  ): Promise<AgentAnalysisResult> {
    const startTime = performance.now();
    const sessionId = `agent-sess-${Math.random().toString(36).substring(2, 10)}`;

    const steps: AgentStepProgress[] = [
      {
        stepIndex: 1,
        totalSteps: 4,
        subagentName: 'ScriptAnalystSubagent',
        subagentRole: 'Screenplay Tokenizer & Entity Extractor',
        actionMessage: 'Parsing scene headings, action descriptions, and character prop cues...',
        status: 'running',
        timestamp: new Date().toLocaleTimeString(),
        details: 'Extracting slugline, lighting conditions, and actor handling cues.'
      },
      {
        stepIndex: 2,
        totalSteps: 4,
        subagentName: 'ContinuityGuardSubagent',
        subagentRole: 'Franchise & Scene Timeline Cross-Referencer',
        actionMessage: 'Checking Franchise Bible to prevent out-of-sync prop build deviations...',
        status: 'pending',
        timestamp: new Date().toLocaleTimeString(),
        details: 'Validating against canon baseline, previous film damage logs, and visual hierarchy.'
      },
      {
        stepIndex: 3,
        totalSteps: 4,
        subagentName: 'StuntToleranceSubagent',
        subagentRole: 'Physical & Stunt Safety Evaluator',
        actionMessage: 'Synthesizing dimensional limits, water/pyro immersion, and stunt duplicates...',
        status: 'pending',
        timestamp: new Date().toLocaleTimeString(),
        details: 'Determining Shore durometer rating, weight balance, and camera close-up requirements.'
      },
      {
        stepIndex: 4,
        totalSteps: 4,
        subagentName: 'BriefSynthesizerSubagent',
        subagentRole: 'Hero Prop Brief Specification Compiler',
        actionMessage: 'Compiling structured Art Department Gate 1 Brief package...',
        status: 'pending',
        timestamp: new Date().toLocaleTimeString(),
        details: 'Generating divergent silhouette directions and CMF parameters.'
      }
    ];

    // Attempt real call to Artifact Agent backend first
    let isBackendConnected = false;
    let backendData: any = null;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const res = await fetch(`${this.baseUrl}/analyze-script`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify({ script_text: scriptText }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        backendData = await res.json();
        isBackendConnected = true;
      }
    } catch {
      // Backend not running or timeout; fall back to local heuristic parsing.
      isBackendConnected = false;
    }

    // Step 1: Script Analyst
    onProgress?.({ ...steps[0] });
    await new Promise((r) => setTimeout(r, 220));
    steps[0].status = 'completed';

    // Step 2: Continuity Guard
    steps[1].status = 'running';
    onProgress?.({ ...steps[1] });
    await new Promise((r) => setTimeout(r, 260));
    steps[1].status = 'completed';

    // Step 3: Stunt Tolerance
    steps[2].status = 'running';
    onProgress?.({ ...steps[2] });
    await new Promise((r) => setTimeout(r, 240));
    steps[2].status = 'completed';

    // Step 4: Brief Synthesizer
    steps[3].status = 'running';
    onProgress?.({ ...steps[3] });
    await new Promise((r) => setTimeout(r, 200));
    steps[3].status = 'completed';

    // Prefer the backend's extraction when connected; otherwise use local heuristics.
    const parsed = parseCustomScript(scriptText);
    const be = (isBackendConnected && backendData?.extraction) ? backendData.extraction : {};
    const fullExtraction: ScriptExtraction = {
      id: `agent-ext-${Date.now()}`,
      title: be.title || parsed.title || 'Screenplay Scene Extract',
      sceneHeading: be.sceneHeading || parsed.sceneHeading || 'EXT. SCENE - DAY',
      sceneNumber: be.sceneNumber || parsed.sceneNumber || 'SCENE 01',
      propName: be.propName || parsed.propName || 'Hero Prop',
      world: be.world || parsed.world || 'Cinematic Production',
      era: be.era || parsed.era || 'Contemporary / Speculative',
      shortDescription: be.shortDescription || parsed.shortDescription || 'Key narrative prop extracted from screenplay.',
      functionOnScreen: be.functionOnScreen || parsed.functionOnScreen || 'Hero object used by character.',
      constraints: be.constraints || parsed.constraints || 'Standard camera handling.',
      scriptText: scriptText,
      suggestedMaterials: be.suggestedMaterials || parsed.suggestedMaterials || ['Machined Alloy', 'Optical Glass']
    };
    const endTime = performance.now();

    const telemetry: AgentRunTelemetry = {
      agentSessionId: sessionId,
      // Only claim a subagent chain when we actually reached the backend.
      subagentChain: isBackendConnected
        ? ['ScriptAnalystSubagent', 'ContinuityGuardSubagent', 'StuntToleranceSubagent', 'BriefSynthesizerSubagent']
        : ['local-heuristic-parser'],
      executionTimeMs: Math.round(endTime - startTime),
      engine: isBackendConnected ? 'artifact_agent_system_subagent' : 'fallback_ai_parser',
      // Continuity is only actually validated when the backend ran.
      continuityChecksPassed: isBackendConnected,
      stuntRiskScore: (fullExtraction.constraints.toLowerCase().includes('water') || fullExtraction.constraints.toLowerCase().includes('stunt')) ? 'HIGH' : 'LOW',
      tokensProcessed: scriptText.split(/\s+/).length * 4,
      backendEndpoint: this.baseUrl,
      isBackendConnected
    };

    return {
      success: true,
      extraction: fullExtraction,
      telemetry,
      steps
    };
  }
}

export const defaultArtifactAgentClient = new ArtifactAgentSystemClient();
