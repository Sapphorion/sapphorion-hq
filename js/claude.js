// Thoughts: talk to Claude about any division, through your own Anthropic API key.
// The key stays on this device (localStorage); it is never synced, backed up or put in the repository.
// What Claude sees: the division you picked (status, next step, notes, tasks, deadlines, links) and a
// one-line summary of the others. Contacts are never sent, because they are other people's personal details.
import { state, division } from './state.js';
import { today, nextDate, nice } from './dates.js';

const LS = 'sapphorion-hq.claude';
export const MODELS = [
  ['claude-sonnet-5-5', 'Claude Sonnet 5.5 (recommended)'],
  ['claude-haiku-5-5', 'Claude Haiku 5.5 (cheapest, fastest)'],
  ['claude-opus-5-5', 'Claude Opus 5.5 (deepest thinking, costs most)'],
];

const read = () => { try { return JSON.parse(localStorage.getItem(LS) || '{}'); } catch { return {}; } };
export const claudeSettings = () => ({ model: MODELS[0][0], ...read() });
export const claudeReady = () => !!read().key;
export const setClaude = p => localStorage.setItem(LS, JSON.stringify({ ...read(), ...p }));
export const forgetClaudeKey = () => { const v = read(); delete v.key; localStorage.setItem(LS, JSON.stringify(v)); };

function divisionBrief(d, full) {
  const tasks = state.data.tasks.filter(t => t.divisionId === d.id && !t.done);
  const lines = [`## ${d.name} (focus: ${d.focus})`, d.what ? `What it is: ${d.what}` : '', `Where it stands: ${d.status || '-'}`, `Next step: ${d.next || '-'}`];
  if (!full) return lines.filter(Boolean).join('\n') + `\nOpen tasks: ${tasks.length}`;
  const dls = state.data.deadlines.filter(x => x.divisionId === d.id).map(x => ({ x, date: nextDate(x) })).filter(o => o.date).sort((a, b) => a.date.localeCompare(b.date));
  const links = state.data.links.filter(l => l.divisionId === d.id);
  const done = state.data.tasks.filter(t => t.divisionId === d.id && t.done).slice(-8);
  return [...lines,
    d.notes ? `Notes:\n${d.notes}` : '',
    `Open tasks:\n${tasks.map(t => `- ${t.title}${t.due ? ` (due ${nice(t.due)})` : ''}${t.notes ? ` – ${t.notes}` : ''}`).join('\n') || '- none'}`,
    done.length ? `Recently done:\n${done.map(t => `- ${t.title}`).join('\n')}` : '',
    `Deadlines:\n${dls.map(o => `- ${o.x.title}: ${nice(o.date)}${o.x.repeat && o.x.repeat !== 'none' ? ` (repeats ${o.x.repeat})` : ''}`).join('\n') || '- none'}`,
    links.length ? `Links: ${links.map(l => `${l.label} (${l.url})`).join('; ')}` : '',
  ].filter(Boolean).join('\n');
}

function systemPrompt(divisionId) {
  const focus = division(divisionId);
  const others = state.data.divisions.filter(d => d.id !== divisionId);
  return `You are Claude, built into Sapphorion HQ, the private planning app of the owner of Sapphorion (Pty) Ltd, a small South African company in Gqeberha with several divisions. The owner also teaches full time, so their time for the businesses is limited and precious.

The owner uses the Thoughts tab to share a thought, idea, worry or question about a division and get your help with it. Help them think it through and turn it into action:
- Answer the actual thought first, warmly and plainly, in a few short paragraphs or a short list. No long essays.
- Be honest: if an idea clashes with their priorities or carries a real risk, say so kindly and suggest a better path.
- Use South African context (rands, SARS, CIPC, POPIA, school terms) where it matters. You can't look things up here, so say when something should be checked.
- Keep the whole business in mind: what's a priority, what's ticking over, what's due.
- Ask at most one question, only if you genuinely need the answer to help.

If there are concrete next steps worth adding to their task list, end your reply with a block exactly like this (at most 3 tasks, due dates only when there's a real reason, otherwise ""):
\`\`\`tasks
[{"title": "Short action starting with a verb", "due": "YYYY-MM-DD"}]
\`\`\`
Leave the block out when no task is needed.

Today is ${nice(today())} (${today()}).

# The division this thought is about
${focus ? divisionBrief(focus, true) : 'General: not about one division in particular.'}

# The other divisions
${others.map(d => divisionBrief(d, false)).join('\n\n')}`;
}

// Ask Claude about a thought thread. Calls onText with the reply so far as it streams in; resolves with the full reply.
export async function askClaude(thread, onText, signal) {
  const s = claudeSettings();
  if (!s.key) throw new Error('Add your Anthropic API key in Settings first.');
  const messages = thread.messages.map(m => ({ role: m.role, content: m.text }));
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST', signal,
    headers: { 'content-type': 'application/json', 'x-api-key': s.key, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
    body: JSON.stringify({ model: s.model, max_tokens: 1500, stream: true, system: systemPrompt(thread.divisionId), messages }),
  });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    const msg = j.error?.message || `Anthropic said ${res.status}`;
    throw new Error(res.status === 401 ? 'The API key wasn’t accepted. Check it in Settings.' : res.status === 429 ? 'Too many requests or the spend limit was reached. Try again in a minute, or check your limits at console.anthropic.com.' : res.status === 529 ? 'Claude is very busy right now. Try again in a minute.' : msg);
  }
  const reader = res.body.getReader(), dec = new TextDecoder();
  let buf = '', text = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let i;
    while ((i = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
      if (!line.startsWith('data:')) continue;
      let ev; try { ev = JSON.parse(line.slice(5)); } catch { continue; }
      if (ev.type === 'content_block_delta' && ev.delta?.type === 'text_delta') { text += ev.delta.text; onText(text); }
      else if (ev.type === 'error') throw new Error(ev.error?.message || 'Claude stopped with an error.');
    }
  }
  return text;
}

// Split a reply into the text to show and any suggested tasks.
export function splitReply(text) {
  const at = text.indexOf('```tasks');
  if (at < 0) return { body: text, tasks: [] };
  const body = text.slice(0, at).trim();
  const block = text.slice(at + 8).split('```')[0];
  let tasks = [];
  try { tasks = JSON.parse(block).filter(t => t && t.title).slice(0, 5).map(t => ({ title: String(t.title), due: /^\d{4}-\d{2}-\d{2}$/.test(t.due || '') ? t.due : '' })); } catch { /* still streaming, or not valid */ }
  return { body, tasks };
}

// Quick check that the key works (a tiny request).
export async function testClaude() {
  const s = claudeSettings();
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': s.key, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
    body: JSON.stringify({ model: s.model, max_tokens: 5, messages: [{ role: 'user', content: 'Say OK.' }] }),
  });
  if (!res.ok) { const j = await res.json().catch(() => ({})); throw new Error(res.status === 401 ? 'That key wasn’t accepted.' : j.error?.message || `Anthropic said ${res.status}`); }
  return true;
}
