// Sync through a private GitHub repository (Sapphorion/sapphorion-hq-data), the same way Teacher's Desk does,
// using a fine-grained access token that can only read and write that one repository.
// The token stays on this device (localStorage); it never goes into backups or the repository.
const LS = 'sapphorion-hq.gh';
const API = 'https://api.github.com';
const MAIN = 'hq-sync.json';
export const DEFAULT_REPO = 'Sapphorion/sapphorion-hq-data';

const read = () => { try { return JSON.parse(localStorage.getItem(LS) || 'null'); } catch { return null; } };
const write = v => { if (v) localStorage.setItem(LS, JSON.stringify(v)); else localStorage.removeItem(LS); };
export const ghInfo = () => { const v = read(); return v ? { login: v.login, owner: v.owner, repo: v.repo } : null; };
export const ghConnected = () => !!read()?.token;
export const ghDisconnect = () => write(null);

async function api(path, { method = 'GET', body, accept = 'application/vnd.github+json', token = read()?.token } = {}) {
  const res = await fetch(API + path, { method, cache: 'no-store', body: body ? JSON.stringify(body) : undefined,
    headers: { Authorization: 'Bearer ' + token, Accept: accept, 'X-GitHub-Api-Version': '2022-11-28', ...(body ? { 'Content-Type': 'application/json' } : {}) } });
  if (res.status === 404 && method === 'GET') return null;
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    const e = new Error(res.status === 401 ? 'GitHub didn’t accept the token. It may have expired: make a new one and connect again.'
      : res.status === 403 ? 'The token isn’t allowed to do that. Check it has “Contents: Read and write” for the data repository.'
      : res.status === 409 || (res.status === 422 && /sha/i.test(j.message || '')) ? 'conflict' : j.message || `GitHub said ${res.status}`);
    e.status = res.status; throw e;
  }
  return accept.includes('raw') ? res.text() : res.json();
}

// Check the token and repository, then remember them.
export async function ghConnect(token, repoName) {
  token = token.trim();
  repoName = (repoName || DEFAULT_REPO).trim().replace(/^https?:\/\/github\.com\//, '').replace(/\.git$/, '').replace(/\/$/, '');
  if (!token) throw new Error('Paste the token first.');
  const me = await api('/user', { token }).catch(e => { throw e.status === 401 ? new Error('GitHub didn’t accept that token. Copy it again (it starts with github_pat_).') : e; });
  if (!me) throw new Error('GitHub didn’t accept that token.');
  const [owner, repo] = repoName.includes('/') ? repoName.split('/') : [me.login, repoName];
  const r = await api(`/repos/${owner}/${repo}`, { token });
  if (!r) throw new Error(`Couldn’t find ${owner}/${repo}, or the token can’t see it. Check the name, and that the token has access to that repository.`);
  if (!r.private) throw new Error(`${owner}/${repo} is public, so anyone could read your clients’ details. Make it private on GitHub (Settings › Danger zone › Change visibility) and connect again.`);
  if (r.permissions && !r.permissions.push) throw new Error('The token can read but not write. Give it “Contents: Read and write”.');
  write({ token, owner, repo, login: me.login });
  return { owner, repo, login: me.login };
}

const path = () => { const v = read(); return `/repos/${v.owner}/${v.repo}/contents/${MAIN}`; };

function b64(str) {
  const bytes = new TextEncoder().encode(str);
  let out = '';
  for (let i = 0; i < bytes.length; i += 0x8000) out += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(out);
}

export const gh = {
  name: 'GitHub',
  ready: ghConnected,
  // The shared copy's current version (its sha), or null if there isn't one yet.
  async version() { const m = await api(path()); return m ? m.sha : null; },
  async download() { return JSON.parse(await api(path(), { accept: 'application/vnd.github.raw+json' })); },
  // Upload the whole HQ. Every sync is a commit, so earlier versions can always be recovered on GitHub.
  async upload(data, prev) {
    const res = await api(path(), { method: 'PUT', body: { message: `HQ sync ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`, content: b64(JSON.stringify(data, null, 1)), ...(prev ? { sha: prev } : {}) } });
    return res.content.sha;
  },
};
