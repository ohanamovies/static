<template>
  <section class="row" v-if="row.movies.length" ref="rowEl">
    <div class="row-header" :class="{ 'row-header--slot-actions': $slots.actions }">
      <div class="row-title">
        <h2 class="row-label">{{ row.label }}</h2>
        <slot name="label-actions" :row="row" />
      </div>
      <div class="row-actions" v-if="$slots.actions || row.seeAllTo">
        <slot name="actions" :row="row">
          <UiChip v-if="row.seeAllTo" :to="row.seeAllTo" size="sm" tone="safe">See all</UiChip>
        </slot>
      </div>
    </div>
    <div class="row-track-wrapper">
      <button
        class="row-arrow row-arrow--left"
        :class="{ hidden: scrollLeft <= 0 }"
        @click="scroll(-1)"
        aria-label="Scroll left"
      >‹</button>

      <div class="row-track" ref="trackEl" @scroll="onScroll">
        <template v-if="isVisible">
          <MovieCard
            v-for="movie in visibleMovies"
            :key="movie.id"
            :movie="movie"
            @select="$emit('selectMovie', $event)"
          />
          <!-- Skeleton cards shown at the end while more are available -->
          <div
            v-if="hasMore"
            class="load-sentinel"
            ref="sentinelEl"
          ></div>
        </template>
        <!-- Skeleton placeholders before the row enters the viewport -->
        <template v-else>
          <div class="card-skeleton" v-for="i in 8" :key="i"></div>
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
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from "vue";
import MovieCard from "./MovieCard.vue";
import UiChip from "@/components/UiChip.vue";

const props = defineProps({ row: { type: Object, required: true } });
defineEmits(["selectMovie"]);

const trackEl = ref(null);
const rowEl = ref(null);
const sentinelEl = ref(null);
const scrollLeft = ref(0);
const atEnd = ref(false);
const isVisible = ref(false);

// Card dimensions (read from CSS vars on mount)
let cardStride = 172; // 160px + 12px gap — matches design-system defaults
const BATCH = 14;     // cards to render per load step
const PRELOAD = 4;    // cards ahead of viewport edge to trigger next batch

const renderedCount = ref(BATCH);
const hasMore = computed(() => renderedCount.value < props.row.movies.length);
const visibleMovies = computed(() => props.row.movies.slice(0, renderedCount.value));

function loadMore() {
  if (!hasMore.value) return;
  renderedCount.value = Math.min(props.row.movies.length, renderedCount.value + BATCH);
}

function onScroll() {
  const el = trackEl.value;
  if (!el) return;
  scrollLeft.value = el.scrollLeft;
  atEnd.value = el.scrollLeft + el.clientWidth >= el.scrollWidth - 10;
  // Extend the rendered window when user scrolls within PRELOAD cards of the current end
  if (hasMore.value && el.scrollLeft + el.clientWidth + PRELOAD * cardStride >= el.scrollWidth) {
    loadMore();
  }
}

function scroll(dir) {
  const el = trackEl.value;
  if (!el) return;
  el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" });
}

// Watch the sentinel element: load more when it scrolls into the row's viewport
let sentinelObserver = null;

function observeSentinel() {
  sentinelObserver?.disconnect();
  sentinelObserver = null;
  if (!sentinelEl.value || !trackEl.value) return;
  sentinelObserver = new IntersectionObserver(
    ([entry]) => { if (entry.isIntersecting) loadMore(); },
    { root: trackEl.value, rootMargin: `${PRELOAD * cardStride}px` }
  );
  sentinelObserver.observe(sentinelEl.value);
}

// Re-attach observer when sentinel mounts/unmounts with each batch
watch(sentinelEl, () => nextTick(observeSentinel));

let rowObserver = null;
let resizeObserver = null;

onMounted(() => {
  // Read actual CSS variable values
  const style = getComputedStyle(document.documentElement);
  const cardW = parseInt(style.getPropertyValue("--card-w")) || 160;
  const gap   = parseInt(style.getPropertyValue("--gap"))    || 12;
  cardStride = cardW + gap;

  // Set initial batch size to fill the viewport
  if (trackEl.value) {
    const visible = Math.ceil(trackEl.value.clientWidth / cardStride) + PRELOAD;
    renderedCount.value = Math.min(props.row.movies.length, Math.max(BATCH, visible));

    resizeObserver = new ResizeObserver(() => onScroll());
    resizeObserver.observe(trackEl.value);
  }

  // Defer rendering until the row scrolls into view
  rowObserver = new IntersectionObserver(
    ([entry]) => {
      if (entry.isIntersecting) {
        isVisible.value = true;
        rowObserver?.disconnect();
        rowObserver = null;
      }
    },
    { rootMargin: "200px" }
  );
  if (rowEl.value) rowObserver.observe(rowEl.value);
});

onUnmounted(() => {
  rowObserver?.disconnect();
  resizeObserver?.disconnect();
  sentinelObserver?.disconnect();
});
</script>

<style scoped>
.row {
  margin-bottom: 26px;
}

.row-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16px;
  padding: 0 48px;
  margin-bottom: 8px;
}

.row-title {
  min-width: 0;
  display: inline-flex;
  align-items: baseline;
  gap: 8px;
}

.row-label {
  min-width: 0;
  font-family: var(--font-display);
  font-size: 21px;
  letter-spacing: 0.06em;
  color: var(--white);
}

.row-actions {
  min-width: 0;
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  flex-wrap: wrap;
}

.row-actions :deep(.ui-chip) { flex: 0 0 auto; }

.row-track-wrapper {
  position: relative;
}

.row-track {
  display: flex;
  gap: var(--gap);
  overflow-x: auto;
  padding: 6px 48px 14px;
  scrollbar-width: none;
  -ms-overflow-style: none;
  /* No scroll-snap: it caused snapping to the sentinel/skeleton elements */
}

.row-track::-webkit-scrollbar { display: none; }

/* Placeholder skeleton cards shown before the row enters the viewport */
.card-skeleton {
  width: var(--card-w);
  height: var(--card-h);
  flex-shrink: 0;
  background: var(--surface2);
  border-radius: var(--radius);
  animation: pulse 1.8s ease-in-out infinite;
}

.card-skeleton:nth-child(2) { animation-delay: 0.1s; }
.card-skeleton:nth-child(3) { animation-delay: 0.2s; }
.card-skeleton:nth-child(4) { animation-delay: 0.3s; }

@keyframes pulse {
  0%, 100% { opacity: 0.35; }
  50%       { opacity: 0.6; }
}

/* Invisible sentinel div at the end of rendered cards */
.load-sentinel {
  width: 1px;
  height: var(--card-h);
  flex-shrink: 0;
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

.row-arrow--left  { left: 0;  border-radius: 0 var(--radius) var(--radius) 0; }
.row-arrow--right { right: 0; border-radius: var(--radius) 0 0 var(--radius); }

.row-arrow:hover { background: rgba(232,54,93,0.4); }
.row-arrow.hidden { opacity: 0; pointer-events: none; }

@media (max-width: 640px) {
  .row-header { padding: 0 16px; align-items: center; gap: 10px; }
  .row-title { max-width: 100%; flex-wrap: wrap; row-gap: 4px; }
  .row-header--slot-actions {
    align-items: flex-start;
    flex-direction: column;
    gap: 7px;
  }
  .row-header--slot-actions .row-actions {
    width: 100%;
    justify-content: flex-start;
  }
  .row-actions { flex-wrap: nowrap; overflow-x: auto; scrollbar-width: none; }
  .row-actions::-webkit-scrollbar { display: none; }
  .row-track  { padding: 8px 16px 16px; }
  .row-arrow { display: none; }
}
</style>
