import { ReportsApi } from "../api.js";
import { getCurrentPatient } from "../state.js";
import { openModal, closeModal, showToast, formatDate, escapeHtml } from "../ui.js";

const CATEGORIES = ["MRI", "CT", "XRay", "ECG", "CBC", "LFT", "KFT", "RBS", "Prescription", "Discharge Summary", "Other"];

export async function renderReportsView(patientId) {
  const root = document.getElementById("view-root");
  const patient = getCurrentPatient();
  root.innerHTML = `<div class="skeleton-line" style="height:120px;"></div>`;

  let data;
  try {
    data = await ReportsApi.list(patientId, { limit: 20 });
  } catch (err) {
    root.innerHTML = `<div class="field-error">${escapeHtml(err.message)}</div>`;
    return;
  }
  const reports = data?.reports || data || [];

  root.innerHTML = `
    <div class="flex-between mt-16" style="margin-bottom:14px;">
      <h1 style="font-size:20px;">Reports${patient ? " — " + escapeHtml(patient.fullname) : ""}</h1>
      <button class="btn btn-primary" id="upload-btn">+ Upload report</button>
    </div>

    <div class="card">
      ${
        reports.length
          ? reports
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
          : `<div class="empty-state"><h3>No reports yet</h3><p>Upload a scan, lab result, or discharge summary to keep it with this patient.</p></div>`
      }
    </div>
  `;

  root.querySelector("#upload-btn").addEventListener("click", () => openUploadModal(patientId));
}

function openUploadModal(patientId) {
  openModal(
    "Upload report",
    `
    <div id="report-error"></div>
    <form id="report-form">
      <div class="field">
        <label>Report file</label>
        <input type="file" id="rp-file" required />
      </div>
      <div class="form-row">
        <div class="field">
          <label>Category</label>
          <select id="rp-category" required>${CATEGORIES.map((c) => `<option>${c}</option>`).join("")}</select>
        </div>
        <div class="field">
          <label>Report date</label>
          <input type="date" id="rp-date" required />
        </div>
      </div>
      <div class="field"><label>Report name</label><input type="text" id="rp-name" required /></div>
      <div class="field mb-0"><label>Remarks</label><textarea id="rp-remarks"></textarea></div>
      <div class="modal-actions">
        <button type="button" class="btn btn-secondary" data-close-modal>Cancel</button>
        <button type="submit" class="btn btn-primary" id="rp-submit">Upload</button>
      </div>
    </form>
  `
  );

  document.getElementById("report-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const errorBox = document.getElementById("report-error");
    const submitBtn = document.getElementById("rp-submit");
    const fileInput = document.getElementById("rp-file");

    if (!fileInput.files.length) {
      errorBox.innerHTML = `<div class="field-error">Choose a file first.</div>`;
      return;
    }

    const formData = new FormData();
    formData.append("reportFile", fileInput.files[0]);
    formData.append("category", document.getElementById("rp-category").value);
    formData.append("reportDate", document.getElementById("rp-date").value);
    formData.append("reportName", document.getElementById("rp-name").value.trim());
    formData.append("remarks", document.getElementById("rp-remarks").value.trim());

    submitBtn.disabled = true;
    submitBtn.textContent = "Uploading…";
    try {
      await ReportsApi.create(patientId, formData);
      closeModal();
      showToast("Report uploaded", "success");
      renderReportsView(patientId);
    } catch (err) {
      errorBox.innerHTML = `<div class="field-error">${escapeHtml(err.message)}</div>`;
      submitBtn.disabled = false;
      submitBtn.textContent = "Upload";
    }
  });
}
