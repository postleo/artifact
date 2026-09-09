import type { Response } from 'express';

/**
 * In-process registry of connected Server-Sent Events (SSE) clients.
 *
 * Clients subscribe to a single `prop_id` (to receive lifecycle events for one
 * prop) or to the wildcard channel `"*"` (to receive events for every prop).
 * The Kafka consumer (see `kafkaConsumer.ts`) calls {@link broadcast} whenever a
 * PropEvent is received; the hub fans that event out to every matching client.
 *
 * This is deliberately in-memory and per-process: it holds live HTTP response
 * handles which cannot be shared across processes. In a multi-instance
 * deployment each instance keeps its own set of connected clients, and each
 * instance independently consumes the Kafka topic, so every instance can serve
 * live updates to the browsers connected to it.
 */

/** Wildcard channel identifier: clients registered here receive all events. */
export const WILDCARD = '*';

/** Registry mapping a channel (prop_id or WILDCARD) to its connected responses. */
const channels: Map<string, Set<Response>> = new Map();

/**
 * Register an SSE client for a given prop id (or {@link WILDCARD} for all props).
 *
 * The caller is responsible for having already set the SSE response headers and
 * flushed them. This method installs a `close` handler on the underlying request
 * so the client is automatically removed when the connection drops.
 *
 * @param propId - The prop id to subscribe to, or `"*"` for every prop.
 * @param res - The Express response representing the open SSE connection.
 */
export function addClient(propId: string, res: Response): void {
  const channel = propId || WILDCARD;
  let set = channels.get(channel);
  if (!set) {
    set = new Set<Response>();
    channels.set(channel, set);
  }
  set.add(res);

  // Auto-clean up when the client disconnects.
  const cleanup = () => removeClient(channel, res);
  res.on('close', cleanup);
  res.on('error', cleanup);

  console.log(`[SSEHub] Client subscribed to "${channel}" (now ${set.size} on channel).`);
}

/**
 * Remove a previously-registered SSE client from a channel.
 *
 * Safe to call multiple times (idempotent). Empty channels are pruned.
 *
 * @param propId - The channel the client was registered under.
 * @param res - The Express response to remove.
 */
export function removeClient(propId: string, res: Response): void {
  const channel = propId || WILDCARD;
  const set = channels.get(channel);
  if (!set) return;
  if (set.delete(res)) {
    console.log(`[SSEHub] Client unsubscribed from "${channel}" (now ${set.size} on channel).`);
  }
  if (set.size === 0) channels.delete(channel);
}

/**
 * Serialize and write an event to a single SSE client, tolerating failures.
 *
 * @returns `true` if the write succeeded, `false` if the socket was gone.
 */
function writeEvent(res: Response, payload: string): boolean {
  try {
    // Skip clients whose socket has already been torn down.
    if (res.writableEnded || res.destroyed) return false;
    res.write(`data: ${payload}\n\n`);
    return true;
  } catch (err) {
    console.error('[SSEHub] Failed to write to client; dropping it.', err);
    return false;
  }
}

/**
 * Broadcast an event to every client subscribed to `propId` and to every
 * wildcard subscriber.
 *
 * The event object is serialized to JSON exactly once and written as a standard
 * SSE `data:` frame (`data: <json>\n\n`). Clients whose write fails are removed.
 *
 * @param propId - The prop id the event pertains to.
 * @param eventObj - Any JSON-serializable event payload.
 */
export function broadcast(propId: string, eventObj: unknown): void {
  let payload: string;
  try {
    payload = JSON.stringify(eventObj);
  } catch (err) {
    console.error('[SSEHub] Failed to serialize event; not broadcasting.', err);
    return;
  }

  const targets: Array<[string, Response]> = [];
  for (const channel of [propId, WILDCARD]) {
    const set = channels.get(channel);
    if (!set) continue;
    for (const res of set) targets.push([channel, res]);
  }

  for (const [channel, res] of targets) {
    if (!writeEvent(res, payload)) removeClient(channel, res);
  }
}

/**
 * Diagnostics helper: total number of currently connected clients across all
 * channels (a client subscribed to two channels counts once per channel).
 */
export function clientCount(): number {
  let total = 0;
  for (const set of channels.values()) total += set.size;
  return total;
}
