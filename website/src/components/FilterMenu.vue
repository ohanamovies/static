<template>
  <div ref="wrapEl" class="filter-menu-wrap">
    <UiChip
      class="control-chip"
      :class="buttonClass"
      :active="open || (highlightActive && active)"
      :aria-expanded="open"
      aria-haspopup="menu"
      @click="emit('toggle')"
    >
      <slot name="label">{{ label }}</slot>
    </UiChip>

    <Teleport to="body">
      <div
        v-if="open"
        ref="menuEl"
        class="filter-menu"
        :class="menuClass"
        :style="menuStyle"
        role="menu"
        @pointerdown.stop
      >
        <slot />
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import UiChip from "@/components/UiChip.vue";

const props = defineProps({
  open: { type: Boolean, default: false },
  active: { type: Boolean, default: false },
  label: { type: String, default: "" },
  menuClass: { type: [String, Array, Object], default: "" },
  buttonClass: { type: [String, Array, Object], default: "" },
  highlightActive: { type: Boolean, default: true },
});

const emit = defineEmits(["toggle"]);
const wrapEl = ref(null);
const menuEl = ref(null);
const menuLeft = ref(0);
const menuTop = ref(0);
const menuMinWidth = ref(168);
const xOffset = ref(0);

const menuStyle = computed(() => ({
  left: `${menuLeft.value}px`,
  top: `${menuTop.value}px`,
  minWidth: `${menuMinWidth.value}px`,
  transform: xOffset.value ? `translateX(${xOffset.value}px)` : undefined,
}));

function positionMenu() {
  if (!props.open || !wrapEl.value) return;

  const rect = wrapEl.value.getBoundingClientRect();
  menuLeft.value = Math.round(rect.left);
  menuTop.value = Math.round(rect.bottom + 8);
  menuMinWidth.value = Math.max(Math.round(rect.width), 168);
  xOffset.value = 0;
}

function fitMenuToViewport() {
  if (!props.open || !menuEl.value) return;

  positionMenu();

  nextTick(() => {
    const menu = menuEl.value;
    if (!menu) return;

    const margin = 12;
    const rect = menu.getBoundingClientRect();
    let offset = 0;

    if (rect.right > window.innerWidth - margin) {
      offset = window.innerWidth - margin - rect.right;
    }
    if (rect.left + offset < margin) {
      offset += margin - (rect.left + offset);
    }

    xOffset.value = Math.round(offset);
  });
}

watch(() => props.open, open => {
  if (open) nextTick(fitMenuToViewport);
  else xOffset.value = 0;
});

onMounted(() => {
  window.addEventListener("resize", fitMenuToViewport);
  window.addEventListener("scroll", fitMenuToViewport, true);
});
onBeforeUnmount(() => {
  window.removeEventListener("resize", fitMenuToViewport);
  window.removeEventListener("scroll", fitMenuToViewport, true);
});
</script>

<style scoped>
.filter-menu-wrap { position: relative; display: inline-flex; }

.control-chip { flex: 0 0 auto; }
.control-chip--dropdown { font-weight: 700; color: rgba(255,255,255,0.78); }
.control-chip--dropdown.is-active,
.control-chip--dropdown:hover,
.control-chip--dropdown:focus-visible {
  border-color: rgba(255,255,255,0.34);
  background: rgba(255,255,255,0.1);
  color: var(--white);
}
.control-chip--safe.is-active {
  border-color: rgba(45,212,191,0.42);
  background: rgba(45,212,191,0.12);
  color: var(--teal);
}

.filter-menu {
  position: fixed;
  z-index: 1000;
  width: max-content;
  max-width: calc(100vw - 24px);
  display: grid;
  gap: 10px;
  padding: 12px;
  border: 1px solid rgba(255,255,255,0.14);
  border-radius: 16px;
  background: rgba(15,15,26,0.98);
  box-shadow: 0 22px 60px rgba(0,0,0,0.42);
  backdrop-filter: blur(16px);
}

.filter-menu--picker { width: max-content; min-width: max-content; }
.filter-menu--rating { width: max-content; min-width: max-content; justify-items: center; }
.filter-menu--title-type { width: max-content; min-width: max(100%, 168px); }

@media (max-width: 640px) {
  .filter-menu { max-width: calc(100vw - 24px); }
}
</style>
