const state = {
  user: null,
  patients: [],
  currentPatientId: null,
};

const listeners = new Set();

export function getState() {
  return state;
}

export function setState(patch) {
  Object.assign(state, patch);
  listeners.forEach((fn) => fn(state));
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getCurrentPatient() {
  return state.patients.find((p) => p._id === state.currentPatientId) || null;
}
