<template>
  <HeroSection @open-settings="$emit('openSettings')" />

  <main class="catalog">
    <template v-if="store.loading">
      <div class="skeleton-row" v-for="n in 3" :key="n">
        <div class="skeleton-label"></div>
        <div class="skeleton-cards">
          <div class="skeleton-card" v-for="c in 8" :key="c"></div>
        </div>
      </div>
    </template>

    <template v-else>
      <div v-if="store.filteredMovies.length === 0" class="empty-state">
        <p class="empty-icon">◌</p>
        <p class="empty-title">No movies match your filters</p>
        <button class="clear-btn" @click="store.clearFilters">Clear all filters</button>
      </div>

      <template v-else>
        <FromYourLists
          :rows="listRows"
          @selectMovie="$emit('selectMovie', $event)"
          @manage="$emit('openSettings', 'lists')"
        />

        <MovieRow
          v-for="row in filteredMovieRows"
          :key="row.id"
          :row="row"
          @selectMovie="$emit('selectMovie', $event)"
        />

        <MovieRow
          v-if="watchedRow"
          :key="watchedRow.id"
          :row="watchedRow"
          @selectMovie="$emit('selectMovie', $event)"
        />
      </template>
    </template>
  </main>
</template>

<script setup>
import { computed } from "vue";
import { useMovieStore } from "@/stores/movies.js";
import { useUserStore } from "@/stores/user.js";
import HeroSection from "@/components/HeroSection.vue";
import FromYourLists from "@/components/FromYourLists.vue";
import MovieRow from "@/components/MovieRow.vue";

defineEmits(["selectMovie", "openSettings"]);

const store = useMovieStore();
const userStore = useUserStore();

const movieById = computed(() => {
  const map = new Map();
  for (const movie of store.allMovies) map.set(movie.id, movie);
  return map;
});

const listRows = computed(() => {
  if (!userStore.isLoggedIn) return [];
  const allowedIds = new Set(store.filteredMovies.map(movie => movie.id));
  return userStore.lists
    .filter(list => list.movies.length > 0)
    .map(list => ({
      id: "list-" + list.token,
      listToken: list.token,
      label: "My list · " + list.name,
      seeAllTo: { name: "list", params: { listId: list.token } },
      movies: list.movies
        .map(id => movieById.value.get(id))
        .filter(movie => movie && allowedIds.has(movie.id)),
    }))
    .filter(row => row.movies.length > 0);
});

const filteredMovieRows = computed(() => {
  const watched = userStore.watchedSet;
  if (!userStore.isLoggedIn || watched.size === 0) return store.movieRows;
  return store.movieRows.map(row => ({
    ...row,
    movies: row.movies.filter(movie => !watched.has(movie.id)),
  })).filter(row => row.movies.length >= 4);
});

const watchedRow = computed(() => {
  if (!userStore.isLoggedIn || userStore.watchedSet.size === 0) return null;
  const movies = [...userStore.watchedSet]
    .map(id => movieById.value.get(id))
    .filter(Boolean)
    .reverse();
  if (movies.length === 0) return null;
  return { id: "watched", label: "Watch again", movies };
});
</script>

<style scoped>
.catalog {
  flex: 1;
  padding-bottom: 52px;
}

.skeleton-row {
  margin-bottom: 26px;
  padding: 0 48px;
}

.skeleton-label {
  width: 160px;
  height: 22px;
  background: var(--surface2);
  border-radius: 4px;
  margin-bottom: 14px;
  animation: pulse 1.8s ease-in-out infinite;
}

.skeleton-cards {
  display: flex;
  gap: var(--gap);
}

.skeleton-card {
  width: var(--card-w);
  height: var(--card-h);
  flex-shrink: 0;
  background: var(--surface2);
  border-radius: var(--radius);
  animation: pulse 1.8s ease-in-out infinite;
}

.skeleton-card:nth-child(2) { animation-delay: 0.1s; }
.skeleton-card:nth-child(3) { animation-delay: 0.2s; }
.skeleton-card:nth-child(4) { animation-delay: 0.3s; }
.skeleton-card:nth-child(5) { animation-delay: 0.4s; }

@keyframes pulse {
  0%, 100% { opacity: 0.35; }
  50% { opacity: 0.6; }
}

.empty-state {
  text-align: center;
  padding: 80px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.empty-icon { font-size: 48px; color: var(--muted); }
.empty-title { font-size: 18px; color: var(--muted); }

.clear-btn {
  margin-top: 8px;
  padding: 8px 20px;
  background: var(--accent);
  border: none;
  border-radius: 99px;
  color: var(--white);
  font-family: var(--font-body);
  font-size: 13px;
  cursor: pointer;
  transition: opacity 0.15s;
}
.clear-btn:hover { opacity: 0.85; }

@media (max-width: 640px) {
  .skeleton-row { padding: 0 16px; }
}
</style>
