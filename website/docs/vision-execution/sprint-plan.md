# Vision sprint plan

Current planning surface only. Completed sprint detail is archived in [`archive/sprint-plan-2026-07-13-full.md`](archive/sprint-plan-2026-07-13-full.md).

## Current sprint — Sprint 9: PM/QA trust, retrieval, and accessibility follow-ups

Goal: cover remaining product-vision and QA findings that are not generic chrome polish.

New CEO priority before broader modal QA: [`reports/ceo/2026-07-14-movie-detail-filter-chips-ceo-feedback.md`](../../reports/ceo/2026-07-14-movie-detail-filter-chips-ceo-feedback.md). Keep it as a quick, reviewable slice rather than another broad redesign.

Already landed:

- Discover dropdown menu options restored after CEO feedback; remaining dropdown work is manual phone/touch verification, not another implementation pass.
- Exact/near-exact Search ranking: `godfather` now surfaces **The Godfather** (1972) first.
- Discover first-row active-profile naming.
- English primary Discover controls.
- Movie-detail suitability reasoning for every active profile, including Adults/no-limit profiles with explicit **No limit set** rows.
- Search result cards annotate abstract availability from existing provider bitmasks only, and Search result hover/active borders use teal/neutral states rather than red.
- Settings-route visible inputs were verified as label-wrapped; non-destructive focus indicators in `SearchBox`, Settings form inputs, and Settings row focus/chevron now use teal/neutral states rather than red.
- No-profile vs wrong-profile list-gate copy now distinguishes setup needs from missing/list-not-attached states on Settings → Lists and `/lists/:listId`.
- Discover availability/filter-chip semantics now use `Flatrate`/`Any`, disabled future availability modes, a Settings streaming link, icon-only clear, no selected-chip × glyphs, and suppressed tautological Discover poster fit badges.
- Movie-detail suitability/profile chips are tappable drill-down controls per maturity profile; redundant Suitability/list summary boxes are removed; reasoning copy uses **Allowed n (label)**.
- Movie-detail maturity evidence/progress rows are merged into the selected-profile reasoning section; redundant provider summary copy above provider chips is removed.
- Movie-detail modal QA coverage is available via `npm run qa:modal`, covering dialog semantics, close controls, focus/scroll lifecycle, suitability profile chips/reasoning, maturity evidence links, provider availability rows, and mobile full-screen behavior.
- Settings → Lists row affordance/scanability is implemented with clearer row boundaries, compact open affordance, separated management actions, and mobile wrapping.
- Sprint 9 trust/source QA coverage is available via `npm run qa:sprint9`, covering Discover availability/chip semantics, tautological poster-fit suppression vs Search annotations, Settings → Lists navigation affordance/action isolation, and list/profile gate copy.
- Mobile/touch source QA coverage is available via `npm run qa:mobile-touch`, covering Discover chip nowrap/dropdown settings paths, non-sticky hover semantics, movie-detail full-screen close/profile/evidence/provider tap targets, Settings → Lists mobile rows, and list/profile recovery paths.
- Dev route smoke coverage is available via `npm run qa:dev-routes`, covering the reachable Vite/static shell for Discover, Search query deep links, Settings subroutes, missing-list recovery, and runtime catalog data.
- Phone/touch readiness coverage is available via `npm run qa:phone-touch`, covering reachable phone-review routes plus source safeguards for Discover dropdown semantics, movie-detail profile/evidence/provider tap targets, full-screen modal behavior, Settings → Lists scanability, and list-gate copy. It prints the remaining real-device checklist.

Open scope:

- Run the `npm run qa:phone-touch` checklist on a real phone via `http://100.85.92.106:5173/` and record pass/fail findings for Discover availability/dropdown selected-state readability, movie-detail profile chips, maturity evidence rows, provider chips, list/profile gate copy, and Settings → Lists row scanability.

Acceptance criteria:

- Tapping a movie-detail suitability/profile chip reveals why that title fits or fails that profile without changing the Discover maturity filter.
- Movie details do not render generic Suitability/list boxes that duplicate chip/action information.
- Touch/mobile chips do not rely on sticky hover color changes for state feedback.
- Platform filtering gives users a direct path to edit configured platforms from the platforms dropdown.
- Maturity allowed-level copy pairs the number with the label, e.g. **Allowed 1 (mild)**.
- Poster fit labels are hidden or reworded when they merely restate the active maturity filter.
- Movie details always explain suitability without requiring users to open raw parental-guide details.
- `/search?q=godfather` puts **The Godfather** (1972) first or clearly first among canonical suggestions; `harry potter` and `james bond` still behave sensibly.
- Search results annotate availability calmly from current data, do not filter retrieval, do not show provider-name clutter on cards, and use teal/neutral interactive states rather than red for hover/active feedback.
- Settings-route input probes find no unlabeled visible inputs, and non-destructive focus color semantics stay teal/neutral rather than red.
- `/settings/lists` and `/lists/:bad` explain profile/list state accurately and tersely.

Verification:

- `npm run qa:sprint9` for source-level Sprint 9 trust regressions.
- `npm run qa:mobile-touch` for source-level mobile/touch safeguards.
- `npm run qa:dev-routes` against the reachable Vite dev server for route/data smoke coverage.
- `npm run qa:phone-touch` against the reachable Vite dev server for phone/touch readiness and the real-device checklist.
- `npm run build`.
- Manual checks: `/discover` with a maturity filter, platform dropdown, `/search?q=godfather`, `/search?q=harry%20potter`, `/search?q=james%20bond`, typo query, `/settings/profile`, `/settings/maturity`, `/settings/lists`, `/lists/bad-id`, and a movie-detail deep link on touch/mobile.

## Closed or manual-QA-only sprints

- Sprint 1: list-first Discover integration — implemented.
- Sprint 2: `/lists/:listId` poster-grid view — implemented.
- Sprint 3: reusable UI primitives — implemented enough; continue only when a concrete duplicate pattern appears.
- Sprint 4: legacy `ConfigModal.vue` narrowing — implemented.
- Sprint 5: lightweight structured Search — implemented.
- Sprint 6: mobile CX review/polish — implementation landed; remaining work should come from concrete phone QA findings, not generic polish.
- Sprint 7: control states and row headers — implemented through chip/menu color semantics and row-title list selector; manual touch verification may still be useful.
- Sprint 8: movie-detail decision hierarchy — implemented; manual phone/profile QA may still be useful.
- Sprint 10: Settings list navigation and copy-share behavior — implemented in Slice 71.

## Explicitly deferred

- True Included/Free/Rent/Buy provider grouping until backend/scraper data supports it.
- Real person/studio search without backend data.
- List ownership/delete semantics beyond current rename/remove-from-profile language.
- Profile/list persistence or KV merge rewrites as part of UI cleanup.
- External deployment unless Alex asks.
