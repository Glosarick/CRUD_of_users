export default function createPagination(container: HTMLElement, onChange: (page: number) => void) {
  function render(total: number, page: number, limit: number) {
    const pages = Math.max(1, Math.ceil(total / limit));
    container.innerHTML = '';

    const info = document.createElement('span');
    info.className = 'pagination-info';
    info.textContent = `Página ${page} de ${pages}`;
    container.appendChild(info);

    const controls = document.createElement('div');
    controls.className = 'pagination-controls';
    container.appendChild(controls);

    const createIcon = (dir: 'left' | 'right') => {
      const ns = 'http://www.w3.org/2000/svg';
      const svg = document.createElementNS(ns, 'svg');
      svg.setAttribute('viewBox', '0 0 24 24');
      svg.setAttribute('width', '16');
      svg.setAttribute('height', '16');
      svg.setAttribute('aria-hidden', 'true');
      const path = document.createElementNS(ns, 'path');
      path.setAttribute('fill', 'currentColor');
      if (dir === 'left') {
        path.setAttribute('d', 'M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z');
      } else {
        path.setAttribute('d', 'M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z');
      }
      svg.appendChild(path);
      return svg;
    };

    const addBtn = (text: string, disabled: boolean, cb: () => void, iconDir?: 'left' | 'right') => {
      const b = document.createElement('button');
      if (iconDir) {
        b.classList.add('icon-btn');
        const icon = createIcon(iconDir);
        if (iconDir === 'left') {
          b.appendChild(icon);
          const span = document.createElement('span');
          span.textContent = ` ${text}`;
          b.appendChild(span);
        } else {
          const span = document.createElement('span');
          span.textContent = `${text} `;
          b.appendChild(span);
          b.appendChild(createIcon(iconDir));
        }
      } else {
        b.textContent = text;
      }
      if (disabled) b.disabled = true;
      b.addEventListener('click', cb);
      controls.appendChild(b);
      return b;
    };

  addBtn('Anterior', page <= 1, () => onChange(Math.max(1, page - 1)), 'left');

    const maxButtons = 7;
    let start = Math.max(1, page - Math.floor(maxButtons / 2));
    let end = start + maxButtons - 1;
    if (end > pages) {
      end = pages;
      start = Math.max(1, end - maxButtons + 1);
    }

    if (start > 1) {
  const b = document.createElement('button');
  b.textContent = '1';
  b.addEventListener('click', () => onChange(1));
  controls.appendChild(b);
      if (start > 2) {
          const sep = document.createElement('span');
          sep.textContent = '...';
          controls.appendChild(sep);
      }
    }

    for (let p = start; p <= end; p++) {
  const btn = document.createElement('button');
  btn.textContent = String(p);
  if (p === page) btn.classList.add('active');
  btn.addEventListener('click', () => onChange(p));
  controls.appendChild(btn);
    }

    if (end < pages) {
      if (end < pages - 1) {
  const sep = document.createElement('span');
  sep.textContent = '...';
  controls.appendChild(sep);
      }
  const b = document.createElement('button');
  b.textContent = String(pages);
  b.addEventListener('click', () => onChange(pages));
  controls.appendChild(b);
    }

  addBtn('Siguiente', page >= pages, () => onChange(Math.min(pages, page + 1)), 'right');
  }

  return { render };
}
