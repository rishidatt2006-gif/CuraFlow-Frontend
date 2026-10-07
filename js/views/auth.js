import { AuthApi } from "../api.js";
import { setSession } from "../apiClient.js";
import { getApiBase, setApiBase } from "../config.js";
import { showToast, escapeHtml } from "../ui.js";

export function renderAuthScreen(onLoginSuccess) {
  const root = document.getElementById("auth-screen");
  root.innerHTML = `
    <div class="auth-card">
      <div class="auth-brand">CuraFlow</div>
      <div class="auth-tagline">Sign in to your caregiver workspace.</div>

      <div id="auth-error"></div>

      <form id="login-form">
        <div class="field">
          <label for="login-id">Email or username</label>
          <input id="login-id" type="text" autocomplete="username" required />
        </div>
        <div class="field">
          <label for="login-pw">Password</label>
          <input id="login-pw" type="password" autocomplete="current-password" required />
        </div>
        <button class="btn btn-primary btn-block" type="submit" id="login-submit">Sign in</button>
      </form>

      <details class="mt-16">
        <summary class="muted" style="cursor:pointer;">Backend API URL</summary>
        <div class="field mt-16 mb-0">
          <input id="api-base-input" type="text" value="${escapeHtml(getApiBase())}" />
          <div class="field-hint">
            Local dev default is <code>http://localhost:8000/api/v1</code>. Change this if your
            backend runs elsewhere (e.g. a Render deployment).
          </div>
        </div>
      </details>
    </div>
  `;

  root.querySelector("#api-base-input").addEventListener("change", (e) => {
    setApiBase(e.target.value);
    showToast("API URL updated");
  });

  root.querySelector("#login-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const identifier = root.querySelector("#login-id").value.trim();
    const password = root.querySelector("#login-pw").value;
    const errorBox = root.querySelector("#auth-error");
    const submitBtn = root.querySelector("#login-submit");

    errorBox.innerHTML = "";
    submitBtn.disabled = true;
    submitBtn.textContent = "Signing in…";

    try {
      const data = await AuthApi.login(identifier, password);
      setSession({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        user: data.user,
      });
      onLoginSuccess(data.user);
    } catch (err) {
      errorBox.innerHTML = `<div class="field-error">${escapeHtml(err.message)}</div>`;
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Sign in";
    }
  });
}
