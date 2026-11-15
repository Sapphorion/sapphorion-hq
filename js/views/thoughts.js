// Thoughts: share a thought about any division and work it through with Claude.
import { h, empty, toast, confirmBox } from '../ui.js';
import { state, save, remove, uid, division } from '../state.js';
import { nice } from '../dates.js';
import { chip } from '../parts.js';
import { md } from '../markdown.js';
import { askClaude, splitReply, claudeReady } from '../claude.js';

const live = {}; // replies streaming in right now, by thread id: { text, error }

const thread = id => state.data.thoughts.find(t => t.id === id);
const go = hash => { location.hash = hash; };
const stamp = iso => { const d = new Date(iso); return `${nice(d.toISOString().slice(0, 10))}, ${d.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}`; };

function setupHint() {
  return claudeReady() ? null : h('p', { class: 'privacy' }, 'To get Claude’s replies, add your Anthropic API key in ', h('a', { href: '#settings' }, 'Settings'), '. Until then, your thoughts are saved and you can ask Claude about them later.');
}

function composer(presetDiv = '') {
  const div = h('select', { id: 'th-div' }, [['', 'General (no division)'], ...state.data.divisions.map(d => [d.id, d.name])].map(([v, l]) => h('option', { value: v, selected: v === presetDiv }, l)));
  const text = h('textarea', { id: 'th-text', rows: 5, placeholder: 'What’s on your mind? An idea, a worry, a question, a decision you’re stuck on…', required: true });
  const send = async ask => {
    const t = text.value.trim();
    if (!t) { text.focus(); return; }
    const now = new Date().toISOString();
    const rec = { id: uid('th'), divisionId: div.value, title: t.split('\n')[0].slice(0, 90), created: now, updated: now, messages: [{ role: 'user', text: t, at: now }] };
    await save('thoughts', rec);
    go('#thoughts/' + rec.id);
    if (ask) runClaude(rec.id);
  };
  return h('section', { class: 'card composer' },
    h('div', { class: 'card-head' }, h('h2', {}, 'Share a thought')),
    h('div', { class: 'field' }, h('label', { for: 'th-div' }, 'About'), div),
    h('div', { class: 'field' }, h('label', { for: 'th-text' }, 'Your thought'), text),
    h('div', { class: 'row end' },
      h('button', { class: 'btn ghost', onclick: () => send(false) }, 'Save for later'),
      h('button', { class: 'btn primary', disabled: !claudeReady(), onclick: () => send(true) }, 'Share with Claude')));
}

export function thoughtsPage(arg, arg2) {
  if (arg && arg !== 'new') return threadPage(arg);
  const list = [...state.data.thoughts].sort((a, b) => (b.updated || '').localeCompare(a.updated || ''));
  return h('div', { class: 'page' },
    h('header', { class: 'page-head' }, h('div', {}, h('h1', {}, 'Thoughts'), h('p', { class: 'lead' }, 'Share a thought about any division. Claude knows where each one stands and helps you turn it into next steps.'))),
    setupHint(),
    composer(arg === 'new' ? decodeURIComponent(arg2 || '') : ''),
    list.length ? h('section', { class: 'card' }, h('div', { class: 'card-head' }, h('h2', {}, `Earlier thoughts (${list.length})`)),
      h('ul', { class: 'list' }, list.map(t => {
        const replies = t.messages.filter(m => m.role === 'assistant').length;
        const waiting = t.messages.at(-1)?.role === 'user';
        return h('li', { class: 'item' },
          h('a', { class: 'item-main', href: '#thoughts/' + t.id },
            h('span', { class: 'item-title' }, t.title),
            h('span', { class: 'item-sub' }, `${stamp(t.updated)} · ${replies ? `${replies} repl${replies === 1 ? 'y' : 'ies'}` : 'no reply yet'}${waiting ? ' · waiting for Claude' : ''}`)),
          h('span', { class: 'item-meta' }, t.divisionId ? chip(t.divisionId) : h('span', { class: 'chip' }, 'General')));
      }))) : null);
}

function messageEl(t, m, i) {
  if (m.role === 'user') return h('div', { class: 'msg me' }, h('div', { class: 'bubble' }, m.text.split('\n').map((l, k) => [k ? h('br') : null, l])), h('span', { class: 'when' }, stamp(m.at)));
  const { body, tasks } = splitReply(m.text);
  const box = h('div', { class: 'bubble md' }); box.innerHTML = md(body);
  const added = m.added || [];
  return h('div', { class: 'msg claude' },
    h('span', { class: 'who' }, '✦ Claude'),
    box,
    tasks.length ? h('div', { class: 'suggested' },
      h('p', { class: 'hint' }, 'Suggested tasks'),
      tasks.map(s => h('div', { class: 'sugg' },
        h('span', {}, s.title, s.due ? h('small', {}, ' · due ' + nice(s.due)) : null),
        added.includes(s.title) ? h('span', { class: 'badge ok' }, 'Added')
          : h('button', { class: 'btn small', onclick: async () => {
            await save('tasks', { id: uid('t'), title: s.title, divisionId: t.divisionId || 'company', due: s.due || '', done: false, doneOn: '', notes: 'From a thought: ' + t.title, created: new Date().toISOString() });
            const msgs = t.messages.map((x, k) => k === i ? { ...x, added: [...(x.added || []), s.title] } : x);
            await save('thoughts', { ...thread(t.id), messages: msgs });
            toast('Added to tasks');
          } }, '+ Add to tasks')))) : null,
    h('span', { class: 'when' }, stamp(m.at)));
}

function threadPage(id) {
  const t = thread(id);
  if (!t) return h('div', { class: 'page' }, empty('That thought isn’t here any more.', h('a', { class: 'btn', href: '#thoughts' }, 'Back to Thoughts')));
  const lv = live[id];
  const last = t.messages.at(-1);
  const reply = h('textarea', { id: 'th-reply', rows: 3, placeholder: 'Reply to Claude, or add more to your thought…' });
  const sendReply = async () => {
    const v = reply.value.trim(); if (!v) { reply.focus(); return; }
    const now = new Date().toISOString();
    await save('thoughts', { ...thread(id), updated: now, messages: [...thread(id).messages, { role: 'user', text: v, at: now }] });
    if (claudeReady()) runClaude(id);
  };
  return h('div', { class: 'page thread' },
    h('header', { class: 'page-head' },
      h('div', {}, h('p', { class: 'eyebrow' }, h('a', { href: '#thoughts' }, 'Thoughts'), ' › ', t.divisionId ? division(t.divisionId)?.name || 'Division' : 'General'), h('h1', { class: 'thread-title' }, t.title)),
      h('div', { class: 'row' },
        t.divisionId ? h('a', { class: 'btn', href: '#division/' + t.divisionId }, 'Open division') : null,
        h('button', { class: 'btn ghost danger-text', onclick: async () => { if (await confirmBox('Delete this thought?', 'The conversation is deleted. Tasks you added from it stay.')) { await remove('thoughts', id); go('#thoughts'); } } }, 'Delete'))),
    setupHint(),
    h('div', { class: 'messages' },
      t.messages.map((m, i) => messageEl(t, m, i)),
      lv ? h('div', { class: 'msg claude' }, h('span', { class: 'who' }, '✦ Claude'),
        lv.error ? h('div', { class: 'bubble error' }, lv.error, h('div', { class: 'row' }, h('button', { class: 'btn small', onclick: () => runClaude(id) }, 'Try again')))
          : (() => { const b = h('div', { class: 'bubble md', id: 'live-' + id }); b.innerHTML = lv.text ? md(splitReply(lv.text).body) : '<p class="thinking">Thinking…</p>'; return b; })()) : null,
      !lv && last?.role === 'user' && claudeReady() ? h('div', { class: 'row' }, h('button', { class: 'btn primary', onclick: () => runClaude(id) }, 'Ask Claude')) : null),
    lv && !lv.error ? null : h('section', { class: 'card reply' },
      h('label', { class: 'sr', for: 'th-reply' }, 'Reply'), reply,
      h('div', { class: 'row end' }, h('button', { class: 'btn primary', onclick: sendReply }, claudeReady() ? 'Send' : 'Save'))));
}

const redraw = () => window.dispatchEvent(new HashChangeEvent('hashchange'));

// Ask Claude about a thread and save the reply. Streams into the page while it arrives.
export async function runClaude(id) {
  if (live[id] && !live[id].error) return;
  if (!navigator.onLine) { toast('You’re offline. Your thought is saved: ask Claude when you’re back online.'); return; }
  live[id] = { text: '' };
  redraw();
  try {
    const text = await askClaude(thread(id), txt => {
      live[id].text = txt;
      const el = document.getElementById('live-' + id);
      if (el) el.innerHTML = md(splitReply(txt).body);
    });
    delete live[id];
    const now = new Date().toISOString();
    await save('thoughts', { ...thread(id), updated: now, messages: [...thread(id).messages, { role: 'assistant', text, at: now }] });
  } catch (e) {
    live[id] = { error: e.message || 'Something went wrong.' };
    redraw();
  }
}

