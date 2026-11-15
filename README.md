# Sapphorion HQ

One place to run every Sapphorion division: HelloEducation, SchoolIndaba, Sapphorion web design, Vigil Fire, Teacher’s Desk, and the company admin behind them.

**Open it:** https://sapphorion.github.io/sapphorion-hq/

## What it does

- **Home:** what's late, what's due this week, deadlines in the next 45 days, and a card for every division with its focus and next step.
- **Divisions:** each one has its status, next step, notes, tasks, deadlines, contacts and links on one page. Change its focus (Priority, Keep running, Ticking over, Paused) from the dropdown.
- **Tasks:** one list across all divisions, grouped into Late, This week, Later and No date. Filter by division.
- **Calendar:** a month view and the next 60 days. Deadlines can repeat every week, month, first Saturday of the month, or year (CIPC annual return, provisional tax, PAIA report, domain renewals).
- **Contacts:** the people you deal with for each division, with Call, WhatsApp and Email buttons.
- **Links:** every site, repository, dashboard and government portal per division. Links only, never passwords.
- **Thoughts:** share a thought about any division and talk it through with Claude. Claude knows where that division stands (status, next step, notes, tasks, deadlines, links) and can suggest tasks you add with one tap.

It works offline and installs like an app (Settings › Install on your devices). There's no accounting here: money stays in Zoho Books.

## Your data and privacy (POPIA)

This repository is public and holds only the app. It has no client names or contact details.
Your data lives on each device (IndexedDB) and, once sync is on, in the **private** repository `Sapphorion/sapphorion-hq-data` as `hq-sync.json`. Every sync is a commit, so earlier versions can be recovered from that repository's history.
HQ refuses to sync to a public repository.

## Turn on sync

1. On GitHub: Settings › Developer settings › Fine-grained tokens › Generate new token.
2. Repository access: **Only select repositories** › `sapphorion-hq-data`. Permissions › Repository permissions › **Contents: Read and write**.
3. In HQ: Settings › Sync between devices › paste the token › Connect. Do this once on each device.

The token stays on the device it was pasted on.

## Turn on Claude (Thoughts)

1. At platform.claude.com › Settings › API keys, create a key called “Sapphorion HQ”, and set a monthly spend limit under Settings › Limits.
2. In HQ: Settings › Claude for Thoughts › paste the key › Connect. Do this on each device you want to use it on.

The key stays on that device: it isn't synced, backed up or stored in any repository. Claude is called straight from your browser, and each reply is billed to your Anthropic account (a few cents with Sonnet). Contacts are never sent to Claude. Your thoughts and Claude's replies sync with the rest of your data to the private repository.

## Publishing changes

GitHub Pages serves the `main` branch. When you change any file, bump `VERSION` in `sw.js` so installed copies pick up the update.

Files: `index.html`, `styles.css`, `sw.js`, `manifest.webmanifest`, `js/` (`app.js` router, `state.js` data and seed, `db.js` storage, `sync.js` + `github.js` sync, `forms.js` add/edit forms, `parts.js` shared rows, `views/` one file per page).
