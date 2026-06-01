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
            <span v-if="movie.s" class="modal-badge">TV Season</span>
          </div>
          <h2 class="modal-title">{{ movie.t }}</h2>

          <div class="modal-genres">
            <span v-for="g in genreLabels" :key="g" class="genre-chip">{{ g }}</span>
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

          <!-- Community reviews (collapsed by default per category) -->
          <div class="modal-maturity" v-if="matLoading || parentsGuide || matError">
            <p class="modal-section-label">Healthyness</p>

            <div v-if="matLoading" class="mat-loading">Loading reviews…</div>
            <div v-else-if="matError" class="mat-loading mat-error">{{ matError }}</div>
            <div v-else-if="parentsGuideCategories.length" class="mat-items-list">
              <details
                v-for="cat in parentsGuideCategories"
                :key="cat.key"
                class="mat-cat-block"
              >
                <summary class="mat-cat-title">
                  <span v-if="cat.severity !== null" class="mat-sev-badge" :class="`sev-${cat.severity}`">
                    {{ SEVERITY_LABELS[cat.severity] }}
                  </span>
                  {{ cat.label }}
                  <span v-if="cat.items.length" class="mat-count">{{ cat.items.length }}</span>
                </summary>
                <ul v-if="cat.items.length" class="mat-items">
                  <li v-for="(item, i) in cat.items.slice(0, 5)" :key="i">{{ item }}</li>
                </ul>
                <p v-else class="mat-no-reviews">No reviews for this category</p>
              </details>
            </div>
            <div v-else class="mat-loading">No community reviews available.</div>
          </div>

          <div class="modal-providers" v-if="providerNames.length">
            <p class="modal-section-label">Available on</p>
            <div class="provider-list">
              <span v-for="p in providerNames" :key="p" class="provider-chip">{{ p }}</span>

            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch } from "vue";
import { GENRES, PROVIDERS, MATURITY_CATEGORIES, SEVERITY_LABELS, getSeverity } from "@/stores/movies.js";
import { API_CAT_TO_KEY, computeSeverity } from "@/maturity.js";
import { useUserStore } from "@/stores/user.js";

const userStore = useUserStore();

const props = defineProps({ movie: { type: Object, default: null } });
defineEmits(["close"]);

const parentsGuide = ref(null);
const matLoading = ref(false);
const matError = ref(null);

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

// ─── Severity algorithm ─────────────────────────────────────────────────────
// computeSeverity is imported from @/maturity.js




// ─── Computed parentsGuide categories ─────────────────────────────────────────

const parentsGuideCategories = computed(() => {
  if (!parentsGuide.value) return [];
  const items = parentsGuide.value.parentsGuide;
  if (!Array.isArray(items)) return [];

  const year      = props.movie?.y   ?? null;
  const genreMask = props.movie?.g   ?? 0;

  const byCat = {};
  for (const entry of items) {
    if (entry.category) byCat[entry.category] = entry;
  }

  return MATURITY_CATEGORIES.map(cat => {
    // Find the API entry whose key maps to this category
    const apiKey = Object.keys(API_CAT_TO_KEY).find(k => API_CAT_TO_KEY[k] === cat.key);
    const entry  = apiKey ? byCat[apiKey] : null;
    if (!entry) return { ...cat, severity: null, items: [] };
    const severity = computeSeverity(entry.severityBreakdowns, apiKey, year, genreMask);
    const reviews  = (entry.reviews ?? []).map(r => r.text).filter(Boolean);
    return { ...cat, severity, items: reviews };
  });
});

async function loadParentsGuide(imdbId) {
  if (!imdbId) return;
  parentsGuide.value = null;
  matError.value = null;
  matLoading.value = true;
  try {
    const res = await fetch(`https://api.imdbapi.dev/titles/${imdbId}/parentsGuide`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    parentsGuide.value = json;
  } catch (e) {
    matError.value = "Could not load reviews.";
    console.warn("parentsGuide fetch failed:", e.message);
  } finally {
    matLoading.value = false;
  }
}

watch(() => props.movie?.id, (id) => {
  if (id) loadParentsGuide(id);
  else { parentsGuide.value = null; matError.value = null; }
}, { immediate: true });
</script>

<style scoped>

.modal-backdrop {
  position: fixed;
  inset: 0;
  background: var(--background, #0b0b0e); /* Changed background color to match full app background */
  z-index: 100;
  width: 100vw;
  height: 100vh;
  display: flex;
  align-items: flex-start; /* Changed from center to allow scrolling from top */
  justify-content: center;
  padding: 0; /* Removed padding for flush fullscreen edge */
  backdrop-filter: blur(6px);
  animation: fadeIn 0.15s ease;
  overflow-y: auto;
}


@keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }

.modal {
  background: var(--background, #0b0b0e); /* Swapped from var(--surface2) to match background */
  border: none; /* Removed border since it fills screen */
  border-radius: 0; /* Removed rounded corners */
  max-width: 900px; /* Increased from 620px to look proper on wide desktop screens */
  width: 100%;
  min-height: 100vh; /* Force to take up entire viewport height */
  display: flex;
  gap: 24px;
  padding: 80px 24px 24px 24px; /* Added extra top padding (80px) to clear the fixed button */
  position: relative;
  overflow-y: visible; /* Let backdrop handle scrolling container */
}

.modal-close {
  position: fixed;
  top: 24px;
  left: 24px;
  background: transparent;
  border: none;
  padding: 0;
  color: #ffffff; /* Sets the SVG stroke color via currentColor */
  width: 24px; /* Explicit width for the icon hit area */
  height: 24px; /* Explicit height for the icon hit area */
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.15s, opacity 0.15s;
  z-index: 110;
}
/* Ensure the child SVG inherits the sizing dimensions smoothly */
.modal-close svg {
  width: 100%;
  height: 100%;
}
.modal-close:hover {
  opacity: 0.8;
  transform: translateX(-3px); /* Subtle back nudge on hover */
}

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

.modal-section-label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--muted);
  margin-bottom: 8px;
}

.provider-list { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 18px; }
.provider-chip {
  padding: 4px 12px;
  background: rgba(45,212,191,0.12);
  border: 1px solid rgba(45,212,191,0.25);
  border-radius: 6px;
  font-size: 12px;
  color: var(--teal);
}

/* ── Community reviews ── */
.modal-maturity { margin-bottom: 18px; }

.mat-loading {
  font-size: 12px;
  color: var(--muted);
  padding: 8px 0;
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
  padding: 8px 10px;
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

.mat-sev-badge {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding: 1px 6px;
  border-radius: 99px;
  flex-shrink: 0;
}
.mat-sev-badge.sev-0 { background: rgba(74,222,128,0.2); color: #4ade80; }
.mat-sev-badge.sev-1 { background: rgba(250,204,21,0.2); color: #facc15; }
.mat-sev-badge.sev-2 { background: rgba(251,146,60,0.2); color: #fb923c; }
.mat-sev-badge.sev-3 { background: rgba(248,113,113,0.2); color: #f87171; }

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

.modal-links { display: flex; gap: 10px; margin-top: 4px; }

.link-btn {
  padding: 8px 16px;
  border-radius: var(--radius);
  font-size: 13px;
  font-weight: 500;
  text-decoration: none;
  transition: opacity 0.15s;
}
.link-btn:hover { opacity: 0.8; }
.link-btn--imdb { background: #f5c842; color: #000; }

/* ── Mobile ── */
@media (max-width: 560px) {
  .modal {
    flex-direction: column;
    padding: 16px 16px 16px 16px;
    gap: 16px;
  }

  .modal-poster {
    width: 100%;
    height: 200px;
  }

  .modal-poster img { object-position: center top; }
  
  /* Adjusted plain SVG scale and position for mobile layout */
  .modal-close {
    top: 16px;
    left: 16px;
    width: 26px;
    height: 26px;
  }
}
</style>