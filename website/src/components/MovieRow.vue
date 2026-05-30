<template>
  <section class="row" v-if="row.movies.length" ref="rowEl">
    <div class="row-header">
      <h2 class="row-label">{{ row.label }}</h2>
      <span class="row-count">{{ row.movies.length }}</span>
    </div>
    <div class="row-track-wrapper">
      <button
        class="row-arrow row-arrow--left"
        :class="{ hidden: scrollPos <= 0 }"
        @click="scroll(-1)"
        aria-label="Scroll left"
      >‹</button>
      <div class="row-track" ref="trackEl" @scroll="onScroll">
        <template v-if="isVisible">
          <MovieCard
            v-for="movie in row.movies"
            :key="movie.id"
            :movie="movie"
            @select="$emit('selectMovie', $event)"
          />
        </template>
        <!-- Placeholder spacer while not yet visible -->
        <template v-else>
          <div
            class="card-placeholder-block"
            v-for="i in row.movies.length"
            :key="i"
          ></div>
        </template>
      </div>
      <button
        class="row-arrow row-arrow--right"
        :class="{ hidden: atEnd }"
        @click="scroll(1)"
        aria-label="Scroll right"
      >›</button>
    </div>
  </section>
</template>

<script setup>
import { ref, onMounted, onUnmounted, onUpdated } from "vue";
import MovieCard from "./MovieCard.vue";

defineProps({ row: { type: Object, required: true } });
defineEmits(["selectMovie"]);

const trackEl = ref(null);
const rowEl = ref(null);
const scrollPos = ref(0);
const atEnd = ref(false);
const isVisible = ref(false);

let observer = null;

function onScroll() {
  const el = trackEl.value;
  if (!el) return;
  scrollPos.value = el.scrollLeft;
  atEnd.value = el.scrollLeft + el.clientWidth >= el.scrollWidth - 10;
}

function scroll(dir) {
  const el = trackEl.value;
  if (!el) return;
  const amount = el.clientWidth * 0.8;
  el.scrollBy({ left: dir * amount, behavior: "smooth" });
}

onMounted(() => {
  onScroll();
  observer = new IntersectionObserver(
    ([entry]) => {
      if (entry.isIntersecting) {
        isVisible.value = true;
        observer?.disconnect();
        observer = null;
      }
    },
    { rootMargin: "200px" }
  );
  if (rowEl.value) observer.observe(rowEl.value);
});

onUnmounted(() => {
  observer?.disconnect();
});

onUpdated(onScroll);
</script>

<style scoped>
.row {
  margin-bottom: 36px;
}

.row-header {
  display: flex;
  align-items: baseline;
  gap: 10px;
  padding: 0 48px;
  margin-bottom: 12px;
}

.row-label {
  font-family: var(--font-display);
  font-size: 22px;
  letter-spacing: 0.06em;
  color: var(--white);
}

.row-count {
  font-size: 12px;
  color: var(--muted);
}

.row-track-wrapper {
  position: relative;
}

.row-track {
  display: flex;
  gap: var(--gap);
  overflow-x: auto;
  padding: 8px 48px 16px;
  scrollbar-width: none;
  -ms-overflow-style: none;
  scroll-snap-type: x proximity;
  min-height: calc(var(--card-h) + 48px);
}

.row-track::-webkit-scrollbar { display: none; }

.row-track > * { scroll-snap-align: start; }

/* Placeholder blocks while lazy loading */
.card-placeholder-block {
  width: var(--card-w);
  height: var(--card-h);
  flex-shrink: 0;
  background: var(--surface2);
  border-radius: var(--radius);
  animation: pulse 1.8s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 0.7; }
}

.row-arrow {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  z-index: 20;
  width: 40px;
  height: 72px;
  background: rgba(8,8,16,0.85);
  border: 1px solid var(--border);
  color: var(--white);
  font-size: 28px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s, opacity 0.15s;
  backdrop-filter: blur(4px);
}

.row-arrow--left {
  left: 0;
  border-radius: 0 var(--radius) var(--radius) 0;
}

.row-arrow--right {
  right: 0;
  border-radius: var(--radius) 0 0 var(--radius);
}

.row-arrow:hover { background: rgba(232,54,93,0.4); }
.row-arrow.hidden { opacity: 0; pointer-events: none; }

@media (max-width: 640px) {
  .row-header { padding: 0 16px; }
  .row-track { padding: 8px 16px 16px; }
}
</style>
