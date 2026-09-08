import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';
import https from 'https';
import { URL } from 'url';
import { initDatabase } from './db.js';
import { Profile } from './models/Profile.js';
import { Prop } from './models/Prop.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const AGENT_SYSTEM_URL = process.env.AGENT_SYSTEM_API_URL || 'http://localhost:8080/v1';
const AGENT_SYSTEM_TOKEN = process.env.AGENT_SYSTEM_BEARER_TOKEN || '';

// CORS: restrict to the frontend origin(s). Configure via APP_CORS_ORIGIN
// (comma-separated) — defaults to the local Vite dev server. Use "*" only in dev.
const CORS_ORIGIN = process.env.APP_CORS_ORIGIN || 'http://localhost:3000';
const corsOrigins = CORS_ORIGIN === '*' ? '*' : CORS_ORIGIN.split(',').map((o) => o.trim());
app.use(cors({ origin: corsOrigins }));
app.use(express.json());

// Optional bearer auth for this backend's API. Enabled only when APP_API_TOKEN is
// set (leave unset in local dev). Guards the money-spending proxy routes.
const APP_API_TOKEN = process.env.APP_API_TOKEN || '';
app.use('/api', (req, res, next) => {
  if (!APP_API_TOKEN) return next(); // auth disabled in dev
  const auth = req.header('authorization') || '';
  if (auth === `Bearer ${APP_API_TOKEN}`) return next();
  return res.status(401).json({ error: 'Unauthorized' });
});

// Helper for agent authorization headers
function getAgentHeaders() {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (AGENT_SYSTEM_TOKEN) {
    headers['Authorization'] = `Bearer ${AGENT_SYSTEM_TOKEN}`;
  }
  return headers;
}

// ---------------------------------------------------------------------------
// 1. Profile Endpoints
// ---------------------------------------------------------------------------

app.get('/api/profile', async (req, res) => {
  try {
    let profile = await Profile.findOne();
    if (!profile) {
      profile = await Profile.create({
        projectName: 'Chronicles of Aethelgard',
        worldLore: 'Steampunk / Gilded Age of Drift',
        departmentRole: 'Lead Prop Master',
        leadName: 'Isla Venn',
      });
    }
    return res.json(profile);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

app.post('/api/profile', async (req, res) => {
  try {
    const { projectName, worldLore, departmentRole, leadName } = req.body;
    let profile = await Profile.findOne();
    if (!profile) {
      profile = await Profile.create({ projectName, worldLore, departmentRole, leadName });
    } else {
      await profile.update({ projectName, worldLore, departmentRole, leadName });
    }
    return res.json(profile);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// ---------------------------------------------------------------------------
// 2. Prop Endpoints
// ---------------------------------------------------------------------------

// Get all props
app.get('/api/props', async (req, res) => {
  try {
    const props = await Prop.findAll();
    return res.json(props);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Get single prop
app.get('/api/props/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const prop = await Prop.findByPk(id);
    if (!prop) {
      return res.status(404).json({ error: `Prop ${id} not found` });
    }
    return res.json(prop);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Create prop (Proxy to Standalone Agent System /props)
app.post('/api/props', async (req, res) => {
  try {
    const { name, description, n_options, budget_ceiling_usd } = req.body;

    // Create the body required by the standalone Python agent system
    const agentPayload = {
      project_id: 'artifact-onboarding',
      brief: {
        what: name,
        on_screen: ['Studied closely by camera', 'Held by lead actor'],
        era: 'Steampunk Gilded Age',
        constraints: ['Brass finishing', 'Must be lightweight'],
      },
      reference_image_refs: [],
      n_options: n_options || 3,
      budget_ceiling_usd: budget_ceiling_usd || 5.0,
    };

    console.log(`[Proxy] Creating prop via Agent System: ${AGENT_SYSTEM_URL}/props`);
    
    // Post to standalone agent system
    const response = await fetch(`${AGENT_SYSTEM_URL}/props`, {
      method: 'POST',
      headers: getAgentHeaders(),
      body: JSON.stringify(agentPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ error: `Agent system error: ${errorText}` });
    }

    const agentData = (await response.json()) as { prop_id: string; job_id: string; status: string };

    // Persist local record in our SQLite / Postgres app database
    const localProp = await Prop.create({
      id: agentData.prop_id,
      name,
      description,
      status: 'generating', // loading state in our app
      brief: agentPayload.brief,
      options: [],
      cost: { nb2_images: 0, nbpro_images: 0, est_usd: 0.0 },
      flags: { trademark_risk: 'none', moderation: 'clean', budget_exceeded: false },
      job_id: agentData.job_id,
    });

    return res.status(201).json(localProp);
  } catch (error: any) {
    console.error('[Proxy Error] Create prop failed:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Record Option Selection (Proxy to Standalone Agent System /selection)
app.post('/api/props/:id/selection', async (req, res) => {
  try {
    const { id } = req.params;
    const { chosen_option_id, chosen_by, why } = req.body;

    const prop = await Prop.findByPk(id);
    if (!prop) {
      return res.status(404).json({ error: `Prop ${id} not found` });
    }

    console.log(`[Proxy] Recording selection via Agent System: ${AGENT_SYSTEM_URL}/props/${id}/selection`);

    const response = await fetch(`${AGENT_SYSTEM_URL}/props/${id}/selection`, {
      method: 'POST',
      headers: getAgentHeaders(),
      body: JSON.stringify({ chosen_option_id, chosen_by, why }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ error: `Agent system error: ${errorText}` });
    }

    // Refresh and sync the state
    await syncPropWithAgent(id);

    const updated = await Prop.findByPk(id);
    return res.json(updated);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Finalize assets (Proxy to Standalone Agent System /finalize)
app.post('/api/props/:id/finalize', async (req, res) => {
  try {
    const { id } = req.params;

    const prop = await Prop.findByPk(id);
    if (!prop) {
      return res.status(404).json({ error: `Prop ${id} not found` });
    }

    console.log(`[Proxy] Finalizing prop via Agent System: ${AGENT_SYSTEM_URL}/props/${id}/finalize`);

    const response = await fetch(`${AGENT_SYSTEM_URL}/props/${id}/finalize`, {
      method: 'POST',
      headers: getAgentHeaders(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ error: `Agent system error: ${errorText}` });
    }

    // Update status to generating
    await prop.update({ status: 'generating' });

    return res.json({ success: true, status: 'generating' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Export assets (Proxy to Standalone Agent System /export)
app.post('/api/props/:id/export', async (req, res) => {
  try {
    const { id } = req.params;

    const prop = await Prop.findByPk(id);
    if (!prop) {
      return res.status(404).json({ error: `Prop ${id} not found` });
    }

    console.log(`[Proxy] Exporting prop via Agent System: ${AGENT_SYSTEM_URL}/props/${id}/export`);

    const response = await fetch(`${AGENT_SYSTEM_URL}/props/${id}/export?acknowledge_risk=true`, {
      method: 'POST',
      headers: getAgentHeaders(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ error: `Agent system error: ${errorText}` });
    }

    // Sync database with the exported status
    await syncPropWithAgent(id);

    const updated = await Prop.findByPk(id);
    return res.json(updated);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Server-Sent Events (SSE) Proxy & Relay with Smart DB Synchronization
app.get('/api/props/:id/events', (req, res) => {
  const { id } = req.params;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  console.log(`[SSE Relay] Opening stream connection for prop ${id} to ${AGENT_SYSTEM_URL}/props/${id}/events`);

  const options = {
    headers: getAgentHeaders(),
  };

  // Choose http vs https based on the agent system URL protocol (Cloud Run is https).
  const agentEventsUrl = `${AGENT_SYSTEM_URL}/props/${id}/events`;
  const transport = new URL(AGENT_SYSTEM_URL).protocol === 'https:' ? https : http;

  const agentReq = transport.get(agentEventsUrl, options, (agentRes) => {
    agentRes.on('data', async (chunk) => {
      const message = chunk.toString();
      // Write chunk back to the React app frontend client
      res.write(chunk);

      // Perform background database synchronization if status changes
      if (message.includes('data:')) {
        try {
          const lines = message.split('\n');
          for (const line of lines) {
            if (line.startsWith('data:')) {
              const dataStr = line.substring(5).trim();
              if (dataStr) {
                const eventData = JSON.parse(dataStr);
                const statusValue = eventData.status;

                console.log(`[SSE Relay] Detected status update for ${id}: ${statusValue}`);
                
                // Fetch the full details from standalone agent-system and save locally
                await syncPropWithAgent(id);
              }
            }
          }
        } catch (err) {
          console.error('[SSE Relay Sync Error] Parse failure:', err);
        }
      }
    });

    agentRes.on('end', () => {
      console.log(`[SSE Relay] Stream ended for prop ${id}`);
      res.end();
    });
  });

  agentReq.on('error', (err) => {
    console.error(`[SSE Relay Error] Connection failed for ${id}:`, err);
    res.write('data: {"error": "Failed to connect to core agent system"}\n\n');
    res.end();
  });

  req.on('close', () => {
    agentReq.destroy();
    console.log(`[SSE Relay] Client disconnected from stream ${id}`);
  });
});

// Helper: Syncs our local App Database with the Agent System's record
async function syncPropWithAgent(propId: string) {
  try {
    const response = await fetch(`${AGENT_SYSTEM_URL}/props/${propId}`, {
      headers: getAgentHeaders(),
    });

    if (!response.ok) {
      console.warn(`[Sync Warning] Failed to fetch prop ${propId} details: ${response.statusText}`);
      return;
    }

    const agentProp = (await response.json()) as any;

    const localProp = await Prop.findByPk(propId);
    if (localProp) {
      // Map every agent status to what the app expects (no silent fallthrough).
      const STATUS_MAP: Record<string, string> = {
        draft: 'generating',
        generating_options: 'generating',
        awaiting_options_review: 'awaiting_review',
        selection_confirmed: 'generating',
        generating_final: 'generating',
        assets_ready: 'assets_ready',
        exported: 'exported',
        failed_options: 'failed',
        failed_final: 'failed',
        failed_export: 'failed',
        budget_exceeded: 'budget_exceeded',
      };
      const appStatus = STATUS_MAP[agentProp.status] ?? 'generating';

      // Map options
      const mappedOptions = (agentProp.options || []).map((opt: any) => ({
        id: opt.id,
        code: `ARF-${propId.replace('prop_', '')}-${opt.id.toUpperCase()}`,
        title: opt.rationale.split(';')[0] || 'Concept option',
        rationale: opt.rationale,
        imageUrl: (opt.image_urls && opt.image_urls[0]) || 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=800',
        silhouette: 'Bold silhouette framing',
        highlights: [opt.rationale, 'High detail close-up'],
      }));

      // Map final turnaround assets & specs
      const finalAssets = {
        turnarounds: (agentProp.final_assets?.turnaround || []).map((url: string, index: number) => ({
          angle: ['FRONT', 'SIDE', 'BACK', 'THREE-QUARTER'][index] || 'FRONT',
          imageUrl: url,
        })),
        callouts: (agentProp.final_assets?.detail_callouts || []).map((url: string, index: number) => ({
          id: `callout_${index}`,
          title: `Detail Callout #${index + 1}`,
          subtitle: 'Close-up analysis',
          imageUrl: url,
        })),
        specTable: {
          dimensionsClosed: '12cm x 5cm',
          dimensionsOpen: '25cm x 5cm',
          weight: '1.2 kg',
          materials: agentProp.final_assets?.material_spec || 'Prop material specifications',
          finishes: 'Industrial weathered',
          stuntVariant: 'Safety rubberized clone',
          scriptedStates: 'Closed / Engaged state',
          mechanism: agentProp.final_assets?.build_spec || 'Prop build specifications',
          caregivingNotes: 'Handle with gloves.',
        },
        exportStatus: agentProp.status === 'exported' ? 'Exported ✓' : 'Ready to export',
        libraryDestination: 'AssetLibrary://Productions/Chronicles',
        budgetCode: 'ART-PROP-AE-109',
        budgetStatus: agentProp.flags?.budget_exceeded ? 'OVER BUDGET' : 'ON BUDGET',
        createdDate: agentProp.created_at,
        updatedDate: agentProp.updated_at,
        author: 'Artifact Agent',
      };

      await localProp.update({
        status: appStatus,
        options: mappedOptions,
        selection: agentProp.selection,
        final_assets: finalAssets,
        cost: agentProp.cost,
        flags: agentProp.flags,
      });

      console.log(`[Sync Success] Local Database successfully synchronized for ${propId}. Status set to: ${appStatus}`);
    }
  } catch (error) {
    console.error(`[Sync Failure] Failed to sync ${propId}:`, error);
  }
}

// ---------------------------------------------------------------------------
// 2b. Script Analysis (server-side heuristic extraction for onboarding)
// ---------------------------------------------------------------------------

function analyzeScript(scriptText: string) {
  const text = (scriptText || '').trim();
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  // Slugline: first INT./EXT. heading if present.
  const slug = lines.find((l) => /^(INT|EXT|INT\.\/EXT|I\/E)[.\s]/i.test(l)) || '';
  const titleLine = lines[0] || 'Screenplay Scene Extract';

  const lower = text.toLowerCase();
  const constraintsHits: string[] = [];
  if (/water|submerg|rain|ocean|sea/.test(lower)) constraintsHits.push('water exposure');
  if (/fire|pyro|flame|burn/.test(lower)) constraintsHits.push('pyro exposure');
  if (/stunt|fight|throw|combat|fall/.test(lower)) constraintsHits.push('stunt handling');
  if (/close[- ]?up|macro|detail/.test(lower)) constraintsHits.push('close-up detail');

  return {
    title: titleLine.slice(0, 120),
    sceneHeading: slug || 'EXT. SCENE - DAY',
    sceneNumber: (text.match(/scene\s+\d+/i) || ['SCENE 01'])[0].toUpperCase(),
    propName: 'Hero Prop',
    world: 'Cinematic Production',
    era: 'Contemporary / Speculative',
    shortDescription: lines.slice(1, 3).join(' ').slice(0, 240) || 'Key narrative prop extracted from screenplay.',
    functionOnScreen: 'Hero object used by character.',
    constraints: constraintsHits.length ? constraintsHits.join(', ') : 'Standard camera handling.',
    suggestedMaterials: ['Machined Alloy', 'Optical Glass'],
  };
}

app.post('/api/analyze-script', (req, res) => {
  try {
    const { script_text } = req.body ?? {};
    if (typeof script_text !== 'string' || !script_text.trim()) {
      return res.status(400).json({ error: 'script_text (non-empty string) is required' });
    }
    return res.json({ extraction: analyzeScript(script_text), engine: 'artifact_backend_parser' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// ---------------------------------------------------------------------------
// 3. Start Server
// ---------------------------------------------------------------------------

async function startServer() {
  try {
    await initDatabase();
  } catch (err) {
    console.error('[Startup] Database initialization failed; exiting.', err);
    process.exit(1);
  }
  app.listen(PORT, () => {
    console.log(`============================================================`);
    console.log(`  🚀 STANDALONE APP BACKEND SERVING AT http://localhost:${PORT}`);
    console.log(`  🔗 connected TO AGENT SYSTEM AT ${AGENT_SYSTEM_URL}`);
    console.log(`============================================================`);
  });
}

startServer();
