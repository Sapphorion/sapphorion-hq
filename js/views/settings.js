// Settings: sync between devices, backups, and the divisions list.
import { h, toast, confirmBox } from '../ui.js';
import { state, replaceAll, change } from '../state.js';
import { ghConnect, ghDisconnect, ghInfo, ghConnected, DEFAULT_REPO } from '../github.js';
import { syncNow, syncInfo, resetSync } from '../sync.js';
import { editDivision } from '../forms.js';

const redraw = () => window.dispatchEvent(new HashChangeEvent('hashchange'));

function syncCard() {
  const info = syncInfo(), gi = ghInfo();
  if (ghConnected()) {
    return h('section', { class: 'card' },
      h('div', { class: 'card-head' }, h('h2', {}, 'Sync between devices'), h('span', { class: 'badge ok' }, 'On')),
      h('p', {}, `Syncing to the private repository ${gi.owner}/${gi.repo} as ${gi.login}.`),
      h('p', { class: 'hint' }, info.syncing ? 'Syncing…' : info.error ? 'Last sync failed: ' + info.error : info.lastSync ? 'Last synced ' + new Date(info.lastSync).toLocaleString('en-ZA') : 'Not synced yet.'),
      h('div', { class: 'row' },
        h('button', { class: 'btn primary', onclick: async () => { try { const r = await syncNow({ quiet: false, sendMine: true }); toast(r === 'pulled' ? 'Updated from your other device' : r === 'later' ? 'Sync postponed' : 'Synced'); } catch (e) { toast(e.message); } redraw(); } }, 'Sync now'),
        h('button', { class: 'btn ghost', onclick: async () => { if (await confirmBox('Turn off sync on this device?', 'Your data stays on this device and in the repository. You can connect again any time.', 'Turn off')) { ghDisconnect(); resetSync(); redraw(); } } }, 'Turn off on this device')));
  }
  const token = h('input', { id: 'tok', type: 'password', autocomplete: 'off', placeholder: 'github_pat_…' });
  const repo = h('input', { id: 'repo', type: 'text', value: DEFAULT_REPO });
  const msg = h('p', { class: 'hint', role: 'status' });
  return h('section', { class: 'card' },
    h('div', { class: 'card-head' }, h('h2', {}, 'Sync between devices'), h('span', { class: 'badge' }, 'Off')),
    h('p', {}, 'Keep HQ the same on your phone and computer, the same way Teacher’s Desk syncs: through your private sapphorion-hq-data repository.'),
    h('ol', { class: 'steps' },
      h('li', {}, 'On GitHub, open ', h('a', { href: 'https://github.com/settings/personal-access-tokens/new', target: '_blank', rel: 'noopener' }, 'Settings › Developer settings › Fine-grained tokens › Generate new token'), '.'),
      h('li', {}, 'Name it “Sapphorion HQ”. Under Repository access choose ', h('b', {}, 'Only select repositories'), ' and pick ', h('b', {}, 'sapphorion-hq-data'), '.'),
      h('li', {}, 'Under Permissions › Repository permissions set ', h('b', {}, 'Contents: Read and write'), '. Generate it and copy it.'),
      h('li', {}, 'Paste it below on each device you use. The token stays on that device only.')),
    h('div', { class: 'field' }, h('label', { for: 'tok' }, 'Token'), token),
    h('div', { class: 'field' }, h('label', { for: 'repo' }, 'Data repository'), repo),
    h('div', { class: 'row' }, h('button', { class: 'btn primary', onclick: async e => {
      e.target.disabled = true; msg.textContent = 'Checking…';
      try { await ghConnect(token.value, repo.value); msg.textContent = 'Connected. Syncing…'; const r = await syncNow({ quiet: false }); toast(r === 'pulled' ? 'Connected: loaded your data from the repository' : 'Connected and synced'); redraw(); }
      catch (err) { msg.textContent = err.message; e.target.disabled = false; }
    } }, 'Connect')),
    msg);
}

function backupCard() {
  const file = h('input', { type: 'file', accept: 'application/json,.json', class: 'sr', id: 'restore', onchange: async e => {
    const f = e.target.files[0]; if (!f) return;
    try {
      const data = JSON.parse(await f.text());
      if (!(await confirmBox('Restore this backup?', 'Everything in HQ on this device is replaced with the backup.', 'Restore'))) return;
      await replaceAll(data); toast('Backup restored');
    } catch (err) { toast(err.message || 'That file couldn’t be read.'); }
  } });
  return h('section', { class: 'card' },
    h('div', { class: 'card-head' }, h('h2', {}, 'Backup')),
    h('p', {}, 'Download everything as one file, or restore from one. Sync already keeps every version on GitHub; this is an extra copy.'),
    h('div', { class: 'row' },
      h('button', { class: 'btn', onclick: () => {
        const blob = new Blob([JSON.stringify(state.data, null, 1)], { type: 'application/json' });
        const a = h('a', { href: URL.createObjectURL(blob), download: `sapphorion-hq-${new Date().toISOString().slice(0, 10)}.json` });
        document.body.append(a); a.click(); a.remove();
      } }, 'Download backup'),
      h('label', { class: 'btn ghost', for: 'restore' }, 'Restore from a file'), file));
}

function divisionsCard() {
  const ds = state.data.divisions;
  const moveDiv = (i, n) => change(d => { const [x] = d.divisions.splice(i, 1); d.divisions.splice(i + n, 0, x); });
  return h('section', { class: 'card' },
    h('div', { class: 'card-head' }, h('h2', {}, 'Divisions'), h('button', { class: 'btn small', onclick: () => editDivision() }, '+ Division')),
    h('ul', { class: 'list' }, ds.map((d, i) => h('li', { class: 'item' },
      h('span', { class: 'swatch', style: { background: d.colour } }),
      h('button', { class: 'item-main', onclick: () => editDivision(d) }, h('span', { class: 'item-title' }, d.name), h('span', { class: 'item-sub' }, d.focus)),
      h('span', { class: 'item-meta' },
        h('button', { class: 'icon-btn small', 'aria-label': 'Move up', disabled: i === 0, onclick: () => moveDiv(i, -1) }, '↑'),
        h('button', { class: 'icon-btn small', 'aria-label': 'Move down', disabled: i === ds.length - 1, onclick: () => moveDiv(i, 1) }, '↓'))))));
}

export function settingsPage() {
  return h('div', { class: 'page' },
    h('header', { class: 'page-head' }, h('h1', {}, 'Settings')),
    syncCard(), divisionsCard(), backupCard(),
    h('section', { class: 'card' },
      h('div', { class: 'card-head' }, h('h2', {}, 'Install on your devices')),
      h('p', {}, 'On Android: open this page in Chrome, tap ⋮ › Add to Home screen. On a computer: click the install icon in the address bar. HQ then opens like an app and works offline.')));
}
