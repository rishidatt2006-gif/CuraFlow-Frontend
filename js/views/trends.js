import { VitalsApi, DailyLogApi, PhysiotherapyApi } from "../api.js";
import { getCurrentPatient } from "../state.js";
import { rangeToDates, escapeHtml } from "../ui.js";
import { renderLineChart, renderBarChart } from "../charts.js";

const RANGES = [
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "6months", label: "6 Months" },
  { value: "all", label: "All" },
];

const PAIN_TO_NUM = { None: 0, Mild: 1, Moderate: 2, Severe: 3 };

function shortDate(d) {
  return new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export async function renderTrendsView(patientId) {
  const root = document.getElementById("view-root");
  const patient = getCurrentPatient();
  let range = "week";

  root.innerHTML = `
    <div class="mt-16" style="margin-bottom:14px;">
      <h1 style="font-size:20px;">Trends${patient ? " — " + escapeHtml(patient.fullname) : ""}</h1>
      <div class="muted">Charted from this patient's logged vitals, medications and physiotherapy.</div>
    </div>
    <div class="segmented" id="range-segmented" style="margin-bottom:18px;">
      ${RANGES.map((r) => `<button type="button" data-value="${r.value}">${r.label}</button>`).join("")}
    </div>
    <div id="trends-output"></div>
  `;

  const segButtons = root.querySelectorAll("#range-segmented button");
  const syncSeg = () => segButtons.forEach((b) => b.classList.toggle("is-active", b.dataset.value === range));
  const load = async () => {
    syncSeg();
    await renderTrends(patientId, range);
  };
  segButtons.forEach((b) =>
    b.addEventListener("click", () => {
      range = b.dataset.value;
      load();
    })
  );
  load();
}

async function renderTrends(patientId, range) {
  const output = document.getElementById("trends-output");
  output.innerHTML = `<div class="skeleton-line" style="height:400px;"></div>`;

  const { startDate, endDate } = rangeToDates(range);
  let analytics, logs, physio;
  try {
    [analytics, logs, physio] = await Promise.all([
      VitalsApi.analytics(patientId, range),
      DailyLogApi.list(patientId, { startDate, endDate }),
      PhysiotherapyApi.list(patientId, { startDate, endDate }),
    ]);
  } catch (err) {
    output.innerHTML = `<div class="field-error">${escapeHtml(err.message)}</div>`;
    return;
  }

  // history comes back most-recent-first; charts read left-to-right chronologically.
  const history = (analytics.history || []).slice().reverse();
  const stat = analytics.summary;

  // Shaded bands are general resting-adult reference ranges, not a
  // diagnosis or a target tailored to this patient — labeled as such.
  const bpChart = renderLineChart({
    series: [
      { name: "Systolic", color: "#1F7A6C", points: history.map((h) => ({ x: shortDate(h.date), y: h.bloodPressureSystolic ?? null })) },
      { name: "Diastolic", color: "#C1652B", points: history.map((h) => ({ x: shortDate(h.date), y: h.bloodPressureDiastolic ?? null })) },
    ],
    bands: [
      { from: 90, to: 120, color: "#1F7A6C", label: "Typical systolic range" },
      { from: 60, to: 80, color: "#C1652B", label: "Typical diastolic range" },
    ],
  });
  const hrChart = renderLineChart({
    series: [{ name: "Heart rate", color: "#1F7A6C", points: history.map((h) => ({ x: shortDate(h.date), y: h.heartRate ?? null })) }],
    bands: [{ from: 60, to: 100, color: "#1F7A6C", label: "Typical resting range" }],
  });
  const spo2Chart = renderLineChart({
    series: [{ name: "SpO₂", color: "#2F8F5B", points: history.map((h) => ({ x: shortDate(h.date), y: h.oxygenSaturation ?? null })) }],
    bands: [{ from: 95, to: 100, color: "#2F8F5B", label: "Typical healthy range" }],
  });

  // One representative pain value per physiotherapy session: the worst
  // (highest) pain level logged across that session's exercises.
  const painSeries = physio.map((s) => {
    const worst = s.exercises.reduce((max, e) => Math.max(max, PAIN_TO_NUM[e.painLevel] ?? 0), 0);
    return { label: shortDate(s.date), value: worst };
  });
  const painChart = renderBarChart({
    labels: painSeries.map((p) => p.label),
    values: painSeries.map((p) => p.value),
    color: "#B8801E",
  });

  const daysLogged = logs.length;
  const medsTakenDays = logs.filter((l) => l.medicinesTaken).length;
  const adherencePct = daysLogged ? Math.round((medsTakenDays / daysLogged) * 100) : null;

  output.innerHTML = `
    <div class="card chart-card">
      <div class="chart-card-header">
        <div class="chart-card-title">Blood pressure</div>
        <div class="chart-card-meta">Latest: ${stat?.averageBloodPressure?.systolic ? `${Math.round(history[history.length - 1]?.bloodPressureSystolic ?? stat.averageBloodPressure.systolic)}/${Math.round(history[history.length - 1]?.bloodPressureDiastolic ?? stat.averageBloodPressure.diastolic)} mmHg` : "—"}</div>
      </div>
      ${bpChart}
      <div class="muted" style="font-size:11px; margin-top:6px;">Shaded bands are general resting-adult reference ranges, not a personalized target — discuss this patient's specific goals with their clinician.</div>
    </div>

    <div class="tile-grid">
      <div class="card chart-card">
        <div class="chart-card-header">
          <div class="chart-card-title">Heart rate</div>
          <div class="chart-card-meta">${stat?.averageHeartRate ? `Avg ${Math.round(stat.averageHeartRate)} bpm` : ""}</div>
        </div>
        ${hrChart}
      </div>
      <div class="card chart-card">
        <div class="chart-card-header">
          <div class="chart-card-title">SpO₂</div>
          <div class="chart-card-meta">${stat?.averageOxygenSaturation ? `Avg ${Math.round(stat.averageOxygenSaturation)}%` : ""}</div>
        </div>
        ${spo2Chart}
      </div>
    </div>

    <div class="card chart-card mt-16">
      <div class="chart-card-header">
        <div class="chart-card-title">Pain level (physiotherapy sessions)</div>
        <div class="chart-card-meta">0=None · 1=Mild · 2=Moderate · 3=Severe</div>
      </div>
      ${painChart}
    </div>

    <div class="card mt-16">
      <div class="flex-between mb-0" style="margin-bottom:10px;">
        <strong>Medication adherence</strong>
        <strong>${adherencePct !== null ? adherencePct + "%" : "—"}</strong>
      </div>
      <div class="progress-track"><div class="progress-fill" style="width:${adherencePct ?? 0}%;"></div></div>
      <div class="muted mt-16" style="margin-bottom:0;">
        ${daysLogged ? `Based on ${daysLogged} logged day${daysLogged === 1 ? "" : "s"} in this range` : "No daily logs in this range"}
        · Vitals logged: ${stat?.totalRecords ?? 0} readings · PT sessions: ${physio.length}
      </div>
    </div>
  `;
}
