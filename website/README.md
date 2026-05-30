# CineVault — Movie Discovery Website

Netflix-style movie browser with fuzzy search, genre/provider filters, and bitmask-encoded data.

## Stack

- **Vue 3** + Composition API
- **Pinia** for state management
- **Fuse.js** for fuzzy title search
- **Vite** for dev/build

## Setup

```bash
cd website
npm install
npm run dev
```

## With real data

1. Run the scraper to generate `public/movies.json`
2. `npm run dev` — the app loads it automatically

Without `movies.json`, the app uses 500 mock movies for development.

## Architecture

```
src/
  stores/movies.js      ← Pinia store, filtering logic, Fuse.js
  components/
    HeroSection.vue     ← Search, genre chips, provider chips, rating slider
    MovieRow.vue        ← Horizontal scrollable row with arrows
    MovieCard.vue       ← Poster card with hover overlay
    MovieModal.vue      ← Detail popup
  App.vue               ← Layout: loading → hero → rows/grid → modal
  assets/global.css     ← CSS variables, reset
```

## Filter logic

All filtering is computed in the Pinia store:

```
allMovies (20k)
  → genre bitmask filter     O(n), ~0.2ms
  → provider array.some()    O(n), ~1ms
  → rating range             O(n), ~0.1ms
  → Fuse.js title search     O(k), ~5ms on subset
  = filteredMovies
    → split into rows by genre/provider/ranking
```

## Data format

```json
{
  "movies": [{ "id": "tt...", "t": "Title", "y": 1994, "r": 9.3,
               "g": 4, "pop": 85.4, "p": "https://...poster.jpg", "prov": [8,15] }],
  "providers": { "8": "Netflix", "15": "Hulu" },
  "genres": { "Action": 1, "Comedy": 2, ... }
}
```
