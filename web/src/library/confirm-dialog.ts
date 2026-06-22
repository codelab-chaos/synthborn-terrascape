const dialogEl = document.querySelector('#confirm-dialog');
const titleEl = document.querySelector('#confirm-dialog-title');
const messageEl = document.querySelector('#confirm-dialog-message');
const confirmButtonEl = document.querySelector('#confirm-dialog-confirm');
const cancelButtonEl = document.querySelector('#confirm-dialog-cancel');

export async function confirmAction({
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
} = {}) {
  if (!dialogEl || !titleEl || !messageEl || !confirmButtonEl || !cancelButtonEl) {
    return window.confirm(message || title || 'Continue?');
  }

  titleEl.textContent = title || 'Confirm';
  messageEl.textContent = message || '';
  confirmButtonEl.textContent = confirmLabel;
  cancelButtonEl.textContent = cancelLabel;

  dialogEl.returnValue = 'cancel';
  dialogEl.showModal();

  return new Promise((resolve) => {
    const onClose = () => {
      dialogEl.removeEventListener('close', onClose);
      resolve(dialogEl.returnValue === 'confirm');
    };
    dialogEl.addEventListener('close', onClose);
  });
}
