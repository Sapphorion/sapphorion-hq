// Everything in Sapphorion HQ, held in memory and saved to this device on every change.
// Seed data holds only public links and plan items: no client names or contact details,
// because this code is public. Your own data lives on your devices and in your private data repository.
import { kvGet, kvPut } from './db.js';

export const FOCUS = ['Priority', 'Keep running', 'Ticking over', 'Paused'];
export const LINK_KINDS = ['Website', 'App', 'Code', 'Service', 'Government', 'Document', 'Other'];

export const uid = (p = '') => p + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);

function seed() {
  const d = (id, name, what, focus, status, next, colour) => ({ id, name, what, focus, status, next, colour, notes: '' });
  const divisions = [
    d('company', 'Company admin', 'Sapphorion (Pty) Ltd: tax, CIPC, bank account, POPIA, contracts', 'Priority', 'Back “In Business” at CIPC; tax clean-up started', 'Book the tax practitioner; reserve the Sapphorion name', '#0A2C47'),
    d('schoolindaba', 'SchoolIndaba', 'School management system for small schools, with Teacher’s Desk built in', 'Priority', 'Almost done; pilot school go-live planned for 1 December 2026', 'Signed agreement with the pilot school, then go-live', '#E8A33D'),
    d('helloeducation', 'HelloEducation', 'Private tutoring', 'Keep running', 'Running; invoices and payments in Zoho Books', 'Keep invoicing in Zoho; capture expenses monthly', '#4A7FB5'),
    d('vigilfire', 'Vigil Fire', 'Fire-safety compliance app, to sell or license to fire-safety companies', 'Keep running', 'Slow burn; demo compliance pack built', 'Follow up interested companies', '#C8372D'),
    d('webdesign', 'Sapphorion web design', 'Websites for Gqeberha small businesses', 'Ticking over', 'Two case studies; campaign ended 5 October 2026', 'Answer enquiries; standard client agreement', '#2E8B57'),
    d('teachersdesk', 'Teacher’s Desk', 'Your own teaching app, and Roll Call for lecture attendance', 'Ticking over', 'In daily use; the school version lives in SchoolIndaba', 'Maintenance only', '#6B5FC7'),
  ];
  const t = (title, divisionId, due = '') => ({ id: uid('t'), title, divisionId, due, done: false, doneOn: '', notes: '', created: new Date().toISOString() });
  const tasks = [
    t('Book a tax practitioner who has done VDP applications', 'company', '2026-11-16'),
    t('Request missing TymeBank and Nedbank statements (Oct 2023 to now)', 'company', '2026-11-16'),
    t('Reserve the Sapphorion name on BizPortal (four options, R50)', 'company'),
    t('Special resolution + file the name change (CoR15.2, R250)', 'company'),
    t('Open the business bank account in the company’s name', 'company'),
    t('Update the name with SARS, Zoho Books and the domain registrant', 'company'),
    t('Move service accounts (Supabase, Netlify, Meta, Resend, Anthropic) to company billing', 'company'),
    t('Register as Information Officer with the Information Regulator (free)', 'company'),
    t('PAIA manual and privacy policy on the websites', 'company'),
    t('Check the ILC employment contract for an outside-work clause', 'company'),
    t('Pilot school agreement signed (fee, AI top-ups, POPIA operator clauses)', 'schoolindaba', '2026-11-30'),
    t('Standard web design client agreement (scope, deposit, who owns the site)', 'webdesign'),
  ];
  const dl = (title, divisionId, date, repeat, notes = '') => ({ id: uid('d'), title, divisionId, date, repeat, notes });
  const deadlines = [
    dl('SchoolIndaba go-live at the pilot school', 'schoolindaba', '2026-12-01', 'none'),
    dl('Capture last month in Zoho Books', 'company', '2026-12-05', 'firstsat', 'Invoices, payments received and business expenses, tagged by division.'),
    dl('Provisional tax: 2nd payment (IRP6)', 'company', '2027-02-26', 'yearly', 'Due by the last working day of February, once you’re a provisional taxpayer. Check the exact date each year.'),
    dl('PAIA annual report to the Information Regulator', 'company', '2027-06-30', 'yearly'),
    dl('SARS tax season: personal (ITR12) and company (ITR14) returns', 'company', '2027-07-15', 'yearly', 'Check the filing dates SARS announces for the year.'),
    dl('Provisional tax: 1st payment (IRP6)', 'company', '2027-08-31', 'yearly'),
    dl('Renew helloeducation.co.za', 'helloeducation', '2027-10-01', 'yearly', 'Renews in October. Check the exact date with the registrar.'),
    dl('CIPC: beneficial ownership + annual return', 'company', '2027-10-01', 'yearly', 'Company registered October 2023. File beneficial ownership first, then the annual return.'),
  ];
  const l = (label, url, divisionId, kind, notes = '') => ({ id: uid('l'), label, url, divisionId, kind, notes });
  const links = [
    l('CIPC eServices', 'https://eservices.cipc.co.za', 'company', 'Government', 'Beneficial ownership, name changes'),
    l('CIPC annual returns', 'https://annualreturns.cipc.co.za', 'company', 'Government'),
    l('BizPortal', 'https://www.bizportal.gov.za', 'company', 'Government', 'Name reservation, company status'),
    l('SARS eFiling', 'https://www.sarsefiling.co.za', 'company', 'Government'),
    l('Information Regulator', 'https://inforegulator.org.za', 'company', 'Government', 'Information Officer registration, PAIA report'),
    l('Zoho Books', 'https://books.zoho.com', 'company', 'Service'),
    l('SchoolIndaba app', 'https://skoolhuis.netlify.app', 'schoolindaba', 'App'),
    l('Skoolhuis on GitHub', 'https://github.com/Skoolhuis', 'schoolindaba', 'Code'),
    l('Supabase dashboard', 'https://supabase.com/dashboard', 'schoolindaba', 'Service'),
    l('Netlify', 'https://app.netlify.com', 'schoolindaba', 'Service'),
    l('helloeducation.co.za', 'https://helloeducation.co.za', 'helloeducation', 'Website'),
    l('HelloEducation code', 'https://github.com/Sapphorion/HelloEducation', 'helloeducation', 'Code'),
    l('Vigil Fire code', 'https://github.com/Sapphorion/Vigil-Fire', 'vigilfire', 'Code'),
    l('Sapphorion portfolio', 'https://sapphorion.github.io', 'webdesign', 'Website'),
    l('BowlzBagz (case study)', 'https://bowlzbagz.co.za', 'webdesign', 'Website'),
    l('Teacher’s Desk', 'https://sapphorion.github.io/Klasboek/', 'teachersdesk', 'App'),
    l('Teacher’s Desk code', 'https://github.com/Sapphorion/Klasboek', 'teachersdesk', 'Code'),
    l('Roll Call code', 'https://github.com/Sapphorion/Roll_Call', 'teachersdesk', 'Code'),
  ];
  return { app: 'sapphorion-hq', version: 1, divisions, tasks, deadlines, contacts: [], links, thoughts: [], updated: new Date().toISOString() };
}

export const state = { data: seed(), loaded: false };

const listeners = new Set();
export const onChange = fn => (listeners.add(fn), () => listeners.delete(fn));
const emit = (info = {}) => listeners.forEach(fn => fn(info));

export async function loadState() {
  const saved = await kvGet('data');
  state.data = saved && saved.app === 'sapphorion-hq' ? normalise(saved) : seed();
  if (!saved) await kvPut('data', state.data);
  state.loaded = true;
}

function normalise(d) {
  return { app: 'sapphorion-hq', version: 1, divisions: d.divisions || [], tasks: d.tasks || [], deadlines: d.deadlines || [], contacts: d.contacts || [], links: d.links || [], thoughts: d.thoughts || [], updated: d.updated || '' };
}

// Every change goes through here: update in memory, save to the device, tell the page and sync.
// { redraw: false } saves without redrawing the page (typing in the notes box).
export async function change(fn, { redraw = true } = {}) {
  fn(state.data);
  state.data.updated = new Date().toISOString();
  await kvPut('data', state.data);
  emit({ redraw });
}

// Replace everything (restoring a backup, or taking the copy from another device).
export async function replaceAll(d, { quiet = false } = {}) {
  if (!d || d.app !== 'sapphorion-hq') throw new Error('This isn’t a Sapphorion HQ backup.');
  state.data = normalise(d);
  await kvPut('data', state.data);
  if (!quiet) emit();
}

export const division = id => state.data.divisions.find(x => x.id === id);
export const divisionName = id => division(id)?.name || 'No division';
export const divisionColour = id => division(id)?.colour || '#93A2B4';

// Add, update or remove a record in one of the lists.
export const save = (list, rec, opts) => change(d => { const i = d[list].findIndex(x => x.id === rec.id); if (i >= 0) d[list][i] = rec; else d[list].push(rec); }, opts);
export const remove = (list, id) => change(d => { d[list] = d[list].filter(x => x.id !== id); });
