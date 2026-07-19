# PM-technical vision/CX review — Ohana TV

Date: 2026-07-13  
Scope: `VISION.md`, `VISION_EXECUTION.md`, `DESIGN_GUIDELINES.md`, `AGENTS.md`, `CODING_STANDARDS.md`, current Vue source, and existing QA/CX reports.

## Executive verdict

Ohana is now pointed at the right product: Discover/Search/Settings are separated, Settings is route-backed, Search is vertical, poster cards are calmer, and the reusable primitive direction is mostly working.

But the current sprint plan is still too UI-polish-heavy for the vision risk that remains. Ohana’s differentiator is not “a nicer Netflix grid”; it is **confidence**: appropriateness + availability + saved intent. The app still under-explains suitability in the default detail state, under-surfaces availability in Search/cards, has a trust-breaking optional data fetch error, and Search ranking can actively betray obvious user intent.

Planning agents should stop broad primitive extraction now. The next sprint should prioritize trust, decision evidence, and retrieval correctness before more chrome polish.

---

## P0 — Fix optional enrichment failure before any more CX polish

**Finding**  
`MovieModal.vue` always fetches `/extra.json` and logs `console.error` when the file is absent or served as HTML fallback. Existing QA caught repeated errors: `Failed to preload extra.json table: SyntaxError: Unexpected token '<'...`.

**Source evidence**
- `src/components/MovieModal.vue` fetches `/extra.json` in `loadExtraJsonData()` and logs `console.error` on failure.
- `public/extra.json` is not present in the inspected file list.
- QA report: `reports/qa-deep-dive/2026-07-13-principal-sde-qa-report.md` lists this as the biggest real bug.

**Vision/design tie**
- `VISION.md` → Movie details must expose suitability reasons and supporting tags/details.
- `DESIGN_GUIDELINES.md` → Movie details combine “Is it appropriate?” and “Where can I watch it?”
- Broken optional enrichment directly weakens parental-guide details and creates QA noise around the most trust-sensitive surface.

**Planning change required**
- Make this the first engineering task in the next slice, before visual polish.
- Decide whether `extra.json` is required product data or optional enrichment:
  - Required: ship it in `public/` and add a route/static check.
  - Optional: fetch defensively, verify JSON content-type/body, and silently no-op or `console.info` on absence.
- Add a regression check: opening a movie detail must produce zero console errors when `extra.json` is absent.

**Acceptance**
- Movie detail opens without console errors.
- CSM/TMDB/synopsis/tags degrade deliberately, not accidentally.

---

## P1 — Default movie detail does not satisfy the “why is this appropriate?” vision

**Finding**  
The detail view only renders the `compatibilityRows` block when active maturity limits exist. With the default Adults profile/no limits, users see a summary like “Fits Adults,” while the per-category score/allowed/reasoning block is absent. The raw parental-guide score grid exists, but it is tucked behind collapsed `<details>` as secondary content.

**Source evidence**
- `src/components/MovieModal.vue`: `compatibilityRows` returns `[]` when `!movieStore.maxMaturityCat.some(v => v >= 0)`.
- Template renders the compatibility explanation only with `v-if="compatibilityRows.length"`.
- The score grid is inside `<details class="modal-maturity">`, meaning the key “why” evidence is collapsed by default.

**Vision/design tie**
- `VISION.md` → Summary labels are useful at poster/filter level, but detail **must expose underlying reasons per movie**.
- `AGENTS.md` current feedback → details must show category scores/intensity, active-profile allowed levels, pass/exceeds status, and supporting tags/details.
- `DESIGN_GUIDELINES.md` → Movie details are where appropriateness is decided.

**Planning change required**
- Add a sprint task to make suitability reasoning visible for every active profile, including Adults/no-limit.
- For no-limit profiles, show category rows as “No limit set” rather than hiding the table.
- Keep raw community reviews collapsed, but keep the compact per-category decision table visible.

**Acceptance**
- Opening any movie detail shows: active profile, each maturity category, movie score/intensity, allowed level/no limit, and pass/exceeds state.
- The user does not need to open “Parental-guide details” to understand the suitability verdict.

---

## P1 — Availability is still not present enough in Search/cards, weakening a core differentiator

**Finding**  
Poster cards and Search results show suitability/list state but not a clear availability annotation. This avoids provider-name clutter on cards, which is correct, but overshoots: the user cannot scan whether a result is watchable with their configured services.

**Source evidence**
- `src/components/MovieCard.vue` displays rating/year, compatibility badge, watched/list badges, title, and genres. No availability signal.
- `src/components/SearchResultCard.vue` displays type/year/rating, synopsis, compatibility, and list label. No availability signal.
- `MovieModal.vue` has provider chips in details, but the discovery/retrieval surfaces do not annotate availability.

**Vision/design tie**
- `VISION.md` core capability: “Know where to watch it with the streaming services you already have.”
- `VISION.md` Search results: each result can show compatibility, availability, list membership.
- `VISION.md` Movie cards: display primary availability, but product specifics forbid streaming platform names on cards.
- `DESIGN_GUIDELINES.md` allows abstract availability status on cards; provider names belong in details.

**Planning change required**
- Add an abstract availability badge primitive/label, not provider logos/names, e.g. “On your services”, “Available”, “Not on services”, “Set services”.
- Apply it first to Search results and movie detail summary; then evaluate poster cards only if it remains visually calm.
- Do not reintroduce platform/provider badges on poster cards.

**Acceptance**
- Search results annotate availability without filtering results.
- Poster cards either show a quiet abstract availability signal or planning explicitly records why cards remain suitability-only.
- Provider names remain detail-only.

---

## P1 — Search best-match ranking violates intentional retrieval

**Finding**  
`/search?q=godfather` ranks obscure exact-title matches above `The Godfather` 1972. The exact-match grouping is technically consistent with normalized title matching, but product-hostile.

**Source evidence**
- `src/components/SearchView.vue`: `exactTitleMatches` filters normalized exact title/alternate-title matches and preserves `visibleResults` order.
- `src/stores/movies.js`: active search sorts Fuse results with score/pop/maturity weighting; it does not apply canonical-title or article-insensitive intent ranking.
- QA evidence shows Best matches: `Godfather` 2022, `Godfather` 1991, then `The Godfather` 1972.

**Vision/design tie**
- `VISION.md` Search purpose: find a specific title quickly.
- `VISION.md`: “Searching for ‘The Godfather’ should always return The Godfather.”
- `DESIGN_GUIDELINES.md`: Search is retrieval, not recommendation.

**Planning change required**
- Add a ranking task before expanding structured Search.
- Treat leading articles as weakly ignorable for exact matching.
- Within exact/near-exact title matches, rank by canonical strength: exact canonical title, high rating/popularity, known year/franchise signals.
- Keep related-title grouping conservative.

**Acceptance**
- `godfather` puts `The Godfather` 1972 first or clearly first among canonical suggestions.
- `harry potter` and `james bond` still show related/series results only when supported by multiple title matches.

---

## P1 — Discover first row still says “Recommended for this profile” instead of carrying active context

**Finding**  
The first recommendation row is generic. The app has the active maturity profile available, but the row label does not use it, so the first screen reads as a generic streaming grid plus controls instead of “these fit tonight’s viewing context.”

**Source evidence**
- `src/stores/movies.js` creates row `{ id: "recommended", label: "Recommended for this profile" }`.
- `HeroSection.vue` exposes the active maturity profile label, but that context is not reflected in row naming.
- QA screenshots show `Recommended for this profile` as the first row.

**Vision/design tie**
- `DESIGN_GUIDELINES.md` → Discover answers “What should we watch?” and recommendations are the hero.
- `VISION.md` → compatibility shown throughout uses the active maturity profile.
- Existing QA also flags weak first-screen decision framing.

**Planning change required**
- Replace generic row labels with profile-aware labels: `Recommended for Adults`, `Recommended for Family`, etc.
- Optionally add one compact active-context line near the hero/first row, but do not add marketing copy.
- Avoid adding another card/banner; use row title/metadata.

**Acceptance**
- On mobile first screen, the user sees brand, task, active profile context, and first movie card without scrolling.
- First row communicates the active maturity profile without opening the profile menu.

---

## P2 — Primary controls mix English and Spanish; this reads like residue, not localization

**Finding**  
Discover controls mix `Series`, `Películas`, `Categorías`, `Rating`, and English menu headings/copy. This is not a bilingual product strategy; it is inconsistent chrome.

**Source evidence**
- `src/components/HeroSection.vue`: content-type chips use `Series` and `Películas`; genre chip label is `Categorías`; rating and availability are English.
- QA screenshots show the mixed-language control row prominently on desktop and mobile.

**Vision/design tie**
- `DESIGN_GUIDELINES.md` → consistency beats creativity; reduce cognitive load.
- `VISION.md` Discover controls are acceptance criteria examples in English.

**Planning change required**
- Pick one locale for current UI chrome. Recommendation: English now, because app shell and docs are English.
- Rename `Películas` → `Movies`, `Categorías` → `Genre` or `Categories`, `Cualquiera` → `Any`.
- Defer real i18n until it is planned as a product capability.

**Acceptance**
- Primary navigation, Discover controls, Search, and Settings chrome use one language consistently.

---

## P2 — Availability grouping in details is only “Included”; the vision wants richer provider intent

**Finding**  
Movie details currently render one provider section labeled `Included`. The vision calls for provider groups: Included, Free with ads, Rent, Buy, with configured services first.

**Source evidence**
- `src/components/MovieModal.vue`: provider section label is hard-coded as `Included`; `providerNames` are generated from the fixed `PROVIDERS` bitmask.
- `VISION_EXECUTION.md` lists true Included/Free/Rent/Buy provider groups as deferred.

**Vision/design tie**
- `VISION.md` → Availability providers grouped by Included / Free with ads / Rent / Buy.
- `DESIGN_GUIDELINES.md` → Movie details answer “Where can I watch it?”

**Planning change required**
- Do not fake Rent/Buy groups in UI without data.
- Add a data-contract/planning task: determine whether `movies.json` can include availability groups or whether a backend/scraper change is needed.
- Until then, label current data honestly, e.g. “Streaming availability” or “Known providers,” if it is not guaranteed to mean Included.

**Acceptance**
- Detail availability language matches the actual data semantics.
- Sprint plan explicitly separates UI grouping from scraper/backend data requirements.

---

## P2 — List/profile gate copy is too terse for first-time users

**Finding**  
No-profile list states are calm but under-explained. A user who lands on `/settings/lists` or `/lists/bad-id` does not learn that lists are profile-scoped, syncable, and shareable.

**Source evidence**
- `src/components/SettingsView.vue`: unauthenticated lists route shows only `Create profile to use lists`.
- `src/views/ListView.vue`: invalid list state always says `This list is not attached to the current profile`, even when there is no profile.

**Vision/design tie**
- `VISION.md` → Lists support discovery and include shared lists.
- `DESIGN_GUIDELINES.md` → Settings answers how Ohana works for me.

**Planning change required**
- Add no-profile vs wrong-profile copy branches.
- Add one short explanatory sentence, not a marketing block: `Lists sync through your profile and can be shared by token.`

**Acceptance**
- `/settings/lists` explains why profile creation is needed.
- `/lists/:bad` distinguishes no profile from missing/not-attached list.

---

## P2 — Full-list route correctly prioritizes completeness; do not regress it into discovery filtering

**Finding**  
`/lists/:listId` currently maps list movie IDs directly from `store.allMovies`, not `store.filteredMovies`. That matches the vision: the full-list route is a complete saved-list view, not a curated preview.

**Source evidence**
- `src/views/ListView.vue`: `movies = list.movies.map(id => movieById.get(id)).filter(Boolean)`.
- `DiscoverView.vue` list preview rows correctly use `allowedIds` from `store.filteredMovies`, so Discover preview respects temporary filters.

**Vision/design tie**
- `VISION.md` → Discover list previews respect active filters; full list page prioritizes completeness.
- `DESIGN_GUIDELINES.md` → poster grids for full-list views, horizontal rows for discovery previews.

**Planning change required**
- Mark this as an intentional product distinction in sprint notes.
- If agents add filter chips to full-list pages later, they must be explicit local page tools, not inherited Discover filters by accident.

**Acceptance**
- Full-list route remains complete by default.
- Discover preview remains filtered by active viewing context.

---

## P3 — Long poster titles need a deliberate recognition decision

**Finding**  
Long franchise titles are single-line truncated on poster cards. This may be acceptable, but it is a product choice because recognizability matters for family browsing.

**Source evidence**
- `src/components/MovieCard.vue` uses a compact title row with `min-width: 0`; QA flags long titles such as `The Lord of the Rings: The Fellowship of the Ring` as overflow/truncation suspects.

**Vision/design tie**
- `DESIGN_GUIDELINES.md` → poster cards are for recognition and quick choice.
- `CODING_STANDARDS.md` → cards should stay simple, but recognition is the point.

**Planning change required**
- Run a visual pass on long franchise titles on phone and desktop.
- If recognition suffers, allow two title lines for title only; keep metadata/badges one-line and quiet.

**Acceptance**
- Long known titles remain recognizable without metadata wrapping or layout overflow.

---

## Things planning agents should *not* spend time on next

- Do not continue generic `UiChip`/primitive consolidation unless tied to a visible bug.
- Do not add person/studio/list search entities until backend/catalog data exists.
- Do not re-add provider/platform names to poster cards.
- Do not treat stale missing-alt reports as current truth without checking source; real poster/detail image alt text is now present in source, and decorative hero images are presentational.
- Do not “fix” `/lists/:listId` by inheriting Discover filters; completeness is the route’s job.

---

## Recommended next sprint order

1. **P0 trust fix:** `/extra.json` handling and no-console-error movie detail open.
2. **P1 decision evidence:** visible suitability rows for all active profiles, including Adults/no-limit.
3. **P1 retrieval correctness:** canonical Search ranking for `godfather`, then `harry potter` / `james bond` regression checks.
4. **P1 availability annotations:** abstract availability in Search results; evaluate poster cards after.
5. **P1/P2 Discover framing:** profile-aware first row + language normalization.
6. **P2 detail availability semantics:** plan data contract for Included/Free/Rent/Buy; avoid fake grouping.
7. **P2 copy polish:** list/profile gate states.
8. **P3 visual QA:** long title recognition and QA harness modal coverage.

## Verification notes

This review did not modify source code. It validated findings against current source and existing QA artifacts. The report itself was written to:

`reports/pmt/2026-07-13-pm-tech-vision-cx-report.md`
