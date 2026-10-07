import { PatientsApi, DailyLogApi } from "../api.js";
import { setState, getState } from "../state.js";
import { navigate } from "../router.js";
import { openModal, closeModal, showToast, ageFromDOB, initials, escapeHtml } from "../ui.js";

export async function renderPatientsView() {
  const root = document.getElementById("view-root");
  root.innerHTML = `
    <div class="flex-between mt-16" style="margin-bottom:18px;">
      <h1 style="font-size:20px;">My patients</h1>
      <button class="btn btn-primary" id="add-patient-btn">+ Add patient</button>
    </div>
    <div id="patients-list">
      <div class="skeleton-line" style="width:100%;height:64px;"></div>
      <div class="skeleton-line" style="width:100%;height:64px;"></div>
    </div>
  `;

  root.querySelector("#add-patient-btn").addEventListener("click", openAddPatientModal);

  try {
    const data = await PatientsApi.list();
    setState({ patients: data.patients });
    await renderList(data.patients);
  } catch (err) {
    root.querySelector("#patients-list").innerHTML = `<div class="field-error">${escapeHtml(err.message)}</div>`;
  }
}

async function renderList(patients) {
  const listEl = document.getElementById("patients-list");

  if (!patients.length) {
    listEl.innerHTML = `
      <div class="empty-state card">
        <h3>No patients yet</h3>
        <p>Add the first patient you're caring for to start logging their care.</p>
      </div>`;
    return;
  }

  // A quick, best-effort "logged today?" check per patient, so the list
  // reflects the glanceable, color-coded status the design calls for.
  const statuses = await Promise.all(
    patients.map((p) => DailyLogApi.today(p._id).then((log) => !!log).catch(() => null))
  );

  listEl.innerHTML = `<div class="tile-grid">${patients
    .map((p, i) => {
      const logged = statuses[i];
      const statusClass = logged === null ? "tile--neutral" : logged ? "tile--ok" : "tile--warn";
      const statusLabel = logged === null ? "Status unknown" : logged ? "Logged today" : "Not logged yet";
      const badgeClass = logged === null ? "badge--neutral" : logged ? "badge--ok" : "badge--warn";
      const age = ageFromDOB(p.dateOfBirth);
      // A plain div (not a <button>) because it now contains its own delete
      // button — real <button> elements can't nest inside each other.
      return `
        <div class="tile ${statusClass}" data-open="${p._id}" role="button" tabindex="0" aria-label="Open ${escapeHtml(p.fullname)}'s daily log">
          <div class="tile-top">
            <span class="avatar-circle">${initials(p.fullname)}</span>
            <div style="display:flex; align-items:center; gap:6px;">
              <span class="badge ${badgeClass}">${statusLabel}</span>
              <button type="button" class="tile-delete-btn" data-delete="${p._id}" data-delete-name="${escapeHtml(p.fullname)}" aria-label="Delete ${escapeHtml(p.fullname)}">🗑</button>
            </div>
          </div>
          <span class="tile-name">${escapeHtml(p.fullname)}</span>
          <div class="tile-meta">${age !== null ? age + " yrs · " : ""}${escapeHtml(p.gender || "")}${p.bloodGroup ? " · " + p.bloodGroup : ""}</div>
        </div>`;
    })
    .join("")}</div>`;

  // Clicking a patient goes straight to today's care log — the single most
  // time-pressured caregiver task — rather than a neutral overview screen.
  listEl.querySelectorAll(".tile").forEach((tile) => {
    const id = tile.getAttribute("data-open");
    const activate = () => {
      setState({ currentPatientId: id });
      navigate(`/patients/${id}/log`);
    };
    tile.addEventListener("click", (e) => {
      if (e.target.closest("[data-delete]")) return; // delete button handles its own click
      activate();
    });
    tile.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        activate();
      }
    });
  });

  // Two-step delete (click once to arm, click again within a few seconds to
  // confirm) instead of either an unconfirmed single click or a full modal.
  listEl.querySelectorAll("[data-delete]").forEach((btn) => {
    let revertTimer = null;
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (btn.dataset.confirming === "true") {
        clearTimeout(revertTimer);
        deletePatient(btn.getAttribute("data-delete"));
        return;
      }
      btn.dataset.confirming = "true";
      btn.textContent = "✕";
      btn.classList.add("is-confirming");
      btn.setAttribute("aria-label", `Confirm delete ${btn.dataset.deleteName}`);
      revertTimer = setTimeout(() => {
        btn.dataset.confirming = "false";
        btn.textContent = "🗑";
        btn.classList.remove("is-confirming");
        btn.setAttribute("aria-label", `Delete ${btn.dataset.deleteName}`);
      }, 3000);
    });
  });
}

async function deletePatient(id) {
  try {
    await PatientsApi.remove(id);
    showToast("Patient removed", "success");
    renderPatientsView();
  } catch (err) {
    showToast(err.message, "error");
  }
}

function openAddPatientModal() {
  openModal(
    "Add patient",
    `
    <div id="add-patient-error"></div>
    <form id="add-patient-form">
      <div class="field">
        <label>Full name</label>
        <input type="text" id="ap-fullname" required />
      </div>
      <div class="form-row">
        <div class="field">
          <label>Date of birth</label>
          <input type="date" id="ap-dob" required />
        </div>
        <div class="field">
          <label>Gender</label>
          <select id="ap-gender" required>
            <option value="">Select</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="field">
          <label>Blood group</label>
          <select id="ap-blood">
            <option value="">Unknown</option>
            ${["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((g) => `<option>${g}</option>`).join("")}
          </select>
        </div>
        <div class="field">
          <label>Contact number</label>
          <input type="tel" id="ap-contact" />
        </div>
      </div>
      <div class="field">
        <label>Allergies (comma separated)</label>
        <input type="text" id="ap-allergies" placeholder="Dust, Penicillin" />
      </div>
      <div class="field mb-0">
        <label>Notes</label>
        <textarea id="ap-notes"></textarea>
      </div>
      <div class="modal-actions">
        <button type="button" class="btn btn-secondary" data-close-modal>Cancel</button>
        <button type="submit" class="btn btn-primary" id="ap-submit">Add patient</button>
      </div>
    </form>
  `
  );

  document.getElementById("add-patient-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const errorBox = document.getElementById("add-patient-error");
    const submitBtn = document.getElementById("ap-submit");
    const payload = {
      fullname: document.getElementById("ap-fullname").value.trim(),
      dateOfBirth: document.getElementById("ap-dob").value,
      gender: document.getElementById("ap-gender").value,
      bloodGroup: document.getElementById("ap-blood").value || undefined,
      contactNumber: document.getElementById("ap-contact").value.trim() || undefined,
      allergies: document
        .getElementById("ap-allergies")
        .value.split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      notes: document.getElementById("ap-notes").value.trim(),
    };

    submitBtn.disabled = true;
    submitBtn.textContent = "Adding…";
    try {
      await PatientsApi.create(payload);
      closeModal();
      showToast("Patient added", "success");
      renderPatientsView();
    } catch (err) {
      errorBox.innerHTML = `<div class="field-error">${escapeHtml(err.message)}</div>`;
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Add patient";
    }
  });
}
