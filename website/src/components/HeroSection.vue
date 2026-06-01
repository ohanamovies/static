<template>
  <header class="hero">
    <!-- Poster background (static pre-made list, no DB dependency) -->
    <div class="hero-poster-bg" aria-hidden="true">
      <div
        v-for="(col, ci) in HERO_POSTER_COLS"
        :key="ci"
        class="poster-col"
      >
        <img
          v-for="(url, i) in col"
          :key="i"
          :src="url"
          loading="lazy"
          class="poster-bg-img"
        />
      </div>
    </div>
    <div class="hero-bg-overlay"></div>

    <div class="hero-content">
      <!-- Wordmark -->
      <div class="hero-brand">
        <span class="hero-logo">Ohana TV</span>
        <span class="hero-tagline">Healthy & family friendly movies.</span>
      </div>

      <!-- Filters (hidden when searching) -->
      <transition name="slide-filters">
        <div class="filters" v-show="true || !store.searchQuery">

          <!-- Per-category maturity filter (top) -->
          <div class="filter-group">
            <p class="filter-label">Max maturity per category</p>
            <div class="mat-cat-grid">
              <div
                v-for="(cat, catIdx) in MATURITY_CATEGORIES"
                :key="cat.key"
                class="mat-cat-row"
              >
                <span class="mat-cat-name">{{ cat.label }}</span>
                <div class="filter-chips">
                  <button
                    v-for="(label, sev) in SEVERITY_LABELS"
                    :key="sev"
                    class="chip chip--maturity chip--sm"
                    :class="[`chip--sev-${sev}`, { active: store.maxMaturityCat[catIdx] === sev }]"
                    @click="store.setMaxMaturityCat(catIdx, sev)"
                  >{{ label }}</button>
                </div>
              </div>
            </div>
          </div>

          <!-- Genres -->
          <div class="filter-group filter-group--full">
            <p class="filter-label">Genre</p>
            <div class="filter-chips">
              <button
                v-for="genre in GENRE_LABELS"
                :key="genre"
                class="chip"
                :class="{ active: store.selectedGenres.has(genre) }"
                @click="store.toggleGenre(genre)"
              >{{ genre }}</button>
            </div>
          </div>

          <!-- Providers -->
          <div class="filter-group filter-group--full" v-if="store.availableProviders.length">
            <p class="filter-label">Streaming on</p>
            <div class="filter-chips">
              <button
                v-for="p in store.availableProviders"
                :key="p.id"
                class="chip chip--provider"
                :class="{ active: store.selectedProviders & p.bit }"
                @click="store.toggleProvider(p.bit)"
              >{{ p.name }}</button>
            </div>
          </div>

        </div>
      </transition>

      <!-- Search + IMDb rating row (always visible, at bottom) -->
      <div class="hero-bottom-row">
        <div class="hero-search">
          <svg class="search-icon" viewBox="0 0 20 20" fill="none">
            <circle cx="9" cy="9" r="6" stroke="currentColor" stroke-width="1.5"/>
            <path d="M13.5 13.5L17 17" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
          <input
            v-model="localSearch"
            type="search"
            placeholder="Search by title…"
            class="search-input"
            spellcheck="false"
          />
          <transition name="fade">
            <span v-if="store.searchQuery" class="search-results-count">
              {{ store.filteredMovies.length }} results
            </span>
          </transition>
        </div>

        <div class="filter-group filter-group--rating">
          <p class="filter-label">Min IMDb rating</p>
          <div class="rating-slider-wrap">
            <input
              type="range"
              min="0" max="10" step="0.5"
              v-model.number="store.minRating"
              class="rating-slider"
            />
            <span class="rating-value">{{ store.minRating === 0 ? 'All' : `${store.minRating}+` }}</span>
          </div>
        </div>
      </div>

      <!-- Active filter summary + clear -->
      <div class="filter-summary" v-if="hasFilters">
        <span class="filter-summary-text">
          {{ store.filteredMovies.length }} of {{ store.allMovies.length }} titles
        </span>
        <button class="clear-btn" @click="store.clearFilters">Clear filters</button>
      </div>
    </div>
  </header>
</template>

<script setup>
import { computed, ref, watch } from "vue";
import { useMovieStore, GENRE_LABELS, PROVIDERS, SEVERITY_LABELS, MATURITY_CATEGORIES } from "@/stores/movies.js";

const store = useMovieStore();

// Local value for instant input feel; debounce the store update by 150ms
const localSearch = ref(store.searchQuery);
let debounceTimer = null;
watch(localSearch, val => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => { store.searchQuery = val; }, 150);
});
// Keep in sync if store is cleared externally (e.g. Clear filters)
watch(() => store.searchQuery, val => { if (val !== localSearch.value) localSearch.value = val; });

const BASE = "https://image.tmdb.org/t/p/w342/";
const HERO_POSTER_COLS = [
  ["qJ2tW6WMUDux911r6m7haRef0WH","aabwWZWx6z1aYP4PX2ADvbDKktd","8FHOtUpNIk5ZPEay2N2EY5lrxkv","4GIeI5K5YdDUkR3mNQBoScpSFEf","mjkS2iAgWj3ik1DTjvI15nHZ7yl","rCzpDGLbOoPwLjy3OAm5NUPOTrC"],
  ["yihdXomYb5kTeSivtFndMy5iDmf","3Qud19bBUrrJAzy0Ilm8gRJlJXP","oJ7g2CifqpStmoYQyaLQgEU32qO","pHpq9yNUIo6aDoCXEBzjSolywgz","3bhkrj58Vtu7enYsRolD1fZdja1","byWgphT74ClOVa8EOGzYDkl8DVL"],
  ["aOIuZAjPaRIE6CMzbazvcHuHXDc","rCzpDGLbOoPwLjy3OAm5NUPOTrC","9cqNxx0GxF0bflZmeSMuL5tnGzr","7WsyChQLEftFiDOVTGkv3hFpyyt","qJ2tW6WMUDux911r6m7haRef0WH","9xjZS2rlVxm8SFx8kPC3aIGCOYQ"],
  ["ybrX94xQm8lXYpZAPRmwD9iIbWP","eTp7gSPkSF3Aw79mNx1NkBP1PZT","yQvGrMoipbRoddT0ZR8tPoR7NfX","RYMX2wcKCBAr24UyPD7xwmjaTn","tVvpFIoteRHNnoZMhdnwIVwJpCA","1g0dhYtq4irTY1GPXvft6k4YLjm"],
  ["iB64vpL3dIObOtMZgX3RqdVdQDc","fWVSwgjpT2D78VUh6X8UBd2rorW","cWsBscZzwu5brg9YjNkGewRUvJX","cRY25Q32kDNPFDkFkxAs6bgCq3L","ril8yx5SOmj0KjNlftsdfIp00fr","vqBmyAj0Xm9LnS1xe1MSlMAJyHq"],
].map(col => col.map(hash => BASE + hash + ".jpg"));

const hasFilters = computed(() =>
  store.searchQuery ||
  store.selectedGenres.size > 0 ||
  store.selectedProviders !== 0 ||
  store.minRating > 0 ||
  store.maxMaturityCat.some(v => v >= 0)
);
</script>

<style scoped>
.hero {
  position: relative;
  min-height: 85vh;
  padding: 80px 48px 56px;
  overflow: hidden;
  border-bottom: 1px solid var(--border);
  margin-bottom: 48px;
  display: flex;
  align-items: flex-start;
  contain: layout paint;
}

/* ── Poster background ── */
.hero-poster-bg {
  position: absolute;
  inset: 0;
  display: flex;
  gap: 8px;
  padding: 0 4px;
  overflow: hidden;
  z-index: 0;
  will-change: transform;
  transform: translateZ(0);
}

.poster-col {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
}

.poster-col:nth-child(even) {
  margin-top: -48px;
}

.poster-col:nth-child(odd) {
  margin-top: 24px;
}

.poster-bg-img {
  width: 100%;
  aspect-ratio: 2/3;
  object-fit: cover;
  border-radius: 4px;
  opacity: 0.55;
  display: block;
  flex-shrink: 0;
}

.hero-bg-overlay {
  position: absolute;
  inset: 0;
  z-index: 1;
  background:
    linear-gradient(135deg, rgba(232,54,93,0.28) 0%, transparent 50%),
    linear-gradient(225deg, rgba(45,212,191,0.15) 0%, transparent 45%),
    radial-gradient(ellipse 110% 60% at 50% 0%, rgba(8,8,16,0.55) 0%, transparent 100%),
    linear-gradient(to bottom, rgba(8,8,16,0.15) 0%, rgba(8,8,16,0.72) 55%, var(--black) 90%);
  pointer-events: none;
}

/* ── Content ── */
.hero-content {
  position: relative;
  z-index: 2;
  max-width: 1400px;
  margin: 0 auto;
  width: 100%;
}

.hero-brand {
  display: flex;
  align-items: baseline;
  gap: 18px;
  margin-bottom: 36px;
}

.hero-logo {
  font-family: var(--font-display);
  font-size: clamp(52px, 8vw, 96px);
  letter-spacing: 0.1em;
  line-height: 1;
  color: #2ecc5a;
  text-shadow: 0 2px 40px rgba(52,211,153,0.55), 0 0 80px rgba(52,211,153,0.2);
}

.hero-tagline {
  font-size: 15px;
  color: rgba(255,255,255,0.82);
  font-style: italic;
}

/* ── Bottom row: search + IMDb rating ── */
.hero-bottom-row {
  display: flex;
  align-items: flex-end;
  gap: 24px;
  margin-top: 32px;
  flex-wrap: wrap;
}

.hero-search {
  position: relative;
  flex: 1 1 320px;
  max-width: 560px;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 16px;
  width: 18px;
  height: 18px;
  color: var(--muted);
  pointer-events: none;
}

.search-input {
  width: 100%;
  min-width: 0;
  max-width: 100%;
  padding: 14px 16px 14px 48px;
  background: rgba(18,18,28,0.96);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  color: var(--white);
  font-family: var(--font-body);
  font-size: 16px;
  outline: none;
  transition: border-color 0.15s, background 0.15s;
}

.search-input::placeholder { color: var(--muted); }
.search-input:focus {
  border-color: rgba(232,54,93,0.5);
  background: rgba(22,22,31,0.95);
}
.search-input::-webkit-search-cancel-button { display: none; }

.search-results-count {
  position: absolute;
  right: 16px;
  font-size: 12px;
  color: var(--muted);
  pointer-events: none;
}

/* ── Filters ── */
.filters {
  display: flex;
  flex-wrap: wrap;
  gap: 28px;
}

.filter-group { display: flex; flex-direction: column; gap: 10px; }
.filter-group--rating { min-width: 200px; }
.filter-group--full { width: 100%; min-width: 0; }

.filter-label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: rgba(255,255,255,0.72);
}

.filter-chips {
  display: flex;
  flex-wrap: nowrap;
  gap: 6px;
  overflow-x: auto;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;
  padding-bottom: 2px;
}
.filter-chips::-webkit-scrollbar { display: none; }

.chip {
  padding: 5px 12px;
  background: rgba(30,30,42,0.92);
  border: 1px solid rgba(255,255,255,0.22);
  border-radius: 99px;
  color: rgba(255,255,255,0.78);
  font-family: var(--font-body);
  font-size: 12px;
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s, background 0.15s;
  white-space: nowrap;
}

.chip:hover {
  border-color: rgba(232,54,93,0.4);
  color: var(--white);
}

.chip.active {
  background: var(--accent);
  border-color: var(--accent);
  color: var(--white);
}

.chip--provider.active {
  background: rgba(45,212,191,0.15);
  border-color: var(--teal);
  color: var(--teal);
}

/* Maturity severity chips */
.chip--sev-0 { --sev-color: #4ade80; }
.chip--sev-1 { --sev-color: #facc15; }
.chip--sev-2 { --sev-color: #fb923c; }
.chip--sev-3 { --sev-color: #f87171; }

.chip--maturity:hover { border-color: var(--sev-color); color: var(--sev-color); }
.chip--maturity.active {
  background: rgba(255,255,255,0.05);
  border-color: var(--sev-color);
  color: var(--sev-color);
}
.chip--sev-0.active { background: rgba(74,222,128,0.15); }
.chip--sev-1.active { background: rgba(250,204,21,0.15); }
.chip--sev-2.active { background: rgba(251,146,60,0.15); }
.chip--sev-3.active { background: rgba(248,113,113,0.15); }

.chip--sm { padding: 3px 8px; font-size: 11px; }

/* Per-category maturity grid */
.mat-cat-grid {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.mat-cat-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.mat-cat-name {
  font-size: 12px;
  color: rgba(255,255,255,0.70);
  min-width: 90px;
  flex-shrink: 0;
}

/* ── Rating slider ── */
.rating-slider-wrap {
  display: flex;
  align-items: center;
  gap: 12px;
}

.rating-slider {
  -webkit-appearance: none;
  width: 160px;
  height: 4px;
  background: var(--surface3);
  border-radius: 99px;
  outline: none;
  cursor: pointer;
}

.rating-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--accent);
  cursor: pointer;
}

.rating-value {
  font-size: 13px;
  font-weight: 500;
  color: var(--white);
  min-width: 30px;
}

/* ── Summary ── */
.filter-summary {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-top: 24px;
}

.filter-summary-text { font-size: 13px; color: var(--muted); }

.clear-btn {
  padding: 4px 12px;
  border: 1px solid var(--border);
  border-radius: 99px;
  background: transparent;
  color: var(--muted);
  font-family: var(--font-body);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s;
}
.clear-btn:hover { border-color: var(--accent); color: var(--accent); }

/* ── Filter slide transition ── */
.slide-filters-enter-active, .slide-filters-leave-active {
  transition: opacity 0.2s, transform 0.2s;
}
.slide-filters-enter-from, .slide-filters-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

/* ── Fade transition ── */
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

/* ── Mobile ── */
@media (max-width: 640px) {
  .hero {
    padding: 48px 16px 40px;
    min-height: 70vh;
  }

  .hero-brand { flex-direction: column; gap: 4px; margin-bottom: 24px; }

  .hero-bottom-row { gap: 16px; margin-top: 20px; }

  .filters { gap: 20px; }

  .poster-col:nth-child(n+4) { display: none; }
}
</style>