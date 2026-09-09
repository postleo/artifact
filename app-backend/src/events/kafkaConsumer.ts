// Type-only imports are fully erased at compile time, so they never cause a
// runtime `require('kafkajs')`. The concrete library is loaded lazily via a
// dynamic `import()` inside the enable path only (see `startPropEventConsumer`),
// so when KAFKA_ENABLED is false the package is never touched — and need not
// even be installed at runtime.
import type { Consumer, Kafka, EachMessagePayload } from 'kafkajs';
import { Prop } from '../models/Prop.js';
import * as sseHub from './sseHub.js';

// ---------------------------------------------------------------------------
// Shared event contract (MUST match the producer in the agent-system exactly).
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
 * The JSON message value published to the Kafka topic. Serialized as UTF-8 JSON,
 * keyed by `prop_id`. `revision` increases monotonically per prop_id starting at 1.
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
// Configuration (read lazily so importing this module has no side effects).
// ---------------------------------------------------------------------------

function isEnabled(): boolean {
  return String(process.env.KAFKA_ENABLED || '').toLowerCase() === 'true';
}

interface KafkaConfig {
  brokers: string[];
  apiKey: string;
  apiSecret: string;
  topic: string;
  groupId: string;
  securityProtocol: string;
  saslMechanism: string;
}

function readConfig(): KafkaConfig {
  return {
    brokers: (process.env.KAFKA_BOOTSTRAP_SERVERS || '')
      .split(',')
      .map((b) => b.trim())
      .filter(Boolean),
    apiKey: process.env.KAFKA_API_KEY || '',
    apiSecret: process.env.KAFKA_API_SECRET || '',
    topic: process.env.KAFKA_TOPIC || 'artifact.prop.events',
    groupId: process.env.KAFKA_CONSUMER_GROUP_ID || 'artifact-backend-prop-events',
    securityProtocol: (process.env.KAFKA_SECURITY_PROTOCOL || 'SASL_SSL').toUpperCase(),
    saslMechanism: (process.env.KAFKA_SASL_MECHANISM || 'PLAIN').toLowerCase(),
  };
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

function mapStatus(status: string): string {
  return STATUS_MAP[status as PropEventStatus] ?? 'generating';
}

// ---------------------------------------------------------------------------
// Module-level consumer state (single consumer per process).
// ---------------------------------------------------------------------------

let consumer: Consumer | null = null;
let running = false;
let stopping = false;

// Track the highest revision applied per prop so out-of-order / replayed
// messages never clobber newer state in the local mirror.
const lastRevision: Map<string, number> = new Map();

/**
 * Type-guard + parser for an incoming message value. Returns a validated
 * PropEvent or null if the payload is malformed (in which case we skip it).
 */
function parsePropEvent(raw: string | null): PropEvent | null {
  if (!raw) return null;
  let obj: any;
  try {
    obj = JSON.parse(raw);
  } catch {
    return null;
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

/**
 * Upsert the local Firestore mirror from a PropEvent and fan the event out to
 * connected SSE clients. Never throws: all failures are logged and swallowed so
 * a single bad message can never crash the consumer loop.
 */
async function handleEvent(event: PropEvent): Promise<void> {
  // Drop stale/replayed revisions for a prop we've already seen more recent state for.
  const seen = lastRevision.get(event.prop_id);
  if (seen !== undefined && event.revision > 0 && event.revision < seen) {
    console.log(
      `[KafkaConsumer] Skipping stale event for ${event.prop_id} (revision ${event.revision} < ${seen}).`
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

  try {
    const existing = await Prop.findByPk(event.prop_id);
    if (existing) {
      await existing.update(patch as any);
    } else {
      // Create a minimal mirror record; the REST sync path will backfill
      // richer detail (options, final assets, brief) on the next fetch.
      await Prop.create({
        id: event.prop_id,
        name: event.prop_id,
        description: '',
        ...patch,
      } as any);
    }
    if (event.revision > 0) lastRevision.set(event.prop_id, event.revision);
    console.log(
      `[KafkaConsumer] Applied event for ${event.prop_id}: ${event.status} -> ${appStatus} (rev ${event.revision}).`
    );
  } catch (err) {
    console.error(`[KafkaConsumer] Failed to persist event for ${event.prop_id}:`, err);
    // Fall through: we still broadcast so live UIs update even if the write failed.
  }

  // Broadcast the raw contract event to subscribed SSE clients.
  try {
    sseHub.broadcast(event.prop_id, event);
  } catch (err) {
    console.error(`[KafkaConsumer] Failed to broadcast event for ${event.prop_id}:`, err);
  }
}

/**
 * Start the prop lifecycle Kafka consumer.
 *
 * No-op unless `KAFKA_ENABLED=true`. The kafkajs client is imported lazily here
 * so that neither the package nor a Kafka connection is required when the
 * feature is disabled. All connection/consumption errors are logged and never
 * propagated to the caller, so server startup is never blocked by Kafka being
 * unavailable; kafkajs retries the connection internally.
 */
export async function startPropEventConsumer(): Promise<void> {
  if (!isEnabled()) {
    console.log('[KafkaConsumer] KAFKA_ENABLED is not true — prop event consumer disabled (no-op).');
    return;
  }
  if (running) {
    console.log('[KafkaConsumer] Consumer already running; ignoring duplicate start.');
    return;
  }

  const cfg = readConfig();
  if (cfg.brokers.length === 0) {
    console.error('[KafkaConsumer] KAFKA_ENABLED=true but KAFKA_BOOTSTRAP_SERVERS is empty — cannot start.');
    return;
  }

  try {
    // Lazy import: only load kafkajs when the feature is actually enabled.
    const { Kafka, logLevel } = await import('kafkajs');

    const kafka: Kafka = new Kafka({
      clientId: 'artifact-app-backend',
      brokers: cfg.brokers,
      ssl: cfg.securityProtocol === 'SASL_SSL' || cfg.securityProtocol === 'SSL',
      sasl:
        cfg.securityProtocol.startsWith('SASL') && cfg.apiKey
          ? {
              mechanism: cfg.saslMechanism as any, // 'plain' for Confluent Cloud API keys
              username: cfg.apiKey,
              password: cfg.apiSecret,
            }
          : undefined,
      logLevel: logLevel.WARN,
      retry: { retries: 8, initialRetryTime: 300 },
    });

    consumer = kafka.consumer({ groupId: cfg.groupId });
    stopping = false;

    // Rebalance/crash resilience: kafkajs surfaces fatal crashes on this event.
    consumer.on(consumer.events.CRASH, (e) => {
      console.error('[KafkaConsumer] Consumer crashed:', e.payload?.error);
      // If it was a non-restartable crash and we are not intentionally stopping,
      // attempt a delayed restart.
      if (!stopping && !e.payload?.restart) {
        running = false;
        const delayMs = 5000;
        console.log(`[KafkaConsumer] Attempting restart in ${delayMs}ms...`);
        setTimeout(() => {
          startPropEventConsumer().catch((err) =>
            console.error('[KafkaConsumer] Restart attempt failed:', err)
          );
        }, delayMs);
      }
    });

    await consumer.connect();
    await consumer.subscribe({ topic: cfg.topic, fromBeginning: false });
    running = true;

    console.log(
      `[KafkaConsumer] Connected. Subscribed to "${cfg.topic}" as group "${cfg.groupId}".`
    );

    await consumer.run({
      eachMessage: async ({ message }: EachMessagePayload) => {
        // Isolate every message: a failure here must never break the loop.
        try {
          const raw = message.value ? message.value.toString('utf8') : null;
          const event = parsePropEvent(raw);
          if (!event) {
            console.warn('[KafkaConsumer] Skipping malformed / unparseable message.');
            return;
          }
          await handleEvent(event);
        } catch (err) {
          console.error('[KafkaConsumer] Unexpected error handling message:', err);
        }
      },
    });
  } catch (err) {
    running = false;
    consumer = null;
    console.error('[KafkaConsumer] Failed to start consumer (server continues without live Kafka updates):', err);
  }
}

/**
 * Gracefully stop the consumer. Safe to call when it was never started (no-op).
 * Disconnects the kafkajs consumer so consumer-group rebalancing happens quickly
 * on shutdown.
 */
export async function stopPropEventConsumer(): Promise<void> {
  stopping = true;
  const c = consumer;
  consumer = null;
  running = false;
  if (!c) return;
  try {
    await c.disconnect();
    console.log('[KafkaConsumer] Consumer disconnected cleanly.');
  } catch (err) {
    console.error('[KafkaConsumer] Error during consumer shutdown:', err);
  }
}
