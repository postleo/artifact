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
