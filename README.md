# CuraFlow Frontend

A modular, vanilla HTML/CSS/JS frontend for [CuraFlow-Backend](https://github.com/shauryapastor2005-cyber/CuraFlow-Backend),
built around the two core caregiver tasks from the Lab 5 design work: logging
today's care in under a minute, and reading an explainable AI recovery
summary. It also covers vitals, physiotherapy, prescriptions and reports so
the whole backend surface is reachable, not just those two flows.

No build step, no framework, no bundler — it's ES modules loaded directly by
the browser, so "running" it is just serving static files.

## 1. Quick start (deployed backend)

`js/config.js` defaults to the deployed Render backend:
`https://curaflow-backend-pfrn.onrender.com/api/v1`. There's no build step —
`package.json` here exists only to serve the files, not to compile anything:

```bash
npm install
npm run dev
```

That's `serve -l 3000 .` under the hood (see `package.json`) — same shape as
the backend's `npm run dev`, but there's nothing to watch or rebuild, it's
just a static file server. If you'd rather not have a `node_modules` folder
in here at all, either of these does the same thing without `npm install`:

```bash
npx serve -l 3000 .
# or:
python3 -m http.server 3000
```

Open `http://localhost:3000` and log in with a seeded caregiver account
(password `Caregiver@123` — see `src/scripts/seed/seedCaregivers.js` in the
backend repo for the exact emails).

**Render free tier cold starts.** If the backend has been idle, the first
request can take 20–50 seconds while it spins back up. `apiClient.js` has no
request timeout, so the first login attempt will just sit there — that's
normal, not broken. Everything after is fast.

**If login fails with a CORS error in the browser console** (not a login
error shown in the UI — check DevTools), the Render service's `CORS_ORIGIN`
env var doesn't match the origin you're serving this frontend from. Its CORS
middleware does an exact string match:
```js
cors({ origin: process.env.CORS_ORIGIN, credentials: true })
```
Set `CORS_ORIGIN=http://localhost:3000` on Render to match the command above
exactly, or `CORS_ORIGIN=*` if you'd rather it accept any origin (simpler
while you're still changing ports/hosts — this frontend authenticates via a
Bearer header, not cookies, so the wildcard doesn't cause the usual
credentials conflict). Render restarts automatically when you save an env
var change; no redeploy needed. This is the one step I can't do for you —
I don't have access to your Render dashboard.

## 2. Using a local backend instead

Useful if you're actively developing the backend itself. Clone it, then:

```bash
git clone https://github.com/shauryapastor2005-cyber/CuraFlow-Backend.git
cd CuraFlow-Backend
npm install
cp .env.sample .env
```

Fill in `.env`: at minimum `MONGODB_URI`, `ACCESS_TOKEN_SECRET`,
`REFRESH_TOKEN_SECRET`. Leave `PORT=8000` and `CORS_ORIGIN=http://localhost:3000`
as-is unless you have a reason to change them. Cloudinary keys are only
needed for report file uploads and avatars; `GEMINI_API_KEY` is required for
the AI summary feature to work; SMTP settings are only needed for the
summary's automatic email — the app still works without them, that one
side-effect will just fail silently on the backend.

```bash
npm run seed   # optional but recommended: creates a demo admin, 3 caregivers,
               # and sample patients/vitals/logs/physiotherapy/prescriptions
npm run dev    # starts on http://localhost:8000
```

Then, on the login screen of this frontend, expand **"Backend API URL"** and
change it to `http://localhost:8000/api/v1`. That override is saved in
`localStorage` and takes priority over the Render default from then on, on
that browser, until you clear it or change it again.

Auth doesn't rely on cookies crossing origins either way — the backend
returns `accessToken`/`refreshToken` in the login response body, and its
`verifyJWT` middleware accepts a plain `Authorization: Bearer <token>`
header, which is what `js/apiClient.js` uses exclusively. The CORS origin
check above still applies regardless of how auth is carried, though — it's a
separate check the browser does before your JS ever sees the response.

## 3. File structure

```
curaflow-frontend/
├── index.html            shell only — no inline CSS/JS
├── css/
│   ├── base.css          tokens, reset, typography, auth screen, app shell grid
│   └── components.css    buttons, forms, tiles, toggle/slider/stepper/segmented,
│                          mood picker, modal, toast, section cards + skip-today,
│                          stat grid, charts, progress bar, grouped sidebar nav
└── js/
    ├── config.js         API base URL (configurable + persisted)
    ├── apiClient.js       fetch wrapper: Bearer auth, ApiResponse unwrapping,
    │                      single-flight refresh-on-401
    ├── api.js             every backend call, grouped by resource
    ├── state.js           tiny global store + pub/sub (user, patients, current patient)
    ├── router.js           hash router with :param support
    ├── ui.js               toast/modal/formatting/date-range helpers
    ├── charts.js           dependency-free inline-SVG line/bar chart renderers
    ├── main.js             bootstraps session, registers routes, login/logout
    └── views/
        ├── auth.js             login screen
        ├── shell.js            grouped sidebar (Overview / Care / Records) + topbar
        ├── dashboard.js        caregiver dashboard (landing page) — GET /dashboard
        ├── patients.js         patient list (status tiles, add patient)
        ├── workspace.js        patient hub (6 tiles) — kept, not linked from nav; see below
        ├── patientDashboard.js patient's weekly summary — GET /patients/:id/dashboard
        ├── dailyLog.js         Task 1 — unified "today's care" flow (medications,
        │                      vitals, physiotherapy, wellness, notes in one screen)
        ├── trends.js           charts: BP/HR/SpO2 over time, pain-level, adherence
        ├── summary.js          Task 2 — AI recovery summary + "based on" explainability panel
        ├── vitals.js           vitals history/entry (reachable from Records)
        ├── physiotherapy.js    detailed multi-exercise session editor (Records)
        ├── prescriptions.js
        └── reports.js
```

**Navigation, grouped like the design mockup:** the sidebar is now Overview
(Dashboard, My patients), then — once a patient is selected — Care (Daily
log, Recovery summary, Trends) and Records (Prescriptions, Reports, Vitals
history, Physiotherapy log, Weekly summary). Clicking a patient from the
list or dashboard goes straight to that patient's Daily log — the single
most time-pressured task — rather than a neutral landing screen first.

**`workspace.js` and its route (`/patients/:id`) still exist but are no
longer linked from anywhere in the nav.** It was the patient hub from the
earlier Lab 5 design; rather than delete a working, tested screen, it's just
dormant — reachable by URL, not by click. Remove the route registration in
`main.js` if you want it gone entirely.

**Two dashboards, mapped 1:1 to the backend's two dashboard endpoints** (not
reinvented client-side):
- **Caregiver dashboard** (`/dashboard`, `views/dashboard.js`) — the landing
  page after login. Calls `GET /dashboard` for overview counts and today's
  activity, then separately checks `GET /logs/:id/today` for each of the 5
  recently-added patients (in parallel) to compute an honest on-track/
  needs-attention count, since the backend doesn't return that breakdown
  directly.
- **Patient weekly summary** (`/patients/:id/dashboard`,
  `views/patientDashboard.js`) — itemized 7-day history: logs, vitals,
  physiotherapy sessions, reports, current prescriptions. Calls `GET
  /patients/:id/dashboard`.
- **Trends** (`/patients/:id/trends`, `views/trends.js`) — the new charts
  page. Distinct from the weekly summary above: this is visual and
  range-selectable (week/month/6 months/all), that one is a fixed 7-day
  itemized list. Calls `GET /vitals/analytics` for the blood pressure/heart
  rate/SpO₂ line charts (using the `history` array the backend already
  returns specifically for this), plus `GET /logs` and `GET /physiotherapy`
  with `startDate`/`endDate` for medication adherence and a pain-level bar
  chart. `rangeToDates()` in `ui.js` reproduces the exact week/month/
  6-months date-math `getVitalAnalytics` uses server-side, so all of these
  stay aligned to the same window.

## 4. Design decisions worth knowing about

- **The Daily Log screen now saves to three different backend resources in
  one submit, not one.** The Medications/Vitals/Physiotherapy/Wellness
  sections are presented as a single unified flow (matching the original
  design mockup), but under the hood, Save fires a `DailyLog` create/update
  (always), plus a `Vital` create/update (unless that section is skipped or
  genuinely empty) and a `Physiotherapy` create/update (unless skipped) —
  three separate API calls, three separate documents, one caregiver-facing
  form. If one of the three fails, the other two still save, and the error
  message says specifically which one didn't.
- **"Skip today" per section means "don't send that API call today,"** not
  just a visual dim. Skipping Vitals, for instance, means no `Vital`
  document is created or updated for today at all — the section greys out
  to make that consequence visible before you save, not after.
- **Per-medicine Taken/Skipped is a frontend-only presentation.** The
  backend's `DailyLog` schema has exactly one `medicinesTaken` boolean for
  the whole day — there's no per-medicine record. The UI lists each current
  prescription with its own Taken/Skipped toggle because that's how a
  caregiver actually thinks about it, but on save this collapses to: `true`
  only if every listed medicine was marked Taken, `false` otherwise. The
  section has a visible caption saying so, rather than silently losing the
  distinction.
- **Physiotherapy's pain-level slider is 0–10 visually, but the backend
  only stores a 4-value enum** (`None`/`Mild`/`Moderate`/`Severe`). The
  slider buckets into those four on save (0→None, 1–3→Mild, 4–6→Moderate,
  7–10→Severe) and shows the resulting label live as you drag, so what gets
  saved is never a surprise. Similarly, the single Yes/No + duration + pain
  slider writes one exercise entry (`exerciseName: "Prescribed exercises"`)
  into the backend's exercise array — if you need to log several distinct
  exercises with different names/durations/pain levels in one session, use
  the more granular editor at **Records → Physiotherapy log** instead,
  which was kept for exactly that case.
- **Vitals' Temperature field stays in °C (25–50 range), not the cosmetic
  98.6°F style some mockups show.** The backend validates temperature in
  that Celsius range specifically — sending a Fahrenheit-looking number
  through unchanged would either fail validation or silently store a wrong
  value. Accuracy won over visual match here.
- **Trends' pain-level chart takes the worst exercise pain per physiotherapy
  session**, not an average — a session with one easy exercise and one
  painful one is realistically a "painful session," not a middling one.
- **Daily log, vitals, and physiotherapy are all "one record per day."**
  The backend enforces a unique `{patient, date}` index on all three. Each of
  those views fetches `.../today` first; if a record exists, the same form
  pre-fills and Save does a `PATCH`, otherwise Save does a `POST`. There's no
  separate "edit" screen.
- **The AI summary's "based on" panel is a frontend composition, not a
  backend field.** `POST /patients/:id/summary` only returns
  `{ summary, generatedAt, promptVersion }` — no structured source data. The
  explainability panel is built by calling `GET
  /patients/:id/vitals/analytics?range=...` in parallel and rendering its
  aggregates (record count, average BP/HR/SpO₂/sugar/weight) alongside the
  narrative. This is flagged directly in the UI: the panel's footnote says it
  currently reflects vitals data specifically, since that's the one resource
  with a dedicated `/analytics` endpoint — daily logs and physiotherapy don't
  have an equivalent endpoint yet, even though the AI narrative itself does
  use them.
- **The patient dashboard's weekly log stats are counts, not a day-by-day
  breakdown.** `GET /patients/:id/dashboard` selects only the health fields
  off each `DailyLog` (`medicinesTaken`, `sleepHours`, etc.) — no `date`
  field — and only returns documents that actually exist for that 7-day
  window, so a day with no log entry just isn't in the array. There's no
  reliable way to reconstruct which of the 7 days is missing from the
  frontend, so `patientDashboard.js` deliberately shows "logged 5 of the
  last 7 days" rather than a fabricated per-day list — showing dates here
  would mean guessing which ones are correct.
- **The six summary sections are parsed from one free-text string**, matched
  against the section headers the backend's prompt asks Gemini to use. If
  Gemini's output doesn't use those exact headers, the whole response falls
  back to a single "Summary" card rather than silently dropping content.
- **Tokens are stored in `localStorage`, not an httpOnly cookie.** This was a
  deliberate trade-off to avoid cross-origin cookie issues in local dev (see
  §1), but it does mean tokens are readable by any JS running on the page —
  fine for a course project, not what you'd ship for a real clinical app
  without further hardening (e.g. a same-origin reverse proxy in production).
- **Patient-list status tiles cost one extra request per patient**
  (`GET /logs/:id/today` for each, in parallel) to color-code who's logged
  today. Fine for a handful of patients; would need a dedicated bulk endpoint
  to scale.

## 5. What's intentionally out of scope

- Caregiver self-registration (the backend only allows admin-created
  caregivers via `/users/register`).
- Avatar/cover image upload, password change, admin screens (suspend/delete
  caregiver) — all real endpoints, just not wired into this UI.
- Editing/deleting existing vitals, physiotherapy sessions, or logs from the
  history list (create/update-today only).

## 6. Lab 8 — usability-testing fixes

Lab 7's usability testing (5 participants, SUS 81.5, 100% task success but
real friction) and heuristic evaluation (8 findings) were run against the
**design mockup**, not this codebase — so a few fixes below are described
against what the mockup did, which may differ slightly from what this
frontend did before today. Per your instruction, the Accessibility Summary
Dashboard, Color Contrast Audit, and Typography/Keyboard/ARIA Audit tables
(the report's 3rd section) were left alone, including the one contrast-
specific row inside the heuristics table itself (Dashboard & Trends → Chart
Ticks & Subtitles). Everything else from the two main tables is addressed
below.

| # | Finding (who / severity) | Before | After |
|---|---|---|---|
| 1 | BP input takes any text, no validation (Nikhil, Shourya confusion · Major, Error prevention) | A plain text box, placeholder `120/80`, no feedback | Format hint always visible under the label; real-time regex check as you type (red border + inline error text on a mismatch); **Save is blocked** with the field focused if the format's wrong and Vitals isn't skipped |
| 2 | Save button only reachable by scrolling to the bottom (Vinit · Major, Visibility of system status) | A plain `flex` row at the end of the form | `.sticky-action-bar`: Discard/Save now stick to the bottom of the viewport through the whole scroll, `position: sticky` (same technique the topbar already used) |
| 3 | AI summary has no copy/export action (Shivam · Minor, Flexibility & efficiency) | Summary text only, no actions | Added **Copy to clipboard**, **Download as .txt**, and — since Akash specifically looked for read-aloud — a **Read aloud** button using the browser's built-in `speechSynthesis`. True PDF export would need adding a library (e.g. jsPDF); I used a plain-text download instead to keep the project dependency-free, which is a real trade-off, not a full substitute |
| 4 | Pain slider "sensitivity" + toggle buttons lack focus/ARIA (Shivam · Major, Accessibility) | Bare `<input type="range">`, no tick marks; toggle/segmented/mood/medicine buttons had no `aria-pressed` | Added an 11-point `<datalist>` so the slider visibly snaps to each of its 10 steps; `aria-valuetext` reports the actual bucket ("Moderate") not just a raw number; every toggle-style button (Taken/Skipped, Yes/No, segmented, mood, wellness toggles) now sets `aria-pressed`; explicit high-contrast `:focus-visible` rings added for these specific custom controls |
| 5 | "Skip today" dims the section but doesn't say what happens to the rest of the form (Akash, Shivam · Minor, Error recovery & user control) | Opacity drops to 0.4, link text flips to "Skipped — undo" | An explicit banner appears inside the section: **"⚠ \[Section\] skipped for today — your other sections will still save normally. Click to undo."** — answers the exact question both testers had, not just a style change |
| 6 | Trends charts show raw numbers with no sense of what's "normal" (Nikhil · Minor, Match with real world) | Plain line charts, nothing to anchor the values against | Shaded reference bands added to BP/HR/SpO₂ charts (typical resting ranges), labeled as general ranges — not a personalized target — in a caption underneath. Separately, added a "View trends for this period →" link on the Recovery Summary page, since Nikhil expected charts near the summary; I linked the two screens rather than merging them, to avoid duplicating a full chart set inside the summary card |
| 7 | Patient delete has no confirmation step (Rishi · Cosmetic, Error prevention) | No delete action existed in this UI at all | Added one, built safely from the start: tap 🗑 once to arm it (turns into a red ✕ for 3 seconds), tap again to actually delete. `PatientsApi.remove()` already existed in `api.js` from the start but was never wired to anything until now |

**Not changed:** Vinit's "took a moment to notice the patient switcher" —
the demo had an inline dropdown on the Daily Log page itself; this frontend
switches patients via the sidebar's "My patients" list instead. That's a
structural difference from the mockup, not a bug, so I didn't add a second,
redundant switcher without you confirming you want one — happy to add it if
you do.
