// Home: what needs you this week, what's coming up, and every division at a glance.
import { h, empty } from '../ui.js';
import { state, FOCUS } from '../state.js';
import { today, addDays, nice } from '../dates.js';
import { taskRow, deadlineRow, upcoming, openTasks, byDue, section } from '../parts.js';
import { editTask, editDeadline, editDivision } from '../forms.js';

export function home() {
  const t0 = today(), week = addDays(t0, 7);
  const open = openTasks().sort(byDue);
  const late = open.filter(t => t.due && t.due < t0);
  const thisWeek = open.filter(t => t.due && t.due >= t0 && t.due <= week);
  const coming = upcoming(t0, addDays(t0, 45));
  const hour = new Date().getHours();
  const hello = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  const divs = [...state.data.divisions].sort((a, b) => FOCUS.indexOf(a.focus) - FOCUS.indexOf(b.focus));

  return h('div', { class: 'page' },
    h('header', { class: 'page-head' },
      h('div', {}, h('p', { class: 'eyebrow' }, nice(t0)), h('h1', {}, hello)),
      h('div', { class: 'row' }, h('button', { class: 'btn primary', onclick: () => editTask() }, '+ Task'), h('button', { class: 'btn', onclick: () => editDeadline() }, '+ Deadline'))),
    h('div', { class: 'summary' },
      stat(late.length, 'late', late.length ? 'bad' : ''),
      stat(thisWeek.length, 'due this week'),
      stat(coming.filter(([d]) => d <= week).length, 'deadlines this week'),
      stat(open.length, 'open tasks')),
    h('div', { class: 'grid2' },
      section('This week', h('a', { class: 'link', href: '#tasks' }, 'All tasks'),
        late.length || thisWeek.length
          ? h('ul', { class: 'list' }, [...late, ...thisWeek].map(t => taskRow(t)))
          : empty('Nothing late or due this week.', h('button', { class: 'btn ghost', onclick: () => editTask() }, 'Add a task'))),
      section('Coming up (next 45 days)', h('a', { class: 'link', href: '#calendar' }, 'Calendar'),
        coming.length
          ? h('ul', { class: 'list' }, coming.slice(0, 8).map(([date, d]) => deadlineRow(d, date)))
          : empty('No deadlines in the next 45 days.'))),
    h('div', { class: 'section-title' }, h('h2', {}, 'Divisions'), h('button', { class: 'btn ghost small', onclick: () => editDivision() }, '+ Division')),
    h('div', { class: 'divisions' }, divs.map(d => {
      const n = openTasks(d.id).length;
      const next = openTasks(d.id).sort(byDue)[0];
      return h('a', { class: 'div-card', href: '#division/' + d.id, style: { '--c': d.colour } },
        h('div', { class: 'div-top' }, h('h3', {}, d.name), h('span', { class: 'focus f-' + FOCUS.indexOf(d.focus) }, d.focus)),
        h('p', { class: 'div-next' }, h('span', { class: 'label' }, 'Next: '), d.next || '—'),
        h('p', { class: 'div-foot' }, `${n} open task${n === 1 ? '' : 's'}`, next?.due ? ` · next due ${nice(next.due)}` : ''));
    })));
}

const stat = (n, label, cls = '') => h('div', { class: 'stat ' + cls }, h('b', {}, n), h('span', {}, label));
