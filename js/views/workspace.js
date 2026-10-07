import {
  PatientsApi,
  DailyLogApi,
  VitalsApi,
  PhysiotherapyApi,
  PrescriptionsApi,
  ReportsApi,
} from "../api.js";
import { setState, getState } from "../state.js";
import { navigate } from "../router.js";
import { ageFromDOB, escapeHtml } from "../ui.js";

export async function renderWorkspaceView(patientId) {
  const root = document.getElementById("view-root");
  root.innerHTML = `<div class="skeleton-line" style="height:100px;"></div>`;

  let patient = getState().patients.find((p) => p._id === patientId);
  try {
    if (!patient) patient = await PatientsApi.get(patientId);
    setState({ currentPatientId: patientId });
  } catch (err) {
    root.innerHTML = `<div class="field-error">${escapeHtml(err.message)}</div>`;
    return;
  }

  const [todayLog, todayVital, todayPhysio, currentMeds, expiringMeds, reports] = await Promise.all([
    DailyLogApi.today(patientId).catch(() => null),
    VitalsApi.today(patientId).catch(() => null),
    PhysiotherapyApi.today(patientId).catch(() => null),
    PrescriptionsApi.current(patientId).catch(() => []),
    PrescriptionsApi.expiring(patientId, 7).catch(() => []),
    ReportsApi.list(patientId, { limit: 1 }).catch(() => null),
  ]);

  const age = ageFromDOB(patient.dateOfBirth);
  const logDone = !!todayLog;

  const banner = logDone
    ? ""
    : `
    <div class="banner">
      <div class="banner-text">Today's care hasn't been logged yet for ${escapeHtml(patient.fullname)}.</div>
      <button class="btn btn-primary" id="log-cta">Log today's care</button>
    </div>`;

  const tiles = [
    tile({
      href: `/patients/${patientId}/log`,
      icon: "📋",
      name: "Daily log",
      status: logDone ? "ok" : "warn",
      meta: logDone ? "Logged today" : "Not logged yet",
    }),
    tile({
      href: `/patients/${patientId}/vitals`,
      icon: "❤",
      name: "Vitals",
      status: todayVital ? "ok" : "warn",
      meta: todayVital ? "Recorded today" : "No reading today",
    }),
    tile({
      href: `/patients/${patientId}/physiotherapy`,
      icon: "🤸",
      name: "Physiotherapy",
      status: todayPhysio ? "ok" : "warn",
      meta: todayPhysio ? "Session logged today" : "No session today",
    }),
    tile({
      href: `/patients/${patientId}/prescriptions`,
      icon: "💊",
      name: "Prescriptions",
      status: expiringMeds?.length ? "warn" : "neutral",
      meta: expiringMeds?.length
        ? `${expiringMeds.length} expiring within 7 days`
        : `${currentMeds?.length || 0} current medicine${currentMeds?.length === 1 ? "" : "s"}`,
    }),
    tile({
      href: `/patients/${patientId}/reports`,
      icon: "📁",
      name: "Reports",
      status: "neutral",
      meta: `${reports?.pagination?.total ?? 0} on file`,
    }),
    tile({
      href: `/patients/${patientId}/summary`,
      icon: "✨",
      name: "AI recovery summary",
      status: "neutral",
      meta: "Explainable, evidence-backed overview",
    }),
  ].join("");

  root.innerHTML = `
    <div class="flex-between mt-16" style="margin-bottom:18px; align-items:flex-start;">
      <div>
        <h1 style="font-size:20px;">${escapeHtml(patient.fullname)}</h1>
        <div class="muted">
          ${age !== null ? age + " yrs · " : ""}${escapeHtml(patient.gender || "")}${patient.bloodGroup ? " · " + patient.bloodGroup : ""}
        </div>
      </div>
      <button class="btn btn-secondary btn-sm" id="dashboard-link">This week's dashboard →</button>
    </div>
    ${banner}
    <div class="tile-grid">${tiles}</div>
  `;

  root.querySelector("#dashboard-link").addEventListener("click", () => navigate(`/patients/${patientId}/dashboard`));
  root.querySelector("#log-cta")?.addEventListener("click", () => navigate(`/patients/${patientId}/log`));
  root.querySelectorAll("[data-href]").forEach((el) => {
    el.addEventListener("click", () => navigate(el.getAttribute("data-href")));
  });
}

function tile({ href, icon, name, status, meta }) {
  return `
    <button class="tile tile--${status}" data-href="${href}">
      <div class="tile-top">
        <span class="tile-icon">${icon}</span>
        <span class="status-dot status-dot--${status}"></span>
      </div>
      <span class="tile-name">${name}</span>
      <span class="tile-meta">${meta}</span>
    </button>`;
}
