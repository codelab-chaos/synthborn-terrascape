export const VIEW_STATE_KEY = 'synthworldview.viewState.v1';

export function loadStoredViewState() {
  try {
    const raw = window.localStorage.getItem(VIEW_STATE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.warn('Failed to load view state', error);
    return null;
  }
}

export function saveStoredViewState(state) {
  try {
    window.localStorage.setItem(VIEW_STATE_KEY, JSON.stringify(state));
    return true;
  } catch (error) {
    console.warn('Failed to save view state', error);
    return false;
  }
}

export function vectorState(vector) {
  return {
    x: roundStateNumber(vector.x),
    y: roundStateNumber(vector.y),
    z: roundStateNumber(vector.z),
  };
}

export function isVectorState(value) {
  return value
    && Number.isFinite(value.x)
    && Number.isFinite(value.y)
    && Number.isFinite(value.z);
}

function roundStateNumber(value) {
  return Math.round(value * 1000) / 1000;
}
