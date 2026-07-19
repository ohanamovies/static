<template>
  <main class="list-page">
    <UiChip to="/discover" class="back-chip" size="sm">← Discover</UiChip>

    <template v-if="store.loading || userStore.loading">
      <div class="list-header list-header--loading">
        <div class="title-skeleton"></div>
        <div class="meta-skeleton"></div>
      </div>
      <div class="poster-grid" aria-label="Loading list">
        <div v-for="n in 12" :key="n" class="poster-skeleton"></div>
      </div>
    </template>

    <template v-else-if="list">
      <header class="list-header">
        <p class="eyebrow">Saved list</p>
        <h1>{{ list.name }}</h1>
        <p class="summary">{{ movies.length }} available {{ movies.length === 1 ? "title" : "titles" }}</p>
      </header>

      <div v-if="movies.length" class="poster-grid" :aria-label="list.name">
        <MovieCard
          v-for="movie in movies"
          :key="movie.id"
          :movie="movie"
          @select="$emit('selectMovie', $event)"
        />
      </div>

      <section v-else class="empty-state">
        <p class="empty-title">No available titles in this list</p>
        <p class="empty-copy">Some saved items may no longer be in the current catalog.</p>
        <UiChip to="/settings/lists" size="sm" tone="safe">Manage lists</UiChip>
      </section>
    </template>

    <section v-else class="empty-state">
      <p class="empty-title">{{ missingListTitle }}</p>
      <p class="empty-copy">{{ missingListCopy }}</p>
      <div class="empty-actions">
        <UiChip to="/discover" size="sm">Back to Discover</UiChip>
        <UiChip :to="missingListActionTo" size="sm" tone="safe">{{ missingListActionLabel }}</UiChip>
      </div>
    </section>
  </main>
</template>

<script setup>
import { computed } from "vue";
import { useRoute } from "vue-router";
import { useMovieStore } from "@/stores/movies.js";
import { useUserStore } from "@/stores/user.js";
import MovieCard from "@/components/MovieCard.vue";
import UiChip from "@/components/UiChip.vue";

defineEmits(["selectMovie"]);

const route = useRoute();
const store = useMovieStore();
const userStore = useUserStore();

const movieById = computed(() => {
  const map = new Map();
  for (const movie of store.allMovies) map.set(movie.id, movie);
  return map;
});

const listId = computed(() => {
  const id = route.params.listId;
  return Array.isArray(id) ? id[0] : id;
});

const list = computed(() => userStore.lists.find(candidate => candidate.token === listId.value) || null);

const missingListTitle = computed(() => userStore.isLoggedIn ? "List not in this profile" : "Profile needed");
const missingListCopy = computed(() => {
  if (!userStore.isLoggedIn) return "Lists are attached to profiles. Create or restore a profile to open saved or shared lists.";
  const profileName = userStore.userData?.name || "this profile";
  return `This list is not attached to ${profileName}. Switch profiles, or import a shared-list link in Settings.`;
});
const missingListActionTo = computed(() => userStore.isLoggedIn ? "/settings/lists" : "/settings/profile");
const missingListActionLabel = computed(() => userStore.isLoggedIn ? "Manage lists" : "Go to Profile");

const movies = computed(() => {
  if (!list.value) return [];
  return list.value.movies.map(id => movieById.value.get(id)).filter(Boolean);
});
</script>

<style scoped>
.list-page {
  flex: 1;
  width: 100%;
  max-width: 1180px;
  margin: 0 auto;
  padding: 24px 48px 64px;
}

.back-chip { margin-bottom: 22px; }

.list-header { margin-bottom: 20px; }

.eyebrow {
  margin-bottom: 6px;
  color: var(--muted);
  font-size: 12px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

h1 {
  margin: 0;
  font-family: var(--font-display);
  font-size: clamp(28px, 5vw, 44px);
  letter-spacing: 0.04em;
}

.summary {
  margin-top: 8px;
  color: var(--muted);
  font-size: 15px;
}

.poster-grid {
  --grid-card-w: var(--card-w);
  display: grid;
  grid-template-columns: repeat(auto-fill, var(--grid-card-w));
  gap: 22px var(--gap);
  align-items: start;
  justify-content: start;
}

.poster-grid :deep(.card) {
  width: 100%;
  max-width: var(--card-w);
}

.poster-grid :deep(.card-poster) {
  width: 100%;
  height: auto;
  aspect-ratio: 2 / 3;
}

.empty-state {
  min-height: 42vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  text-align: center;
  color: var(--muted);
}

.empty-title {
  color: var(--white);
  font-size: 20px;
  font-weight: 650;
}

.empty-copy { max-width: 320px; }
.empty-actions { display: flex; gap: 14px; flex-wrap: wrap; justify-content: center; }

.title-skeleton,
.meta-skeleton,
.poster-skeleton {
  background: var(--surface2);
  border-radius: var(--radius);
  animation: pulse 1.8s ease-in-out infinite;
}

.title-skeleton { width: min(360px, 70vw); height: 42px; margin-bottom: 10px; }
.meta-skeleton { width: 140px; height: 18px; }
.poster-skeleton { height: var(--card-h); }

@keyframes pulse {
  0%, 100% { opacity: 0.35; }
  50% { opacity: 0.6; }
}

@media (max-width: 640px) {
  .list-page { padding: 18px 16px 44px; }
  .poster-grid {
    --grid-card-w: 132px;
    gap: 18px 10px;
  }
  .poster-grid :deep(.card:hover),
  .poster-grid :deep(.card:focus-visible) { transform: none; }
}
</style>
