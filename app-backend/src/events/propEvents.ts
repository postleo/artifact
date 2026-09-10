// ---------------------------------------------------------------------------
// Shared prop-event module.
//
// This is the single source of truth for the prop lifecycle event contract and
// for applying an incoming event to the local Firestore mirror + fanning it out
// to connected SSE clients. It is consumed by BOTH delivery paths:
//   • the PUSH webhook route  POST /hooks/prop-event   (see index.ts)
//   • the PULL Kafka consumer                          (see kafkaConsumer.ts)
//
// Keeping the parse + apply logic here (rather than duplicated per transport)
// guarantees the two paths map statuses and upsert the mirror identically.
// ---------------------------------------------------------------------------

import { Prop } from '../models/Prop.js';
import * as sseHub from './sseHub.js';

// ---------------------------------------------------------------------------
// Event contract (MUST match the producer in the agent-system exactly).
// ---------------------------------------------------------------------------

/** The canonical set of lifecycle statuses carried on the wire. */
export type PropEventStatus =
  | 'draft'
  | 'generating_options'
  | 'options_ready'
  | 'selection_confirmed'
  | 'generating_final'
  | 'assets_ready'
  | 'exported'
  | 'failed_options'
  | 'failed_final'
  | 'failed_export'
  | 'budget_exceeded';

/**
 * The JSON message published to the Kafka topic (and POSTed to the webhook).
 * Serialized as UTF-8 JSON, keyed by `prop_id`. `revision` increases
 * monotonically per prop_id starting at 1.
 */
export interface PropEvent {
  schema_version: number;
  prop_id: string;
  status: PropEventStatus;
  job_id: string | null;
  cost: Record<string, unknown> | null;
  flags: Record<string, unknown> | null;
  revision: number;
  timestamp: string;
  source: string;
}

// ---------------------------------------------------------------------------
// Status mapping: agent lifecycle status -> the coarse status the app UI uses.
// Mirrors the mapping used by the REST sync path in index.ts.
// ---------------------------------------------------------------------------

const STATUS_MAP: Record<PropEventStatus, string> = {
  draft: 'generating',
  generating_options: 'generating',
  options_ready: 'awaiting_review',
  selection_confirmed: 'generating',
  generating_final: 'generating',
  assets_ready: 'assets_ready',
  exported: 'exported',
  failed_options: 'failed',
  failed_final: 'failed',
  failed_export: 'failed',
  budget_exceeded: 'budget_exceeded',
};

export function mapStatus(status: string): string {
  return STATUS_MAP[status as PropEventStatus] ?? 'generating';
}

// ---------------------------------------------------------------------------
// Parsing / validation.
// ---------------------------------------------------------------------------

/**
 * Type-guard + parser for an incoming event payload. Accepts either a raw JSON
 * string (Kafka message value) or an already-parsed object (Express-parsed
 * webhook body). Returns a validated PropEvent, or null if malformed.
 */
export function parsePropEvent(raw: unknown): PropEvent | null {
  if (raw === null || raw === undefined) return null;

  let obj: any = raw;
  if (typeof raw === 'string') {
    if (!raw.trim()) return null;
    try {
      obj = JSON.parse(raw);
    } catch {
      return null;
    }
  }

  if (!obj || typeof obj !== 'object') return null;
  if (typeof obj.prop_id !== 'string' || !obj.prop_id) return null;
  if (typeof obj.status !== 'string' || !obj.status) return null;

  const revision = typeof obj.revision === 'number' ? obj.revision : 0;
  return {
    schema_version: typeof obj.schema_version === 'number' ? obj.schema_version : 1,
    prop_id: obj.prop_id,
    status: obj.status,
    job_id: obj.job_id ?? null,
    cost: obj.cost ?? null,
    flags: obj.flags ?? null,
    revision,
    timestamp: typeof obj.timestamp === 'string' ? obj.timestamp : new Date().toISOString(),
    source: typeof obj.source === 'string' ? obj.source : 'agent-system',
  };
}

// ---------------------------------------------------------------------------
// Apply an event to the local mirror + broadcast to SSE clients.
// ---------------------------------------------------------------------------

// Track the highest revision applied per prop so out-of-order / replayed events
// (from either transport) never clobber newer state in the local mirror.
const lastRevision: Map<string, number> = new Map();

/**
 * Upsert the local Firestore mirror from a PropEvent and fan the event out to
 * connected SSE clients. Never throws for the broadcast step; a persistence
 * failure is surfaced to the caller so the webhook can return a 5xx and the
 * agent can retry, while the Kafka consumer swallows it to keep the loop alive.
 */
export async function applyPropEvent(event: PropEvent): Promise<void> {
  // Drop stale/replayed revisions for a prop we've already seen newer state for.
  const seen = lastRevision.get(event.prop_id);
  if (seen !== undefined && event.revision > 0 && event.revision < seen) {
    console.log(
      `[PropEvents] Skipping stale event for ${event.prop_id} (revision ${event.revision} < ${seen}).`
    );
    return;
  }

  const appStatus = mapStatus(event.status);

  // Build a patch containing only the fields the event actually carries.
  const patch: Record<string, unknown> = {
    status: appStatus,
    agent_status: event.status,
    last_event_revision: event.revision,
    last_event_at: event.timestamp,
  };
  if (event.job_id !== null) patch.job_id = event.job_id;
  if (event.cost !== null) patch.cost = event.cost;
  if (event.flags !== null) patch.flags = event.flags;

  const existing = await Prop.findByPk(event.prop_id);
  if (existing) {
    await existing.update(patch as any);
  } else {
    // Create a minimal mirror record; the REST sync path will backfill richer
    // detail (options, final assets, brief) on the next fetch.
    await Prop.create({
      id: event.prop_id,
      name: event.prop_id,
      description: '',
      ...patch,
    } as any);
  }
  if (event.revision > 0) lastRevision.set(event.prop_id, event.revision);
  console.log(
    `[PropEvents] Applied event for ${event.prop_id}: ${event.status} -> ${appStatus} (rev ${event.revision}).`
  );

  // Broadcast the raw contract event to subscribed SSE clients. A broadcast
  // failure must not fail the whole apply (the mirror is already updated).
  try {
    sseHub.broadcast(event.prop_id, event);
  } catch (err) {
    console.error(`[PropEvents] Failed to broadcast event for ${event.prop_id}:`, err);
  }
}
