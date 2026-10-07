import { apiRequest } from "./apiClient.js";

const qs = (params = {}) => {
  const clean = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "")
  );
  const s = new URLSearchParams(clean).toString();
  return s ? `?${s}` : "";
};

export const AuthApi = {
  // The backend accepts either { email, password } or { username, password }
  login: (identifier, password) => {
    const body = identifier.includes("@")
      ? { email: identifier, password }
      : { username: identifier, password };
    return apiRequest("/users/login", { method: "POST", body });
  },
  logout: () => apiRequest("/users/logout", { method: "POST" }),
  currentUser: () => apiRequest("/users/current-user"),
};

export const PatientsApi = {
  list: (params = {}) => apiRequest(`/patients${qs({ page: 1, limit: 20, ...params })}`),
  get: (id) => apiRequest(`/patients/${id}`),
  create: (payload) => apiRequest("/patients", { method: "POST", body: payload }),
  update: (id, payload) => apiRequest(`/patients/${id}`, { method: "PATCH", body: payload }),
  remove: (id) => apiRequest(`/patients/${id}`, { method: "DELETE" }),
};

export const DailyLogApi = {
  today: (patientId) => apiRequest(`/patients/${patientId}/logs/today`),
  weekly: (patientId) => apiRequest(`/patients/${patientId}/logs/weekly`),
  // startDate/endDate (YYYY-MM-DD) switches this into date-range mode on the backend
  list: (patientId, params = {}) => apiRequest(`/patients/${patientId}/logs${qs(params)}`),
  create: (patientId, payload) =>
    apiRequest(`/patients/${patientId}/logs`, { method: "POST", body: payload }),
  update: (logId, payload) => apiRequest(`/logs/${logId}`, { method: "PATCH", body: payload }),
  remove: (logId) => apiRequest(`/logs/${logId}`, { method: "DELETE" }),
  missedMedicines: (patientId) => apiRequest(`/patients/${patientId}/logs/missed-medicines`),
};

export const VitalsApi = {
  today: (patientId) => apiRequest(`/patients/${patientId}/vitals/today`),
  weekly: (patientId) => apiRequest(`/patients/${patientId}/vitals/weekly`),
  analytics: (patientId, range = "week") =>
    apiRequest(`/patients/${patientId}/vitals/analytics${qs({ range })}`),
  create: (patientId, payload) =>
    apiRequest(`/patients/${patientId}/vitals`, { method: "POST", body: payload }),
  update: (id, payload) => apiRequest(`/vitals/${id}`, { method: "PATCH", body: payload }),
  remove: (id) => apiRequest(`/vitals/${id}`, { method: "DELETE" }),
};

export const PhysiotherapyApi = {
  today: (patientId) => apiRequest(`/patients/${patientId}/physiotherapy/today`),
  weekly: (patientId) => apiRequest(`/patients/${patientId}/physiotherapy/weekly`),
  // startDate/endDate (YYYY-MM-DD) switches this into date-range mode on the backend
  list: (patientId, params = {}) => apiRequest(`/patients/${patientId}/physiotherapy${qs(params)}`),
  create: (patientId, payload) =>
    apiRequest(`/patients/${patientId}/physiotherapy`, { method: "POST", body: payload }),
  update: (id, payload) => apiRequest(`/physiotherapy/${id}`, { method: "PATCH", body: payload }),
  remove: (id) => apiRequest(`/physiotherapy/${id}`, { method: "DELETE" }),
};

export const PrescriptionsApi = {
  current: (patientId) => apiRequest(`/patients/${patientId}/prescriptions/current`),
  list: (patientId, params = {}) =>
    apiRequest(`/patients/${patientId}/prescriptions${qs(params)}`),
  expiring: (patientId, days = 7) =>
    apiRequest(`/patients/${patientId}/prescriptions/expiring${qs({ days })}`),
  create: (patientId, payload) =>
    apiRequest(`/patients/${patientId}/prescriptions`, { method: "POST", body: payload }),
  update: (id, payload) => apiRequest(`/prescriptions/${id}`, { method: "PATCH", body: payload }),
  remove: (id) => apiRequest(`/prescriptions/${id}`, { method: "DELETE" }),
};

export const ReportsApi = {
  list: (patientId, params = {}) => apiRequest(`/patients/${patientId}/reports${qs(params)}`),
  // formData must contain a "reportFile" file field plus category/reportName/etc.
  create: (patientId, formData) =>
    apiRequest(`/patients/${patientId}/reports`, { method: "POST", body: formData, isForm: true }),
  remove: (id) => apiRequest(`/reports/${id}`, { method: "DELETE" }),
};

export const DashboardApi = {
  global: () => apiRequest("/dashboard"),
  patient: (patientId) => apiRequest(`/patients/${patientId}/dashboard`),
};

export const SummaryApi = {
  // range: "week" | "month" | "6months" | "all"
  generate: (patientId, range = "week") =>
    apiRequest(`/patients/${patientId}/summary${qs({ range })}`, { method: "POST" }),
};
