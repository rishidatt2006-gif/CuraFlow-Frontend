import { DashboardApi, PatientsApi, DailyLogApi } from "../api.js";
import { setState, getState } from "../state.js";
import { navigate } from "../router.js";
import { openModal, closeModal, showToast, greeting, formatWeekday, formatDate, initials, escapeHtml } from "../ui.js";

export async function renderDashboardView() {
  const root = document.getElementById("view-root");
  const { user } = getState();
  root.innerHTML = `
    <div class="greeting-header mt-16">
      <h1>${greeting()}, ${escapeHtml((user?.fullname || "there").split(" ")[0])}</h1>
      <div class="muted">${formatWeekday()}</div>
    </div>
    <div class="skeleton-line" style="height:280px;"></div>
  `;

  let data, patients;
  try {
    [data, patients] = await Promise.all([DashboardApi.global(), PatientsApi.list().catch(() => null)]);
  } catch (err) {
    root.innerHTML = `<div class="field-error">${escapeHtml(err.message)}</div>`;
    return;
  }
  if (patients) setState({ patients: patients.patients });

  const { overview, today, recentPatients, recentReports } = data;

  // "On track" / "needs attention" isn't a field the backend gives us directly —
  // compute it the same honest way the patient list does: who has today's log.
  const statuses = await Promise.all(
    recentPatients.map((p) => DailyLogApi.today(p._id).then((log) => !!log).catch(() => null))
  );
  const onTrackCount = statuses.filter((s) => s === true).length;
  const attentionCount = statuses.filter((s) => s === false).length;

  const medicinePct = today.medicineSchedules
    ? Math.round((today.medicineCompleted / today.medicineSchedules) * 100)
    : null;

  root.innerHTML = `
    <div class="greeting-header mt-16">
      <div class="flex-between" style="align-items:flex-start;">
        <div>
          <h1>${greeting()}, ${escapeHtml((user?.fullname || "there").split(" ")[0])}</h1>
          <div class="muted">${formatWeekday()}</div>
        </div>
        <button class="btn btn-primary" id="log-today-btn">+ Log today's care</button>
      </div>
    </div>

    <div class="stat-grid">
      <div class="card stat-card">
        <span class="stat-card-icon">👥</span>
        <div class="num">${overview.totalPatients}</div>
        <div class="label">Total patients</div>
      </div>
      <div class="card stat-card">
        <span class="stat-card-icon">✅</span>
        <div class="num">${onTrackCount}/${recentPatients.length}</div>
        <div class="label">On track (of ${recentPatients.length} shown below)${attentionCount ? ` · ${attentionCount} need attention` : ""}</div>
      </div>
      <div class="card stat-card">
        <span class="stat-card-icon">💊</span>
        <div class="num">${medicinePct !== null ? medicinePct + "%" : "—"}</div>
        <div class="label">Medicine adherence today</div>
      </div>
      <div class="card stat-card">
        <span class="stat-card-icon">📁</span>
        <div class="num">${overview.reportsUploadedToday}</div>
        <div class="label">Reports uploaded today</div>
      </div>
    </div>

    <div class="two-col">
      <div class="card">
        <div class="flex-between" style="margin-bottom:14px;">
          <div class="section-title mb-0">Patient overview</div>
          <button class="btn-ghost btn-sm" id="see-all-patients">See all</button>
        </div>
        ${
          recentPatients.length
            ? recentPatients
                .map((p, i) => {
                  const logged = statuses[i];
                  const badgeClass = logged === null ? "badge--neutral" : logged ? "badge--ok" : "badge--warn";
                  const badgeLabel = logged === null ? "Unknown" : logged ? "✓ On-track" : "⚠ Attention";
                  return `
                <div class="patient-overview-row" data-open="${p._id}">
                  <span class="avatar-circle">${initials(p.fullname)}</span>
                  <div class="pr-main">
                    <div class="list-row-main">${escapeHtml(p.fullname)}</div>
                    <div class="list-row-sub">${escapeHtml(p.gender || "")}</div>
                  </div>
                  <span class="badge ${badgeClass}">${badgeLabel}</span>
                </div>`;
                })
                .join("")
            : `<div class="empty-state"><h3>No patients yet</h3><p>Add your first patient to get started.</p></div>`
        }
      </div>

      <div>
        <div class="card">
          <div class="section-title">Quick actions</div>
          <button class="quick-action-btn" id="qa-log">📋 Log today's care</button>
          <button class="quick-action-btn" id="qa-add-patient">➕ Add new patient</button>
          <button class="quick-action-btn" id="qa-summary">✨ View recovery summaries</button>
          <button class="quick-action-btn" id="qa-trends">📈 Check trends</button>
        </div>
        <div class="teaser-card">
          <div class="label">Recovery summaries</div>
          <p>AI-generated, evidence-backed overviews for any patient — never a diagnosis.</p>
          <button class="btn btn-primary btn-sm" id="qa-summary-2">Generate one →</button>
        </div>
      </div>
    </div>

    <div class="card mt-16">
      <div class="section-title">Recent reports</div>
      ${
        recentReports.length
          ? recentReports
              .map(
                (r) => `
          <div class="list-row">
            <div>
              <div class="list-row-main">${escapeHtml(r.reportName)}</div>
              <div class="list-row-sub">${escapeHtml(r.category)} · ${escapeHtml(r.patient?.fullname || "")} · ${formatDate(r.reportDate)}</div>
            </div>
            ${r.reportFile ? `<a class="btn btn-secondary btn-sm" href="${r.reportFile}" target="_blank" rel="noopener">View</a>` : ""}
          </div>`
              )
              .join("")
          : `<div class="muted">No reports uploaded yet.</div>`
      }
    </div>
  `;

  const patientList = patients?.patients || [];

  async function pickPatientThen(destinationFn) {
    if (!patientList.length) {
      showToast("Add a patient first", "error");
      return;
    }
    if (patientList.length === 1) {
      navigate(destinationFn(patientList[0]._id));
      return;
    }
    openModal(
      "Choose a patient",
      `<div id="patient-pick-list">${patientList
        .map((p) => `<div class="list-row" data-pick="${p._id}" style="cursor:pointer;"><div class="list-row-main">${escapeHtml(p.fullname)}</div></div>`)
        .join("")}</div>`
    );
    document.querySelectorAll("[data-pick]").forEach((el) => {
      el.addEventListener("click", () => {
        const id = el.getAttribute("data-pick");
        closeModal();
        navigate(destinationFn(id));
      });
    });
  }

  root.querySelector("#see-all-patients").addEventListener("click", () => navigate("/patients"));
  root.querySelectorAll("[data-open]").forEach((el) => {
    el.addEventListener("click", () => {
      const id = el.getAttribute("data-open");
      setState({ currentPatientId: id });
      navigate(`/patients/${id}/log`);
    });
  });
  root.querySelector("#log-today-btn").addEventListener("click", () => pickPatientThen((id) => `/patients/${id}/log`));
  root.querySelector("#qa-log").addEventListener("click", () => pickPatientThen((id) => `/patients/${id}/log`));
  root.querySelector("#qa-add-patient").addEventListener("click", () => navigate("/patients"));
  root.querySelector("#qa-summary").addEventListener("click", () => pickPatientThen((id) => `/patients/${id}/summary`));
  root.querySelector("#qa-summary-2").addEventListener("click", () => pickPatientThen((id) => `/patients/${id}/summary`));
  root.querySelector("#qa-trends").addEventListener("click", () => pickPatientThen((id) => `/patients/${id}/trends`));
}
