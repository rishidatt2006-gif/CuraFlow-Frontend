import { PrescriptionsApi } from "../api.js";
import { getCurrentPatient } from "../state.js";
import { openModal, closeModal, showToast, formatDate, escapeHtml } from "../ui.js";

export async function renderPrescriptionsView(patientId) {
  const root = document.getElementById("view-root");
  const patient = getCurrentPatient();
  root.innerHTML = `<div class="skeleton-line" style="height:120px;"></div>`;

  const [current, expiring] = await Promise.all([
    PrescriptionsApi.current(patientId).catch(() => []),
    PrescriptionsApi.expiring(patientId, 7).catch(() => []),
  ]);

  root.innerHTML = `
    <div class="flex-between mt-16" style="margin-bottom:14px;">
      <h1 style="font-size:20px;">Prescriptions${patient ? " — " + escapeHtml(patient.fullname) : ""}</h1>
      <button class="btn btn-primary" id="add-rx-btn">+ Add prescription</button>
    </div>

    ${
      expiring.length
        ? `<div class="banner"><div class="banner-text">${expiring.length} medicine${expiring.length === 1 ? " is" : "s are"} expiring within 7 days.</div></div>`
        : ""
    }

    <div class="card">
      <div class="section-title">Current medicines</div>
      ${
        current.length
          ? current
              .map(
                (p) => `
          <div class="list-row">
            <div>
              <div class="list-row-main">${escapeHtml(p.medicineName)} · ${escapeHtml(p.dosage)}</div>
              <div class="list-row-sub">${escapeHtml(p.frequency)} · ${escapeHtml(p.route || "")}${p.doctorName ? " · " + escapeHtml(p.doctorName) : ""}</div>
            </div>
            <div class="muted">until ${formatDate(p.endDate)}</div>
          </div>`
              )
              .join("")
          : `<div class="empty-state"><h3>No current medicines</h3><p>Add a prescription to start tracking it.</p></div>`
      }
    </div>
  `;

  root.querySelector("#add-rx-btn").addEventListener("click", () => openAddModal(patientId));
}

function openAddModal(patientId) {
  openModal(
    "Add prescription",
    `
    <div id="rx-error"></div>
    <form id="rx-form">
      <div class="form-row">
        <div class="field"><label>Medicine name</label><input type="text" id="rx-name" required /></div>
        <div class="field"><label>Dosage</label><input type="text" id="rx-dosage" placeholder="10mg" required /></div>
      </div>
      <div class="form-row">
        <div class="field"><label>Frequency</label><input type="text" id="rx-frequency" placeholder="Once daily" required /></div>
        <div class="field"><label>Route</label><input type="text" id="rx-route" placeholder="Oral" /></div>
      </div>
      <div class="form-row">
        <div class="field"><label>Start date</label><input type="date" id="rx-start" required /></div>
        <div class="field"><label>End date</label><input type="date" id="rx-end" /></div>
      </div>
      <div class="field"><label>Doctor</label><input type="text" id="rx-doctor" /></div>
      <div class="field mb-0"><label>Instructions</label><textarea id="rx-instructions"></textarea></div>
      <div class="modal-actions">
        <button type="button" class="btn btn-secondary" data-close-modal>Cancel</button>
        <button type="submit" class="btn btn-primary" id="rx-submit">Add</button>
      </div>
    </form>
  `
  );

  document.getElementById("rx-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const errorBox = document.getElementById("rx-error");
    const submitBtn = document.getElementById("rx-submit");
    const payload = {
      medicineName: document.getElementById("rx-name").value.trim(),
      dosage: document.getElementById("rx-dosage").value.trim(),
      frequency: document.getElementById("rx-frequency").value.trim(),
      route: document.getElementById("rx-route").value.trim() || undefined,
      startDate: document.getElementById("rx-start").value,
      endDate: document.getElementById("rx-end").value || undefined,
      doctorName: document.getElementById("rx-doctor").value.trim() || undefined,
      instructions: document.getElementById("rx-instructions").value.trim() || undefined,
    };
    submitBtn.disabled = true;
    try {
      await PrescriptionsApi.create(patientId, payload);
      closeModal();
      showToast("Prescription added", "success");
      renderPrescriptionsView(patientId);
    } catch (err) {
      errorBox.innerHTML = `<div class="field-error">${escapeHtml(err.message)}</div>`;
      submitBtn.disabled = false;
    }
  });
}
