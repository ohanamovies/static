# AGENTS.md — Ohana TV Website

Scope: this file is for the `website/` project only inside the Ohana static repo.

## Project shape

- Before implementation or CX review, read `README.md` for current project/product context, then use this `AGENTS.md` for agent-specific workflow and guardrails.
- Also read `VISION.md`, `DESIGN_GUIDELINES.md`, and `CODING_STANDARDS.md` before product/CX or UI implementation work; the “Specific product and UX requirements” section in `VISION.md` is acceptance criteria.
- Vue 3 + Composition API, Pinia, Fuse.js, Vite.
- Entry: `src/main.js` mounts `src/App.vue` with Pinia and Vue Router.
- Routes live in `src/router/index.js`; main routes include `/discover`, `/search`, `/settings`, settings subroutes, and `/roadmap`.
- Vite alias: `@` → `src` from `vite.config.js`.
- Static data is loaded from `public/movies.json` at runtime via `fetch("movies.json")` in `src/stores/movies.js`.
- The real `movies.json` file is required for meaningful local CX review. If it is missing after cloning the repo, download the canonical copy from `https://ohana.tv/movies.json` into `public/movies.json`.
- Even when `public/movies.json` exists, re-download it every now and then before product/UX review because the canonical catalog may have changed.
- If `movies.json` is missing/unreadable, the store falls back to generated mock movies, but that fallback is only for development smoke tests — not real review.

## Key files

- `src/App.vue` — app shell, modal state, URL query handling for `?movie=` and `?add=`, profile filter persistence.
- `src/router/index.js` — route definitions and static-friendly route handling.
- `src/views/DiscoverView.vue` — Discover route layout.
- `src/components/SearchView.vue` — Search route layout.
- `src/components/SettingsView.vue` — Settings index/subroute layouts.
- `src/stores/movies.js` — catalog loading, Fuse search, filtering, row generation, provider/genre constants.
- `src/stores/user.js` — local profile token, KV-backed profile/list data, watched/list/provider-ish profile persistence, filter preferences.
- `src/components/HeroSection.vue` — hero/search/filter UI. Current provider filters live here.
- `src/components/ConfigModal.vue` — narrow shared-list invite bridge for `?add=` links when a profile is missing; core profile/list/maturity settings live on route-backed Settings pages.
- `src/components/MovieRow.vue` — horizontal lazy-rendered movie rows with desktop scroll arrows.
- `src/maturity.js` — maturity category definitions and score helpers.
- `VISION.md` — product/CX source of truth; specifics section is acceptance criteria.
- `DESIGN_GUIDELINES.md` — durable design principles, screen intent, visual hierarchy, and UX critique checklist.
- `VISION_EXECUTION.md` — thin execution index and current next-step pointer. Deeper execution docs live under `docs/vision-execution/`; archived logs are not part of routine context.
- `CODING_STANDARDS.md` — reusable component and UI implementation standards.
- `agents/ceo-assistant.md` — CEO feedback intake/coordinator prompt.
- `agents/pmt.md`, `agents/principal-engineer.md`, `agents/qa.md` — specialist review/planning prompts.

## Current product model

- Search currently ignores genre/provider/rating/maturity filters once query length is ≥2.
- Normal browsing hides titles without posters and hides very explicit sex/nudity by default.
- Maturity limits are stored as `maxMaturityCat` array with one threshold per maturity category; `-1` means off.
- Provider filter is currently a bitmask (`selectedProviders`) using the fixed `PROVIDERS` array in `movies.js`.
- User profile data supports `filterPrefs`; current app saves maturity limits and selected provider bitmask there.
- Current vision direction: Discover/Search/Settings are separate intent-based routes; Discover controls are temporary, Settings stores permanent preferences, Search ignores discovery filters and annotates results.

## Local development

```bash
cd website
npm install
npm run dev -- --host 0.0.0.0
```

Tailscale/dev URL on this Pi has been `http://100.85.92.106:5173/` when Vite uses port 5173.

Keep the Vite dev server running during active work/review so Alex can check the dev version from his phone over Tailscale. If it is stopped or stale, restart it with `npm run dev -- --host 0.0.0.0` and mention the reachable Tailscale URL.

When starting or refreshing the dev server for Alex, send him the latest Tailscale endpoint on Telegram too, using OpenClaw session messaging when a Telegram session is visible/reachable. If Telegram routing is not visible from the current session, record that blocker in the final update rather than faking it.

Real data should be downloaded/refreshed with:

```bash
curl -fL --compressed https://ohana.tv/movies.json -o public/movies.json
```

## Roadmap execution protocol

- For roadmap execution, work in small, reviewable slices; do not do a massive lift unless Alex explicitly asks.
- Use progressive disclosure for execution docs: read `VISION_EXECUTION.md` first, then `docs/vision-execution/current-status.md`; read `docs/vision-execution/sprint-plan.md` only for planning/scope selection; read archived logs only for auditing history or debugging a regression.
- Do not turn `VISION_EXECUTION.md` back into a long rolling log. Keep it as the durable current-state router; move completed/stale detail into `docs/vision-execution/archive/`.
- Before vision implementation, read `README.md`, `VISION.md`, `DESIGN_GUIDELINES.md`, `CODING_STANDARDS.md`, this `AGENTS.md`, `VISION_EXECUTION.md`, and only the focused execution sub-docs needed for the task.
- Sequence work according to `VISION.md` and the current focus in `VISION_EXECUTION.md` / `docs/vision-execution/current-status.md`; update the tracker before/after each slice.
- Use subagents for scoped audits, implementation consensus, and separation of concerns; ask them for concise findings, exact file refs, risks, and verification results.
- For Alex/CEO feedback intake, use `agents/ceo-assistant.md`: capture the feedback in `reports/ceo/`, then coordinate PM/design/principal-engineer updates before implementation.
- Preserve existing worktree changes: inspect `git status --short` and relevant diffs before editing.
- After each implementation slice, run the smallest meaningful verification gate, usually `npm run build`, and note manual/mobile checks still needed.
- When making changes, verify the Vite dev server is running and reachable before handing back to Alex. If it is not running, start it with `npm run dev -- --host 0.0.0.0` and confirm `http://100.85.92.106:5173/` responds.

## Guardrails

- Be very frugal with main-session tokens. Keep summaries tight and avoid dumping large file/context blocks into the main thread.
- For deep dives, broad searches, or concrete implementation tasks, prefer spinning sub-agents with optimized, task-specific context so the main agent stays lean.
- Ask sub-agents for concise findings, exact file references, and verification results instead of raw exploratory logs.
- Keep roadmap ideas documented first; do not implement roadmap items unless Alex asks.
- Prefer small UX changes with mobile verification because this app is being reviewed on a phone.
- Less is more: default to removing, hiding, merging, or simplifying UI before adding new copy, controls, settings, routes, cards, or explanations.
- Every Settings row must represent a user-owned configuration; do not add generic “about”, product-note, or marketing sections unless Alex explicitly asks.
- Once there are relevant, contained improvements, prepare a PR back to the original repo with a focused scope and clear verification notes.
- Do not move profile/list persistence casually; `user.js` uses 3-way merge logic for KV data.
- If adding real routing later, account for static hosting fallback behavior.

## Current explicit product feedback

Do not duplicate a stale feedback checklist here. Current acceptance criteria live in `VISION.md`; active execution follow-ups live in `VISION_EXECUTION.md` and `docs/vision-execution/current-status.md`.

Standing reminders that remain broadly relevant:

- Preserve the core IA: Discover for curated browsing, Search for intentional retrieval, Settings for persistent configuration.
- Keep mobile hierarchy calm: fewer boxes, reusable primitives, one-line chips, compact Settings rows, and provider details in movie detail rather than poster cards.
- Movie details must explain suitability with category reasoning, especially for the active profile; do not regress to a vague verdict-only modal.
- When feedback is implemented, update the execution docs instead of leaving old “current” instructions in this file.

## Design guidance

For UX/product/design decisions, read `DESIGN_GUIDELINES.md`.

Keep `VISION.md` as the product source of truth and acceptance criteria. Use `CODING_STANDARDS.md` for implementation-specific UI/component rules.

When reviewing or implementing UI, explicitly check:

- screen intent
- hierarchy before controls
- progressive disclosure
- reusable primitives
- mobile first-screen clarity
- unnecessary visual noise
