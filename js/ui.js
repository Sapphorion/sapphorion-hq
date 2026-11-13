// Small helpers for building the page.
export function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === false || v == null) continue;
    if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (k === 'style' && typeof v === 'object') { for (const [p, val] of Object.entries(v)) { if (p.startsWith('--')) el.style.setProperty(p, val); else el.style[p] = val; } }
    else if (k === 'value') el.value = v;
    else if (k === 'checked') el.checked = !!v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat(Infinity)) {
    if (kid == null || kid === false) continue;
    el.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
  }
  return el;
}

export const clear = el => { while (el.firstChild) el.firstChild.remove(); return el; };

let toastTimer;
export function toast(msg) {
  let t = document.getElementById('toast');
  if (!t) { t = h('div', { id: 'toast', role: 'status', 'aria-live': 'polite' }); document.body.append(t); }
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
}

// A dialog. Returns { el, close }.
export function modal(title, body, { wide = false } = {}) {
  const dlg = h('dialog', { class: 'modal' + (wide ? ' wide' : ''), 'aria-label': title },
    h('div', { class: 'modal-head' }, h('h2', {}, title), h('button', { class: 'icon-btn', 'aria-label': 'Close', onclick: () => close() }, '×')),
    h('div', { class: 'modal-body' }, body));
  const close = () => { dlg.close(); dlg.remove(); };
  dlg.addEventListener('cancel', e => { e.preventDefault(); close(); });
  dlg.addEventListener('click', e => { if (e.target === dlg) close(); });
  document.body.append(dlg);
  dlg.showModal();
  return { el: dlg, close };
}

export function confirmBox(title, text, okLabel = 'Delete') {
  return new Promise(res => {
    const m = modal(title, [
      h('p', {}, text),
      h('div', { class: 'row end' },
        h('button', { class: 'btn ghost', onclick: () => { m.close(); res(false); } }, 'Cancel'),
        h('button', { class: 'btn danger', onclick: () => { m.close(); res(true); } }, okLabel)),
    ]);
  });
}

// A form in a dialog. fields: [{ key, label, type: text|textarea|date|select|url|tel|email, options: [[value,label]], required, hint, placeholder }]
// Resolves with the filled-in values, or null if cancelled. onDelete adds a Delete button.
export function formDialog(title, fields, values = {}, { submitLabel = 'Save', onDelete } = {}) {
  return new Promise(res => {
    const inputs = {};
    const rows = fields.map(f => {
      const id = 'f-' + f.key;
      let input;
      if (f.type === 'textarea') input = h('textarea', { id, rows: f.rows || 3, placeholder: f.placeholder || '' });
      else if (f.type === 'select') input = h('select', { id }, f.options.map(([v, l]) => h('option', { value: v }, l)));
      else input = h('input', { id, type: f.type || 'text', placeholder: f.placeholder || '', autocomplete: 'off' });
      input.value = values[f.key] ?? f.default ?? '';
      if (f.required) input.required = true;
      inputs[f.key] = input;
      return h('div', { class: 'field' }, h('label', { for: id }, f.label), input, f.hint ? h('p', { class: 'hint' }, f.hint) : null);
    });
    let done = false;
    const finish = v => { if (done) return; done = true; m.close(); res(v); };
    const form = h('form', { class: 'form', onsubmit: e => {
      e.preventDefault();
      const out = {};
      for (const f of fields) out[f.key] = inputs[f.key].value.trim();
      finish(out);
    } }, rows,
      h('div', { class: 'row end' },
        onDelete ? h('button', { type: 'button', class: 'btn danger ghost left', onclick: async () => { if (await onDelete()) finish(null); } }, 'Delete') : null,
        h('button', { type: 'button', class: 'btn ghost', onclick: () => finish(null) }, 'Cancel'),
        h('button', { type: 'submit', class: 'btn primary' }, submitLabel)));
    const m = modal(title, form);
    m.el.addEventListener('close', () => { if (!done) { done = true; res(null); } });
    setTimeout(() => inputs[fields[0].key]?.focus(), 30);
  });
}

export const empty = (text, ...actions) => h('div', { class: 'empty' }, h('p', {}, text), actions.length ? h('div', { class: 'row' }, actions) : null);
