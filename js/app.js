// Sapphorion HQ: one place for every division's tasks, deadlines, contacts and links.
import { loadState, onChange, state } from './state.js';
import { h, clear } from './ui.js';
import { startSync, onSync, setRedraw, syncInfo } from './sync.js';
import { ghConnected } from './github.js';
import { today } from './dates.js';
import { home } from './views/home.js';
import { divisionPage } from './views/division.js';
import { tasksPage } from './views/tasks.js';
import { calendarPage } from './views/calendar.js';
import { contactsPage } from './views/contacts.js';
import { linksPage } from './views/links.js';
import { settingsPage } from './views/settings.js';
import { thoughtsPage } from './views/thoughts.js';

const NAV = [
  ['home', 'Home', '⌂'],
  ['tasks', 'Tasks', '✓'],
  ['calendar', 'Calendar', '▦'],
  ['contacts', 'Contacts', '☺'],
  ['links', 'Links', '↗'],
  ['thoughts', 'Thoughts', '✦'],
  ['settings', 'Settings', '⚙'],
];

const main = document.getElementById('main');
const nav = document.getElementById('nav');

function route() {
  const [page, arg, arg2] = (location.hash.slice(1) || 'home').split('/');
  let view;
  switch (page) {
    case 'division': view = divisionPage(decodeURIComponent(arg || '')); break;
    case 'tasks': view = tasksPage(); break;
    case 'calendar': view = calendarPage(); break;
    case 'contacts': view = contactsPage(); break;
    case 'links': view = linksPage(); break;
    case 'settings': view = settingsPage(); break;
    case 'thoughts': view = thoughtsPage(arg, arg2); break;
    default: view = home();
  }
  const y = window.scrollY, same = main.dataset.page === location.hash;
  clear(main).append(view);
  main.dataset.page = location.hash;
  if (same) window.scrollTo(0, y); else window.scrollTo(0, 0);
  drawNav(page === 'division' ? 'division/' + arg : page);
}

function drawNav(current) {
  const late = state.data.tasks.filter(t => !t.done && t.due && t.due < today()).length;
  clear(nav).append(
    ...NAV.map(([id, label, icon]) => h('li', {}, h('a', { href: '#' + id, class: current === id ? 'on' : '', 'aria-current': current === id ? 'page' : false },
      h('span', { class: 'nav-icon', 'aria-hidden': 'true' }, icon), h('span', { class: 'nav-label' }, label),
      id === 'tasks' && late ? h('span', { class: 'count', 'aria-label': `${late} late` }, late) : null))),
    h('li', { class: 'nav-divs' }, h('span', { class: 'nav-head' }, 'Divisions')),
    ...state.data.divisions.map(d => h('li', { class: 'nav-div' }, h('a', { href: '#division/' + d.id, class: current === 'division/' + d.id ? 'on' : '', style: { '--c': d.colour } },
      h('span', { class: 'dot', 'aria-hidden': 'true' }), h('span', { class: 'nav-label' }, d.name)))));
}

function drawSync() {
  const el = document.getElementById('net');
  const i = syncInfo();
  el.textContent = !navigator.onLine ? 'Offline' : !ghConnected() ? 'Sync off' : i.syncing ? 'Syncing…' : i.error ? 'Sync problem' : i.dirty ? 'Changes waiting' : 'Synced';
  el.className = 'net' + (!navigator.onLine || i.error ? ' warn' : '');
  el.title = i.error || '';
}

async function start() {
  await loadState();
  window.addEventListener('hashchange', route);
  onChange(({ redraw } = {}) => { if (redraw !== false) route(); });
  setRedraw(route);
  onSync(drawSync);
  window.addEventListener('online', drawSync);
  window.addEventListener('offline', drawSync);
  route();
  drawSync();
  startSync();
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
}

// Offer "Install app" where the browser supports it.
let installEvent = null;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvent = e; const b = document.getElementById('install'); b.hidden = false; b.onclick = async () => { b.hidden = true; await installEvent.prompt(); installEvent = null; }; });

start().catch(err => { main.textContent = 'Sapphorion HQ couldn’t start: ' + err.message; });
