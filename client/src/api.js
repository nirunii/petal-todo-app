import { demoApi } from './demoApi.js';

// True when the site was built as the GitHub Pages demo (no server, data kept in the browser).
export const DEMO = import.meta.env.VITE_DEMO === 'true';

// Thin wrapper around fetch: adds the login token and turns server errors into Error objects.
const TOKEN_KEY = 'petal_token';
export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t) => (t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY));

export async function api(path, { method = 'GET', body } = {}) {
  const token = getToken();
  if (DEMO) return demoApi(path, { method, body }, token);
  let res;
  try {
    res = await fetch('/api' + path, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error('Cannot reach the server. Check your connection and try again.');
  }
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401 && token) { setToken(null); window.location.assign('/login'); }
    throw new Error((data && data.error) || 'Request failed.');
  }
  return data;
}
