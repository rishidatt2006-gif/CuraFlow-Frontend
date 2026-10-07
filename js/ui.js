export function showToast(message, type = "info") {
  const container = document.getElementById("toast-container");
  const el = document.createElement("div");
  el.className = `toast${type === "error" ? " toast--error" : ""}${type === "success" ? " toast--success" : ""}`;
  el.textContent = message;
  container.appendChild(el);
  setTimeout(() => el.remove(), 3200);
}

export function openModal(titleHtml, bodyHtml) {
  const root = document.getElementById("modal-root");
  root.innerHTML = `
    <div class="modal-overlay" data-close-modal>
      <div class="modal-card" role="dialog" aria-modal="true">
        <div class="modal-header">
          <h2>${titleHtml}</h2>
          <button class="icon-btn" data-close-modal aria-label="Close">✕</button>
        </div>
        ${bodyHtml}
      </div>
    </div>`;
  root.querySelectorAll("[data-close-modal]").forEach((el) => {
    el.addEventListener("click", (e) => {
      if (e.target.hasAttribute("data-close-modal")) closeModal();
    });
  });
}

export function closeModal() {
  document.getElementById("modal-root").innerHTML = "";
}

export function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

// Mirrors the exact window the backend's GET /vitals/analytics uses for each
// range value (see vital.controller.js getVitalAnalytics), so a log/
// physiotherapy query for the same range covers the same days.
export function rangeToDates(range) {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const start = new Date(today);
  if (range === "week") start.setUTCDate(today.getUTCDate() - 6);
  else if (range === "month") start.setUTCDate(today.getUTCDate() - 29);
  else if (range === "6months") start.setUTCDate(today.getUTCDate() - 180);
  else start.setTime(new Date("2000-01-01T00:00:00Z").getTime()); // "all"
  return { startDate: start.toISOString().slice(0, 10), endDate: today.toISOString().slice(0, 10) };
}

export function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export function formatWeekday(date = new Date()) {
  return date.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
}

export function ageFromDOB(dob) {
  if (!dob) return null;
  const birth = new Date(dob);
  const diff = Date.now() - birth.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
}

export function initials(name = "") {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export function escapeHtml(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
