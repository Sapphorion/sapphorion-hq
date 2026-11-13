// Pieces used on several pages: a task row, a deadline row, a division chip.
import { h } from './ui.js';
import { divisionName, divisionColour, state } from './state.js';
import { nice, when, today, repeatLabel, nextDate, occurrences, addDays } from './dates.js';
import { editTask, toggleTask, editDeadline } from './forms.js';

export const chip = id => h('a', { class: 'chip', href: '#division/' + id, style: { '--c': divisionColour(id) } }, divisionName(id));

export function taskRow(t, { showDivision = true } = {}) {
  const late = !t.done && t.due && t.due < today();
  return h('li', { class: 'item task' + (t.done ? ' done' : '') + (late ? ' late' : '') },
    h('input', { type: 'checkbox', checked: t.done, 'aria-label': (t.done ? 'Mark not done: ' : 'Mark done: ') + t.title, onchange: e => toggleTask(t, e.target.checked) }),
    h('div', { class: 'item-body' },
      h('button', { class: 'item-main', onclick: () => editTask(t) },
        h('span', { class: 'item-title' }, t.title),
        t.notes ? h('span', { class: 'item-sub' }, t.notes.split('\n')[0]) : null),
      showDivision || t.due ? h('span', { class: 'item-meta under' },
        showDivision ? chip(t.divisionId) : null,
        t.due ? h('span', { class: 'due' + (late ? ' late' : '') }, t.done ? nice(t.due) : `${nice(t.due)} · ${when(t.due)}`) : null) : null));
}

export function deadlineRow(d, date = nextDate(d), { showDivision = true } = {}) {
  const past = date && date < today();
  return h('li', { class: 'item deadline' + (past ? ' done' : '') },
    h('span', { class: 'cal-badge', 'aria-hidden': 'true' }, date ? h('b', {}, date.slice(8).replace(/^0/, '')) : '–', date ? h('small', {}, nice(date).split(' ')[2] || '') : null),
    h('button', { class: 'item-main', onclick: () => editDeadline(d) },
      h('span', { class: 'item-title' }, d.title),
      h('span', { class: 'item-sub' }, [date ? `${nice(date)} · ${when(date)}` : 'No date', d.repeat && d.repeat !== 'none' ? repeatLabel(d.repeat).toLowerCase() : ''].filter(Boolean).join(' · '))),
    h('span', { class: 'item-meta' }, showDivision ? chip(d.divisionId) : null));
}

// Deadlines falling between from and to, as [date, deadline] pairs in date order.
export function upcoming(from, to, divisionId) {
  const out = [];
  for (const d of state.data.deadlines) {
    if (divisionId && d.divisionId !== divisionId) continue;
    for (const date of occurrences(d, from, to)) out.push([date, d]);
  }
  return out.sort((a, b) => a[0].localeCompare(b[0]));
}

export const openTasks = divisionId => state.data.tasks.filter(t => !t.done && (!divisionId || t.divisionId === divisionId));

// Tasks in the order you'd do them: late first, then by due date, then undated by when they were added.
export const byDue = (a, b) => (a.due || '9999') .localeCompare(b.due || '9999') || (a.created || '').localeCompare(b.created || '');

export const soon = (days = 7) => addDays(today(), days);

export const section = (title, action, ...body) => h('section', { class: 'card' },
  h('div', { class: 'card-head' }, h('h2', {}, title), action || null), ...body);
