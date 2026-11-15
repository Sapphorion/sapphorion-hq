// One division: where it stands, its tasks, deadlines, contacts, links and notes.
import { h, empty } from '../ui.js';
import { state, division, save, FOCUS } from '../state.js';
import { today, addDays } from '../dates.js';
import { taskRow, deadlineRow, upcoming, byDue, section } from '../parts.js';
import { editTask, editDeadline, editContact, editLink, editDivision } from '../forms.js';
import { contactCard } from './contacts.js';
import { linkRow } from './links.js';

export function divisionPage(id) {
  const d = division(id);
  if (!d) return h('div', { class: 'page' }, empty('That division doesn’t exist any more.', h('a', { class: 'btn', href: '#home' }, 'Back to Home')));
  const tasks = state.data.tasks.filter(t => t.divisionId === id);
  const open = tasks.filter(t => !t.done).sort(byDue);
  const done = tasks.filter(t => t.done).sort((a, b) => (b.doneOn || '').localeCompare(a.doneOn || ''));
  const deadlines = upcoming(today(), addDays(today(), 400), id);
  const seen = new Set(), dl = deadlines.filter(([, x]) => !seen.has(x.id) && seen.add(x.id));
  const past = state.data.deadlines.filter(x => x.divisionId === id && !seen.has(x.id));
  const contacts = state.data.contacts.filter(c => c.divisionId === id).sort((a, b) => a.name.localeCompare(b.name));
  const links = state.data.links.filter(l => l.divisionId === id);

  let notesTimer;
  const notes = h('textarea', { class: 'notes', rows: 6, placeholder: 'Ideas, decisions, things to remember…', 'aria-label': 'Notes for ' + d.name, value: d.notes || '',
    oninput: e => { clearTimeout(notesTimer); pending = e.target.value; notesTimer = setTimeout(flush, 400); },
    onchange: () => flush() });
  // Save straight away when you leave the page, so nothing typed in the last moment is lost.
  let pending = null;
  const flush = () => { clearTimeout(notesTimer); if (pending === null || !division(id)) return; const v = pending; pending = null; save('divisions', { ...division(id), notes: v }, { redraw: false }); };
  window.addEventListener('hashchange', flush, { capture: true, once: true });
  window.addEventListener('pagehide', flush, { once: true });

  return h('div', { class: 'page' },
    h('header', { class: 'page-head', style: { '--c': d.colour } },
      h('div', {}, h('p', { class: 'eyebrow' }, h('a', { href: '#home' }, 'Home'), ' › Division'), h('h1', { class: 'div-title' }, d.name), d.what ? h('p', { class: 'lead' }, d.what) : null),
      h('div', { class: 'row' },
        h('label', { class: 'sr', for: 'focus' }, 'Focus'),
        h('select', { id: 'focus', class: 'focus-select f-' + FOCUS.indexOf(d.focus), onchange: e => save('divisions', { ...d, focus: e.target.value }) }, FOCUS.map(f => h('option', { value: f, selected: f === d.focus }, f))),
        h('a', { class: 'btn', href: '#thoughts/new/' + encodeURIComponent(id) }, '✦ Share a thought'),
        h('button', { class: 'btn', onclick: () => editDivision(d) }, 'Edit'))),
    h('div', { class: 'grid2' },
      h('section', { class: 'card standing' },
        h('div', { class: 'card-head' }, h('h2', {}, 'Where it stands'), h('button', { class: 'link', onclick: () => editDivision(d) }, 'Update')),
        h('p', {}, d.status || '—'),
        h('h3', {}, 'Next step'), h('p', { class: 'next' }, d.next || '—')),
      section('Notes', null, notes)),
    h('div', { class: 'grid2' },
      section(`Tasks (${open.length})`, h('button', { class: 'btn small', onclick: () => editTask(null, { divisionId: id }) }, '+ Task'),
        open.length ? h('ul', { class: 'list' }, open.map(t => taskRow(t, { showDivision: false }))) : empty('No open tasks.'),
        done.length ? h('details', { class: 'done-list' }, h('summary', {}, `Done (${done.length})`), h('ul', { class: 'list' }, done.map(t => taskRow(t, { showDivision: false })))) : null),
      section('Deadlines', h('button', { class: 'btn small', onclick: () => editDeadline(null, { divisionId: id }) }, '+ Deadline'),
        dl.length || past.length ? h('ul', { class: 'list' }, dl.map(([date, x]) => deadlineRow(x, date, { showDivision: false })), past.map(x => deadlineRow(x, x.date, { showDivision: false }))) : empty('No deadlines.'))),
    h('div', { class: 'grid2' },
      section('Contacts', h('button', { class: 'btn small', onclick: () => editContact(null, { divisionId: id }) }, '+ Contact'),
        contacts.length ? h('div', { class: 'contacts' }, contacts.map(c => contactCard(c, { showDivision: false }))) : empty('No contacts yet.')),
      section('Links and accounts', h('button', { class: 'btn small', onclick: () => editLink(null, { divisionId: id }) }, '+ Link'),
        links.length ? h('ul', { class: 'list' }, links.map(l => linkRow(l, { showDivision: false }))) : empty('No links yet.'))));
}
