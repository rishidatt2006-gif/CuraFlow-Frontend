import { route, startRouter, navigate } from "./router.js";
import { setState } from "./state.js";
import { getStoredUser, getAccessToken, clearSession } from "./apiClient.js";
import { AuthApi } from "./api.js";
import { showToast } from "./ui.js";

import { renderAuthScreen } from "./views/auth.js";
import { renderSidebar, renderTopbar } from "./views/shell.js";
import { renderDashboardView } from "./views/dashboard.js";
import { renderPatientsView } from "./views/patients.js";
import { renderWorkspaceView } from "./views/workspace.js";
import { renderPatientDashboardView } from "./views/patientDashboard.js";
import { renderDailyLogView } from "./views/dailyLog.js";
import { renderTrendsView } from "./views/trends.js";
import { renderVitalsView } from "./views/vitals.js";
import { renderPhysiotherapyView } from "./views/physiotherapy.js";
import { renderPrescriptionsView } from "./views/prescriptions.js";
import { renderReportsView } from "./views/reports.js";
import { renderSummaryView } from "./views/summary.js";

function showAuth() {
  document.getElementById("auth-screen").hidden = false;
  document.getElementById("app-shell").hidden = true;
  renderAuthScreen(onLoginSuccess);
}

function showApp() {
  document.getElementById("auth-screen").hidden = true;
  document.getElementById("app-shell").hidden = false;
}

function currentPath() {
  return window.location.hash.replace(/^#/, "") || "/dashboard";
}

/** Wraps a view render function so every route also refreshes the sidebar/topbar. */
function withShell(title, renderFn, extractPatientId) {
  return async (params) => {
    setState({ currentPatientId: extractPatientId ? extractPatientId(params) : null });
    renderSidebar(currentPath());
    renderTopbar(title, handleLogout);
    await renderFn(params);
  };
}

route("/dashboard", withShell("Dashboard", renderDashboardView));
route("/patients", withShell("My patients", renderPatientsView));
route("/patients/:id", withShell("Workspace", (p) => renderWorkspaceView(p.id), (p) => p.id));
route(
  "/patients/:id/dashboard",
  withShell("Patient dashboard", (p) => renderPatientDashboardView(p.id), (p) => p.id)
);
route("/patients/:id/log", withShell("Daily log", (p) => renderDailyLogView(p.id), (p) => p.id));
route("/patients/:id/trends", withShell("Trends", (p) => renderTrendsView(p.id), (p) => p.id));
route("/patients/:id/vitals", withShell("Vitals history", (p) => renderVitalsView(p.id), (p) => p.id));
route(
  "/patients/:id/physiotherapy",
  withShell("Physiotherapy log", (p) => renderPhysiotherapyView(p.id), (p) => p.id)
);
route(
  "/patients/:id/prescriptions",
  withShell("Prescriptions", (p) => renderPrescriptionsView(p.id), (p) => p.id)
);
route("/patients/:id/reports", withShell("Reports", (p) => renderReportsView(p.id), (p) => p.id));
route("/patients/:id/summary", withShell("Recovery summary", (p) => renderSummaryView(p.id), (p) => p.id));

function onLoginSuccess(user) {
  setState({ user });
  showApp();
  startRouter();
  navigate("/dashboard");
}

async function handleLogout() {
  try {
    await AuthApi.logout();
  } catch {
    // Best-effort — the session is cleared locally regardless.
  }
  clearSession();
  setState({ user: null, patients: [], currentPatientId: null });
  showAuth();
}

window.addEventListener("curaflow:session-expired", () => {
  showToast("Your session expired — please log in again", "error");
  setState({ user: null, patients: [], currentPatientId: null });
  showAuth();
});

(function boot() {
  const storedUser = getStoredUser();
  const token = getAccessToken();
  if (storedUser && token) {
    setState({ user: storedUser });
    showApp();
    startRouter();
  } else {
    showAuth();
  }
})();
