// Highlight the lines of the example file that belong to the step being read.
// Steps declare data-file-step; file lines are grouped by data-step ("all" lights every group).
// The step being read is the last one whose top has crossed the reading line.
const READING_LINE = 0.4;
const steps = [...document.querySelectorAll('[data-file-step]')];
const groups = [...document.querySelectorAll('.file-group[data-step]')];

function currentStep() {
  const line = window.innerHeight * READING_LINE;
  const passed = steps.filter((step) => step.getBoundingClientRect().top <= line);
  const last = passed[passed.length - 1];
  if (!last || last.getBoundingClientRect().bottom < 0) return null;
  return last.dataset.fileStep;
}

function highlight() {
  const stepId = currentStep();
  groups.forEach((group) => {
    group.classList.toggle('is-active', stepId === 'all' || group.dataset.step === stepId);
  });
}

if (steps.length && groups.length) {
  let queued = false;
  const schedule = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; highlight(); });
  };
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
  highlight();
}
