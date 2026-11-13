// Every task across all divisions, grouped by when it's due.
import { h, empty } from '../ui.js';
import { state } from '../state.js';
import { today, addDays } from '../dates.js';
import { taskRow, byDue } from '../parts.js';
import { editTask } from '../forms.js';

const filter = { division: '', showDone: false };

export function tasksPage() {
  const t0 = today(), week = addDays(t0, 7);
  const all = state.data.tasks.filter(t => !filter.division || t.divisionId === filter.division);
  const open = all.filter(t => !t.done).sort(byDue);
  const groups = [
    ['Late', open.filter(t => t.due && t.due < t0)],
    ['This week', open.filter(t => t.due && t.due >= t0 && t.due <= week)],
    ['Later', open.filter(t => t.due && t.due > week)],
    ['No date', open.filter(t => !t.due)],
  ];
  const done = all.filter(t => t.done).sort((a, b) => (b.doneOn || '').localeCompare(a.doneOn || ''));
  const redraw = () => window.dispatchEvent(new HashChangeEvent('hashchange'));

  return h('div', { class: 'page' },
    h('header', { class: 'page-head' }, h('h1', {}, 'Tasks'), h('button', { class: 'btn primary', onclick: () => editTask(null, { divisionId: filter.division || undefined }) }, '+ Task')),
    h('div', { class: 'filters', role: 'group', 'aria-label': 'Show tasks for' },
      [['', 'All'], ...state.data.divisions.map(d => [d.id, d.name])].map(([id, name]) =>
        h('button', { class: 'pill' + (filter.division === id ? ' on' : ''), 'aria-pressed': String(filter.division === id), onclick: () => { filter.division = id; redraw(); } }, name)),
      h('label', { class: 'toggle' }, h('input', { type: 'checkbox', checked: filter.showDone, onchange: e => { filter.showDone = e.target.checked; redraw(); } }), 'Show done')),
    open.length ? groups.filter(([, list]) => list.length).map(([title, list]) =>
      h('section', { class: 'card' + (title === 'Late' ? ' late-card' : '') }, h('div', { class: 'card-head' }, h('h2', {}, `${title} (${list.length})`)), h('ul', { class: 'list' }, list.map(t => taskRow(t, { showDivision: !filter.division })))))
      : h('section', { class: 'card' }, empty('No open tasks here.', h('button', { class: 'btn', onclick: () => editTask() }, 'Add a task'))),
    filter.showDone && done.length ? h('section', { class: 'card' }, h('div', { class: 'card-head' }, h('h2', {}, `Done (${done.length})`)), h('ul', { class: 'list' }, done.map(t => taskRow(t, { showDivision: !filter.division })))) : null);
}
