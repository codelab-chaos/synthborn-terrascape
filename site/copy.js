// Keep the guide readable without JavaScript; enhance snippets when it is available.
const status = document.getElementById('copy-status');
document.querySelectorAll('pre').forEach((pre, index) => {
  const code = pre.querySelector('code');
  if (!code) return;
  const wrapper = document.createElement('div');
  wrapper.className = 'code-block';
  const toolbar = document.createElement('div');
  toolbar.className = 'code-toolbar';
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'copy-btn';
  button.textContent = 'Copy';
  button.setAttribute('aria-label', `Copy code block ${index + 1}`);
  const error = document.createElement('p');
  error.className = 'copy-error';
  error.id = `copy-error-${index + 1}`;
  error.hidden = true;
  let resetTimer;
  button.addEventListener('click', async () => {
    clearTimeout(resetTimer);
    error.hidden = true;
    button.removeAttribute('aria-describedby');
    button.disabled = true;
    button.textContent = 'Copying…';
    status.textContent = '';
    try {
      await navigator.clipboard.writeText(code.textContent);
      button.textContent = 'Copied';
      status.textContent = `Code block ${index + 1} copied to clipboard.`;
      resetTimer = setTimeout(() => { button.textContent = 'Copy'; }, 2500);
    } catch {
      button.textContent = 'Retry copy';
      error.textContent = 'Clipboard unavailable. Select the code and copy it manually, or retry.';
      error.hidden = false;
      button.setAttribute('aria-describedby', error.id);
      status.textContent = error.textContent;
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(code);
      selection.removeAllRanges();
      selection.addRange(range);
    } finally {
      button.disabled = false;
    }
  });
  pre.before(wrapper);
  if (pre.dataset.label) {
    const label = document.createElement('span');
    label.className = 'code-label';
    label.textContent = pre.dataset.label;
    toolbar.appendChild(label);
  }
  toolbar.appendChild(button);
  wrapper.append(toolbar, pre, error);
});
