import { getApiBase, STORAGE_KEYS } from "./config.js";

// The backend accepts auth either as an httpOnly cookie or as a Bearer
// header (see src/middlewares/auth.middleware.js). Cookies are awkward
// across two different local origins (frontend on :3000, backend on
// :8000), so this client always uses the Bearer header instead — the
// login response returns the tokens in its JSON body for exactly this
// reason.

export function getAccessToken() {
  return localStorage.getItem(STORAGE_KEYS.access);
}

export function getRefreshToken() {
  return localStorage.getItem(STORAGE_KEYS.refresh);
}

export function getStoredUser() {
  const raw = localStorage.getItem(STORAGE_KEYS.user);
  return raw ? JSON.parse(raw) : null;
}

export function setSession({ accessToken, refreshToken, user }) {
  if (accessToken) localStorage.setItem(STORAGE_KEYS.access, accessToken);
  if (refreshToken) localStorage.setItem(STORAGE_KEYS.refresh, refreshToken);
  if (user) localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem(STORAGE_KEYS.access);
  localStorage.removeItem(STORAGE_KEYS.refresh);
  localStorage.removeItem(STORAGE_KEYS.user);
}

let refreshPromise = null;

async function refreshAccessToken() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) throw new Error("No refresh token available");

  const res = await fetch(`${getApiBase()}/users/refresh-token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(json?.message || "Session expired");

  setSession({
    accessToken: json.data.accessToken,
    refreshToken: json.data.refreshToken,
  });
  return json.data.accessToken;
}

/**
 * apiRequest("/patients", { method: "POST", body: {...} })
 * - body is JSON-stringified unless isForm is true (for file uploads,
 *   pass a FormData instance as body with isForm: true)
 * - returns the unwrapped `data` field of the backend's ApiResponse
 * - on a 401, tries exactly one silent refresh-and-retry before giving up
 */
export async function apiRequest(path, options = {}) {
  const { method = "GET", body = null, isForm = false, retry = true } = options;

  const headers = {};
  if (!isForm) headers["Content-Type"] = "application/json";
  const token = getAccessToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`${getApiBase()}${path}`, {
      method,
      headers,
      body: body ? (isForm ? body : JSON.stringify(body)) : undefined,
    });
  } catch (networkError) {
    throw new Error(
      "Can't reach the backend. Check the API URL and that the server is running."
    );
  }

  const json = await res.json().catch(() => null);

  if (res.status === 401 && retry && getRefreshToken()) {
    try {
      if (!refreshPromise) {
        refreshPromise = refreshAccessToken().finally(() => {
          refreshPromise = null;
        });
      }
      await refreshPromise;
      return apiRequest(path, { ...options, retry: false });
    } catch {
      clearSession();
      window.dispatchEvent(new CustomEvent("curaflow:session-expired"));
      throw new Error("Your session expired. Please log in again.");
    }
  }

  if (!res.ok) {
    throw new Error(json?.message || `Request failed (${res.status})`);
  }

  return json ? json.data : null;
}
