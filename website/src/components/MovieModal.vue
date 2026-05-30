<template>
  <Teleport to="body">
    <div class="modal-backdrop" @click.self="$emit('close')" v-if="movie">
      <div class="modal">
        <button class="modal-close" @click="$emit('close')">✕</button>

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
            <span v-if="movie.s" class="modal-badge">TV Season</span>
          </div>
          <h2 class="modal-title">{{ movie.t }}</h2>

          <div class="modal-genres">
            <span v-for="g in genreLabels" :key="g" class="genre-chip">{{ g }}</span>
          </div>

          <div class="modal-providers" v-if="providerNames.length">
            <p class="modal-section-label">Available on</p>
            <div class="provider-list">
              <span v-for="p in providerNames" :key="p" class="provider-chip">{{ p }}</span>
            </div>
          </div>

          <!-- Maturity section -->
          <div class="modal-maturity" v-if="movie.mat !== undefined || matLoading || parentsGuide">
            <p class="modal-section-label">Maturity</p>

            <!-- Stored severity bars (only if mat is defined) -->
            <div class="maturity-bars" v-if="movie.mat !== undefined">
              <div
                v-for="cat in MATURITY_CATEGORIES"
                :key="cat.key"
                class="mat-bar-row"
              >
                <span class="mat-bar-label">{{ cat.label }}</span>
                <div class="mat-bar-track">
                  <div
                    class="mat-bar-fill"
                    :class="`sev-${getSeverity(movie.mat, cat.shift)}`"
                    :style="{ width: `${(getSeverity(movie.mat, cat.shift) / 3) * 100}%` }"
                  ></div>
                </div>
                <span
                  v-if="getSeverity(movie.mat, cat.shift) > 0"
                  class="mat-bar-text"
                  :class="`sev-${getSeverity(movie.mat, cat.shift)}`"
                >{{ SEVERITY_LABELS[getSeverity(movie.mat, cat.shift)] }}</span>
              </div>
            </div>

            <!-- Dynamic parentsGuide community reviews -->
            <div class="maturity-details">
              <p class="modal-section-label mat-reviews-label">Community reviews</p>
              <div v-if="matLoading" class="mat-loading">Loading reviews…</div>
              <div v-else-if="matError" class="mat-loading mat-error">{{ matError }}</div>
              <div v-else-if="parentsGuideCategories.length" class="mat-items-list">
                <div
                  v-for="cat in parentsGuideCategories"
                  :key="cat.key"
                  class="mat-cat-block"
                  v-show="cat.items?.length"
                >
                  <p class="mat-cat-title" v-if="cat.items?.length">
                    <span v-if="cat.severity !== null" class="mat-sev-badge" :class="`sev-${cat.severity}`">
                      {{ SEVERITY_LABELS[cat.severity] }}
                    </span>
                    {{ cat.label }}
                  </p>
                  <ul v-if="cat.items?.length" class="mat-items">
                    <li v-for="(item, i) in cat.items.slice(0, 5)" :key="i">{{ item }}</li>
                  </ul>
                </div>
              </div>
              <div v-else-if="!matLoading" class="mat-loading">No community reviews available.</div>
            </div>
          </div>

          <div class="modal-links">
            <a
              :href="`https://www.imdb.com/title/${movie.id}/`"
              target="_blank"
              rel="noopener"
              class="link-btn link-btn--imdb"
            >IMDb ↗</a>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch } from "vue";
import { GENRES, PROVIDERS, MATURITY_CATEGORIES, SEVERITY_LABELS, getSeverity } from "@/stores/movies.js";

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

// API response: { parentsGuide: [{ category: "VIOLENCE", severityBreakdowns: [...], reviews: [{text}] }] }
const API_CAT_MAP = {
  "SEXUAL_CONTENT":             "sexAndNudity",
  "VIOLENCE":                   "violenceAndGore",
  "PROFANITY":                  "profanity",
  "ALCOHOL_DRUGS":              "alcoholDrugsAndSmoking",
  "FRIGHTENING_INTENSE_SCENES": "frighteningScenes",
};

const SEV_WEIGHTS = { none: 1, mild: 2, moderate: 3, severe: 4 }; // 1-4 → avg → 0-3

function weightedSeverity(severityBreakdowns) {
  if (!Array.isArray(severityBreakdowns) || severityBreakdowns.length === 0) return null;
  let total = 0, wsum = 0;
  for (const { severityLevel, voteCount } of severityBreakdowns) {
    const w = SEV_WEIGHTS[severityLevel];
    if (w == null) continue;
    total += voteCount;
    wsum  += voteCount * w;
  }
  if (total === 0) return null;
  return Math.round(wsum / total) - 1; // 0-3
}

const parentsGuideCategories = computed(() => {
  if (!parentsGuide.value) return [];
  const items = parentsGuide.value.parentsGuide;
  if (!Array.isArray(items)) return [];

  // Index by our internal key
  const byKey = {};
  for (const entry of items) {
    const key = API_CAT_MAP[entry.category];
    if (key) byKey[key] = entry;
  }

  return MATURITY_CATEGORIES.map(cat => {
    const entry = byKey[cat.key];
    if (!entry) return { ...cat, severity: null, items: [] };
    const severity = weightedSeverity(entry.severityBreakdowns);
    const reviews = (entry.reviews ?? []).map(r => r.text).filter(Boolean);
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
  background: rgba(0,0,0,0.75);
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  backdrop-filter: blur(6px);
  animation: fadeIn 0.15s ease;
  overflow-y: auto;
}

@keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }

.modal {
  background: var(--surface2);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  max-width: 620px;
  width: 100%;
  display: flex;
  gap: 24px;
  padding: 24px;
  position: relative;
  animation: slideUp 0.2s ease;
  max-height: 90vh;
  overflow-y: auto;
}

@keyframes slideUp { from { transform: translateY(16px); opacity: 0 } to { transform: none; opacity: 1 } }

.modal-close {
  position: absolute;
  top: 12px; right: 12px;
  background: transparent;
  border: none;
  color: var(--muted);
  font-size: 18px;
  cursor: pointer;
  line-height: 1;
  padding: 4px 8px;
  transition: color 0.15s;
  z-index: 1;
}
.modal-close:hover { color: var(--white); }

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

/* ── Maturity ── */
.modal-maturity { margin-bottom: 18px; }

.maturity-bars { display: flex; flex-direction: column; gap: 6px; }

.mat-bar-row {
  display: grid;
  grid-template-columns: 100px 1fr 72px;
  align-items: center;
  gap: 8px;
}

.mat-bar-label { font-size: 12px; color: var(--muted); }

.mat-bar-track {
  height: 5px;
  background: var(--surface3);
  border-radius: 99px;
  overflow: hidden;
}

.mat-bar-fill {
  height: 100%;
  border-radius: 99px;
  transition: width 0.4s ease;
}

.mat-bar-fill.sev-0, .mat-bar-text.sev-0 { background: #4ade80; color: #4ade80; }
.mat-bar-fill.sev-1, .mat-bar-text.sev-1 { background: #facc15; color: #facc15; }
.mat-bar-fill.sev-2, .mat-bar-text.sev-2 { background: #fb923c; color: #fb923c; }
.mat-bar-fill.sev-3, .mat-bar-text.sev-3 { background: #f87171; color: #f87171; }

.mat-bar-text { font-size: 11px; text-align: right; }

.mat-reviews-label { margin-top: 14px; }

.mat-loading {
  font-size: 12px;
  color: var(--muted);
  padding: 8px 0;
}

.mat-error { color: rgba(248,113,113,0.7); }

.mat-items-list { display: flex; flex-direction: column; gap: 10px; }

.mat-cat-block {}

.mat-cat-title {
  font-size: 12px;
  color: var(--white);
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.mat-sev-badge {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding: 1px 6px;
  border-radius: 99px;
}

.mat-sev-badge.sev-0 { background: rgba(74,222,128,0.2); color: #4ade80; }
.mat-sev-badge.sev-1 { background: rgba(250,204,21,0.2); color: #facc15; }
.mat-sev-badge.sev-2 { background: rgba(251,146,60,0.2); color: #fb923c; }
.mat-sev-badge.sev-3 { background: rgba(248,113,113,0.2); color: #f87171; }

.mat-items {
  list-style: none;
  padding: 0;
}

.mat-items li {
  font-size: 11px;
  color: var(--muted);
  padding: 3px 0;
  border-bottom: 1px solid var(--border);
  line-height: 1.4;
}
.mat-items li:last-child { border-bottom: none; }

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
    padding: 16px;
    gap: 16px;
  }

  .modal-poster {
    width: 100%;
    height: 200px;
  }

  .modal-poster img { object-position: center top; }

  .mat-bar-row { grid-template-columns: 80px 1fr 64px; }
}
</style>
