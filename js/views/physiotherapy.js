import { PhysiotherapyApi } from "../api.js";
import { getCurrentPatient } from "../state.js";
import { showToast, formatDate, todayISO, escapeHtml } from "../ui.js";

const PAIN_LEVELS = ["None", "Mild", "Moderate", "Severe"];
const DIFFICULTIES = ["Easy", "Moderate", "Difficult"];

export async function renderPhysiotherapyView(patientId) {
  const root = document.getElementById("view-root");
  const patient = getCurrentPatient();
  root.innerHTML = `<div class="skeleton-line" style="height:120px;"></div>`;

  const [today, weekly] = await Promise.all([
    PhysiotherapyApi.today(patientId).catch(() => null),
    PhysiotherapyApi.weekly(patientId).catch(() => []),
  ]);

  let exercises = today?.exercises?.length
    ? JSON.parse(JSON.stringify(today.exercises))
    : [{ exerciseName: "", duration: 15, completed: true, painLevel: "None", difficulty: "Easy" }];

  root.innerHTML = `
    <div class="mt-16" style="margin-bottom:14px;">
      <h1 style="font-size:20px;">Physiotherapy${patient ? " — " + escapeHtml(patient.fullname) : ""}</h1>
    </div>

    <div class="card">
      <div class="section-title">${today ? "Update today's session" : "Log today's session"}</div>
      <div id="exercise-rows"></div>
      <button class="btn btn-secondary btn-sm mt-16" id="add-exercise">+ Add exercise</button>

      <div class="field mt-16">
        <label>Session notes</label>
        <textarea id="pt-notes">${escapeHtml(today?.notes || "")}</textarea>
      </div>
      <div id="pt-error"></div>
      <button class="btn btn-primary" id="pt-save">${today ? "Update" : "Save"} session</button>
    </div>

    <div class="card mt-16">
      <div class="section-title">Last 7 days</div>
      ${
        weekly.length
          ? weekly
              .map(
                (s) => `
          <div class="list-row">
            <div>
              <div class="list-row-main">${formatDate(s.date)}</div>
              <div class="list-row-sub">${s.exercises.length} exercise${s.exercises.length === 1 ? "" : "s"} logged</div>
            </div>
          </div>`
              )
              .join("")
          : `<div class="empty-state"><h3>No sessions this week</h3><p>Sessions you log will show up here.</p></div>`
      }
    </div>
  `;

  function renderRows() {
    document.getElementById("exercise-rows").innerHTML = exercises
      .map(
        (ex, i) => `
        <div class="card" style="margin-bottom:10px; padding:14px;">
          <div class="form-row">
            <div class="field mb-0">
              <label>Exercise name</label>
              <input type="text" data-i="${i}" data-k="exerciseName" value="${escapeHtml(ex.exerciseName)}" />
            </div>
            <div class="field mb-0">
              <label>Duration (minutes)</label>
              <input type="number" data-i="${i}" data-k="duration" value="${ex.duration}" />
            </div>
          </div>
          <div class="form-row mt-16">
            <div class="field mb-0">
              <label>Pain level</label>
              <select data-i="${i}" data-k="painLevel">
                ${PAIN_LEVELS.map((p) => `<option ${p === ex.painLevel ? "selected" : ""}>${p}</option>`).join("")}
              </select>
            </div>
            <div class="field mb-0">
              <label>Difficulty</label>
              <select data-i="${i}" data-k="difficulty">
                ${DIFFICULTIES.map((d) => `<option ${d === ex.difficulty ? "selected" : ""}>${d}</option>`).join("")}
              </select>
            </div>
          </div>
          <div class="flex-between mt-16 mb-0">
            <label style="display:flex; align-items:center; gap:8px; font-size:13px; font-weight:600;">
              <button type="button" class="toggle${ex.completed ? " is-on" : ""}" data-i="${i}" data-k="completed"></button>
              Completed
            </label>
            ${exercises.length > 1 ? `<button type="button" class="btn-ghost btn-sm" data-remove="${i}">Remove</button>` : ""}
          </div>
        </div>`
      )
      .join("");

    document.querySelectorAll("#exercise-rows input, #exercise-rows select").forEach((el) => {
      el.addEventListener("input", () => {
        const i = parseInt(el.dataset.i);
        const k = el.dataset.k;
        exercises[i][k] = el.type === "number" ? parseFloat(el.value) : el.value;
      });
    });
    document.querySelectorAll("#exercise-rows .toggle").forEach((el) => {
      el.addEventListener("click", () => {
        const i = parseInt(el.dataset.i);
        exercises[i].completed = !exercises[i].completed;
        renderRows();
      });
    });
    document.querySelectorAll("[data-remove]").forEach((el) => {
      el.addEventListener("click", () => {
        exercises.splice(parseInt(el.dataset.remove), 1);
        renderRows();
      });
    });
  }
  renderRows();

  document.getElementById("add-exercise").addEventListener("click", () => {
    exercises.push({ exerciseName: "", duration: 15, completed: true, painLevel: "None", difficulty: "Easy" });
    renderRows();
  });

  document.getElementById("pt-save").addEventListener("click", async () => {
    const btn = document.getElementById("pt-save");
    const errorBox = document.getElementById("pt-error");
    errorBox.innerHTML = "";
    const payload = {
      date: today?.date ? today.date.slice(0, 10) : todayISO(),
      exercises: exercises.filter((e) => e.exerciseName.trim()),
      notes: document.getElementById("pt-notes").value.trim(),
    };
    if (!payload.exercises.length) {
      errorBox.innerHTML = `<div class="field-error">Add at least one exercise with a name.</div>`;
      return;
    }
    btn.disabled = true;
    try {
      if (today) await PhysiotherapyApi.update(today._id, payload);
      else await PhysiotherapyApi.create(patientId, payload);
      showToast("Physiotherapy session saved", "success");
      renderPhysiotherapyView(patientId);
    } catch (err) {
      errorBox.innerHTML = `<div class="field-error">${escapeHtml(err.message)}</div>`;
      btn.disabled = false;
    }
  });
}
