<template>
  <span class="ui-badge" :class="[`ui-badge--${variant}`, tone ? `ui-badge--${tone}` : '']">
    <slot />
  </span>
</template>

<script setup>
defineProps({
  variant: { type: String, default: "soft" },
  tone: { type: String, default: "neutral" },
});
</script>

<style scoped>
.ui-badge {
  max-width: 100%;
  display: inline-flex;
  align-items: center;
  min-width: 0;
  border-radius: 999px;
  font-weight: 800;
  line-height: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ui-badge--soft {
  padding: 4px 8px;
  background: rgba(255,255,255,0.06);
  color: rgba(240,238,232,0.72);
  font-size: 11px;
}
.ui-badge--overlay {
  padding: 3px 6px;
  border: 1px solid rgba(255,255,255,0.12);
  background: rgba(8,8,16,0.72);
  color: rgba(255,255,255,0.82);
  font-size: 9px;
  letter-spacing: 0.02em;
  backdrop-filter: blur(6px);
}
.ui-badge--success.ui-badge--soft { background: rgba(45,212,191,0.12); color: var(--teal); }
.ui-badge--warning.ui-badge--soft { background: rgba(248,113,113,0.13); color: #fca5a5; }
.ui-badge--gold.ui-badge--soft { background: rgba(245,200,66,0.12); color: var(--gold); }
.ui-badge--success.ui-badge--overlay { border-color: rgba(45,212,191,0.35); color: var(--teal); }
.ui-badge--warning.ui-badge--overlay { border-color: rgba(248,113,113,0.4); color: #fca5a5; }
.ui-badge--gold.ui-badge--overlay { border-color: rgba(245,200,66,0.38); color: var(--gold); }
.ui-badge--muted.ui-badge--overlay { border-color: rgba(255,255,255,0.32); }
</style>
