# Website architecture

## Source map

```text
src/
  main.js                 Vue/Pinia bootstrap
  App.vue                 App shell: loading, hero, rows/grid, modal, config
  stores/movies.js        Catalogue loading, filters, row construction, mock data
  stores/user.js          User token, watched state, lists, custom providers
  lib/kvStore.js          Remote/local KV helpers and conflict-safe mutations
  maturity.js             Packed maturity score helpers
  components/
    HeroSection.vue       Search and filter controls
    MovieRow.vue          Horizontal rows
    MovieCard.vue         Poster cards and watched/list actions
    MovieModal.vue        Details and maturity display
    ConfigModal.vue       User/list/provider settings
  assets/global.css       Design system and global styles
```

## Runtime flow

1. `stores/movies.js` fetches `movies.json` from the site root.
2. If loading fails, mock movies are generated for development.
3. Fuse.js indexes titles (`t`) and translated titles (`ts`) after data loads.
4. The store computes filtered movies, then splits them into ranked rows.
5. `stores/user.js` optionally loads user/list documents through `lib/kvStore.js`.

## Filtering notes

- Search queries of 2+ characters return Fuse results and intentionally ignore other filters.
- Without search, movies without posters are hidden.
- Very explicit sex/nudity entries are hidden by default: `getScore(mat, 0) < 4.5`.
- Genres and providers are bitmasks; use bitwise checks, not array membership.

## PWA/cache notes

`vite.config.js` configures Workbox:

- App assets are precached.
- `movies.json` and `extra.json` are **not** precached; they use runtime stale-while-revalidate caching.
- Google Fonts CSS is stale-while-revalidate; font files are cache-first.
