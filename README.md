# CuraFlow

**A caregiver health-management platform that turns a working backend into an interface a tired caregiver can actually use.**

CuraFlow helps home caregivers track a patient's medications, vitals, physiotherapy, and daily wellness in one place — and get an AI-generated, evidence-backed recovery summary instead of having to piece one together themselves from scattered notes.

---

## The problem

Caregiving at home means juggling five different kinds of information — medications, vitals, physiotherapy, daily wellness, and medical records — usually across two or three different apps, each covering only a slice of the picture. On top of that:

- **Logging is a chore.** Most caregiver apps ask for more typing than a tired person at the end of a long day is willing to do, so logging stops happening.
- **Interfaces aren't built for the moment they're used in.** Dense tables and clinical jargon work against someone checking in quickly, often on a phone, often distracted.
- **AI tools that summarize a patient's recovery exist, but rarely explain themselves.** A caregiver is asked to trust a paragraph of text with no way to see what it's actually based on.

CuraFlow's design starts from one question: **can a caregiver open the app at 9pm, log today's care in under a minute, and trust what the AI tells them about their patient's recovery?**

## Objectives

- Bring medications, vitals, physiotherapy, and daily wellness into a single, low-friction daily check-in instead of five disconnected screens.
- Default every entry to toggles, sliders, and steppers rather than open text fields, so a full day's log is fast to complete.
- Make AI-generated recovery summaries explainable — every summary is paired with the data it was built from, not just the output.
- Keep the interface glanceable and color-coded (on-track / needs attention / overdue) rather than requiring a caregiver to read and interpret raw numbers.
- Design for a real caregiver managing more than one patient, not just a single patient-single caregiver relationship.

## Who this is for

A caregiver — family member or professional — managing day-to-day care for one or more patients recovering at home, who needs a fast way to log care and a trustworthy way to check in on how recovery is actually going.

---

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



## Navigating the app

The app is organized around two levels: an overview across all of a caregiver's patients, and a focused workspace once a specific patient is selected.

| Section | Screen | What it's for |
|---|---|---|
| **Overview** | Dashboard | Landing page — today's activity across every patient, who needs attention, recent reports |
| | My Patients | The full patient list, with an on-track / needs-attention status per patient |
| **Care** *(per patient)* | Daily Log | The core daily check-in — medications, vitals, physiotherapy, and wellness in one flow |
| | Recovery Summary | AI-generated recovery overview for a selected time range, with the data it's based on shown alongside it |
| | Trends | Charts of vitals, medication adherence, and physiotherapy pain levels over time |
| **Records** *(per patient)* | Prescriptions | Current and past medications |
| | Reports | Uploaded scans, lab results, and documents |
| | Vitals history / Physiotherapy log | Full history and detailed multi-exercise session logging |
| | Weekly Summary | A 7-day itemized view across logs, vitals, physiotherapy, and reports |

Selecting a patient from either the Dashboard or My Patients takes you straight into that patient's Daily Log — logging care is treated as the most time-pressured task a caregiver has, so it's one click away rather than behind a neutral landing page.

---

## Technology used

**Backend** — Node.js, Express, MongoDB with Mongoose, JWT-based authentication, Google Gemini for AI-generated recovery summaries, Cloudinary for file storage, Nodemailer for email delivery.

**Frontend** — Plain HTML, CSS, and JavaScript (ES modules), built with no framework and no build step by design — the entire app runs by serving static files, with its own lightweight hash-based router, state store, and API client.

**Hosting** — Backend deployed on Render; database on MongoDB Atlas.

---

## Team

- **Kush Mistry**
- **Rishi Datt Gupta**

---

## Repository structure

This project has two parts, each in its own repository:

- **[CuraFlow-Frontend](https://github.com/rishidatt2006-gif/CuraFlow-Frontend)** — the caregiver-facing interface described above.
- **[CuraFlow-Backend](https://github.com/shauryapastor2005-cyber/CuraFlow-Backend)** — the REST API it talks to: patients, prescriptions, daily logs, vitals, physiotherapy, reports, dashboards, and AI-generated summaries.

See each repository's own README for setup and run instructions.

### Frontend (`CuraFlow-Frontend`)

Plain HTML/CSS/JS, no build step — every file is served as-is:

```
CuraFlow-Frontend/
├── index.html            App shell — no inline CSS or JS
├── package.json          Scripts to serve the app locally (no build, no bundler)
├── LICENSE
├── README.md
├── css/
│   ├── base.css           Design tokens, reset, layout, auth screen
│   └── components.css     Every UI component: nav, cards, forms, charts, etc.
└── js/
    ├── config.js           API base URL
    ├── apiClient.js        Fetch wrapper — auth headers, token refresh
    ├── api.js               Every backend call, grouped by resource
    ├── state.js             Shared app state (current user, patients, selection)
    ├── router.js             Lightweight hash-based router
    ├── ui.js                 Shared UI helpers (toasts, modals, formatting)
    ├── charts.js             Dependency-free line/bar chart rendering
    ├── main.js               App entry point — wires routes to views
    └── views/                One file per screen (Dashboard, Daily Log, Trends,
                               Recovery Summary, Prescriptions, Reports, etc. —
                               see the navigation table above)
```

### Backend (`CuraFlow-Backend`)

A standard layered Express structure — routes, controllers, models, and services
for each resource (patients, prescriptions, daily logs, vitals, physiotherapy,
reports, dashboards, AI summaries, and user authentication).
