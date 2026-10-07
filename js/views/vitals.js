import { VitalsApi } from "../api.js";
import { getCurrentPatient } from "../state.js";
import { showToast, formatDate, todayISO, escapeHtml } from "../ui.js";

const FIELDS = [
  { key: "bloodPressureSystolic", label: "BP systolic" },
  { key: "bloodPressureDiastolic", label: "BP diastolic" },
  { key: "heartRate", label: "Heart rate (bpm)" },
  { key: "temperature", label: "Temperature (°C)", step: "0.1" },
  { key: "oxygenSaturation", label: "SpO₂ (%)" },
  { key: "bloodSugar", label: "Blood sugar (mg/dL)" },
  { key: "weight", label: "Weight (kg)", step: "0.1" },
];

export async function renderVitalsView(patientId) {
  const root = document.getElementById("view-root");
  const patient = getCurrentPatient();
  root.innerHTML = `<div class="skeleton-line" style="height:120px;"></div>`;

  const [today, weekly] = await Promise.all([
    VitalsApi.today(patientId).catch(() => null),
    VitalsApi.weekly(patientId).catch(() => []),
  ]);

  root.innerHTML = `
    <div class="mt-16" style="margin-bottom:14px;">
      <h1 style="font-size:20px;">Vitals${patient ? " — " + escapeHtml(patient.fullname) : ""}</h1>
    </div>

    <div class="card">
      <div class="section-title">${today ? "Update today's reading" : "Record today's reading"}</div>
      <div id="vitals-error"></div>
      <div class="form-row">
        ${FIELDS.map(
          (f) => `
          <div class="field">
            <label>${f.label}</label>
            <input type="number" step="${f.step || "1"}" id="v-${f.key}" value="${today?.[f.key] ?? ""}" />
          </div>`
        ).join("")}
      </div>
      <div class="field mb-0">
        <label>Notes</label>
        <textarea id="v-notes">${escapeHtml(today?.notes || "")}</textarea>
      </div>
      <button class="btn btn-primary mt-16" id="vitals-save">${today ? "Update" : "Save"} reading</button>
    </div>

    <div class="card mt-16">
      <div class="section-title">Last 7 days</div>
      ${
        weekly.length
          ? weekly
              .map(
                (v) => `
          <div class="list-row">
            <div>
              <div class="list-row-main">${formatDate(v.date)}</div>
              <div class="list-row-sub">
                ${v.bloodPressureSystolic ? `BP ${v.bloodPressureSystolic}/${v.bloodPressureDiastolic}` : ""}
                ${v.heartRate ? ` · HR ${v.heartRate}` : ""}
                ${v.oxygenSaturation ? ` · SpO₂ ${v.oxygenSaturation}%` : ""}
              </div>
            </div>
          </div>`
              )
              .join("")
          : `<div class="empty-state"><h3>No vitals this week</h3><p>Readings you record will show up here.</p></div>`
      }
    </div>
  `;

  document.getElementById("vitals-save").addEventListener("click", async () => {
    const btn = document.getElementById("vitals-save");
    const errorBox = document.getElementById("vitals-error");
    errorBox.innerHTML = "";
    const payload = { date: today?.date ? today.date.slice(0, 10) : todayISO() };
    for (const f of FIELDS) {
      const raw = document.getElementById(`v-${f.key}`).value;
      payload[f.key] = raw === "" ? undefined : parseFloat(raw);
    }
    payload.notes = document.getElementById("v-notes").value.trim();

    btn.disabled = true;
    try {
      if (today) await VitalsApi.update(today._id, payload);
      else await VitalsApi.create(patientId, payload);
      showToast("Vitals saved", "success");
      renderVitalsView(patientId);
    } catch (err) {
      errorBox.innerHTML = `<div class="field-error">${escapeHtml(err.message)}</div>`;
      btn.disabled = false;
    }
  });
}
