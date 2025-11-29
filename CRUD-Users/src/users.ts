import { fetchUsers, addUser, updateUser, deleteUser } from './utils/api';
import createModal from './components/modal';
import createPagination from './components/pagination';

type IUser = { id: number | string; name: string; email: string; created: string };

const app = document.getElementById('app')!;

app.innerHTML = `
  <div class="users-container">
    <h1>Usuarios</h1>
    <div class="toolbar">
      <div class="search-group">
        <input id="search-input" placeholder="Buscar" />
        <button type="button" id="clear-search-btn" class="clear-search-btn hidden" aria-label="Limpiar búsqueda">&times;</button>
      </div>
      <label for="limit-select">Mostrar:</label>
      <select id="limit-select">
        <option value="5" selected>5</option>
        <option value="10">10</option>
        <option value="25">25</option>
        <option value="50">50</option>
      </select>
      <button id="open-add-btn">Agregar usuario</button>
    </div>

    <div id="notifications" class="toast-container" aria-live="polite"></div>

    <div class="table-wrap">
      <table id="users-table">
        <thead><tr><th>Nombre</th><th>Email</th><th>Acciones</th></tr></thead>
        <tbody id="users-tbody"></tbody>
      </table>
    </div>

    <div class="pagination" id="pagination"></div>
  <div id="error-panel" class="error-panel hidden"></div>
  <div id="spinner" class="spinner hidden">Cargando...</div>

    <!-- Modal markup -->
    <div id="modal" class="modal" role="dialog" aria-hidden="true">
      <div class="modal-content">
        <h2 id="modal-title"></h2>
        <form id="user-form">
          <input type="hidden" id="user-id" />
          <input type="hidden" id="user-created" />
          <div class="form-row"><label>Nombre</label><input id="user-name" required /></div>
          <div class="form-row"><label>Email</label><input id="user-email" type="email" required /></div>
          <div class="form-actions">
            <button type="submit" id="save-btn">Guardar</button>
            <button type="button" id="cancel-btn">Cancelar</button>
          </div>
        </form>
      </div>
    </div>

  </div>
`;

const usersTbody = document.getElementById('users-tbody') as HTMLTableSectionElement;
const notificationContainer = document.getElementById('notifications') as HTMLDivElement;
const searchInput = document.getElementById('search-input') as HTMLInputElement;
const clearSearchBtn = document.getElementById('clear-search-btn') as HTMLButtonElement | null;
const limitSelect = document.getElementById('limit-select') as HTMLSelectElement;

let currentUsers: IUser[] = [];
let total = 0;
let currentPage = 1;
let currentLimit = Number(limitSelect.value) || 5;

type ToastType = 'success' | 'error' | 'info' | 'warning';

function showToast(message: string, type: ToastType = 'info', timeout = 3500) {
  if (!notificationContainer) return;
  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.setAttribute('role', type === 'error' ? 'alert' : 'status');
  toast.textContent = message;

  notificationContainer.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add('show'));

  const removeToast = () => {
    toast.classList.remove('show');
    toast.addEventListener('transitionend', () => toast.remove(), { once: true });
  };

  const timer = window.setTimeout(removeToast, timeout);
  toast.addEventListener('click', () => {
    window.clearTimeout(timer);
    removeToast();
  });
}

const normalizeEmail = (email: string) => email.trim().toLowerCase();

async function emailExists(email: string, excludeId?: number | string): Promise<boolean> {
  const normalized = normalizeEmail(email);
  if (!normalized) return false;
  const matchesLocal = currentUsers.some((u) => normalizeEmail(u.email) === normalized && (excludeId === undefined || String(u.id) !== String(excludeId)));
  if (matchesLocal) return true;
  try {
    const lookup = await fetchUsers(normalized, 1, 5);
    const fetchedUsers = lookup && typeof lookup === 'object' && 'users' in lookup
      ? ((lookup as { users?: IUser[] }).users || [])
      : [];
    return fetchedUsers.some((u: IUser) => normalizeEmail(u.email) === normalized && (excludeId === undefined || String(u.id) !== String(excludeId)));
  } catch (err) {
    console.warn('No se pudo validar el email de manera anticipada', err);
    return false;
  }
}

function updateClearSearchVisibility() {
  if (!clearSearchBtn) return;
  const hasValue = searchInput.value.trim().length > 0;
  clearSearchBtn.classList.toggle('hidden', !hasValue);
}

function getErrorMessage(err: unknown, fallback: string) {
  if (typeof err === 'string') {
    return err;
  }
  if (err && typeof err === 'object') {
    const maybeMessage = (err as { message?: unknown }).message;
    if (typeof maybeMessage === 'string' && maybeMessage.trim()) {
      const normalized = maybeMessage.trim();
      const normalizedLower = normalized.toLowerCase();
      if (normalized === 'Email already exists' || normalized === 'API error 409') {
        return 'Ya existe un usuario con ese email';
      }
      if (normalized === 'User not found') {
        return 'Usuario no encontrado';
      }
      if (normalizedLower.includes('failed to fetch')) {
        return 'No se pudo conectar con la API.';
      }
      return normalized;
    }
  }
  return fallback;
}

function showErrorPanel(msg: string) {
  const el = document.getElementById('error-panel') as HTMLDivElement;
  el.classList.remove('hidden');
  el.innerHTML = '';
  const p = document.createElement('p');
  p.textContent = msg;
  el.appendChild(p);
  const btn = document.createElement('button');
  btn.textContent = 'Reintentar';
  btn.addEventListener('click', () => { el.classList.add('hidden'); refresh(searchInput.value.trim()); });
  el.appendChild(btn);
}

function escapeHtml(s: string) {
  return s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

const modal = createModal();
const pagination = createPagination(document.getElementById('pagination') as HTMLDivElement, (p) => {
  currentPage = p;
  refresh(searchInput.value.trim());
});

function renderUsers(users: IUser[]) {
  usersTbody.innerHTML = '';
  for (const u of users) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${escapeHtml(u.name)}</td>
      <td>${escapeHtml(u.email)}</td>
      <td>
        <button class="edit-btn" data-id="${u.id}">Editar</button>
        <button class="delete-btn" data-id="${u.id}">Eliminar</button>
      </td>
    `;
    usersTbody.appendChild(tr);
  }
}

async function refresh(q = '') {
  const spinner = document.getElementById('spinner') as HTMLDivElement;
  spinner.classList.remove('hidden');
  try {
    const res = await fetchUsers(q, currentPage, currentLimit);
    currentUsers = res.users || [];
    total = res.total || currentUsers.length;
    currentPage = res.page || currentPage;
    currentLimit = res.limit || currentLimit;
    renderUsers(currentUsers);
    pagination.render(total, currentPage, currentLimit);
  } catch (err) {
    showErrorPanel('No se puede conectar con la API. Asegúrate de que el servidor está levantado.');
    usersTbody.innerHTML = '';
    console.error(err);
  } finally {
    spinner.classList.add('hidden');
    updateClearSearchVisibility();
  }
}

// Events
if (clearSearchBtn) {
  clearSearchBtn.addEventListener('click', () => {
    if (!searchInput.value.trim()) {
      searchInput.value = '';
      updateClearSearchVisibility();
      searchInput.focus();
      return;
    }
    searchInput.value = '';
    currentPage = 1;
    updateClearSearchVisibility();
    void refresh('');
    searchInput.focus();
  });
}

document.getElementById('open-add-btn')!.addEventListener('click', () => {
  modal.open(undefined, {
    title: 'Agregar usuario',
    submitLabel: 'Crear',
    onSubmit: async (data) => {
      try {
        const trimmedEmail = data.email.trim();
        if (await emailExists(trimmedEmail)) {
          showToast('Ya existe un usuario con ese email', 'warning');
          return;
        }
        const payload = {
          id: -1,
          name: data.name.trim(),
          email: trimmedEmail,
          created: new Date().toISOString(),
        };
        const resp = await addUser<IUser>(payload);
        const createdUser = resp && typeof resp === 'object' && 'user' in resp
          ? (resp as { user: IUser }).user
          : resp;
        showToast('Usuario creado correctamente', 'success');
        modal.close();
        const filterVal = (createdUser && (createdUser.email || createdUser.name)) || '';
        searchInput.value = filterVal;
        updateClearSearchVisibility();
        currentPage = 1;
        await refresh(filterVal.trim());
      } catch (err) {
        const message = getErrorMessage(err, 'Error al crear usuario');
        showToast(message, 'error');
        console.error(err);
      }
    },
    onCancel: () => showToast('Operación cancelada', 'info'),
  });
});

usersTbody.addEventListener('click', async (ev) => {
  const target = ev.target as HTMLElement;
  if (target.matches('.delete-btn')) {
    const id = target.getAttribute('data-id')!;
    if (!confirm('¿Eliminar este usuario?')) return;
    try {
      await deleteUser(id);
      showToast('Usuario eliminado correctamente', 'error');
      await refresh(searchInput.value.trim());
    } catch (err) {
      showToast(getErrorMessage(err, 'Error al eliminar usuario'), 'error');
      console.error(err);
    }
  } else if (target.matches('.edit-btn')) {
    const id = Number(target.getAttribute('data-id'));
    const user = currentUsers.find(u => Number(u.id) === Number(id));
    if (!user) { showToast('Usuario no encontrado', 'warning'); return; }
    modal.open(user, {
      title: 'Editar usuario',
      submitLabel: 'Guardar cambios',
      onSubmit: async (data) => {
        try {
          const trimmedEmail = data.email.trim();
          if (await emailExists(trimmedEmail, data.id)) {
            showToast('Ya existe un usuario con ese email', 'warning');
            return;
          }
          await updateUser({
            id: Number(data.id),
            name: data.name.trim(),
            email: trimmedEmail,
            created: data.created || new Date().toISOString(),
          });
          showToast('Usuario actualizado correctamente', 'success');
          modal.close();
          await refresh(searchInput.value.trim());
        } catch (err) {
          showToast(getErrorMessage(err, 'Error al actualizar usuario'), 'error');
          console.error(err);
        }
      },
      onCancel: () => showToast('Operación cancelada', 'info'),
    });
  }
});

const debounce = (fn: (...args: any[]) => void, wait = 250) => {
  let t: any = null;
  return (...args: any[]) => {
    if (t) clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
};

const onSearch = debounce((e: Event) => { currentPage = 1; refresh((e.target as HTMLInputElement).value.trim()); }, 300);
searchInput.addEventListener('input', (event) => {
  updateClearSearchVisibility();
  onSearch(event);
});

limitSelect.addEventListener('change', () => { currentLimit = Number(limitSelect.value) || 10; currentPage = 1; refresh(searchInput.value.trim()); });

// Cargar datos desde el inicio usando el límite y búsqueda actuales
refresh(searchInput.value.trim());
