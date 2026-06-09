<template>
  <Teleport to="body">
    <div class="modal-backdrop" @click.self="$emit('close')" v-if="movie">
      <div class="modal">
        <button class="modal-close" @click="$emit('close')" aria-label="Go back">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>

        <div class="modal-poster">
          <img v-if="movie.p" :src="movie.p.replace('w342', 'w500')" :alt="movie.t" />
          <div v-else class="modal-poster-placeholder" :style="{ background: movie._mockColor || '#16161f' }">
            <span>{{ movie.t }}</span>
          </div>
        </div>

        <div class="modal-body">
          <div class="modal-meta">
            <span class="modal-year">{{ movie.y }}</span>
            <span class="modal-rating">★ {{ movie.r?.toFixed(1) }}</span>
            <a
              v-if="movie.id"
              :href="`https://www.imdb.com/title/${movie.id}/`"
              target="_blank"
              rel="noopener"
              class="imdb-link"
              title="View on IMDb"
            >
              <img src="https://upload.wikimedia.org/wikipedia/commons/6/69/IMDB_Logo_2016.svg" alt="IMDb" class="imdb-logo" />
            </a>
            <a
              v-if="extraDetails?.tmdbUrl"
              :href="extraDetails.tmdbUrl"
              target="_blank"
              rel="noopener"
              class="ext-site-link"
              title="View on TMDB"
            >
              <img src="https://upload.wikimedia.org/wikipedia/commons/8/89/Tmdb.new.logo.svg" alt="TMDB" class="imdb-logo" />
            </a>
            <span v-if="movie.s" class="modal-badge">TV Season</span>
          </div>
          <h2 class="modal-title">{{ movie.t }}</h2>

          <div class="modal-genres">
            <span v-for="g in genreLabels" :key="g" class="genre-chip">{{ g }}</span>
          </div>

          <!-- Synopsis -->
          <div class="modal-synopsis" v-if="synopsis">
            <p class="synopsis-text">{{ synopsis }}</p>
          </div>

          <!-- User actions (watched + lists) -->
          <div v-if="userStore.isLoggedIn" class="modal-user-actions">
            <div class="user-actions-row">
              <button
                class="watched-btn"
                :class="{ 'watched-btn--active': userStore.isWatched(movie.id) }"
                @click="userStore.toggleWatched(movie.id)"
              >
                {{ userStore.isWatched(movie.id) ? "✓ Watched" : "Mark watched" }}
              </button>

              <button
                v-for="list in userStore.lists"
                :key="list.token"
                class="list-chip"
                :class="{ 'list-chip--active': userStore.isInList(list.token, movie.id) }"
                @click="userStore.toggleMovieInList(list.token, movie.id)"
              >{{ list.name }}</button>

              <span v-if="!userStore.lists.length" class="no-lists-hint">No lists yet — create one in ⚙ Settings</span>
            </div>
          </div>

          <!-- Healthiness: ML scores from stored matMask + links + IMDb community reviews -->
          <div class="modal-maturity" v-if="movie.mat !== undefined || matReviews">
            <div class="mat-header">
              <p class="modal-section-label">Healthiness</p>
              <div class="mat-links">
                <span v-if="movie.mpa" class="modal-badge modal-badge--mpa">{{ movie.mpa }}</span>
                <a
                  v-if="movie.id"
                  :href="`https://www.imdb.com/title/${movie.id}/parentalguide`"
                  target="_blank" rel="noopener"
                  class="mat-ext-link"
                  title="IMDb Parents Guide"
                >IMDb guide</a>
                <a
                  v-if="extraDetails.csm"
                  :href="'https://www.commonsensemedia.org'+extraDetails.csm"
                  target="_blank" rel="noopener"
                  class="mat-ext-link mat-ext-link--csm"
                  title="Common Sense Media review"
                >CSM</a>
              </div>
            </div>

            <!-- Score grid from stored bitmask -->
            <div v-if="movie.mat !== undefined" class="mat-score-grid">
              <div
                v-for="cat in MATURITY_CATEGORIES"
                :key="cat.key"
                class="mat-score-row"
              >
                <span class="mat-score-name">{{ cat.label }}</span>
                <div class="mat-score-bar-wrap">
                  <div
                    class="mat-score-bar"
                    :class="scoreCssClass(getScore(movie.mat, cat.shift))"
                    :style="{ width: `${getScore(movie.mat, cat.shift) / 5 * 95+5}%` }"
                  ></div>
                </div>
                <span class="mat-score-label" :class="scoreCssClass(getScore(movie.mat, cat.shift))">
                  {{ SEVERITY_LABELS[Math.round(getScore(movie.mat, cat.shift))] }}
                  - {{ getScore(movie.mat, cat.shift).toFixed(0) }}/5
                </span>
                
              </div>
            </div>

            <!-- Community review excerpts from IMDb (collapsed per category) -->
            <div v-if="matReviewsLoading" class="mat-loading">Loading community reviews…</div>
            <div v-else-if="matReviewsError" class="mat-loading mat-error">{{ matReviewsError }}</div>
            <div v-else-if="matReviewCategories.length" class="mat-items-list">
              <details
                v-for="cat in matReviewCategories"
                :key="cat.key"
                class="mat-cat-block"
              >
                <summary class="mat-cat-title">
                  {{ cat.label }}
                  <span v-if="cat.items.length" class="mat-count">{{ cat.items.length }} reviews</span>
                </summary>
                <ul v-if="cat.items.length" class="mat-items">
                  <li v-for="(item, i) in cat.items.slice(0, 5)" :key="i">{{ item }}</li>
                </ul>
                <p v-else class="mat-no-reviews">No community reviews for this category</p>
              </details>
            </div>
          </div>

          <div class="modal-providers" v-if="providerNames.length">
            <p class="modal-section-label">Available on</p>
            <div class="provider-list">
              <a v-for="p in providerNames" target="_blank" rel="noopener" :key="p" :href="extraDetails?.tmdbUrl+'/watch'" class="provider-chip">{{ p }}</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch } from "vue";
import { GENRES, PROVIDERS } from "@/stores/movies.js";
import { MATURITY_CATEGORIES, SEVERITY_LABELS, getScore, scoreCssClass } from "@/maturity.js";
import { useUserStore } from "@/stores/user.js";

const userStore = useUserStore();

const props = defineProps({ movie: { type: Object, default: null } });
defineEmits(["close"]);

// ─── Extra Data Lookup Management ───────────────────────────────────────────
// Holds the parsed key-value dictionary from extra.json
const extraTable = ref({}); 
const extraLoaded = ref(false);

async function loadExtraJsonData() {
  if (extraLoaded.value) return; // Prevent multiple global fetches
  try {
    // Assuming extra.json is placed inside your public directory alongside movies.json
    const res = await fetch("/extra.json");
    if (res.ok) {
      const data = await res.json();
      extraTable.value = data || {};
      extraLoaded.value = true;
    }
  } catch (error) {
    console.error("Failed to preload extra.json table:", error);
  }
}

// Automatically resolve details matching the current active movie ID
const extraDetails = computed(() => {
  if (!props.movie?.id || !extraLoaded.value) return null;
console.log(extraTable.value)
  return extraTable.value[props.movie.id] || null;
});

// Fallback cascade logic for handling overview
const synopsis = computed(() => {
  if (!props.movie) return null;
  // 1. Check if the active movie element already contains an overview variant
  if (props.movie.overviewEs || props.movie.overviewEn) {
    console.log(props, props.movie)
    return props.movie.overviewEs || props.movie.overviewEn;
  }
  console.log(extraDetails.value)
  // 2. Return the pre-scraped English synopsis retrieved from our table
  return extraDetails.value?.synopsisEn || null;
});

// ─── IMDb community reviews (raw text only — no severity computed in browser) ─
const matReviews        = ref(null);
const matReviewsLoading = ref(false);
const matReviewsError   = ref(null);

// Only the 4 CSM categories we track — no FRIGHTENING
const REVIEW_CATS = [
  { key: "SEXUAL_CONTENT", label: "Sex & Nudity" },
  { key: "VIOLENCE",       label: "Violence" },
  { key: "PROFANITY",      label: "Language" },
  { key: "ALCOHOL_DRUGS",  label: "Drugs" },
];

const matReviewCategories = computed(() => {
  if (!matReviews.value) return [];
  const items = matReviews.value.parentsGuide;
  if (!Array.isArray(items)) return [];
  const byCat = Object.fromEntries(items.filter(e => e.category).map(e => [e.category, e]));
  return REVIEW_CATS.map(({ key, label }) => {
    const entry   = byCat[key] ?? null;
    const reviews = (entry?.reviews ?? []).map(r => r.text).filter(Boolean);
    return { key, label, items: reviews };
  }).filter(cat => cat.items.length > 0);
});

async function loadReviews(imdbId) {
  matReviews.value = null;
  matReviewsError.value = null;
  if (!imdbId) return;
  matReviewsLoading.value = true;
  try {
    const res = await fetch(`https://api.imdbapi.dev/titles/${imdbId}/parentsGuide`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    matReviews.value = await res.json();
  } catch (e) {
    matReviewsError.value = "Could not load community reviews.";
    console.warn("parentsGuide fetch failed:", e.message);
  } finally {
    matReviewsLoading.value = false;
  }
}

// ─── Derived display data ─────────────────────────────────────────────────────
const genreLabels = computed(() => {
  if (!props.movie) return [];
  return Object.entries(GENRES)
    .filter(([, mask]) => props.movie.g & mask)
    .map(([name]) => name);
});

const providerNames = computed(() => {
  if (!props.movie) return [];
  return PROVIDERS
    .filter(p => props.movie.prov & p.bit)
    .map(p => p.name);
});

// ─── Watch for movie changes ──────────────────────────────────────────────────
watch(() => props.movie, (movie) => {
  if (movie) {
    //loadSynopsis(movie);
    loadExtraJsonData()
    loadReviews(movie.id);
  } else {
    //synopsis.value = null;
    matReviews.value = null;
    matReviewsError.value = null;
  }
}, { immediate: true });
</script>

<style scoped>

.modal-backdrop {
  position: fixed;
  inset: 0;
  background: var(--background, #0b0b0e);
  z-index: 100;
  width: 100vw;
  height: 100vh;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 0;
  backdrop-filter: blur(6px);
  animation: fadeIn 0.15s ease;
  overflow-y: auto;
}

@keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }

.modal {
  background: var(--background, #0b0b0e);
  border: none;
  border-radius: 0;
  max-width: 900px;
  width: 100%;
  min-height: 100vh;
  display: flex;
  gap: 24px;
  padding: 80px 24px 24px 24px;
  position: relative;
  overflow-y: visible;
}

.modal-close {
  position: fixed;
  top: 24px;
  left: 24px;
  background: transparent;
  border: none;
  padding: 0;
  color: #ffffff;
  width: 24px;
  height: 24px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.15s, opacity 0.15s;
  z-index: 110;
}
.modal-close svg { width: 100%; height: 100%; }
.modal-close:hover { opacity: 0.8; transform: translateX(-3px); }

.modal-poster {
  flex-shrink: 0;
  width: 140px;
  height: 210px;
  border-radius: var(--radius);
  overflow: hidden;
}
.modal-poster img { width: 100%; height: 100%; object-fit: cover; }
.modal-poster-placeholder {
  width: 100%; height: 100%;
  display: flex; align-items: flex-end; padding: 10px;
  font-family: var(--font-display);
  font-size: 14px; color: rgba(255,255,255,0.7);
}

.modal-body { flex: 1; min-width: 0; }

.modal-meta {
  display: flex; gap: 12px; align-items: center;
  margin-bottom: 8px; flex-wrap: wrap;
}
.modal-year { font-size: 13px; color: var(--muted); }
.modal-rating { font-size: 14px; font-weight: 500; color: var(--gold); }
.imdb-link { display: inline-flex; align-items: center; text-decoration: none; }
.imdb-logo { height: 12px; width: auto; border-radius: 2px; }

.modal-badge {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  padding: 2px 8px;
  background: rgba(45,212,191,0.15);
  border: 1px solid rgba(45,212,191,0.3);
  border-radius: 99px;
  color: var(--teal);
}
.modal-badge--mpa {
  background: rgba(250,204,21,0.1);
  border-color: rgba(250,204,21,0.3);
  color: #facc15;
}

.modal-title {
  font-family: var(--font-display);
  font-size: 28px;
  letter-spacing: 0.04em;
  line-height: 1.1;
  margin-bottom: 14px;
}

.modal-genres {
  display: flex; flex-wrap: wrap; gap: 6px;
  margin-bottom: 18px;
}
.genre-chip {
  padding: 3px 10px;
  background: var(--surface3);
  border: 1px solid var(--border);
  border-radius: 99px;
  font-size: 12px;
  color: var(--white);
}

/* ── Synopsis ── */
.modal-synopsis { margin-bottom: 18px; }
.synopsis-loading { font-size: 13px; color: var(--muted); font-style: italic; }
.synopsis-text {
  font-size: 14px;
  color: rgba(255,255,255,0.78);
  line-height: 1.6;
  margin: 0;
}

.modal-section-label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--muted);
  margin: 0;
}

/* ── Providers ── */
.modal-providers { margin-bottom: 18px; }
.provider-list { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
.provider-chip {
  padding: 4px 12px;
  background: rgba(45,212,191,0.12);
  border: 1px solid rgba(45,212,191,0.25);
  border-radius: 6px;
  font-size: 12px;
  text-decoration: none;
  color: var(--teal);
}

/* ── Healthiness section ── */
.modal-maturity { margin-bottom: 18px; }

.mat-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.mat-links {
  display: flex;
  gap: 8px;
  margin-left: auto;
}

.mat-ext-link {
  font-size: 11px;
  color: var(--muted);
  text-decoration: none;
  padding: 2px 8px;
  border: 1px solid var(--border);
  border-radius: 99px;
  transition: color 0.15s, border-color 0.15s;
  white-space: nowrap;
}
.mat-ext-link:hover { color: var(--white); border-color: rgba(255,255,255,0.3); }
.mat-ext-link--csm:hover { color: #34d399; border-color: rgba(52,211,153,0.4); }

/* Score grid */
.mat-score-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 14px;
}

.mat-score-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.mat-score-name {
  font-size: 12px;
  color: var(--muted);
  min-width: 88px;
  flex-shrink: 0;
}

.mat-score-bar-wrap {
  flex: 1;
  height: 4px;
  background: var(--surface3);
  border-radius: 99px;
  overflow: hidden;
}

.mat-score-bar {
  height: 100%;
  border-radius: 99px;
  transition: width 0.4s ease;
}

/* Score bar & label colours keyed to 0–5 integer */
.sev-0 { background: #4ade80; color: #4ade80; }
.sev-1 { background: #a3e635; color: #a3e635; }
.sev-2 { background: #facc15; color: #facc15; }
.sev-3 { background: #fb923c; color: #fb923c; }
.sev-4 { background: #f87171; color: #f87171; }
.sev-5 { background: #dc2626; color: #dc2626; }

.mat-score-label {
  font-size: 10px;
  color: white;
  text-shadow: 1px black;
  min-width: 75px;
  text-align: center;
  flex-shrink: 0;
}

.mat-score-val {
  font-size: 11px;
  color: var(--muted);
  min-width: 8px;
  text-align: right;
  flex-shrink: 0;
}

/* Community review accordions */
.mat-loading {
  font-size: 12px;
  color: var(--muted);
  padding: 4px 0;
}
.mat-error { color: rgba(248,113,113,0.7); }

.mat-items-list { display: flex; flex-direction: column; gap: 4px; }

.mat-cat-block {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
}

.mat-cat-title {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 10px;
  font-size: 12px;
  color: var(--white);
  cursor: pointer;
  list-style: none;
  user-select: none;
  background: var(--surface3);
}
.mat-cat-title::-webkit-details-marker { display: none; }
.mat-cat-title::after {
  content: "›";
  margin-left: auto;
  font-size: 16px;
  color: var(--muted);
  transition: transform 0.15s;
}
.mat-cat-block[open] .mat-cat-title::after { transform: rotate(90deg); }

.mat-count {
  font-size: 10px;
  color: var(--muted);
  background: var(--surface2);
  padding: 1px 6px;
  border-radius: 99px;
}

.mat-no-reviews {
  font-size: 11px;
  color: var(--muted);
  padding: 6px 10px;
  opacity: 0.6;
}

.mat-items {
  list-style: none;
  padding: 6px 10px;
  display: flex;
  flex-direction: column;
  gap: 0;
}
.mat-items li {
  font-size: 11px;
  color: var(--muted);
  padding: 5px 0;
  border-bottom: 1px solid var(--border);
  line-height: 1.4;
}
.mat-items li:last-child { border-bottom: none; }

/* ── User actions ── */
.modal-user-actions { margin-bottom: 18px; }

.user-actions-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.watched-btn {
  padding: 5px 14px;
  border-radius: 99px;
  font-family: var(--font-body);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid var(--border);
  background: var(--surface3);
  color: var(--muted);
  transition: all 0.15s;
}
.watched-btn:hover { border-color: rgba(255,255,255,0.2); color: var(--white); }
.watched-btn--active {
  background: rgba(45, 212, 191, 0.15);
  border-color: rgba(45, 212, 191, 0.35);
  color: var(--teal);
}

.list-chip {
  padding: 5px 14px;
  border-radius: 99px;
  font-family: var(--font-body);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid var(--border);
  background: var(--surface3);
  color: var(--muted);
  transition: all 0.15s;
}
.list-chip:hover { border-color: rgba(255,255,255,0.2); color: var(--white); }
.list-chip--active {
  background: rgba(45,212,191,0.15);
  border-color: rgba(45,212,191,0.35);
  color: var(--teal);
}

.no-lists-hint {
  font-size: 12px;
  color: var(--muted);
  font-style: italic;
}

/* ── Mobile ── */
@media (max-width: 560px) {
  .modal {
    flex-direction: column;
    padding: 16px 16px 16px 16px;
    gap: 16px;
  }
  .modal-poster { width: 100%; height: 200px; }
  .modal-poster img { object-position: center top; }
  .modal-close { top: 16px; left: 16px; width: 26px; height: 26px; }
}
</style>