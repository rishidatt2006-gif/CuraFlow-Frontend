// Central place for anything environment-specific.
//
// Defaults to the deployed Render backend, so this works out of the box
// with no setup. To point at a local backend instead (e.g. for backend
// development), expand "Backend API URL" on the login screen and enter
// http://localhost:8000/api/v1 — it overrides this default and persists
// in localStorage from then on. See README.md for details either way.

const API_BASE_KEY = "curaflow_api_base";
const DEFAULT_API_BASE = "https://curaflow-backend-pfrn.onrender.com/api/v1";

export function getApiBase() {
  return localStorage.getItem(API_BASE_KEY) || DEFAULT_API_BASE;
}

export function setApiBase(url) {
  const clean = url.trim().replace(/\/+$/, "");
  localStorage.setItem(API_BASE_KEY, clean);
}

export const STORAGE_KEYS = {
  access: "curaflow_access_token",
  refresh: "curaflow_refresh_token",
  user: "curaflow_user",
};
