<img width="1011" height="860" alt="image" src="https://github.com/user-attachments/assets/f4979621-84a2-4463-b901-dac8c2504399" /># CuraFlow

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
- **CuraFlow-Backend** — the REST API it talks to: patients, prescriptions, daily logs, vitals, physiotherapy, reports, dashboards, and AI-generated summaries.

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
