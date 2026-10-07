import { DashboardApi } from "../api.js";
import { navigate } from "../router.js";
import { ageFromDOB, formatDate, escapeHtml } from "../ui.js";

export async function renderPatientDashboardView(patientId) {
  const root = document.getElementById("view-root");
  root.innerHTML = `<div class="skeleton-line" style="height:180px;"></div>`;

  let data;
  try {
    data = await DashboardApi.patient(patientId);
  } catch (err) {
    root.innerHTML = `<div class="field-error">${escapeHtml(err.message)}</div>`;
    return;
  }

  const { patient, weeklySummary } = data;
  const { weeklyLog, currentPrescription, weeklyVitals, weeklyPhysiotherapy, weeklyReports } = weeklySummary;
  const age = ageFromDOB(patient.dateOfBirth);

  // weeklyLog rows don't carry a date field (the backend only selects the
  // health fields), so these are counts over "the last 7 days", not a
  // day-by-day breakdown — that's a real constraint of the endpoint, not
  // something worth faking with guessed dates.
  const daysLogged = weeklyLog.length;
  const medsDays = weeklyLog.filter((l) => l.medicinesTaken).length;
  const physioDays = weeklyLog.filter((l) => l.physiotherapyDone).length;
  const exerciseDays = weeklyLog.filter((l) => l.exerciseDone).length;
  const sleepValues = weeklyLog.map((l) => l.sleepHours).filter((v) => typeof v === "number");
  const avgSleep = sleepValues.length ? (sleepValues.reduce((a, b) => a + b, 0) / sleepValues.length).toFixed(1) : null;

  root.innerHTML = `
    <div class="mt-16" style="margin-bottom:6px;">
      <h1 style="font-size:20px;">${escapeHtml(patient.fullname)} — weekly dashboard</h1>
      <div class="muted">
        ${age !== null ? age + " yrs · " : ""}${escapeHtml(patient.gender || "")}${patient.bloodGroup ? " · " + patient.bloodGroup : ""}
      </div>
    </div>
    <button class="btn-ghost btn-sm" id="to-workspace" style="margin-bottom:18px;">← Back to workspace</button>

    <div class="card" style="margin-bottom:20px;">
      <div class="section-title">Last 7 days at a glance</div>
      <div class="based-on-body" style="padding:0;">
        <div class="based-on-stat"><div class="num">${daysLogged}/7</div><div class="label">Days logged</div></div>
        <div class="based-on-stat"><div class="num">${medsDays}/${daysLogged || 7}</div><div class="label">Medicines taken</div></div>
        <div class="based-on-stat"><div class="num">${physioDays}/${daysLogged || 7}</div><div class="label">Physiotherapy done</div></div>
        <div class="based-on-stat"><div class="num">${exerciseDays}/${daysLogged || 7}</div><div class="label">Exercise done</div></div>
        <div class="based-on-stat"><div class="num">${avgSleep !== null ? avgSleep + "h" : "—"}</div><div class="label">Average sleep</div></div>
      </div>
      ${daysLogged < 7 ? `<div class="muted mt-16" style="margin-bottom:0;">Only ${daysLogged} of the last 7 days have a log entry — the rest were never recorded, not zero.</div>` : ""}
    </div>

    <div class="card" style="margin-bottom:20px;">
      <div class="section-title">Current prescriptions</div>
      ${
        currentPrescription.length
          ? currentPrescription
              .map(
                (p) => `
          <div class="list-row">
            <div>
              <div class="list-row-main">${escapeHtml(p.medicineName)} · ${escapeHtml(p.dosage)}</div>
              <div class="list-row-sub">${escapeHtml(p.frequency)}</div>
            </div>
            <div class="muted">until ${formatDate(p.endDate)}</div>
          </div>`
              )
              .join("")
          : `<div class="muted">No active prescriptions.</div>`
      }
    </div>

    <div class="card" style="margin-bottom:20px;">
      <div class="section-title">Vitals this week</div>
      ${
        weeklyVitals.length
          ? weeklyVitals
              .map(
                (v) => `
          <div class="list-row">
            <div class="list-row-main">${formatDate(v.date)}</div>
            <div class="list-row-sub">
              ${v.bloodPressureSystolic ? `BP ${v.bloodPressureSystolic}/${v.bloodPressureDiastolic}` : ""}
              ${v.heartRate ? ` · HR ${v.heartRate}` : ""}
              ${v.oxygenSaturation ? ` · SpO₂ ${v.oxygenSaturation}%` : ""}
            </div>
          </div>`
              )
              .join("")
          : `<div class="muted">No vitals recorded this week.</div>`
      }
    </div>

    <div class="card" style="margin-bottom:20px;">
      <div class="section-title">Physiotherapy this week</div>
      ${
        weeklyPhysiotherapy.length
          ? weeklyPhysiotherapy
              .map(
                (s) => `
          <div class="list-row">
            <div class="list-row-main">${formatDate(s.date)}</div>
            <div class="list-row-sub">${s.exercises.length} exercise${s.exercises.length === 1 ? "" : "s"} logged</div>
          </div>`
              )
              .join("")
          : `<div class="muted">No sessions this week.</div>`
      }
    </div>

    <div class="card">
      <div class="section-title">Reports this week</div>
      ${
        weeklyReports.length
          ? weeklyReports
              .map(
                (r) => `
          <div class="list-row">
            <div>
              <div class="list-row-main">${escapeHtml(r.reportName)}</div>
              <div class="list-row-sub">${escapeHtml(r.category)} · ${formatDate(r.reportDate)}</div>
            </div>
            ${r.reportFile ? `<a class="btn btn-secondary btn-sm" href="${r.reportFile}" target="_blank" rel="noopener">View</a>` : ""}
          </div>`
              )
              .join("")
          : `<div class="muted">No reports uploaded this week.</div>`
      }
    </div>
  `;

  root.querySelector("#to-workspace").addEventListener("click", () => navigate(`/patients/${patientId}`));
}
