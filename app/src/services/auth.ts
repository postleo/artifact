/**
 * auth.ts — client-side auth state for the studio app.
 *
 * The user logs in with a shared password; the backend verifies it and returns a
 * short-lived JWT. We store that JWT and send it as a Bearer token on every API
 * call. The password and the JWT signing secret never live in the frontend.
 */

const TOKEN_KEY = 'artifact_auth_token';

const BASE =
  (import.meta.env?.VITE_BACKEND_URL as string | undefined) || 'http://localhost:5000/api';

export function getToken(): string {
  try {
    return localStorage.getItem(TOKEN_KEY) || '';
  } catch {
    return '';
  }
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

/**
 * True only when a token exists AND (if it's a decodable JWT) it has not expired.
 * This prevents the confusing "logged-in but every API write silently 401s" state
 * that can happen after the 12h token expires — which previously caused
 * newly-created props to fail to save and vanish on reload.
 */
export function isAuthenticated(): boolean {
  const token = getToken();
  if (!token) return false;
  const parts = token.split('.');
  if (parts.length !== 3) return true; // non-JWT (e.g. the 'dev' token when auth is disabled)
  try {
    const json = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
    const payload = JSON.parse(json) as { exp?: number };
    if (typeof payload.exp === 'number') {
      // Treat as expired a minute early to avoid races on in-flight requests.
      return payload.exp * 1000 > Date.now() + 60_000;
    }
    return true;
  } catch {
    return true; // can't decode → don't lock the user out; the server still verifies
  }
}

/** Authorization header for API calls (empty object when not logged in). */
export function authHeader(): Record<string, string> {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

/** Exchange the shared password for a JWT. Throws on invalid password. */
export async function login(password: string): Promise<void> {
  const res = await fetch(`${BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
  if (!res.ok) {
    throw new Error(res.status === 401 ? 'Invalid password' : `Login failed (${res.status})`);
  }
  const data = (await res.json()) as { token: string };
  setToken(data.token);
}

/**
 * Handle a 401 from any API call: clear the stale token and notify the app so it
 * can show the login screen again. Components listen for 'artifact-unauthorized'.
 */
export function handleUnauthorized(): void {
  clearToken();
  window.dispatchEvent(new CustomEvent('artifact-unauthorized'));
}
