# AGENTS.md — Ohana TV website

Lightweight bootstrap for agents working in this directory.

## Start here

1. Read `README.md` for setup and commands.
2. Read only the doc that matches your task:
   - `docs/architecture.md` — app structure, state, filtering, PWA/cache behavior.
   - `docs/data-format.md` — `public/movies.json`, bitmasks, maturity encoding.
   - `docs/persistence.md` — user/list storage and the KV Lambda contract.
3. Inspect the relevant source files before editing; do not preload the whole repo.

## Guardrails

- This is the static Vue/Vite website for **Ohana TV**. Avoid reintroducing the old `CineVault` name.
- Keep generated/heavy artifacts out of context unless needed: `node_modules/`, `dist/`, `dev-dist/`, `reports/`, `temp/`, and large JSON datasets.
- Do not edit app/source files for documentation-only work.
- Cheap verification for docs-only changes: `git diff -- website` from the repo root, plus a quick link/path sanity check.
- For code changes, run the smallest relevant check; `npm run build` is the default full check for the website.
