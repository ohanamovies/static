<template>
  <section v-if="rows.length" class="from-lists" aria-label="From your lists">
    <MovieRow
      v-for="row in visibleRows"
      :key="row.id"
      :row="row"
      @selectMovie="$emit('selectMovie', $event)"
    >
      <template #label-actions>
        <FilterMenu
          :open="listMenuOpen"
          :active="selectedList !== 'all'"
          menu-class="filter-menu--picker"
          button-class="list-selector-chip"
          @toggle="listMenuOpen = !listMenuOpen"
        >
          <template #label>
            <span class="selector-label">
              <span>{{ selectedListLabel }}</span>
              <span class="selector-chevron" aria-hidden="true">⌄</span>
            </span>
          </template>
          <div class="list-menu-options" role="none">
            <button
              class="list-menu-option"
              :class="{ active: selectedList === 'all' }"
              type="button"
              role="menuitemradio"
              :aria-checked="selectedList === 'all'"
              @click="selectList('all')"
            >All lists</button>
            <button
              v-for="optionRow in rows"
              :key="optionRow.id"
              class="list-menu-option"
              :class="{ active: selectedList === optionRow.id }"
              type="button"
              role="menuitemradio"
              :aria-checked="selectedList === optionRow.id"
              @click="selectList(optionRow.id)"
            >{{ cleanLabel(optionRow.label) }}</button>
          </div>
        </FilterMenu>
      </template>
      <template #actions="{ row: visibleRow }">
        <div class="list-tools">
          <UiChip v-if="visibleRow.seeAllTo" :to="visibleRow.seeAllTo" size="sm" tone="safe">See all</UiChip>
          <UiChip size="sm" tone="safe" @click="$emit('manage')">Manage lists</UiChip>
        </div>
      </template>
    </MovieRow>
  </section>
</template>

<script setup>
import { computed, ref, watch } from "vue";
import FilterMenu from "@/components/FilterMenu.vue";
import MovieRow from "@/components/MovieRow.vue";
import UiChip from "@/components/UiChip.vue";

const props = defineProps({ rows: { type: Array, default: () => [] } });
defineEmits(["selectMovie", "manage"]);

const PREVIEW_LIMIT = 24;
const selectedList = ref("all");
const listMenuOpen = ref(false);

watch(() => props.rows.map(r => r.id).join("|"), () => {
  if (selectedList.value !== "all" && !props.rows.some(row => row.id === selectedList.value)) selectedList.value = "all";
});

const selectedListLabel = computed(() => {
  if (selectedList.value === "all") return "All lists";
  const row = props.rows.find(candidate => candidate.id === selectedList.value);
  return row ? cleanLabel(row.label) : "All lists";
});

function selectList(id) {
  selectedList.value = id;
  listMenuOpen.value = false;
}

const visibleRows = computed(() => {
  if (selectedList.value !== "all") {
    const row = props.rows.find(candidate => candidate.id === selectedList.value);
    return row ? [{ ...row, label: "From your lists", movies: row.movies.slice(0, PREVIEW_LIMIT), seeAllTo: row.seeAllTo }] : [];
  }

  const seen = new Set();
  const movies = [];
  for (const row of props.rows) {
    for (const movie of row.movies) {
      if (seen.has(movie.id)) continue;
      seen.add(movie.id);
      movies.push(movie);
      if (movies.length >= PREVIEW_LIMIT) break;
    }
    if (movies.length >= PREVIEW_LIMIT) break;
  }
  return movies.length ? [{ id: "all-lists", label: "From your lists", movies }] : [];
});
function cleanLabel(label) { return label.replace(/^My list ·\s*/, ""); }
</script>

<style scoped>
.from-lists { margin-bottom: 6px; padding-top: 2px; }
.list-tools {
  min-width: 0;
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: flex-end;
}
.selector-label {
  min-width: 0;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.selector-chevron { font-size: 11px; opacity: 0.75; }
:deep(.list-selector-chip) {
  min-height: 24px;
  padding: 0 8px;
  border-color: transparent;
  background: transparent;
  color: rgba(240,238,232,0.58);
  font-size: 12px;
  font-weight: 600;
}
:deep(.list-selector-chip:hover),
:deep(.list-selector-chip:focus-visible),
:deep(.list-selector-chip.is-active) {
  border-color: rgba(255,255,255,0.2);
  background: rgba(255,255,255,0.07);
  color: var(--white);
}
.list-menu-options { display: grid; gap: 8px; min-width: 142px; max-width: min(240px, calc(100vw - 56px)); }
.list-menu-option {
  min-height: 36px;
  border: 1px solid rgba(255,255,255,0.14);
  border-radius: 11px;
  background: rgba(30,30,42,0.86);
  color: rgba(255,255,255,0.78);
  font: inherit;
  font-size: 12px;
  line-height: 1.2;
  text-align: left;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: pointer;
  padding: 8px 10px;
  transition: border-color 0.15s, color 0.15s, background 0.15s;
}
.list-menu-option:hover,
.list-menu-option:focus-visible {
  border-color: rgba(45,212,191,0.36);
  color: var(--white);
  outline: none;
}
.list-menu-option.active {
  border-color: rgba(45,212,191,0.42);
  background: rgba(45,212,191,0.12);
  color: var(--teal);
}
.list-tools :deep(.ui-chip) { flex: 0 0 auto; }
@media (max-width: 640px) {
  .from-lists { margin-bottom: 2px; }
  .list-tools {
    justify-content: flex-start;
    overflow-x: auto;
    scrollbar-width: none;
  }
  .list-tools::-webkit-scrollbar { display: none; }
  :deep(.list-selector-chip) { max-width: min(180px, calc(100vw - 190px)); }
}
</style>
