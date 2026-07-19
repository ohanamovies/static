<template>
  <header class="hero">
    <div class="hero-poster-bg" aria-hidden="true">
      <div v-for="(col, ci) in HERO_POSTER_COLS" :key="ci" class="poster-col">
        <img
          v-for="(url, i) in col"
          :key="i"
          :src="url"
          alt=""
          role="presentation"
          loading="lazy"
          decoding="async"
          class="poster-bg-img"
        />
      </div>
    </div>
    <div class="hero-bg-overlay"></div>

    <div class="hero-content">
      <div class="hero-brand">
        <div>
          <span class="hero-kicker">Discover</span>
          <h1 class="hero-title">What should we watch tonight?</h1>
        </div>
      </div>

      <div class="search-panel">
        <div ref="chipRowEl" class="chip-row" role="toolbar" aria-label="Discovery controls">
          <FilterMenu
            :open="activePanel === 'availability'"
            :active="store.availabilityMode !== 'my-services' || Boolean(selectedProviderCount)"
            :highlight-active="false"
            :label="availabilityChipLabel"
            menu-class="filter-menu--picker"
            button-class="control-chip--dropdown"
            @toggle="togglePanel('availability')"
          >
            <template #label>
              <span class="chip-label-with-icon">
                <span>{{ availabilityChipLabel }}</span>
                <span class="chip-chevron" aria-hidden="true">⌄</span>
              </span>
            </template>
            <div class="filter-heading">
              <p class="filter-label">Availability</p>
              <span>Configure services in Settings</span>
            </div>
            <div class="menu-options menu-options--single">
              <button
                class="menu-option"
                :class="{ active: store.availabilityMode === 'my-services' }"
                type="button"
                role="menuitemradio"
                :aria-checked="store.availabilityMode === 'my-services'"
                @click="selectAvailability('my-services')"
              >
                Flatrate
              </button>
              <button class="menu-option" type="button" role="menuitemradio" aria-checked="false" disabled>
                Free with ads
              </button>
              <button class="menu-option" type="button" role="menuitemradio" aria-checked="false" disabled>
                Rent
              </button>
              <button class="menu-option" type="button" role="menuitemradio" aria-checked="false" disabled>
                Buy
              </button>
              <button
                class="menu-option"
                :class="{ active: store.availabilityMode === 'any' }"
                type="button"
                role="menuitemradio"
                :aria-checked="store.availabilityMode === 'any'"
                @click="selectAvailability('any')"
              >
                Any
              </button>
              <p class="menu-note">Free/rent/buy modes are not tracked yet.</p>
              <button class="menu-option menu-option--settings" type="button" @click="openStreamingSettings">
                Edit services in Settings
              </button>
            </div>
          </FilterMenu>

          <FilterMenu
            :open="activePanel === 'maturity'"
            :active="maturityActive"
            menu-class="filter-menu--picker"
            button-class="control-chip--safe"
            @toggle="togglePanel('maturity')"
          >
            <template #label>
              <span class="chip-label-with-icon">
                <span>{{ maturityProfileLabel }}</span>
                <span class="chip-chevron" aria-hidden="true">⌄</span>
              </span>
            </template>
            <div class="filter-heading">
              <p class="filter-label">Maturity profile</p>
              <span>Active viewing context</span>
            </div>
            <div class="menu-options menu-options--single">
              <button
                v-for="profile in maturityProfiles"
                :key="profile.id"
                class="menu-option menu-option--profile"
                :class="{ active: activeMaturityProfileId === profile.id }"
                type="button"
                role="menuitemradio"
                :aria-checked="activeMaturityProfileId === profile.id"
                @click="selectMaturityProfile(profile)"
              >
                <span>{{ profile.label }}</span>
                <small>{{ profile.description }}</small>
              </button>
              <button class="menu-option menu-option--settings" type="button" @click="openMaturitySettings">
                Edit limits in Settings
              </button>
            </div>
          </FilterMenu>

          <UiChip
            class="control-chip control-chip--primary"
            :active="store.titleType === 'tv'"
            @click="toggleTitleType('tv', $event)"
          >
            <span>TV Shows</span>
          </UiChip>

          <UiChip
            class="control-chip control-chip--primary"
            :active="store.titleType === 'movies'"
            @click="toggleTitleType('movies', $event)"
          >
            <span>Movies</span>
          </UiChip>

          <FilterMenu
            :open="activePanel === 'genres'"
            :active="Boolean(store.selectedGenres.size)"
            menu-class="filter-menu--picker"
            button-class="control-chip--dropdown"
            @toggle="togglePanel('genres')"
          >
            <template #label>
              <span class="chip-label-with-icon">
                <span>{{ genreChipLabel }}</span>
                <span class="chip-chevron" aria-hidden="true">⌄</span>
              </span>
            </template>
            <div class="filter-heading">
              <p class="filter-label">Genre</p>
              <span>{{ selectedGenreSummary }}</span>
            </div>
            <div class="menu-options menu-options--grid">
              <button
                v-for="genre in GENRE_LABELS"
                :key="genre"
                class="menu-option"
                :class="{ active: store.selectedGenres.has(genre) }"
                type="button"
                role="menuitemradio"
                :aria-checked="store.selectedGenres.has(genre)"
                @click="selectGenre(genre)"
              >{{ genre }}</button>
            </div>
          </FilterMenu>

          <FilterMenu
            :open="activePanel === 'rating'"
            :active="store.minRating > 0"
            :label="ratingChipLabel"
            menu-class="filter-menu--rating"
            @toggle="togglePanel('rating')"
          >
              <div class="filter-heading">
                <p class="filter-label">Min rating</p>
              </div>
              <div class="rating-slider-wrap">
                <input
                  v-model.number="store.minRating"
                  type="range"
                  min="0"
                  max="9"
                  step="1"
                  class="rating-slider"
                  :aria-valuetext="store.minRating ? `${store.minRating}+` : 'Any rating'"
                  aria-label="Minimum rating"
                />
                <span class="rating-value">{{ store.minRating ? `${store.minRating}+` : 'All' }}</span>
                <div class="rating-presets" aria-label="Rating presets">
                  <UiChip size="sm" :active="store.minRating === 0" @click="store.minRating = 0">Any</UiChip>
                  <UiChip
                    v-for="rating in [6,7,8,9]"
                    :key="rating"
                    size="sm"
                    :active="store.minRating === rating"
                    @click="store.minRating = rating"
                  >{{ rating }}+</UiChip>
                </div>
              </div>
          </FilterMenu>

          <button v-if="hasFilters" class="clear-btn clear-btn--icon" type="button" aria-label="Clear Discover filters" title="Clear filters" @click="store.clearFilters">×</button>
        </div>
      </div>

      <p v-if="hasFilters" class="filter-summary">
        Showing {{ store.filteredMovies.length }} of {{ store.allMovies.length }} titles
      </p>
    </div>
  </header>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from "vue";
import FilterMenu from "@/components/FilterMenu.vue";
import UiChip from "@/components/UiChip.vue";
import { useMovieStore, GENRE_LABELS } from "@/stores/movies.js";
import { profileLabel } from "@/lib/maturityProfiles.js";

const emit = defineEmits(["open-settings"]);
const store = useMovieStore();
const activePanel = ref(null);
const chipRowEl = ref(null);

const BASE = "https://image.tmdb.org/t/p/w342/";
const HERO_POSTER_COLS = [
  ["qJ2tW6WMUDux911r6m7haRef0WH","aabwWZWx6z1aYP4PX2ADvbDKktd","8FHOtUpNIk5ZPEay2N2EY5lrxkv","4GIeI5K5YdDUkR3mNQBoScpSFEf"],
  ["yihdXomYb5kTeSivtFndMy5iDmf","3Qud19bBUrrJAzy0Ilm8gRJlJXP","oJ7g2CifqpStmoYQyaLQgEU32qO","pHpq9yNUIo6aDoCXEBzjSolywgz"],
  ["aOIuZAjPaRIE6CMzbazvcHuHXDc","rCzpDGLbOoPwLjy3OAm5NUPOTrC","9cqNxx0GxF0bflZmeSMuL5tnGzr","7WsyChQLEftFiDOVTGkv3hFpyyt"],
  ["ybrX94xQm8lXYpZAPRmwD9iIbWP","eTp7gSPkSF3Aw79mNx1NkBP1PZT","yQvGrMoipbRoddT0ZR8tPoR7NfX","RYMX2wcKCBAr24UyPD7xwmjaTn"],
  ["iB64vpL3dIObOtMZgX3RqdVdQDc","fWVSwgjpT2D78VUh6X8UBd2rorW","cWsBscZzwu5brg9YjNkGewRUvJX","cRY25Q32kDNPFDkFkxAs6bgCq3L"],
].map(col => col.map(hash => BASE + hash + ".jpg"));

const selectedProviderCount = computed(() =>
  store.availableProviders.filter(p => store.selectedProviders & p.bit).length
);

const browseFilterCount = computed(() =>
  store.selectedGenres.size +
  (store.titleType !== "both" ? 1 : 0) +
  (store.minRating > 0 ? 1 : 0)
);

const selectedProviderNames = computed(() =>
  store.availableProviders
    .filter(p => store.selectedProviders & p.bit)
    .map(p => p.name)
    .join(", ")
);

const genreChipLabel = computed(() => {
  const count = store.selectedGenres.size;
  if (count === 0) return "Genre";
  if (count === 1) return [...store.selectedGenres][0];
  return `${count} genres`;
});

const selectedGenreSummary = computed(() => {
  const count = store.selectedGenres.size;
  if (count === 0) return "Any genre";
  return `${count} selected`;
});

const availabilityChipLabel = computed(() => {
  if (store.availabilityMode === "any") return "Any";
  return "Flatrate";
});

const maturityProfiles = computed(() => store.maturityProfiles);
const maturityActive = computed(() => store.activeMaturityProfileId !== "adults" || store.maxMaturityCat.some(v => v >= 0));
const activeMaturityProfileId = computed(() => store.activeMaturityProfileId);
const maturityProfileLabel = computed(() => profileLabel(store.maturityProfiles, store.activeMaturityProfileId));
const ratingChipLabel = computed(() => store.minRating ? `Rating ${store.minRating}+` : "Rating");

function toggleTitleType(value, event) {
  store.titleType = store.titleType === value ? "both" : value;
  activePanel.value = null;
  event?.currentTarget?.blur();
}

function selectGenre(genre) {
  store.selectedGenres = store.selectedGenres.has(genre) ? new Set() : new Set([genre]);
  activePanel.value = null;
}

function selectAvailability(mode) {
  store.availabilityMode = mode;
  activePanel.value = null;
}

function selectMaturityProfile(profile) {
  store.selectMaturityProfile(profile.id);
  activePanel.value = null;
}

function openMaturitySettings() {
  activePanel.value = null;
  emit("open-settings", "maturity");
}

function openStreamingSettings() {
  activePanel.value = null;
  emit("open-settings", "streaming");
}

function togglePanel(panel) {
  activePanel.value = activePanel.value === panel ? null : panel;
}

function onDocumentPointerDown(event) {
  if (!activePanel.value) return;
  if (chipRowEl.value?.contains(event.target)) return;
  activePanel.value = null;
}

onMounted(() => document.addEventListener("pointerdown", onDocumentPointerDown));
onUnmounted(() => document.removeEventListener("pointerdown", onDocumentPointerDown));

const hasFilters = computed(() =>
  browseFilterCount.value > 0 ||
  store.availabilityMode !== "my-services" ||
  maturityActive.value ||
  !store.safeBrowsingEnabled
);
</script>

<style scoped>
.hero {
  position: relative;
  min-height: 360px;
  padding: 54px 48px 32px;
  overflow: visible;
  border-bottom: 1px solid var(--border);
  margin-bottom: 22px;
}

.hero-poster-bg {
  position: absolute;
  inset: 0;
  display: flex;
  gap: 8px;
  padding: 0 4px;
  overflow: hidden;
  z-index: 0;
  opacity: 0.75;
}

.poster-col { display: flex; flex-direction: column; gap: 8px; flex: 1; }
.poster-col:nth-child(even) { margin-top: -52px; }
.poster-col:nth-child(odd) { margin-top: 22px; }
.poster-bg-img { width: 100%; aspect-ratio: 2/3; object-fit: cover; border-radius: 5px; opacity: 0.45; display: block; }

.hero-bg-overlay {
  position: absolute;
  inset: 0;
  z-index: 1;
  background:
    linear-gradient(90deg, rgba(8,8,16,0.96) 0%, rgba(8,8,16,0.8) 48%, rgba(8,8,16,0.38) 100%),
    linear-gradient(to bottom, rgba(8,8,16,0.2) 0%, var(--black) 100%),
    radial-gradient(circle at 20% 0%, rgba(232,54,93,0.34), transparent 36%);
  pointer-events: none;
}

.hero-content { position: relative; z-index: 5; max-width: 1180px; margin: 0 auto; width: 100%; }
.hero-brand { display: flex; align-items: flex-start; justify-content: space-between; gap: 24px; margin-bottom: 22px; }
.hero-kicker { font-family: var(--font-display); font-size: 28px; letter-spacing: 0.14em; color: #34d399; text-shadow: 0 0 35px rgba(52,211,153,0.34); }
.hero-title { max-width: 780px; margin-top: 4px; font-family: var(--font-display); font-size: clamp(42px, 7vw, 78px); letter-spacing: 0.045em; line-height: 0.95; color: var(--white); }

.control-chip,
.clear-btn,
.menu-option {
  font-family: var(--font-body);
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s, background 0.15s, opacity 0.15s;
}

.search-panel { position: relative; overflow: visible; max-width: 920px; padding: 14px; border: 1px solid rgba(255,255,255,0.11); border-radius: 20px; background: rgba(15,15,26,0.78); box-shadow: 0 24px 70px rgba(0,0,0,0.28); backdrop-filter: blur(12px); }
.chip-row { position: relative; z-index: 30; display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.control-chip, .clear-btn { padding: 7px 12px; border: 1px solid rgba(255,255,255,0.13); border-radius: 99px; background: rgba(255,255,255,0.04); color: var(--muted); font-size: 13px; }
.control-chip--primary { display: inline-flex; align-items: center; gap: 7px; padding: 8px 16px; font-weight: 700; color: rgba(255,255,255,0.78); }
.control-chip:hover, .clear-btn:hover, .control-chip.active, .control-chip.is-active { border-color: rgba(45,212,191,0.42); color: var(--white); background: rgba(45,212,191,0.1); }
.control-chip--primary:hover { border-color: rgba(255,255,255,0.26); background: rgba(255,255,255,0.06); color: var(--white); }
.control-chip--primary.active, .control-chip--primary.is-active { border-color: rgba(45,212,191,0.42); background: rgba(45,212,191,0.12); color: var(--teal); }
.control-chip--safe.active { border-color: rgba(45,212,191,0.42); background: rgba(45,212,191,0.12); color: var(--teal); }
.chip-label-with-icon { display: inline-flex; align-items: center; gap: 8px; }
.chip-chevron { font-size: 17px; line-height: 0.8; transform: translateY(-1px); }
.clear-btn { margin-left: auto; }
.clear-btn--icon { display: inline-flex; align-items: center; justify-content: center; width: 38px; padding: 0; font-size: 20px; line-height: 1; }

.filter-heading { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; color: var(--muted); font-size: 12px; }
.filter-heading span { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.filter-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.12em; color: rgba(255,255,255,0.68); }
.menu-options { display: grid; align-content: start; gap: 8px; width: max-content; max-width: calc(100vw - 56px); max-height: min(210px, 31vh); overflow: auto; padding-right: 2px; overscroll-behavior: contain; }
.menu-options--grid { grid-template-columns: repeat(2, minmax(max-content, 1fr)); }
.menu-options--single { grid-template-columns: minmax(128px, 1fr); width: 100%; }
.menu-option { display: flex; align-items: center; width: 100%; min-width: 112px; min-height: 40px; max-width: 180px; padding: 9px 11px; background: rgba(30,30,42,0.86); border: 1px solid rgba(255,255,255,0.16); border-radius: 11px; color: rgba(255,255,255,0.78); font: inherit; font-size: 12px; line-height: 1.2; text-align: left; white-space: nowrap; cursor: pointer; transition: border-color 0.15s, color 0.15s, background 0.15s; }
.menu-option:hover { border-color: rgba(45,212,191,0.42); color: var(--white); }
.menu-option.active { background: rgba(45,212,191,0.15); border-color: var(--teal); color: var(--teal); }
.menu-option:disabled, .menu-option:disabled:hover { opacity: 0.45; cursor: not-allowed; border-color: rgba(255,255,255,0.16); color: rgba(255,255,255,0.78); background: rgba(30,30,42,0.86); }
.menu-note { max-width: 180px; margin: 0; color: rgba(255,255,255,0.48); font-size: 11px; line-height: 1.35; }
.menu-option--provider.active { background: rgba(45,212,191,0.15); border-color: var(--teal); color: var(--teal); }
.menu-option--profile { flex-direction: column; align-items: flex-start; gap: 3px; max-width: 220px; }
.menu-option--profile small { color: rgba(255,255,255,0.52); font-size: 11px; }
.menu-option--profile.active { background: rgba(45,212,191,0.15); border-color: var(--teal); color: var(--teal); }
.menu-option--profile.active small { color: rgba(45,212,191,0.76); }
.menu-option--settings { color: var(--teal); }

.rating-slider-wrap { width: min(300px, calc(100vw - 72px)); display: grid; grid-template-columns: minmax(150px, 1fr) auto; align-items: center; gap: 12px; padding: 4px 1px; }
.rating-slider { width: 100%; margin: 0; background: transparent; outline: none; cursor: pointer; accent-color: var(--teal); touch-action: pan-x; }
.rating-slider::-webkit-slider-runnable-track { height: 8px; border-radius: 99px; background: var(--surface3); }
.rating-slider::-webkit-slider-thumb { -webkit-appearance: none; width: 26px; height: 26px; margin-top: -9px; border-radius: 50%; background: var(--teal); cursor: pointer; box-shadow: 0 0 0 7px rgba(45,212,191,0.18); }
.rating-slider::-moz-range-track { height: 8px; background: var(--surface3); border-radius: 99px; }
.rating-slider::-moz-range-thumb { width: 26px; height: 26px; border: 0; border-radius: 50%; background: var(--teal); cursor: pointer; box-shadow: 0 0 0 7px rgba(45,212,191,0.18); }
.rating-value { font-size: 13px; font-weight: 700; color: var(--white); min-width: 36px; text-align: center; }
.rating-presets { grid-column: 1 / -1; display: flex; gap: 6px; }
.filter-summary { margin-top: 12px; font-size: 13px; color: var(--muted); }

@media (max-width: 640px) {
  .hero { min-height: 0; padding: 14px 16px 8px; margin-bottom: 4px; border-bottom: 0; }
  .hero-poster-bg { opacity: 0.22; height: 132px; }
  .hero-bg-overlay { background: linear-gradient(to bottom, rgba(8,8,16,0.94), var(--black)); }
  .hero-brand { gap: 8px; margin-bottom: 9px; }
  .hero-kicker { display: none; }
  .hero-title { max-width: 320px; font-size: clamp(24px, 8vw, 34px); line-height: 1.02; letter-spacing: 0.035em; }
  .search-panel { margin: 0 -8px; padding: 0; border: 0; border-radius: 0; background: transparent; box-shadow: none; backdrop-filter: none; }
  .chip-row { flex-wrap: nowrap; gap: 8px; margin-top: 0; overflow-x: auto; padding: 2px 8px 6px; scrollbar-width: none; }
  .chip-row::-webkit-scrollbar { display: none; }
  .control-chip, .clear-btn { flex: 0 0 auto; min-height: 36px; white-space: nowrap; }
  .clear-btn { margin-left: 0; }
  .filter-summary { display: none; }
  .poster-col:nth-child(n+4) { display: none; }
  .menu-options { max-width: calc(100vw - 48px); }
  .menu-options--grid { grid-template-columns: minmax(0, 1fr); }
  .menu-option { max-width: min(260px, calc(100vw - 72px)); }
}
</style>
