const routes = [];

/** route("/patients/:id/log", (params) => { ... }) */
export function route(pattern, handler) {
  const paramNames = [];
  const regexStr = pattern.replace(/\/:([^/]+)/g, (_, name) => {
    paramNames.push(name);
    return "/([^/]+)";
  });
  routes.push({ regex: new RegExp(`^${regexStr}$`), paramNames, handler });
}

function run() {
  const path = window.location.hash.replace(/^#/, "") || "/dashboard";
  for (const r of routes) {
    const match = path.match(r.regex);
    if (match) {
      const params = {};
      r.paramNames.forEach((name, i) => (params[name] = decodeURIComponent(match[i + 1])));
      r.handler(params);
      return;
    }
  }
  navigate("/dashboard");
}

let started = false;

export function startRouter() {
  if (!started) {
    window.addEventListener("hashchange", run);
    started = true;
  }
  run();
}

export function navigate(path) {
  if (window.location.hash === `#${path}`) {
    run();
  } else {
    window.location.hash = path;
  }
}
