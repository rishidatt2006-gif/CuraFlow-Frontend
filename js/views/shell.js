import { getState, getCurrentPatient } from "../state.js";
import { navigate } from "../router.js";
import { initials } from "../ui.js";

function navItem(label, icon, path, activePath) {
  const isActive = activePath === path;
  return `
    <button class="nav-item${isActive ? " is-active" : ""}" data-nav="${path}">
      <span>${icon}</span><span>${label}</span>
    </button>`;
}

export function renderSidebar(activePath) {
  const { user } = getState();
  const patient = getCurrentPatient();

  const patientNav = patient
    ? `
      <div class="nav-patient-label">${patient.fullname}</div>
      <div class="nav-section-label">Care</div>
      ${navItem("Daily log", "📋", `/patients/${patient._id}/log`, activePath)}
      ${navItem("Recovery summary", "✨", `/patients/${patient._id}/summary`, activePath)}
      ${navItem("Trends", "📈", `/patients/${patient._id}/trends`, activePath)}
      <div class="nav-section-label">Records</div>
      ${navItem("Prescriptions", "💊", `/patients/${patient._id}/prescriptions`, activePath)}
      ${navItem("Reports", "📁", `/patients/${patient._id}/reports`, activePath)}
      ${navItem("Vitals history", "❤", `/patients/${patient._id}/vitals`, activePath)}
      ${navItem("Physiotherapy log", "🤸", `/patients/${patient._id}/physiotherapy`, activePath)}
      ${navItem("Weekly summary", "🗒", `/patients/${patient._id}/dashboard`, activePath)}
    `
    : "";

  const sidebar = document.getElementById("sidebar");
  sidebar.innerHTML = `
    <div class="nav-brand">🩺 CuraFlow</div>
    <div class="nav-user-top">
      <span class="avatar-circle avatar-circle--light">${initials(user?.fullname || "C")}</span>
      <div>
        <strong>${user?.fullname || "Caregiver"}</strong>
        <span>Caregiver</span>
      </div>
    </div>
    <div class="nav-section-label" style="padding-top:0;">Overview</div>
    ${navItem("Dashboard", "📊", "/dashboard", activePath)}
    ${navItem("My patients", "👥", "/patients", activePath)}
    ${patientNav}
    <div class="nav-spacer"></div>
    <button class="nav-signout" id="logout-btn">↩ Sign out</button>
  `;

  sidebar.querySelectorAll("[data-nav]").forEach((btn) => {
    btn.addEventListener("click", () => {
      navigate(btn.getAttribute("data-nav"));
      sidebar.classList.remove("is-open");
    });
  });
}

export function renderTopbar(title, onLogout) {
  const topbar = document.getElementById("topbar");
  const { user } = getState();
  topbar.innerHTML = `
    <button class="icon-btn" id="menu-toggle" style="display:none;">☰</button>
    <div class="topbar-title">${title}</div>
    <div class="topbar-actions">
      <span class="avatar-circle">${initials(user?.fullname || "C")}</span>
    </div>
  `;
  // Simple responsive sidebar toggle for narrow screens
  const menuToggle = topbar.querySelector("#menu-toggle");
  if (window.innerWidth <= 780) {
    menuToggle.style.display = "inline-flex";
    menuToggle.addEventListener("click", () => {
      document.getElementById("sidebar").classList.toggle("is-open");
    });
  }

  document.getElementById("logout-btn")?.addEventListener("click", onLogout);
}
