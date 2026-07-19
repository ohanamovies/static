<template>
  <main class="roadmap-page">
    <nav class="roadmap-nav" aria-label="Roadmap navigation">
      <a href="/" class="back-link">← Back to catalog</a>
      <span>Ohana TV</span>
    </nav>

    <section class="roadmap-hero">
      <p class="eyebrow">Product notes</p>
      <h1>Website vision</h1>
      <p>The product direction currently being implemented. This page renders the project’s <code>VISION.md</code>.</p>
    </section>

    <article class="roadmap-card" aria-label="Roadmap content">
      <div
        v-for="(block, index) in blocks"
        :key="index"
        class="roadmap-block"
        :class="`roadmap-block--${block.type}`"
      >
        <component :is="block.tag" v-if="block.type === 'heading'" :class="`heading-${block.level}`">
          {{ block.text }}
        </component>
        <ul v-else-if="block.type === 'list'" class="roadmap-list">
          <li v-for="(item, itemIndex) in block.items" :key="itemIndex" v-html="formatInline(item)"></li>
        </ul>
        <p v-else v-html="formatInline(block.text)"></p>
      </div>
    </article>
  </main>
</template>

<script setup>
import { computed } from "vue";
import roadmapMarkdown from "../../VISION.md?raw";

function escapeHtml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;");
}

function formatInline(value) {
  return escapeHtml(value)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
}

const blocks = computed(() => {
  const parsed = [];
  let currentList = null;

  function flushList() {
    if (currentList) parsed.push(currentList);
    currentList = null;
  }

  for (const rawLine of roadmapMarkdown.split("\n")) {
    const line = rawLine.trim();
    if (!line) { flushList(); continue; }

    const heading = line.match(/^(#{1,4})\s+(.+)$/);
    if (heading) {
      flushList();
      const level = heading[1].length;
      parsed.push({ type: "heading", level, tag: `h${Math.min(level, 3)}`, text: heading[2] });
      continue;
    }

    const listItem = line.match(/^-\s+(.+)$/);
    if (listItem) {
      if (!currentList) currentList = { type: "list", items: [] };
      currentList.items.push(listItem[1]);
      continue;
    }

    flushList();
    parsed.push({ type: "paragraph", text: line });
  }

  flushList();
  return parsed;
});
</script>

<style scoped>
.roadmap-page {
  min-height: 100vh;
  padding: 22px clamp(16px, 5vw, 56px) 56px;
  background:
    radial-gradient(circle at 18% 0%, rgba(232,54,93,0.28), transparent 32%),
    linear-gradient(180deg, rgba(15,15,26,0.96), var(--black));
}

.roadmap-nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  max-width: 980px;
  margin: 0 auto 36px;
  color: var(--muted);
  font-size: 13px;
}

.back-link {
  color: var(--white);
  text-decoration: none;
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 99px;
  padding: 8px 13px;
  background: rgba(255,255,255,0.04);
}
.back-link:hover { border-color: var(--accent); color: var(--accent); }

.roadmap-hero,
.roadmap-card {
  max-width: 980px;
  margin: 0 auto;
}

.roadmap-hero {
  margin-bottom: 20px;
}

.eyebrow {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  color: var(--teal);
}

.roadmap-hero h1 {
  margin-top: 4px;
  font-family: var(--font-display);
  font-size: clamp(52px, 10vw, 96px);
  line-height: 0.92;
  letter-spacing: 0.05em;
}

.roadmap-hero p {
  max-width: 680px;
  margin-top: 10px;
  color: rgba(240,238,232,0.76);
  font-size: 16px;
}

.roadmap-card {
  padding: clamp(18px, 4vw, 34px);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 24px;
  background: rgba(15,15,26,0.78);
  box-shadow: 0 26px 90px rgba(0,0,0,0.34);
}

.roadmap-block + .roadmap-block { margin-top: 12px; }
.roadmap-block--heading + .roadmap-block { margin-top: 8px; }
.roadmap-block:not(.roadmap-block--heading) + .roadmap-block--heading { margin-top: 30px; }

.heading-1 { display: none; }
.heading-2 {
  font-size: 24px;
  margin-top: 4px;
  color: var(--white);
}
.heading-3 {
  font-size: 18px;
  color: var(--accent2);
}

p, li { color: rgba(240,238,232,0.78); }
.roadmap-list { padding-left: 22px; display: grid; gap: 6px; }

:deep(strong) { color: var(--white); }
:deep(code) {
  padding: 2px 5px;
  border-radius: 6px;
  background: rgba(255,255,255,0.08);
  color: var(--teal);
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.92em;
}

@media (max-width: 640px) {
  .roadmap-nav { margin-bottom: 28px; }
  .roadmap-card { border-radius: 18px; }
  .heading-2 { font-size: 21px; }
}
</style>
