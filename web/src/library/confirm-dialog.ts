const dialogEl = document.querySelector<HTMLDialogElement>('#confirm-dialog');
const titleEl = document.querySelector<HTMLElement>('#confirm-dialog-title');
const messageEl = document.querySelector<HTMLElement>('#confirm-dialog-message');
const confirmButtonEl = document.querySelector<HTMLButtonElement>('#confirm-dialog-confirm');
const cancelButtonEl = document.querySelector<HTMLButtonElement>('#confirm-dialog-cancel');

type ConfirmActionOptions = {
  title?: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
};

export async function confirmAction({
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
}: ConfirmActionOptions = {}) {
  if (!dialogEl || !titleEl || !messageEl || !confirmButtonEl || !cancelButtonEl) {
    return window.confirm(message || title || 'Continue?');
  }

  titleEl.textContent = title || 'Confirm';
  messageEl.textContent = message || '';
  confirmButtonEl.textContent = confirmLabel;
  cancelButtonEl.textContent = cancelLabel;

  dialogEl.returnValue = 'cancel';
  dialogEl.showModal();

  return new Promise<boolean>((resolve) => {
    const onClose = () => {
      dialogEl.removeEventListener('close', onClose);
      resolve(dialogEl.returnValue === 'confirm');
    };
    dialogEl.addEventListener('close', onClose);
  });
}
