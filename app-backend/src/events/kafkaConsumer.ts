// Type-only imports are fully erased at compile time, so they never cause a
// runtime `require('kafkajs')`. The concrete library is loaded lazily via a
// dynamic `import()` inside the enable path only (see `startPropEventConsumer`),
// so when KAFKA_ENABLED is false the package is never touched — and need not
// even be installed at runtime.
import type { Consumer, Kafka, EachMessagePayload } from 'kafkajs';
import { parsePropEvent, applyPropEvent } from './propEvents.js';

// The prop-event contract, parsing, status mapping and mirror-apply logic all
// live in ./propEvents.ts (the single source of truth shared with the PUSH
// webhook path in index.ts). This module owns only the Kafka transport.

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
// Module-level consumer state (single consumer per process).
// ---------------------------------------------------------------------------

let consumer: Consumer | null = null;
let running = false;
let stopping = false;

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
          // Shared apply: upserts the local mirror + broadcasts to SSE clients.
          // If persistence throws, the outer try/catch below keeps the loop alive.
          await applyPropEvent(event);
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
