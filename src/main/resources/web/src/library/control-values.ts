import { applyTriStateValue } from './tri-state-control.js';

type TriStateValuesById = Record<string, string[]>;

type PairedControlOptions = {
  onUpdate?: () => void;
  onSave?: () => void;
};

type RadiusControlOptions = {
  setRadius: (value: string | number) => string | number;
  updateReadout: () => void;
  onChange: () => void;
};

export function applyNumberParam(params: URLSearchParams, name: string, input: HTMLInputElement) {
  const value = params.get(name);
  if (value === null || value.trim() === '') return null;
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) return null;
  input.value = String(parsed);
  return parsed;
}

export function applyBooleanParam(params: URLSearchParams, name: string, input: HTMLInputElement) {
  const value = params.get(name);
  if (value === null) return false;
  input.checked = isTruthyParam(value);
  return true;
}

export function applyFloatParam(params: URLSearchParams, name: string, ...inputs: HTMLInputElement[]) {
  const value = params.get(name);
  if (value === null || value.trim() === '') return null;
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) return null;
  for (const input of inputs) {
    input.value = String(parsed);
  }
  return parsed;
}

export function applySelectParam(
  params: URLSearchParams,
  name: string,
  input: HTMLInputElement | HTMLSelectElement,
  triStateValuesById: TriStateValuesById = {},
) {
  const value = params.get(name);
  if (value === null) return false;
  return applySelectValue(input, value, triStateValuesById);
}

export function applySelectValue(
  input: HTMLInputElement | HTMLSelectElement | null,
  value: string,
  triStateValuesById: TriStateValuesById = {},
) {
  if (!input) return false;
  const triStateValues = triStateValuesById[input.id];
  if (triStateValues) {
    applyTriStateValue(input, value, triStateValues);
    return true;
  }
  if (input.tagName === 'SELECT') {
    for (const option of (input as HTMLSelectElement).options) {
      if (option.value === value) {
        input.value = value;
        return true;
      }
    }
    return false;
  }
  input.value = value;
  return true;
}

export function setNumberInput(input: HTMLInputElement, value: unknown) {
  if (Number.isFinite(value)) {
    input.value = String(value);
    return true;
  }
  return false;
}

export function setPairedControlValue(rangeInput: HTMLInputElement, numberInput: HTMLInputElement, value: unknown) {
  if (!Number.isFinite(value)) return null;
  const normalized = normalizePairedValue(rangeInput, Number(value));
  rangeInput.value = String(normalized);
  numberInput.value = String(normalized);
  return normalized;
}

export function normalizePairedValue(input: HTMLInputElement, value: unknown) {
  const min = Number.parseFloat(input.min);
  const max = Number.parseFloat(input.max);
  const step = Number.parseFloat(input.step);
  let normalized = Number(value);
  if (!Number.isFinite(normalized)) {
    return Number.parseFloat(input.value);
  }
  if (Number.isFinite(min)) normalized = Math.max(min, normalized);
  if (Number.isFinite(max)) normalized = Math.min(max, normalized);
  if (Number.isFinite(step) && step > 0) {
    normalized = Math.round(normalized / step) * step;
  }
  return Number.parseFloat(normalized.toFixed(4));
}

export function bindPairedControl(
  rangeInput: HTMLInputElement,
  numberInput: HTMLInputElement,
  options: PairedControlOptions = {},
) {
  const onUpdate = options.onUpdate ?? (() => {});
  const onSave = options.onSave ?? (() => {});
  rangeInput.addEventListener('input', () => {
    numberInput.value = rangeInput.value;
    onUpdate();
    onSave();
  });
  numberInput.addEventListener('input', () => {
    const parsed = Number.parseFloat(numberInput.value);
    if (Number.isFinite(parsed)) {
      rangeInput.value = String(normalizePairedValue(rangeInput, parsed));
    }
    onUpdate();
    onSave();
  });
  numberInput.addEventListener('change', () => {
    setPairedControlValue(rangeInput, numberInput, Number.parseFloat(numberInput.value));
    onUpdate();
    onSave();
  });
}

export function bindRadiusControl(
  rangeInput: HTMLInputElement,
  numberInput: HTMLInputElement,
  options: RadiusControlOptions,
) {
  rangeInput.addEventListener('input', () => {
    numberInput.value = rangeInput.value;
    options.updateReadout();
    options.onChange();
  });
  numberInput.addEventListener('input', () => {
    const parsed = Number.parseInt(numberInput.value, 10);
    if (Number.isFinite(parsed)) {
      rangeInput.value = String(normalizePairedValue(rangeInput, parsed));
    }
    options.updateReadout();
    options.onChange();
  });
  numberInput.addEventListener('change', () => {
    options.setRadius(numberInput.value);
    options.onChange();
  });
  rangeInput.addEventListener('change', () => {
    options.setRadius(rangeInput.value);
    options.onChange();
  });
}

export function isTruthyParam(value: string) {
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}
