# Ohana TV — Movie Discovery Website

Family-friendly, Netflix-style movie browser with fuzzy search, compact browse filters, genre/provider filters, and bitmask-encoded data.

## Live site

Production is deployed on Netlify:

- **URL:** https://ohana-tv.netlify.app
- **Netlify project:** `ohana-tv`
- **Branch:** `include-new-unrated-titles`

Deploys are configured through Netlify CI/CD using the repo-root `netlify.toml`.

## Project notes

- [AGENTS.md](./AGENTS.md) captures project-specific implementation notes for future agent work.
- [VISION.md](./VISION.md) is the product source of truth, including concrete UX acceptance criteria.
- [DESIGN_GUIDELINES.md](./DESIGN_GUIDELINES.md) captures durable product design principles, screen intent, visual hierarchy, and the UX critique checklist.
- [VISION_EXECUTION.md](./VISION_EXECUTION.md) tracks implementation slices and the current fix plan.
- [CODING_STANDARDS.md](./CODING_STANDARDS.md) captures reusable component and UI implementation standards.
- Current vision direction: Discover/Search/Settings are separate intent-based routes; Discover answers what to watch, Search retrieves known titles, Settings configures the experience.

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

## Build

From the repo root, Netlify runs:

```bash
cd website && npm ci && npm run build
```

The static output is published from:

```text
website/dist
```

For a local production build:

```bash
cd website
npm ci
npm run build
```

## With real data

1. Run the scraper to generate `public/movies.json`
2. `npm run dev` — the app loads it automatically

Data loading order:

1. `movies.json` from the current site root — local/generated data
2. `https://ohana.tv/movies.json` — production fallback used by Netlify when the file is not deployed with this static site
3. 500 mock movies — development fallback if both real-data sources fail

## Architecture

```
src/
  router/index.js       ← Vue Router routes
  stores/movies.js      ← Pinia store, filtering logic, Fuse.js, row generation
  stores/user.js        ← Profile/list/settings persistence
  views/DiscoverView.vue ← Discover route layout
  components/
    AppTabs.vue         ← Bottom navigation
    HeroSection.vue     ← Discover controls
    SearchView.vue      ← Search route layout/results
    SearchBox.vue       ← Reusable search input primitive
    SettingsView.vue    ← Settings index/subroutes
    MovieRow.vue        ← Horizontal discovery rows
    MovieCard.vue       ← Poster card
    MovieModal.vue      ← Detail popup
    RoadmapPage.vue     ← `/roadmap` page rendering VISION.md
  App.vue               ← App shell + global movie modal
  assets/global.css     ← CSS variables, reset
```

## Filter logic

All filtering is computed in the Pinia store. Current roadmap direction keeps search broad for now: once title search is active, it may ignore browse filters like the existing behavior.

```
allMovies (20k)
  → genre bitmask filter     O(n), ~0.2ms
  → provider bitmask filter  O(n), ~1ms
  → rating range             O(n), ~0.1ms
  → Fuse.js title search     O(k), ~5ms on subset
  = filteredMovies
    → split into rows by genre/provider/ranking
```

## Data format

```json
{
  "movies": [{ "id": "tt...", "t": "Title", "y": 1994, "r": 9.3,
               "g": 4, "pop": 85.4, "p": "https://...poster.jpg", "prov": 18,
               "s": 1 }],
  "providers": { "8": "Netflix", "15": "Hulu" },
  "genres": { "Action": 1, "Comedy": 2, ... }
}
```
