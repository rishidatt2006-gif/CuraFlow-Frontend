import { DailyLogApi, VitalsApi, PhysiotherapyApi, PrescriptionsApi } from "../api.js";
import { getCurrentPatient } from "../state.js";
import { navigate } from "../router.js";
import { showToast, todayISO, escapeHtml } from "../ui.js";

const APPETITE_OPTIONS = ["Poor", "Normal", "Good"];
const MOOD_OPTIONS = [
  { value: "Very Bad", emoji: "😣" },
  { value: "Bad", emoji: "🙁" },
  { value: "Neutral", emoji: "😐" },
  { value: "Good", emoji: "🙂" },
  { value: "Very Good", emoji: "😄" },
];
const PAIN_SLIDER_TO_LEVEL = (v) => (v <= 0 ? "None" : v <= 3 ? "Mild" : v <= 6 ? "Moderate" : "Severe");
const PAIN_LEVEL_TO_SLIDER = { None: 0, Mild: 2, Moderate: 5, Severe: 8 };

function parseBP(str) {
  const m = (str || "").trim().match(/^(\d{2,3})\s*\/\s*(\d{2,3})$/);
  return m ? { systolic: parseInt(m[1], 10), diastolic: parseInt(m[2], 10) } : null;
}

export async function renderDailyLogView(patientId) {
  const root = document.getElementById("view-root");
  const patient = getCurrentPatient();
  root.innerHTML = `<div class="skeleton-line" style="height:400px;"></div>`;

  let existingLog, existingVital, existingPhysio, currentMeds;
  try {
    [existingLog, existingVital, existingPhysio, currentMeds] = await Promise.all([
      DailyLogApi.today(patientId),
      VitalsApi.today(patientId).catch(() => null),
      PhysiotherapyApi.today(patientId).catch(() => null),
      PrescriptionsApi.current(patientId).catch(() => []),
    ]);
  } catch (err) {
    root.innerHTML = `<div class="field-error">${escapeHtml(err.message)}</div>`;
    return;
  }

  // Backend only stores ONE medicinesTaken boolean per day — there's no
  // per-medicine record. We show per-medicine Taken/Skipped for a realistic
  // caregiver workflow, but it's aggregated down to that one boolean on
  // save (see aggregateMedicines below). If today was already logged as
  // fully taken, default every listed medicine to "taken"; otherwise we
  // have no way to know which ones were skipped, so they start unanswered.
  const medStatus = {};
  currentMeds.forEach((m) => {
    medStatus[m._id] = existingLog?.medicinesTaken ? "taken" : null;
  });

  const existingPhysioExercise = existingPhysio?.exercises?.[0];

  const form = {
    medsSkipped: false,
    vitalsSkipped: false,
    physioSkipped: false,
    exerciseDone: existingLog?.exerciseDone ?? false,
    bowelMovement: existingLog?.bowelMovement ?? false,
    waterIntake: existingLog?.waterIntake ?? 0,
    sleepHours: existingLog?.sleepHours ?? 7,
    appetite: existingLog?.appetite ?? "Normal",
    mood: existingLog?.mood ?? "Neutral",
    notes: existingLog?.notes ?? "",
    bp: existingVital?.bloodPressureSystolic ? `${existingVital.bloodPressureSystolic}/${existingVital.bloodPressureDiastolic}` : "",
    heartRate: existingVital?.heartRate ?? null,
    oxygenSaturation: existingVital?.oxygenSaturation ?? null,
    temperature: existingVital?.temperature ?? null,
    physioCompleted: existingPhysioExercise?.completed ?? true,
    physioDuration: existingPhysioExercise?.duration ?? 15,
    painSlider: PAIN_LEVEL_TO_SLIDER[existingPhysioExercise?.painLevel] ?? 0,
  };

  root.innerHTML = `
    <div class="flex-between mt-16" style="margin-bottom:14px;">
      <h1 style="font-size:20px;">Daily log${patient ? " — " + escapeHtml(patient.fullname) : ""}</h1>
      <span class="badge badge--neutral">${todayISO()}</span>
    </div>
    ${existingLog ? `<div class="banner banner--ok"><div class="banner-text">Today is already logged — saving will update it.</div></div>` : ""}

    <div class="card section-card" id="meds-section">
      <div class="section-card-header">
        <div class="section-card-title">💊 Medications</div>
        <button type="button" class="skip-link" id="meds-skip">Skip today</button>
      </div>
      <div class="skip-confirm-banner" id="meds-section-skip-banner" hidden></div>
      <div class="section-card-body" id="meds-body"></div>
      ${currentMeds.length ? `<div class="muted mt-16" style="margin-bottom:0;">Mark every medicine "Taken" for today's log to record medicines as given.</div>` : ""}
    </div>

    <div class="card section-card" id="vitals-section">
      <div class="section-card-header">
        <div class="section-card-title">❤ Vitals</div>
        <button type="button" class="skip-link" id="vitals-skip">Skip today</button>
      </div>
      <div class="skip-confirm-banner" id="vitals-section-skip-banner" hidden></div>
      <div class="section-card-body" id="vitals-body">
        <div class="vital-row" style="align-items:flex-start; flex-wrap:wrap;">
          <div>
            <label for="v-bp" class="log-row-label">Blood pressure</label>
            <div class="field-hint" style="margin-top:2px;">Format: systolic/diastolic — e.g. 120/80</div>
          </div>
          <div style="text-align:right;">
            <input type="text" id="v-bp" placeholder="120/80" value="${escapeHtml(form.bp)}" inputmode="numeric" aria-describedby="bp-error" />
            <div id="bp-error" class="field-hint" style="color:var(--danger-600); display:none;">Enter as two numbers separated by a slash, like 120/80.</div>
          </div>
        </div>
        <div class="vital-row">
          <label for="hr-value" class="log-row-label">Heart rate (bpm)</label>
          <div class="stepper"><button type="button" id="hr-minus" aria-label="Decrease heart rate">−</button><span class="stepper-value" id="hr-value">${form.heartRate ?? "—"}</span><button type="button" id="hr-plus" aria-label="Increase heart rate">+</button></div>
        </div>
        <div class="vital-row">
          <label for="spo2-value" class="log-row-label">SpO₂ (%)</label>
          <div class="stepper"><button type="button" id="spo2-minus" aria-label="Decrease SpO2">−</button><span class="stepper-value" id="spo2-value">${form.oxygenSaturation ?? "—"}</span><button type="button" id="spo2-plus" aria-label="Increase SpO2">+</button></div>
        </div>
        <div class="vital-row"><label for="v-temp" class="log-row-label">Temperature (°C)</label><input type="number" step="0.1" id="v-temp" value="${form.temperature ?? ""}" /></div>
      </div>
    </div>

    <div class="card section-card" id="physio-section">
      <div class="section-card-header">
        <div class="section-card-title">🤸 Physiotherapy</div>
        <button type="button" class="skip-link" id="physio-skip">Skip today</button>
      </div>
      <div class="skip-confirm-banner" id="physio-section-skip-banner" hidden></div>
      <div class="section-card-body" id="physio-body">
        <div class="log-row">
          <div><div class="log-row-label">Exercises completed</div><div class="log-row-sub">Prescribed exercises for today</div></div>
          <div class="segmented" id="physio-completed-seg">
            <button type="button" data-value="yes">Yes</button>
            <button type="button" data-value="no">No</button>
          </div>
        </div>
        <div class="log-row">
          <div class="log-row-label">Duration (minutes)</div>
          <div class="stepper"><button type="button" id="dur-minus">−</button><span class="stepper-value" id="dur-value">${form.physioDuration}</span><button type="button" id="dur-plus">+</button></div>
        </div>
        <div class="log-row" style="flex-direction:column; align-items:stretch; gap:6px;">
          <div class="flex-between mb-0"><span class="log-row-label" id="pain-slider-label">Pain level</span><span id="pain-label" class="muted"></span></div>
          <input type="range" id="pain-slider" min="0" max="10" step="1" value="${form.painSlider}"
            list="pain-ticks" aria-labelledby="pain-slider-label" aria-valuetext="${PAIN_SLIDER_TO_LEVEL(form.painSlider)}" />
          <datalist id="pain-ticks">
            <option value="0"></option><option value="1"></option><option value="2"></option><option value="3"></option>
            <option value="4"></option><option value="5"></option><option value="6"></option><option value="7"></option>
            <option value="8"></option><option value="9"></option><option value="10"></option>
          </datalist>
          <div class="flex-between mb-0"><span class="muted" style="font-size:11px;">No pain</span><span class="muted" style="font-size:11px;">Severe pain</span></div>
        </div>
      </div>
    </div>

    <div class="card section-card">
      <div class="section-card-header"><div class="section-card-title">☀ Wellness</div></div>
      <div class="log-row">
        <div class="log-row-label">Exercise done</div>
        <button type="button" class="toggle" id="t-exercise"></button>
      </div>
      <div class="log-row">
        <div class="log-row-label">Bowel movement</div>
        <button type="button" class="toggle" id="t-bowel"></button>
      </div>
      <div class="log-row">
        <div><div class="log-row-label">Water intake</div><div class="log-row-sub">Glasses today</div></div>
        <div class="stepper"><button type="button" id="water-minus">−</button><span class="stepper-value" id="water-value">0</span><button type="button" id="water-plus">+</button></div>
      </div>
      <div class="log-row">
        <div class="log-row-label">Sleep hours</div>
        <div class="slider-wrap"><div class="slider-value" id="sleep-value">0h</div><input type="range" id="sleep-slider" min="0" max="24" step="0.5" /></div>
      </div>
      <div class="log-row" style="flex-direction:column; align-items:stretch; gap:10px;">
        <div class="log-row-label">Appetite</div>
        <div class="segmented" id="appetite-segmented">${APPETITE_OPTIONS.map((o) => `<button type="button" data-value="${o}">${o}</button>`).join("")}</div>
      </div>
      <div class="log-row" style="flex-direction:column; align-items:stretch; gap:10px;">
        <div class="log-row-label">Mood</div>
        <div class="mood-picker" id="mood-picker">
          ${MOOD_OPTIONS.map((o) => `<button type="button" class="mood-btn" data-value="${o.value}"><span class="mood-emoji">${o.emoji}</span>${o.value}</button>`).join("")}
        </div>
      </div>
    </div>

    <div class="card section-card">
      <div class="section-card-header"><div class="section-card-title">📝 Notes (optional)</div></div>
      <textarea id="notes-input" maxlength="1000" placeholder="Add any observations, changes, or notes...">${escapeHtml(form.notes)}</textarea>
    </div>

    <div id="save-error"></div>
    <div class="sticky-action-bar mt-16">
      <button class="btn btn-secondary" id="discard-btn">Discard</button>
      <button class="btn btn-primary" id="save-btn">Save log</button>
    </div>
  `;

  // ---- Medications ----
  function renderMeds() {
    const body = root.querySelector("#meds-body");
    if (!currentMeds.length) {
      body.innerHTML = `<div class="muted">No active prescriptions for this patient.</div>`;
      return;
    }
    body.innerHTML = currentMeds
      .map(
        (m) => `
        <div class="med-row">
          <div>
            <div class="list-row-main">${escapeHtml(m.medicineName)} · ${escapeHtml(m.dosage)}</div>
            <div class="list-row-sub">${escapeHtml(m.frequency)}</div>
          </div>
          <div class="med-pair" data-med="${m._id}" role="group" aria-label="${escapeHtml(m.medicineName)} status">
            <button type="button" data-status="taken" class="${medStatus[m._id] === "taken" ? "is-taken" : ""}" aria-pressed="${medStatus[m._id] === "taken"}">Taken</button>
            <button type="button" data-status="skipped" class="${medStatus[m._id] === "skipped" ? "is-skipped-med" : ""}" aria-pressed="${medStatus[m._id] === "skipped"}">Skipped</button>
          </div>
        </div>`
      )
      .join("");
    body.querySelectorAll("[data-med]").forEach((pair) => {
      const medId = pair.getAttribute("data-med");
      pair.querySelectorAll("button").forEach((btn) => {
        btn.addEventListener("click", () => {
          medStatus[medId] = btn.getAttribute("data-status");
          renderMeds();
        });
      });
    });
  }
  renderMeds();

  // "Skip today" previously only dimmed the section, which left testers
  // unsure whether skipping one section affected the others. The banner
  // below says explicitly, every time, that it doesn't.
  function setupSkip(sectionId, skipBtnId, stateKey, sectionLabel) {
    const section = root.querySelector(`#${sectionId}`);
    const btn = root.querySelector(`#${skipBtnId}`);
    const banner = root.querySelector(`#${sectionId}-skip-banner`);
    const sync = () => {
      section.classList.toggle("is-skipped", form[stateKey]);
      btn.classList.toggle("is-active", form[stateKey]);
      btn.textContent = form[stateKey] ? "Undo skip" : "Skip today";
      btn.setAttribute("aria-pressed", form[stateKey] ? "true" : "false");
      if (form[stateKey]) {
        banner.hidden = false;
        banner.innerHTML = `⚠ ${sectionLabel} skipped for today — your other sections will still save normally. <button type="button" class="btn-ghost btn-sm" data-undo>Click to undo</button>`;
        banner.querySelector("[data-undo]").addEventListener("click", () => {
          form[stateKey] = false;
          sync();
        });
      } else {
        banner.hidden = true;
        banner.innerHTML = "";
      }
    };
    sync();
    btn.addEventListener("click", () => {
      form[stateKey] = !form[stateKey];
      sync();
    });
  }
  setupSkip("meds-section", "meds-skip", "medsSkipped", "Medications");
  setupSkip("vitals-section", "vitals-skip", "vitalsSkipped", "Vitals");
  setupSkip("physio-section", "physio-skip", "physioSkipped", "Physiotherapy");

  // ---- Vitals controls ----
  const bpInput = root.querySelector("#v-bp");
  const bpError = root.querySelector("#bp-error");
  function validateBP() {
    const valid = bpInput.value.trim() === "" || parseBP(bpInput.value) !== null;
    bpInput.style.borderColor = valid ? "" : "var(--danger-600)";
    bpInput.setAttribute("aria-invalid", valid ? "false" : "true");
    bpError.style.display = valid ? "none" : "block";
    return valid;
  }
  bpInput.addEventListener("input", (e) => {
    form.bp = e.target.value;
    validateBP();
  });
  root.querySelector("#v-temp").addEventListener("input", (e) => (form.temperature = e.target.value === "" ? null : parseFloat(e.target.value)));
  const hrValue = root.querySelector("#hr-value");
  const syncHr = () => (hrValue.textContent = form.heartRate ?? "—");
  root.querySelector("#hr-minus").addEventListener("click", () => { form.heartRate = Math.max(0, (form.heartRate ?? 70) - 1); syncHr(); });
  root.querySelector("#hr-plus").addEventListener("click", () => { form.heartRate = (form.heartRate ?? 69) + 1; syncHr(); });
  const spo2Value = root.querySelector("#spo2-value");
  const syncSpo2 = () => (spo2Value.textContent = form.oxygenSaturation ?? "—");
  root.querySelector("#spo2-minus").addEventListener("click", () => { form.oxygenSaturation = Math.max(0, (form.oxygenSaturation ?? 98) - 1); syncSpo2(); });
  root.querySelector("#spo2-plus").addEventListener("click", () => { form.oxygenSaturation = Math.min(100, (form.oxygenSaturation ?? 97) + 1); syncSpo2(); });

  // ---- Physiotherapy controls ----
  const physioSeg = root.querySelectorAll("#physio-completed-seg button");
  const syncPhysioSeg = () =>
    physioSeg.forEach((b) => {
      const active = (b.dataset.value === "yes") === form.physioCompleted;
      b.classList.toggle("is-active", active);
      b.setAttribute("aria-pressed", active);
    });
  syncPhysioSeg();
  physioSeg.forEach((b) => b.addEventListener("click", () => { form.physioCompleted = b.dataset.value === "yes"; syncPhysioSeg(); }));
  const durValue = root.querySelector("#dur-value");
  root.querySelector("#dur-minus").addEventListener("click", () => { form.physioDuration = Math.max(0, form.physioDuration - 5); durValue.textContent = form.physioDuration; });
  root.querySelector("#dur-plus").addEventListener("click", () => { form.physioDuration += 5; durValue.textContent = form.physioDuration; });
  const painSlider = root.querySelector("#pain-slider");
  const painLabel = root.querySelector("#pain-label");
  const syncPain = () => {
    const level = PAIN_SLIDER_TO_LEVEL(form.painSlider);
    painLabel.textContent = level;
    painSlider.setAttribute("aria-valuetext", level);
  };
  syncPain();
  painSlider.addEventListener("input", () => { form.painSlider = parseInt(painSlider.value, 10); syncPain(); });

  // ---- Wellness controls ----
  const toggle = (id, key) => {
    const el = root.querySelector(id);
    const sync = () => {
      el.classList.toggle("is-on", form[key]);
      el.setAttribute("aria-pressed", form[key]);
    };
    sync();
    el.addEventListener("click", () => { form[key] = !form[key]; sync(); });
  };
  toggle("#t-exercise", "exerciseDone");
  toggle("#t-bowel", "bowelMovement");

  const waterValue = root.querySelector("#water-value");
  const syncWater = () => (waterValue.textContent = form.waterIntake);
  syncWater();
  root.querySelector("#water-minus").addEventListener("click", () => { form.waterIntake = Math.max(0, form.waterIntake - 1); syncWater(); });
  root.querySelector("#water-plus").addEventListener("click", () => { form.waterIntake += 1; syncWater(); });

  const sleepSlider = root.querySelector("#sleep-slider");
  const sleepValue = root.querySelector("#sleep-value");
  sleepSlider.value = form.sleepHours;
  sleepValue.textContent = `${form.sleepHours}h`;
  sleepSlider.addEventListener("input", () => { form.sleepHours = parseFloat(sleepSlider.value); sleepValue.textContent = `${form.sleepHours}h`; });

  const segButtons = root.querySelectorAll("#appetite-segmented button");
  const syncSeg = () =>
    segButtons.forEach((b) => {
      const active = b.dataset.value === form.appetite;
      b.classList.toggle("is-active", active);
      b.setAttribute("aria-pressed", active);
    });
  syncSeg();
  segButtons.forEach((b) => b.addEventListener("click", () => { form.appetite = b.dataset.value; syncSeg(); }));

  const moodButtons = root.querySelectorAll("#mood-picker button");
  const syncMood = () =>
    moodButtons.forEach((b) => {
      const active = b.dataset.value === form.mood;
      b.classList.toggle("is-active", active);
      b.setAttribute("aria-pressed", active);
    });
  syncMood();
  moodButtons.forEach((b) => b.addEventListener("click", () => { form.mood = b.dataset.value; syncMood(); }));

  root.querySelector("#notes-input").addEventListener("input", (e) => (form.notes = e.target.value));
  root.querySelector("#discard-btn").addEventListener("click", () => navigate(`/patients/${patientId}/dashboard`));

  function aggregateMedicines() {
    if (form.medsSkipped) return false;
    if (!currentMeds.length) return existingLog?.medicinesTaken ?? false;
    return currentMeds.every((m) => medStatus[m._id] === "taken");
  }

  root.querySelector("#save-btn").addEventListener("click", async () => {
    const saveBtn = root.querySelector("#save-btn");
    const errorBox = root.querySelector("#save-error");
    errorBox.innerHTML = "";

    if (!form.vitalsSkipped && !validateBP()) {
      errorBox.innerHTML = `<div class="field-error">Fix the blood pressure format before saving (e.g. 120/80) — or use "Skip today" on Vitals.</div>`;
      bpInput.focus();
      return;
    }

    saveBtn.disabled = true;
    saveBtn.textContent = "Saving…";

    const logPayload = {
      date: todayISO(),
      medicinesTaken: aggregateMedicines(),
      exerciseDone: form.exerciseDone,
      physiotherapyDone: form.physioSkipped ? false : form.physioCompleted,
      waterIntake: form.waterIntake,
      sleepHours: form.sleepHours,
      bowelMovement: form.bowelMovement,
      appetite: form.appetite,
      mood: form.mood,
      notes: form.notes,
    };

    const errors = [];
    try {
      if (existingLog) await DailyLogApi.update(existingLog._id, logPayload);
      else await DailyLogApi.create(patientId, logPayload);
    } catch (err) {
      errors.push(`Daily log: ${err.message}`);
    }

    if (!form.vitalsSkipped) {
      const bp = parseBP(form.bp);
      const vitalsPayload = {
        date: todayISO(),
        bloodPressureSystolic: bp?.systolic,
        bloodPressureDiastolic: bp?.diastolic,
        heartRate: form.heartRate ?? undefined,
        oxygenSaturation: form.oxygenSaturation ?? undefined,
        temperature: form.temperature ?? undefined,
      };
      const hasAnyVital = Object.values(vitalsPayload).some((v) => v !== undefined && v !== "date");
      if (hasAnyVital) {
        try {
          if (existingVital) await VitalsApi.update(existingVital._id, vitalsPayload);
          else await VitalsApi.create(patientId, vitalsPayload);
        } catch (err) {
          errors.push(`Vitals: ${err.message}`);
        }
      }
    }

    if (!form.physioSkipped) {
      const physioPayload = {
        date: todayISO(),
        exercises: [
          {
            exerciseName: existingPhysioExercise?.exerciseName || "Prescribed exercises",
            duration: form.physioDuration,
            completed: form.physioCompleted,
            painLevel: PAIN_SLIDER_TO_LEVEL(form.painSlider),
            difficulty: existingPhysioExercise?.difficulty || "Moderate",
          },
        ],
        notes: existingPhysio?.notes || "",
      };
      try {
        if (existingPhysio) await PhysiotherapyApi.update(existingPhysio._id, physioPayload);
        else await PhysiotherapyApi.create(patientId, physioPayload);
      } catch (err) {
        errors.push(`Physiotherapy: ${err.message}`);
      }
    }

    if (errors.length) {
      errorBox.innerHTML = `<div class="field-error">${errors.map(escapeHtml).join("<br>")}</div>`;
      saveBtn.disabled = false;
      saveBtn.textContent = "Save log";
    } else {
      showToast("Today's care logged", "success");
      navigate(`/patients/${patientId}/dashboard`);
    }
  });
}
