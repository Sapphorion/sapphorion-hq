// Calendar: deadlines (including repeating ones) and task due dates, as a month grid and a list.
import { h, empty } from '../ui.js';
import { state, divisionColour } from '../state.js';
import { iso, today, addDays, monthName, nice } from '../dates.js';
import { deadlineRow, taskRow, upcoming } from '../parts.js';
import { editDeadline, editTask } from '../forms.js';

const view = { y: new Date().getFullYear(), m: new Date().getMonth() };

export function calendarPage() {
  const first = new Date(view.y, view.m, 1), last = new Date(view.y, view.m + 1, 0);
  const from = iso(first), to = iso(last);
  const dls = upcoming(from, to);
  const tasks = state.data.tasks.filter(t => t.due && t.due >= from && t.due <= to);
  const byDay = {};
  for (const [date, d] of dls) (byDay[date] ||= []).push({ kind: 'deadline', title: d.title, div: d.divisionId, open: () => editDeadline(d) });
  for (const t of tasks) (byDay[t.due] ||= []).push({ kind: 'task', title: t.title, div: t.divisionId, done: t.done, open: () => editTask(t) });

  const redraw = () => window.dispatchEvent(new HashChangeEvent('hashchange'));
  const move = n => { const d = new Date(view.y, view.m + n, 1); view.y = d.getFullYear(); view.m = d.getMonth(); redraw(); };
  const lead = (first.getDay() + 6) % 7; // weeks start on Monday
  const cells = [];
  for (let i = 0; i < lead; i++) cells.push(h('div', { class: 'day blank' }));
  const t0 = today();
  for (let day = 1; day <= last.getDate(); day++) {
    const date = iso(new Date(view.y, view.m, day));
    const items = byDay[date] || [];
    cells.push(h('div', { class: 'day' + (date === t0 ? ' today' : '') },
      h('button', { class: 'day-num', 'aria-label': `Add a deadline on ${nice(date)}`, onclick: () => editDeadline(null, { date }) }, day),
      items.map(it => h('button', { class: 'ev ' + it.kind + (it.done ? ' done' : ''), style: { '--c': divisionColour(it.div) }, title: it.title, onclick: it.open }, it.title))));
  }

  const agendaTo = addDays(t0, 60);
  const agenda = upcoming(t0, agendaTo);
  const dueTasks = state.data.tasks.filter(t => !t.done && t.due && t.due <= agendaTo).sort((a, b) => a.due.localeCompare(b.due));

  return h('div', { class: 'page' },
    h('header', { class: 'page-head' }, h('h1', {}, 'Calendar'), h('button', { class: 'btn primary', onclick: () => editDeadline() }, '+ Deadline')),
    h('section', { class: 'card month' },
      h('div', { class: 'card-head' },
        h('button', { class: 'icon-btn', 'aria-label': 'Previous month', onclick: () => move(-1) }, '‹'),
        h('h2', {}, `${monthName(view.m)} ${view.y}`),
        h('button', { class: 'icon-btn', 'aria-label': 'Next month', onclick: () => move(1) }, '›'),
        h('button', { class: 'btn ghost small', onclick: () => { view.y = new Date().getFullYear(); view.m = new Date().getMonth(); redraw(); } }, 'Today')),
      h('div', { class: 'weekdays', 'aria-hidden': 'true' }, ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => h('span', {}, d))),
      h('div', { class: 'days' }, cells),
      h('p', { class: 'hint' }, 'Solid = deadline, outlined = task. Tap a day number to add a deadline on that day.')),
    h('div', { class: 'grid2' },
      h('section', { class: 'card' }, h('div', { class: 'card-head' }, h('h2', {}, 'Deadlines, next 60 days')),
        agenda.length ? h('ul', { class: 'list' }, agenda.map(([date, d]) => deadlineRow(d, date))) : empty('No deadlines in the next 60 days.')),
      h('section', { class: 'card' }, h('div', { class: 'card-head' }, h('h2', {}, 'Tasks due, next 60 days')),
        dueTasks.length ? h('ul', { class: 'list' }, dueTasks.map(t => taskRow(t))) : empty('No dated tasks in the next 60 days.'))));
}
