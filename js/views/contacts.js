// Contacts per division. Kept on your devices and in your private data repository only.
import { h, empty } from '../ui.js';
import { state } from '../state.js';
import { chip } from '../parts.js';
import { editContact } from '../forms.js';

const filter = { q: '' };

// South African numbers to WhatsApp's international form: 082 123 4567 → 27821234567.
const wa = p => { let n = (p || '').replace(/[^\d+]/g, ''); if (n.startsWith('+')) n = n.slice(1); else if (n.startsWith('0')) n = '27' + n.slice(1); return n.length >= 9 ? 'https://wa.me/' + n : ''; };

export function contactCard(c, { showDivision = true } = {}) {
  const w = wa(c.phone);
  return h('div', { class: 'contact' },
    h('button', { class: 'contact-main', onclick: () => editContact(c) },
      h('span', { class: 'item-title' }, c.name),
      h('span', { class: 'item-sub' }, [c.role, c.org].filter(Boolean).join(', '))),
    showDivision ? chip(c.divisionId) : null,
    h('div', { class: 'contact-actions' },
      c.phone ? h('a', { class: 'btn small', href: 'tel:' + c.phone.replace(/\s/g, '') }, 'Call') : null,
      w ? h('a', { class: 'btn small', href: w, target: '_blank', rel: 'noopener' }, 'WhatsApp') : null,
      c.email ? h('a', { class: 'btn small', href: 'mailto:' + c.email }, 'Email') : null),
    c.notes ? h('p', { class: 'item-sub' }, c.notes) : null);
}

export function contactsPage() {
  const q = filter.q.toLowerCase();
  const list = state.data.contacts.filter(c => !q || [c.name, c.org, c.role, c.email, c.phone, c.notes].join(' ').toLowerCase().includes(q));
  const search = h('input', { type: 'search', class: 'search', placeholder: 'Search contacts', 'aria-label': 'Search contacts', value: filter.q,
    oninput: e => { filter.q = e.target.value; const pos = e.target.selectionStart; window.dispatchEvent(new HashChangeEvent('hashchange')); const s = document.querySelector('.search'); s?.focus(); s?.setSelectionRange(pos, pos); } });
  return h('div', { class: 'page' },
    h('header', { class: 'page-head' }, h('h1', {}, 'Contacts'), h('button', { class: 'btn primary', onclick: () => editContact() }, '+ Contact')),
    h('p', { class: 'privacy' }, 'These are other people’s personal details, so POPIA applies: keep only what you need for the business, and keep the data repository private.'),
    search,
    state.data.contacts.length === 0
      ? h('section', { class: 'card' }, empty('No contacts yet. Add the people you deal with for each division: the pilot school, tutoring parents, web clients.', h('button', { class: 'btn', onclick: () => editContact() }, 'Add a contact')))
      : state.data.divisions.map(d => {
        const mine = list.filter(c => c.divisionId === d.id).sort((a, b) => a.name.localeCompare(b.name));
        return mine.length ? h('section', { class: 'card' }, h('div', { class: 'card-head' }, h('h2', {}, d.name)), h('div', { class: 'contacts' }, mine.map(c => contactCard(c, { showDivision: false })))) : null;
      }),
    state.data.contacts.length && !list.length ? h('section', { class: 'card' }, empty('No contacts match that search.')) : null);
}
