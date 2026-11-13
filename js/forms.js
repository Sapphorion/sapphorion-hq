// The add/edit forms, shared by every page.
import { state, save, remove, uid, FOCUS, LINK_KINDS, change } from './state.js';
import { formDialog, confirmBox, toast } from './ui.js';
import { REPEATS } from './dates.js';

const divOptions = (blank = false) => [...(blank ? [['', 'No division']] : []), ...state.data.divisions.map(d => [d.id, d.name])];

export async function editTask(task, preset = {}) {
  const isNew = !task;
  const v = await formDialog(isNew ? 'New task' : 'Edit task', [
    { key: 'title', label: 'Task', required: true, placeholder: 'What needs doing?' },
    { key: 'divisionId', label: 'Division', type: 'select', options: divOptions() },
    { key: 'due', label: 'Due (optional)', type: 'date' },
    { key: 'notes', label: 'Notes', type: 'textarea' },
  ], task || { divisionId: preset.divisionId || state.data.divisions[0]?.id, due: preset.due || '' },
  { onDelete: isNew ? null : async () => { if (await confirmBox('Delete this task?', task.title)) { await remove('tasks', task.id); return true; } return false; } });
  if (!v) return;
  await save('tasks', { ...(task || { id: uid('t'), done: false, doneOn: '', created: new Date().toISOString() }), ...v });
  toast(isNew ? 'Task added' : 'Task saved');
}

export const toggleTask = (task, done) => save('tasks', { ...task, done, doneOn: done ? new Date().toISOString().slice(0, 10) : '' });

export async function editDeadline(dl, preset = {}) {
  const isNew = !dl;
  const v = await formDialog(isNew ? 'New deadline' : 'Edit deadline', [
    { key: 'title', label: 'What’s due', required: true },
    { key: 'divisionId', label: 'Division', type: 'select', options: divOptions() },
    { key: 'date', label: 'Date', type: 'date', required: true },
    { key: 'repeat', label: 'Repeats', type: 'select', options: REPEATS },
    { key: 'notes', label: 'Notes', type: 'textarea' },
  ], dl || { divisionId: preset.divisionId || 'company', repeat: 'none', date: preset.date || '' },
  { onDelete: isNew ? null : async () => { if (await confirmBox('Delete this deadline?', dl.title)) { await remove('deadlines', dl.id); return true; } return false; } });
  if (!v) return;
  await save('deadlines', { ...(dl || { id: uid('d') }), ...v });
  toast(isNew ? 'Deadline added' : 'Deadline saved');
}

export async function editContact(c, preset = {}) {
  const isNew = !c;
  const v = await formDialog(isNew ? 'New contact' : 'Edit contact', [
    { key: 'name', label: 'Name', required: true },
    { key: 'org', label: 'Organisation', placeholder: 'School, business or family' },
    { key: 'role', label: 'Role', placeholder: 'e.g. Secretary, parent, client' },
    { key: 'divisionId', label: 'Division', type: 'select', options: divOptions() },
    { key: 'phone', label: 'Phone / WhatsApp', type: 'tel' },
    { key: 'email', label: 'Email', type: 'email' },
    { key: 'notes', label: 'Notes', type: 'textarea' },
  ], c || { divisionId: preset.divisionId || state.data.divisions[0]?.id },
  { onDelete: isNew ? null : async () => { if (await confirmBox('Delete this contact?', c.name)) { await remove('contacts', c.id); return true; } return false; } });
  if (!v) return;
  await save('contacts', { ...(c || { id: uid('c') }), ...v });
  toast(isNew ? 'Contact added' : 'Contact saved');
}

export async function editLink(l, preset = {}) {
  const isNew = !l;
  const v = await formDialog(isNew ? 'New link' : 'Edit link', [
    { key: 'label', label: 'Name', required: true },
    { key: 'url', label: 'Address', type: 'url', required: true, placeholder: 'https://', hint: 'Never store passwords here. Keep those in a password manager.' },
    { key: 'divisionId', label: 'Division', type: 'select', options: divOptions() },
    { key: 'kind', label: 'Kind', type: 'select', options: LINK_KINDS.map(k => [k, k]) },
    { key: 'notes', label: 'Notes', type: 'textarea', rows: 2 },
  ], l || { divisionId: preset.divisionId || state.data.divisions[0]?.id, kind: 'Website' },
  { onDelete: isNew ? null : async () => { if (await confirmBox('Delete this link?', l.label)) { await remove('links', l.id); return true; } return false; } });
  if (!v) return;
  await save('links', { ...(l || { id: uid('l') }), ...v });
  toast(isNew ? 'Link added' : 'Link saved');
}

const COLOURS = [['#0A2C47', 'Sapphire'], ['#E8A33D', 'Ember gold'], ['#4A7FB5', 'Sky blue'], ['#C8372D', 'Fire red'], ['#2E8B57', 'Green'], ['#6B5FC7', 'Violet'], ['#0E8C8C', 'Teal'], ['#7A5230', 'Brown']];

export async function editDivision(d) {
  const isNew = !d;
  const v = await formDialog(isNew ? 'New division' : 'Edit division', [
    { key: 'name', label: 'Name', required: true },
    { key: 'what', label: 'What it is' },
    { key: 'focus', label: 'Focus', type: 'select', options: FOCUS.map(f => [f, f]) },
    { key: 'status', label: 'Where it stands', type: 'textarea', rows: 2 },
    { key: 'next', label: 'Next step', type: 'textarea', rows: 2 },
    { key: 'colour', label: 'Colour', type: 'select', options: COLOURS },
  ], d || { focus: 'Keep running', colour: '#4A7FB5' },
  { onDelete: isNew ? null : async () => {
    const n = ['tasks', 'deadlines', 'contacts', 'links'].reduce((a, k) => a + state.data[k].filter(x => x.divisionId === d.id).length, 0);
    if (!(await confirmBox('Delete this division?', n ? `${d.name} and its ${n} tasks, deadlines, contacts and links will be deleted.` : d.name))) return false;
    await change(x => { x.divisions = x.divisions.filter(y => y.id !== d.id); for (const k of ['tasks', 'deadlines', 'contacts', 'links']) x[k] = x[k].filter(y => y.divisionId !== d.id); });
    location.hash = '#home';
    return true;
  } });
  if (!v) return;
  await save('divisions', { ...(d || { id: uid('v'), notes: '' }), ...v });
  toast(isNew ? 'Division added' : 'Division saved');
}
