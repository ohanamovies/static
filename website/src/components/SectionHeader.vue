<template>
  <div class="section-header" :class="[{ 'section-header--compact': compact }, `section-header--${tone}`]">
    <div class="section-header-copy">
      <p v-if="eyebrow" class="section-eyebrow">{{ eyebrow }}</p>
      <component :is="level" v-if="title" class="section-title">{{ title }}</component>
      <p v-if="intro" class="section-intro">{{ intro }}</p>
    </div>
    <div v-if="$slots.actions" class="section-actions">
      <slot name="actions" />
    </div>
  </div>
</template>

<script setup>
defineProps({
  eyebrow: { type: String, default: "" },
  title: { type: String, default: "" },
  intro: { type: String, default: "" },
  tone: { type: String, default: "teal" },
  compact: { type: Boolean, default: false },
  level: { type: String, default: "h2" },
});
</script>

<style scoped>
.section-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 18px;
  min-width: 0;
}
.section-header--compact { align-items: center; gap: 12px; }
.section-header-copy { min-width: 0; }
.section-eyebrow {
  font-size: 11px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--teal);
  font-weight: 800;
}
.section-header--gold .section-eyebrow { color: var(--gold); }
.section-header--muted .section-eyebrow { color: var(--muted); }
.section-title { margin-top: 2px; color: var(--white); font-size: 20px; line-height: 1.15; }
.section-intro { max-width: 650px; margin-top: 6px; color: rgba(240,238,232,0.68); }
.section-actions { display: flex; align-items: center; justify-content: flex-end; gap: 8px; flex-wrap: wrap; }
@media (max-width: 640px) {
  .section-header { align-items: stretch; flex-direction: column; gap: 12px; }
  .section-header--compact { align-items: flex-start; }
  .section-actions { justify-content: flex-start; }
}
</style>
