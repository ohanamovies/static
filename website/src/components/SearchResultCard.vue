<template>
  <button type="button" class="search-card" @click="$emit('select', movie)">
    <div class="poster">
      <img v-if="movie.p" :src="movie.p" :alt="movie.t" loading="lazy" />
      <span v-else>{{ movie.t }}</span>
    </div>

    <div class="search-card-body">
      <div class="search-card-topline">
        <span>{{ movie.s ? 'TV show' : 'Movie' }}</span>
        <span v-if="movie.y">{{ movie.y }}</span>
        <span v-if="movie.r">★ {{ movie.r.toFixed(1) }}</span>
      </div>
      <h3>{{ movie.t }}</h3>
      <p class="overview">{{ synopsis }}</p>
      <div class="chips">
        <UiBadge :tone="compatTone">{{ compatibilityLabel }}</UiBadge>
        <UiBadge :tone="availabilityTone">{{ availabilityLabel }}</UiBadge>
        <UiBadge v-if="listLabel" tone="gold">{{ listLabel }}</UiBadge>
      </div>
    </div>
  </button>
</template>

<script setup>
import { computed } from "vue";
import { GENRES, useMovieStore } from "@/stores/movies.js";
import { useUserStore } from "@/stores/user.js";
import { MATURITY_CATEGORIES, getScore } from "@/maturity.js";
import { profileLabel } from "@/lib/maturityProfiles.js";
import UiBadge from "@/components/UiBadge.vue";

const props = defineProps({ movie: { type: Object, required: true } });
defineEmits(["select"]);

const store = useMovieStore();
const userStore = useUserStore();

const synopsis = computed(() => {
  const text = props.movie.overviewEs || props.movie.overviewEn;
  if (text) return text;
  const genres = Object.entries(GENRES)
    .filter(([, mask]) => props.movie.g & mask)
    .map(([name]) => name)
    .slice(0, 3)
    .join(" · ");
  return genres || "Open details for maturity, availability, and list actions.";
});

const activeProfileName = computed(() => profileLabel(store.maturityProfiles, store.activeMaturityProfileId));
const activeLimits = computed(() => store.maxMaturityCat
  .map((level, i) => ({ level, category: MATURITY_CATEGORIES[i] }))
  .filter(({ level }) => level >= 0)
);

const compatibilityLabel = computed(() => {
  if (props.movie.mat === undefined) return `Unknown fit for ${activeProfileName.value}`;
  if (!activeLimits.value.length) return `Fits ${activeProfileName.value}`;
  const exceeded = activeLimits.value.find(({ level, category }) => {
    const score = getScore(props.movie.mat, category.shift);
    return (Number.isFinite(score) ? Math.round(score) : 6) > level;
  });
  return exceeded ? `Review for ${activeProfileName.value}` : `Fits ${activeProfileName.value}`;
});

const compatTone = computed(() => {
  if (props.movie.mat === undefined) return "neutral";
  return compatibilityLabel.value.startsWith("Fits") ? "success" : "warning";
});

const availabilityLabel = computed(() => {
  if (!props.movie.prov) return "Availability unknown";
  if (store.selectedProviders && (props.movie.prov & store.selectedProviders)) return "Available on your services";
  return "Available elsewhere";
});

const availabilityTone = computed(() => availabilityLabel.value === "Available on your services" ? "gold" : "neutral");

const listLabel = computed(() => {
  if (!userStore.isLoggedIn) return "";
  const lists = userStore.lists.filter(list => list.movies.includes(props.movie.id)).map(list => list.name);
  if (userStore.isWatched(props.movie.id)) lists.unshift("Watched");
  return lists.slice(0, 2).join(" · ");
});
</script>

<style scoped>
.search-card {
  width: 100%;
  display: grid;
  grid-template-columns: 86px minmax(0, 1fr);
  gap: 14px;
  padding: 12px;
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 16px;
  background: rgba(15,15,26,0.78);
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s, transform 0.15s;
}
.search-card:hover,
.search-card:focus-visible {
  border-color: rgba(45,212,191,0.45);
  background: rgba(22,22,31,0.92);
  outline: none;
  transform: translateY(-1px);
}
.search-card:active { transform: translateY(0); }
.poster {
  width: 86px;
  aspect-ratio: 2 / 3;
  border-radius: 10px;
  overflow: hidden;
  background: var(--surface3);
  display: grid;
  place-items: end start;
  padding: 8px;
  color: rgba(255,255,255,0.66);
  font-size: 12px;
}
.poster img { width: 100%; height: 100%; object-fit: cover; display: block; margin: -8px; width: calc(100% + 16px); height: calc(100% + 16px); }
.search-card-body { min-width: 0; display: flex; flex-direction: column; gap: 7px; }
.search-card-topline { display: flex; flex-wrap: wrap; gap: 8px; font-size: 12px; color: var(--muted); }
h3 { font-size: 18px; line-height: 1.1; color: var(--white); }
.overview { color: rgba(240,238,232,0.68); font-size: 13px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.chips { display: flex; flex-wrap: wrap; gap: 6px; }
@media (hover: none), (pointer: coarse) {
  .search-card:hover {
    border-color: rgba(255,255,255,0.08);
    background: rgba(15,15,26,0.78);
    transform: none;
  }
  .search-card:active {
    border-color: rgba(45,212,191,0.42);
    background: rgba(22,22,31,0.92);
  }
}
@media (max-width: 640px) { .search-card { grid-template-columns: 72px minmax(0, 1fr); gap: 11px; padding: 10px; } .poster { width: 72px; } h3 { font-size: 16px; } }
</style>
