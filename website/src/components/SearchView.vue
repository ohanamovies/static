<template>
  <section class="search-view">
    <div class="search-hero">
      <SearchBox
        ref="searchBox"
        v-model="localSearch"
        placeholder="Search movies, shows, Spanish titles…"
        aria-label="Search movies and TV shows"
        @commit="commitSearch"
        @clear="clearSearch"
      />
    </div>

    <div v-if="!queryActive" class="search-empty">
      <section v-if="recentSearches.length" class="recent-section">
        <SectionHeader title="Recent searches" compact level="h3">
          <template #actions>
            <button type="button" @click="clearRecentSearchesList">Clear</button>
          </template>
        </SectionHeader>
        <div class="recent-chips">
          <UiChip
            v-for="query in recentSearches"
            :key="query"
            size="sm"
            tone="safe"
            :label="query"
            @click="runRecentSearch(query)"
          />
        </div>
      </section>

      <section v-if="recentViewedMovies.length" class="recent-section">
        <SectionHeader title="Recently viewed" compact level="h3" />
        <div class="recent-viewed-list">
          <SearchResultCard
            v-for="movie in recentViewedMovies"
            :key="movie.id"
            :movie="movie"
            @select="$emit('selectMovie', $event)"
          />
        </div>
      </section>
    </div>

    <div v-else class="results-wrap">
      <SectionHeader :title="`Results for “${store.searchQuery}”`" compact>
        <template #actions>
          <span class="result-count">{{ store.filteredMovies.length }} titles</span>
        </template>
      </SectionHeader>
      <section v-if="noSearchResults" class="no-results" aria-live="polite">
        <p class="no-results-title">No matching titles</p>
        <p>Check the spelling or try a shorter title. Search ignores Discover filters, so this is a catalog miss.</p>
      </section>
      <div v-if="exactTitleMatches.length" class="results-section">
        <SectionHeader title="Best matches" compact level="h3" />
        <div class="results-list">
          <SearchResultCard
            v-for="movie in exactTitleMatches"
            :key="movie.id"
            :movie="movie"
            @select="selectResult"
          />
        </div>
      </div>

      <div v-if="relatedTitleMatches.length" class="results-section">
        <SectionHeader title="Related titles" compact level="h3">
          <template #actions>
            <span class="result-count">Series-style title matches</span>
          </template>
        </SectionHeader>
        <div class="results-list">
          <SearchResultCard
            v-for="movie in relatedTitleMatches"
            :key="movie.id"
            :movie="movie"
            @select="selectResult"
          />
        </div>
      </div>

      <div v-if="supplementalResults.length" class="results-section">
        <SectionHeader :title="supplementalTitle" compact level="h3" />
        <div class="results-list">
          <SearchResultCard
            v-for="movie in supplementalResults"
            :key="movie.id"
            :movie="movie"
            @select="selectResult"
          />
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useMovieStore } from "@/stores/movies.js";
import { addRecentSearch, clearRecentSearches, getRecentSearches, getRecentViewedIds } from "@/lib/recentActivity.js";
import SearchBox from "@/components/SearchBox.vue";
import SearchResultCard from "@/components/SearchResultCard.vue";
import SectionHeader from "@/components/SectionHeader.vue";
import UiChip from "@/components/UiChip.vue";

const emit = defineEmits(["selectMovie"]);

const route = useRoute();
const router = useRouter();
const store = useMovieStore();
const searchBox = ref(null);
const localSearch = ref(routeQueryText() || store.searchQuery);
const activityTick = ref(0);
let debounceTimer = null;

watch(localSearch, val => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    store.searchQuery = val;
  }, 180);
});
watch(() => store.searchQuery, val => { if (val !== localSearch.value) localSearch.value = val; });
watch(() => route.query.q, () => {
  const query = routeQueryText();
  if (query === store.searchQuery) return;
  clearTimeout(debounceTimer);
  localSearch.value = query;
  store.searchQuery = query;
}, { immediate: true });

const queryActive = computed(() => store.searchQuery.trim().length >= 2);
const recentSearches = computed(() => {
  activityTick.value;
  return getRecentSearches();
});
const movieById = computed(() => {
  const map = new Map();
  for (const movie of store.allMovies) map.set(movie.id, movie);
  return map;
});
const recentViewedMovies = computed(() => {
  activityTick.value;
  return getRecentViewedIds().map(id => movieById.value.get(id)).filter(Boolean).slice(0, 6);
});

const normalizedQuery = computed(() => normalizeTitle(store.searchQuery));
const visibleResults = computed(() => store.filteredMovies.slice(0, 80));
const exactTitleMatches = computed(() => {
  const query = normalizedQuery.value;
  if (query.length < 2) return [];
  return visibleResults.value
    .filter(movie => [movie.t, movie.ts].some(title => normalizeTitle(title) === query))
    .sort((a, b) => compareExactTitleIntent(a, b, query))
    .slice(0, 6);
});
const relatedTitleMatches = computed(() => {
  const query = normalizedQuery.value;
  if (query.length < 4) return [];
  const exactIds = new Set(exactTitleMatches.value.map(movie => movie.id));
  const matches = visibleResults.value
    .filter(movie => !exactIds.has(movie.id))
    .filter(movie => [movie.t, movie.ts].some(title => isHighConfidenceRelatedTitle(title, query)))
    .sort((a, b) => (a.y || 9999) - (b.y || 9999));
  return matches.length >= 2 ? matches.slice(0, 12) : [];
});
const highlightedIds = computed(() => new Set([
  ...exactTitleMatches.value.map(movie => movie.id),
  ...relatedTitleMatches.value.map(movie => movie.id),
]));
const supplementalResults = computed(() => visibleResults.value.filter(movie => !highlightedIds.value.has(movie.id)));
const supplementalTitle = computed(() => highlightedIds.value.size ? "More results" : "Top results");
const noSearchResults = computed(() => queryActive.value && store.filteredMovies.length === 0);

function routeQueryText() {
  const q = route.query.q;
  return (Array.isArray(q) ? q[0] : q || "").trim();
}

function syncSearchQueryToRoute(query) {
  if (route.name !== "search") return;
  const trimmed = query.trim();
  const nextQuery = { ...route.query };
  if (trimmed.length >= 2) nextQuery.q = trimmed;
  else delete nextQuery.q;
  if ((route.query.q || "") !== (nextQuery.q || "")) router.replace({ query: nextQuery });
}

function normalizeTitle(value = "") {
  return String(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/^(the|a|an|el|la|los|las|un|una|unos|unas)\s+/, "")
    .trim();
}

function compareExactTitleIntent(a, b, query) {
  return exactTitleIntentScore(b, query) - exactTitleIntentScore(a, query);
}

function exactTitleIntentScore(movie, query) {
  const title = normalizeTitle(movie.t);
  const alternateTitle = normalizeTitle(movie.ts);
  const ratingScore = (movie.r || 0) * 100;
  const popularityScore = Math.min(movie.pop || 0, 100);
  const primaryTitleBoost = title === query ? 500 : 0;
  const alternateTitleBoost = alternateTitle === query ? 120 : 0;
  const posterBoost = movie.p ? 20 : 0;

  // Exact-title buckets are already high confidence. Within them, prefer the
  // canonical, better-known title over obscure same-name noise; this keeps
  // searches like “godfather” from burying The Godfather under weaker remakes.
  return primaryTitleBoost + alternateTitleBoost + ratingScore + popularityScore + posterBoost;
}

function isHighConfidenceRelatedTitle(title, query) {
  const normalizedTitle = normalizeTitle(title);
  if (!normalizedTitle || normalizedTitle === query) return false;
  const queryTokens = query.split(" ").filter(Boolean);
  if (queryTokens.length >= 2) return normalizedTitle.includes(query);
  // One-word collection hints need a stronger signal than a short substring:
  // “godfather” works; vague searches like “star” should stay in Top results.
  return query.length >= 6 && (normalizedTitle === query || normalizedTitle.startsWith(`${query} `));
}

function clearSearch() {
  clearTimeout(debounceTimer);
  localSearch.value = "";
  store.searchQuery = "";
  syncSearchQueryToRoute("");
  if (shouldFocusSearchBox()) searchBox.value?.focus({ preventScroll: true });
}

function commitSearch() {
  clearTimeout(debounceTimer);
  store.searchQuery = localSearch.value;
  syncSearchQueryToRoute(store.searchQuery);
  if (store.searchQuery.trim().length >= 2) addRecentSearch(store.searchQuery);
  activityTick.value++;
}

function shouldFocusSearchBox() {
  return window.matchMedia?.("(pointer: fine) and (min-width: 700px)").matches;
}

function runRecentSearch(query) {
  clearTimeout(debounceTimer);
  localSearch.value = query;
  store.searchQuery = query;
  syncSearchQueryToRoute(query);
  addRecentSearch(query);
  activityTick.value++;
  if (shouldFocusSearchBox()) searchBox.value?.focus({ preventScroll: true });
}

function clearRecentSearchesList() {
  clearRecentSearches();
  activityTick.value++;
}

function selectResult(movie) {
  commitSearch();
  emit("selectMovie", movie);
}

function refreshRecentActivity() {
  activityTick.value++;
}

onMounted(() => {
  if (shouldFocusSearchBox()) searchBox.value?.focus({ preventScroll: true });
  window.addEventListener("ohana:recent-activity", refreshRecentActivity);
});
onUnmounted(() => window.removeEventListener("ohana:recent-activity", refreshRecentActivity));
</script>

<style scoped>
.search-view { padding: 18px 48px 64px; max-width: 1060px; margin: 0 auto; width: 100%; }
.search-hero { display: grid; gap: 10px; }
.search-empty { margin-top: 16px; display: grid; gap: 18px; }
.recent-section { padding: 16px 0; color: var(--muted); }
.recent-section { border-top: 1px solid rgba(255,255,255,0.08); }
.recent-section h3 { color: var(--white); font-size: 16px; }
.recent-section button:not(.ui-chip) { border: 1px solid rgba(255,255,255,0.12); border-radius: 999px; background: rgba(255,255,255,0.05); color: rgba(240,238,232,0.72); font: inherit; font-size: 12px; min-height: 32px; padding: 0 12px; cursor: pointer; }
.recent-chips { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
.recent-section button:not(.ui-chip):hover { border-color: rgba(45,212,191,0.42); color: var(--teal); }
.recent-viewed-list { display: grid; gap: 10px; }
.results-wrap { margin-top: 16px; }
.result-count { color: var(--muted); font-size: 13px; }
.no-results { margin-top: 14px; padding: 18px 0; color: var(--muted); border-top: 1px solid rgba(255,255,255,0.08); }
.no-results-title { margin-bottom: 4px; color: var(--white); font-weight: 650; }
.results-section { display: grid; gap: 10px; margin-top: 14px; }
.results-section:first-of-type { margin-top: 0; }
.results-section h3 { font-size: 15px; }
.results-list { display: grid; gap: 10px; }
@media (max-width: 640px) {
  .search-view { padding: 10px 14px 48px; }
  .recent-chips {
    flex-wrap: nowrap;
    overflow-x: auto;
    scrollbar-width: none;
    overscroll-behavior-inline: contain;
    -webkit-overflow-scrolling: touch;
  }
  .recent-chips::-webkit-scrollbar { display: none; }
}
</style>
