/**
 * studioApi.ts — DB-backed persistence for the studio UI (replaces localStorage).
 * Reads/writes the production profile and props slate via the App Backend API.
 */
import { PropItem, ProductionProfile } from '../types';
import { authHeader, handleUnauthorized } from './auth';

const BASE =
  (import.meta.env?.VITE_BACKEND_URL as string | undefined) || 'http://localhost:5000/api';

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { headers: authHeader() });
  if (res.status === 401) {
    handleUnauthorized();
    throw new Error(`GET ${path} unauthorized`);
  }
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`);
  return (await res.json()) as T;
}

async function putJson(path: string, body: unknown): Promise<void> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeader() },
    body: JSON.stringify(body),
  });
  if (res.status === 401) {
    handleUnauthorized();
    throw new Error(`PUT ${path} unauthorized`);
  }
  if (!res.ok) throw new Error(`PUT ${path} failed: ${res.status}`);
}

export function getStudioProfile(): Promise<ProductionProfile | null> {
  return getJson<ProductionProfile | null>('/studio/profile');
}

export function saveStudioProfile(profile: ProductionProfile): Promise<void> {
  return putJson('/studio/profile', profile);
}

export function getStudioProps(): Promise<PropItem[]> {
  return getJson<PropItem[]>('/studio/props');
}

export function saveStudioProps(list: PropItem[]): Promise<void> {
  return putJson('/studio/props', list);
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader() },
    body: JSON.stringify(body),
  });
  if (res.status === 401) {
    handleUnauthorized();
    throw new Error(`POST ${path} unauthorized`);
  }
  if (!res.ok) throw new Error(`POST ${path} failed: ${res.status}`);
  return (await res.json()) as T;
}

export interface CreatePropInput {
  name: string;
  shortDescription?: string;
  world?: string;
  era?: string;
  functionOnScreen?: string;
  constraints?: string;
  optionsCount?: number;
}

/**
 * Create a prop via the REAL agent pipeline (backend proxies to the agent-system,
 * which drives Agent Engine + Nano Banana image generation). Returns the created
 * record (status 'generating'); poll getProp(id) for progress + generated options.
 */
export function createProp(input: CreatePropInput): Promise<PropItem> {
  return postJson<PropItem>('/props', {
    name: input.name,
    description: input.shortDescription ?? '',
    shortDescription: input.shortDescription ?? '',
    world: input.world ?? '',
    era: input.era ?? '',
    functionOnScreen: input.functionOnScreen ?? '',
    constraints: input.constraints ?? '',
    n_options: input.optionsCount ?? 3,
  });
}

/** Fetch a single prop (backend refreshes it from the agent on read). */
export function getProp(id: string): Promise<PropItem> {
  return getJson<PropItem>(`/props/${encodeURIComponent(id)}`);
}

/**
 * Fetch ALL live props from the backend mirror (the authoritative record of every
 * prop created through the pipeline). The studio catalogue merges these on load so
 * generations always appear, independent of the browser-side slate.
 */
export function getLiveProps(): Promise<any[]> {
  return getJson<any[]>('/props');
}

/** Delete a live prop from the backend mirror so the removal persists. */
export async function deleteLiveProp(id: string): Promise<void> {
  const res = await fetch(`${BASE}/props/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: authHeader(),
  });
  if (res.status === 401) {
    handleUnauthorized();
    throw new Error('DELETE /props unauthorized');
  }
  if (!res.ok) throw new Error(`DELETE /props/${id} failed: ${res.status}`);
}

/** Gate 2 — record the chosen option (backend proxies to the agent + syncs). */
export function selectPropOption(id: string, optionId: string, why: string): Promise<any> {
  return postJson<any>(`/props/${encodeURIComponent(id)}/selection`, {
    chosen_option_id: optionId,
    chosen_by: 'Studio',
    why: why || 'Selected in studio review',
  });
}

/** Stage 3 — start final asset generation (turnarounds + build spec). */
export function finalizeProp(id: string): Promise<any> {
  return postJson<any>(`/props/${encodeURIComponent(id)}/finalize`, {});
}

/** Export the finished package to the asset library / DAM. */
export function exportProp(id: string): Promise<any> {
  return postJson<any>(`/props/${encodeURIComponent(id)}/export`, {});
}
