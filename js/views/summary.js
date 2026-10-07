import { SummaryApi, VitalsApi } from "../api.js";
import { getCurrentPatient } from "../state.js";
import { navigate } from "../router.js";
import { showToast, formatDate, escapeHtml } from "../ui.js";

const RANGES = [
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "6months", label: "6 Months" },
  { value: "all", label: "All" },
];

const SECTION_HEADERS = [
  "Overall Overview",
  "Vital Trends",
  "Medication Adherence",
  "Physiotherapy Progress",
  "Lifestyle Observations",
  "Suggested Discussion Points",
];

export async function renderSummaryView(patientId) {
  const root = document.getElementById("view-root");
  const patient = getCurrentPatient();
  let range = "week";

  root.innerHTML = `
    <div class="mt-16" style="margin-bottom:14px;">
      <h1 style="font-size:20px;">AI recovery summary${patient ? " — " + escapeHtml(patient.fullname) : ""}</h1>
      <div class="muted">Generated from this patient's logged vitals, medications and physiotherapy — never a diagnosis.</div>
    </div>

    <div class="flex-between" style="margin-bottom:18px;">
      <div class="segmented" id="range-segmented">
        ${RANGES.map((r) => `<button type="button" data-value="${r.value}">${r.label}</button>`).join("")}
      </div>
      <button class="btn btn-primary" id="generate-btn">Generate summary</button>
    </div>

    <div id="summary-output"></div>
  `;

  const segButtons = root.querySelectorAll("#range-segmented button");
  const syncSeg = () => segButtons.forEach((b) => b.classList.toggle("is-active", b.dataset.value === range));
  syncSeg();
  segButtons.forEach((b) =>
    b.addEventListener("click", () => {
      range = b.dataset.value;
      syncSeg();
    })
  );

  root.querySelector("#generate-btn").addEventListener("click", () => generate(patientId, range));
}

async function generate(patientId, range) {
  const output = document.getElementById("summary-output");
  const generateBtn = document.getElementById("generate-btn");
  generateBtn.disabled = true;

  output.innerHTML = `
    <div class="card">
      <div class="flex-between mb-0">
        <strong>Generating your summary…</strong>
        <div class="spinner"></div>
      </div>
      <div class="loading-steps">
        <div class="loading-step">Reading logged vitals for this range</div>
        <div class="loading-step">Checking medication adherence</div>
        <div class="loading-step">Reviewing physiotherapy sessions</div>
        <div class="loading-step">Writing a plain-language overview</div>
      </div>
    </div>`;

  try {
    const [summaryData, analytics] = await Promise.all([
      SummaryApi.generate(patientId, range),
      VitalsApi.analytics(patientId, range).catch(() => null),
    ]);
    renderResult(summaryData, analytics, range, patientId);
    showToast("Summary ready — a copy was also emailed to you", "success");
  } catch (err) {
    output.innerHTML = `<div class="field-error">${escapeHtml(err.message)}</div>`;
  } finally {
    generateBtn.disabled = false;
  }
}

function parseSections(rawText) {
  const lines = rawText.split(/\r?\n/);
  const sections = [];
  let current = null;

  for (const line of lines) {
    const clean = line.replace(/^[#*\-\s\d.]+|[:*]+$/g, "").trim();
    const matchedHeader = SECTION_HEADERS.find((h) => clean.toLowerCase() === h.toLowerCase());
    if (matchedHeader) {
      current = { title: matchedHeader, body: [] };
      sections.push(current);
    } else if (current) {
      current.body.push(line);
    } else if (line.trim()) {
      if (!sections.length || sections[0].title !== "Summary") sections.unshift({ title: "Summary", body: [] });
      sections[0].body.push(line);
    }
  }

  if (!sections.length) sections.push({ title: "Summary", body: lines });
  return sections;
}

function renderResult(summaryData, analytics, range, patientId) {
  const output = document.getElementById("summary-output");
  const sections = parseSections(summaryData.summary || "");
  const stat = analytics?.summary;
  const fullText = sections.map((s) => `${s.title}\n${s.body.join("\n").trim()}`).join("\n\n");

  const statCards = [
    stat?.totalRecords !== undefined ? { label: "Vital readings used", num: stat.totalRecords } : null,
    stat?.averageBloodPressure?.systolic
      ? {
          label: "Avg blood pressure",
          num: `${Math.round(stat.averageBloodPressure.systolic)}/${Math.round(stat.averageBloodPressure.diastolic)}`,
        }
      : null,
    stat?.averageHeartRate ? { label: "Avg heart rate", num: `${Math.round(stat.averageHeartRate)} bpm` } : null,
    stat?.averageOxygenSaturation ? { label: "Avg SpO₂", num: `${Math.round(stat.averageOxygenSaturation)}%` } : null,
    stat?.averageBloodSugar ? { label: "Avg blood sugar", num: `${Math.round(stat.averageBloodSugar)} mg/dL` } : null,
    stat?.averageWeight ? { label: "Avg weight", num: `${stat.averageWeight.toFixed(1)} kg` } : null,
  ].filter(Boolean);

  output.innerHTML = `
    <div class="disclaimer-chip">⚠ AI-generated summary — not a diagnosis. Always confirm with a clinician.</div>

    <div class="flex-between" style="margin-bottom:16px;">
      <div style="display:flex; gap:8px; flex-wrap:wrap;">
        <button class="btn btn-secondary btn-sm" id="copy-btn">📋 Copy summary</button>
        <button class="btn btn-secondary btn-sm" id="download-btn">⬇ Download as text</button>
        <button class="btn btn-secondary btn-sm" id="read-aloud-btn">🔊 Read aloud</button>
      </div>
      <button class="btn-ghost btn-sm" id="view-trends-link">📈 View trends for this period →</button>
    </div>

    <div class="based-on-panel">
      <button class="based-on-header" id="based-on-toggle" style="width:100%; cursor:pointer;">
        <span>Based on: ${range} · generated ${formatDate(summaryData.generatedAt)}</span>
        <span id="based-on-caret">▾</span>
      </button>
      <div class="based-on-body" id="based-on-body" hidden>
        ${
          statCards.length
            ? statCards.map((c) => `<div class="based-on-stat"><div class="num">${c.num}</div><div class="label">${c.label}</div></div>`).join("")
            : `<div class="muted">No vitals were recorded in this range yet.</div>`
        }
      </div>
      <div style="padding:0 16px 14px; font-size:12px; color:var(--muted);">
        This panel currently reflects vitals data (the backend's <code>/vitals/analytics</code> endpoint). The AI narrative
        itself also draws on daily logs and physiotherapy sessions for this same range.
      </div>
    </div>

    ${sections
      .map(
        (s) => `
      <div class="summary-section">
        <h3>${escapeHtml(s.title)}</h3>
        <p>${escapeHtml(s.body.join("\n").trim())}</p>
      </div>`
      )
      .join("")}
  `;

  const toggle = document.getElementById("based-on-toggle");
  const body = document.getElementById("based-on-body");
  const caret = document.getElementById("based-on-caret");
  toggle.addEventListener("click", () => {
    const isHidden = body.hasAttribute("hidden");
    if (isHidden) body.removeAttribute("hidden");
    else body.setAttribute("hidden", "");
    caret.textContent = isHidden ? "▴" : "▾";
  });

  document.getElementById("copy-btn").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(fullText);
      showToast("Summary copied to clipboard", "success");
    } catch {
      showToast("Couldn't copy — your browser may be blocking clipboard access", "error");
    }
  });

  document.getElementById("download-btn").addEventListener("click", () => {
    const blob = new Blob([fullText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `recovery-summary-${range}-${summaryData.generatedAt?.slice(0, 10) || "today"}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  });

  const readAloudBtn = document.getElementById("read-aloud-btn");
  readAloudBtn.addEventListener("click", () => {
    if (!("speechSynthesis" in window)) {
      showToast("Read-aloud isn't supported in this browser", "error");
      return;
    }
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      readAloudBtn.textContent = "🔊 Read aloud";
      return;
    }
    const utterance = new SpeechSynthesisUtterance(fullText);
    utterance.onend = () => (readAloudBtn.textContent = "🔊 Read aloud");
    window.speechSynthesis.speak(utterance);
    readAloudBtn.textContent = "⏹ Stop reading";
  });

  document.getElementById("view-trends-link").addEventListener("click", () => navigate(`/patients/${patientId}/trends`));
}
