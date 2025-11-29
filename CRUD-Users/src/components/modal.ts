export type ModalConfig = {
  title?: string;
  submitLabel?: string;
  onSubmit?: (data: { id?: string | number; name: string; email: string; created?: string }) => Promise<void> | void;
  onCancel?: () => void;
};

export default function createModal() {
  const modal = document.getElementById('modal')! as HTMLDivElement;
  const titleEl = document.getElementById('modal-title')! as HTMLHeadingElement;
  const idInput = document.getElementById('user-id') as HTMLInputElement;
  const createdInput = document.getElementById('user-created') as HTMLInputElement;
  const nameInput = document.getElementById('user-name') as HTMLInputElement;
  const emailInput = document.getElementById('user-email') as HTMLInputElement;
  const form = document.getElementById('user-form') as HTMLFormElement;
  const submitBtn = document.getElementById('save-btn') as HTMLButtonElement;

  let cfg: ModalConfig = {};

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const data = {
      id: idInput.value || undefined,
      created: createdInput.value || undefined,
      name: nameInput.value.trim(),
      email: emailInput.value.trim(),
    };
    if (cfg.onSubmit) await cfg.onSubmit(data);
  });

  const cancelBtn = document.getElementById('cancel-btn') as HTMLButtonElement | null;
  if (cancelBtn) cancelBtn.addEventListener('click', () => {
    if (cfg.onCancel) cfg.onCancel();
    close();
  });

  function open(data?: Partial<{ id: string | number; name: string; email: string; created: string }>, config?: ModalConfig) {
    cfg = config || {};
    const hasId = !!(data && data.id !== undefined && data.id !== null && data.id !== '');
    titleEl.textContent = cfg.title || (hasId ? 'Editar usuario' : 'Agregar usuario');
    submitBtn.textContent = cfg.submitLabel || (hasId ? 'Guardar cambios' : 'Crear');
    idInput.value = data && data.id ? String(data.id) : '';
    createdInput.value = data && data.created ? String(data.created) : '';
    nameInput.value = data && data.name ? data.name : '';
    emailInput.value = data && data.email ? data.email : '';
    modal.setAttribute('aria-hidden', 'false');
    modal.classList.add('open');
    nameInput.focus();
  }

  function close() {
    modal.setAttribute('aria-hidden', 'true');
    modal.classList.remove('open');
    form.reset();
    submitBtn.textContent = 'Crear';
  }

  return { open, close };
}
