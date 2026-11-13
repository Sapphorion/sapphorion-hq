// Every site, app, repository and service per division. Links only: never passwords.
import { h, empty } from '../ui.js';
import { state } from '../state.js';
import { chip } from '../parts.js';
import { editLink } from '../forms.js';

const host = u => { try { return new URL(u).host.replace(/^www\./, ''); } catch { return u; } };

export function linkRow(l, { showDivision = true } = {}) {
  return h('li', { class: 'item link-row' },
    h('span', { class: 'kind' }, l.kind || 'Link'),
    h('a', { class: 'item-main', href: l.url, target: '_blank', rel: 'noopener' },
      h('span', { class: 'item-title' }, l.label, h('span', { class: 'ext', 'aria-hidden': 'true' }, ' ↗')),
      h('span', { class: 'item-sub' }, [host(l.url), l.notes].filter(Boolean).join(' · '))),
    h('span', { class: 'item-meta' }, showDivision ? chip(l.divisionId) : null,
      h('button', { class: 'icon-btn small', 'aria-label': 'Edit ' + l.label, onclick: () => editLink(l) }, '✎')));
}

export function linksPage() {
  return h('div', { class: 'page' },
    h('header', { class: 'page-head' }, h('h1', {}, 'Links and accounts'), h('button', { class: 'btn primary', onclick: () => editLink() }, '+ Link')),
    h('p', { class: 'privacy' }, 'Store addresses and notes only. Never put passwords or tokens here: use a password manager for those.'),
    state.data.links.length === 0 ? h('section', { class: 'card' }, empty('No links yet.', h('button', { class: 'btn', onclick: () => editLink() }, 'Add a link'))) : null,
    state.data.divisions.map(d => {
      const mine = state.data.links.filter(l => l.divisionId === d.id);
      return mine.length ? h('section', { class: 'card' }, h('div', { class: 'card-head' }, h('h2', {}, d.name), h('button', { class: 'btn ghost small', onclick: () => editLink(null, { divisionId: d.id }) }, '+ Link')), h('ul', { class: 'list' }, mine.map(l => linkRow(l, { showDivision: false })))) : null;
    }));
}
