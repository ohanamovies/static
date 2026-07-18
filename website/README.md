# Ohana TV — family-friendly movie discovery

Static Vue app for browsing a compact movie catalogue with fuzzy search, genre/provider filters, maturity filters, watch state, and shared lists.

## Stack

- Vue 3 + Composition API
- Pinia for state
- Fuse.js for title search
- Vite + vite-plugin-pwa

## Setup

```bash
cd website
npm install
npm run dev
```

The app loads `public/movies.json`. If that file is missing or fails to load, it falls back to mock data for local development.

## Common commands

```bash
npm run dev      # local Vite server
npm run build    # production build into dist/
npm run preview  # preview the built app
```

## Docs

- `AGENTS.md` — agent bootstrap/router.
- `docs/architecture.md` — app layout, filtering, PWA caching.
- `docs/data-format.md` — compact movie data schema.
- `docs/persistence.md` — user/list persistence model.

Movie data is produced by the sibling scraper (`../scraper`) and written to `public/movies.json`.
