# Principal engineer priority execution plan — CEO walk-the-store

Date: 2026-07-18 14:22 Europe/Madrid
Scope: latest CEO report `reports/ceo/20260718-ceo-walk-the-store.md`; product docs `README.md`, `VISION.md`, `DESIGN_GUIDELINES.md`, `CODING_STANDARDS.md`, `VISION_EXECUTION.md`; agent prompts `agents/principal-engineer.md`, `agents/pmt.md`; implementation inspection of `src/components/HeroSection.vue`, `src/components/FilterMenu.vue`, `src/components/UiChip.vue`, `src/components/MovieCard.vue`, `src/components/MovieModal.vue`, `src/components/SettingsView.vue`, `src/components/SettingsRow.vue`, `src/components/FromYourLists.vue`, `src/views/ListView.vue`, `src/components/MovieRow.vue`, `src/components/SearchResultCard.vue`, `src/stores/movies.js`, and `src/router/index.js`.

## Executive verdict

The CEO report is a high-signal polish and trust pass, not a reason to reopen information architecture. The work should be executed as four small UI/UX slices, in this order:

1. Discover chip semantics and poster-card redundancy.
2. Movie-detail trust surface: profile chips drive suitability reasoning, with redundant containers removed.
3. Movie-detail maturity-row redesign and provider-summary cleanup.
4. Settings → Lists row affordance/scanability.

Do **not** implement app code as part of this planning artifact. During implementation, keep each slice independently reviewable and avoid changes to persistence, catalog data, backend availability semantics, or routing beyond existing Settings/list routes.

## Source findings

- `src/components/MovieCard.vue` always computes and displays `Fits <profile>` / `Review for <profile>` badges on poster cards. On Discover, this is redundant when active maturity filters already guarantee visible titles fit; on Search, the same signal remains useful via `src/components/SearchResultCard.vue`.
- `src/components/HeroSection.vue` exposes only `my-services` and `any` availability modes, labels the active chip as `On n services`, uses active coloring for dropdown filters, and renders the clear action as text. The report asks for a commerce-mode label (`Flatrate`), readonly unsupported modes (`free with ads`, `rent`, `buy`), `Any`, a clear chevron, and a Settings link to streaming services.
- `src/components/FilterMenu.vue` makes `open || active` look active at the shared `UiChip` layer. This is correct for selectable chips but overstates dropdown chips, matching the CEO concern that selected-state color is confused.
- `src/components/HeroSection.vue` shows an `×` inside selected Movie/TV chips even though selected state already communicates toggleability.
- `src/components/MovieModal.vue` renders external IMDb/TMDb/FilmAffinity logos with `.imdb-logo { height: 12px; }`, too small for comfortable mobile tapping.
- `src/components/MovieModal.vue` has a redundant `.watch-summary` Suitability card before the per-profile glance chips. The per-profile chips are spans and are not selectable, so they cannot drive the reasoning panel yet.
- `src/components/MovieModal.vue` builds `compatibilityRows` only from `movieStore.maxMaturityCat`, so the suitability table is locked to the active Discover profile instead of a selected detail-profile chip.
- `src/components/MovieModal.vue` currently duplicates maturity information across `compatibility-summary` and collapsed `Parental-guide details`; the latter has progress bars and useful external links, while the former has better allowed/exceeded reasoning. These should be merged rather than maintained as competing tables.
- `src/components/MovieModal.vue` uses integer-rounded maturity scores in `compatibilityRows` but one-decimal display in parental details. CEO feedback prefers the one-decimal number and stronger visual prominence.
- `src/components/MovieModal.vue` shows an availability sentence like `Available on Netflix` above provider chips. The CEO report calls this redundant when the provider chips immediately follow.
- `src/components/SettingsView.vue` already makes list rows clickable and route to `/lists/:listId`, but styling is very low-contrast (`padding: 14px 0`, thin separators, actions inline), making starts/ends and clickability weak.

## Recommended sprint / slice order

### Sprint 1 — Discover chip semantics and poster-card redundancy

**Priority**: P0, fastest trust/hierarchy win on the home page.

**Goal**
Make Discover controls read as lightweight controls, not noisy status claims, and remove tautological suitability badges from Discover poster cards while preserving compatibility annotations in Search.

**Files to read before coding**
- `reports/ceo/20260718-ceo-walk-the-store.md`
- `VISION.md` sections: Discover controls, Movie cards, Chips and compact controls
- `DESIGN_GUIDELINES.md` sections: Discover, Components, Interaction and visual standards
- `CODING_STANDARDS.md` sections: Cards/posters, Chips
- `src/components/HeroSection.vue`
- `src/components/FilterMenu.vue`
- `src/components/UiChip.vue`
- `src/components/MovieCard.vue`
- `src/components/SearchResultCard.vue`
- `src/stores/movies.js`

**Files likely touched**
- `src/components/HeroSection.vue`
- `src/components/FilterMenu.vue`
- `src/components/MovieCard.vue`
- optionally `src/stores/movies.js` only if naming the existing `availabilityMode` values cleanly requires a small enum/comment update; do not expand real backend semantics.

**Scope**
- Change the Discover availability chip label from `Included with my services` / `On n services` to exactly `Flatrate` for the supported mode and exactly `Any` for broad browsing.
- In the availability menu, show options in this order with exact labels: `Flatrate`, `Free with ads`, `Rent`, `Buy`, `Any`.
- Keep `Free with ads`, `Rent`, and `Buy` readonly/disabled with real semantics (`disabled` for buttons or `aria-disabled` for non-button controls), quiet disabled styling, and no red. Add one quiet menu note such as `Not tracked yet`; do not add per-option explanatory noise.
- Add a vertically centered chevron to the availability chip using the same structure as other dropdown chips.
- Add a `Settings` link/action inside the availability dropdown that routes to `/settings/streaming`, closes the menu after navigation, and lands on the Streaming services section (existing pattern: `emit("open-settings", "maturity")`; add streaming equivalent if needed).
- Stop using green/selected emphasis for dropdown chips just because a dropdown value is selected. Keep clear open/focus affordance; reserve teal selected treatment for true toggle/selection chips.
- Replace the text `Clear` chip with an icon-only close chip with an accessible label, e.g. `aria-label="Clear Discover filters"`.
- Remove the inline close `×` from selected `TV Shows` / `Movies` chips.
- Hide Discover poster-card `Fits <profile>` labels when they merely restate active maturity filtering. Preserve non-tautological warnings/unknowns where useful and preserve Search result compatibility labels in `SearchResultCard.vue`.

**Non-goals**
- Do not add real `free with ads`, `rent`, or `buy` filtering until data supports it.
- Do not change Search filtering semantics.
- Do not redesign the hero/header or row generation.
- Do not persist availability mode as a permanent setting.

**Acceptance criteria**
- Discover default availability chip reads exactly `Flatrate` and includes a centered chevron; old labels `Included with my services`, `On n services`, and `Any availability` do not appear in Discover chip/menu UI.
- Availability dropdown contains `Flatrate`, semantically disabled/readonly `Free with ads`, `Rent`, `Buy`, and `Any`, plus one quiet `Not tracked yet`-style note for unsupported modes.
- Availability dropdown includes a clear link/action to `/settings/streaming`; activating it closes the menu and lands on Streaming services settings.
- Dropdown chips do not use green selected styling solely because a value is selected; open/focus states remain visible.
- Clear-filters control is an icon chip with an accessible name.
- Selected Movie/TV chips show selected state without an extra close icon.
- Discover poster cards do not show redundant `Fits <active profile>` labels when all visible titles already fit the active profile; Search results still annotate compatibility.
- Chips remain single-line on mobile and do not rely on sticky hover color.

**Verification gates**
- `npm run build`
- Manual/mobile smoke at ~375px and desktop width: `/discover`, open availability/maturity/genre/rating menus, toggle Movie/TV, clear filters, confirm no chip wrapping, no sticky hover, and no horizontal overflow.
- Keyboard/screen-reader smoke: tab to chip menus, verify expanded state/focus is understandable and disabled availability modes are not actionable.
- Manual search regression: `/search?q=godfather`, confirm Discover card fit labels are suppressed where tautological and Search compatibility labels remain preserved.

**Risk**
- Shared `FilterMenu`/`UiChip` changes can accidentally alter list-selector, maturity, genre, and rating chip behavior. Keep changes prop-driven and verify all dropdowns.

**Dependencies**
- Existing `availabilityMode` supports only `my-services` and `any`; disabled menu items should not mutate store state.

**Expected UX outcome**
The first Discover screen becomes calmer and more truthful: controls read as controls, not overclaimed status badges, and poster cards focus on title recognition rather than repeating the active filter.

---

### Sprint 2 — Movie-detail profile chips become the suitability controller

**Priority**: P0, core trust and appropriateness decision.

**Goal**
Make movie-detail suitability understandable and interactive by letting profile chips select the detail profile and refresh the reasoning panel, while removing redundant wrapper cards.

**Files to read before coding**
- `reports/ceo/20260718-ceo-walk-the-store.md`
- `VISION.md` section: Movie details → Suitability
- `DESIGN_GUIDELINES.md` section: Movie details
- `CODING_STANDARDS.md` sections: Reusable UI first, Chips
- `src/components/MovieModal.vue`
- `src/maturity.js`
- `src/lib/maturityProfiles.js`
- `src/stores/movies.js`
- `src/components/UiChip.vue`

**Files likely touched**
- `src/components/MovieModal.vue`
- optionally `src/components/UiChip.vue` only if needed for accessible pressed/selected chip semantics; keep API small.

**Scope**
- Replace `.profile-glance-pill` spans with accessible buttons or `UiChip` instances using either `aria-pressed` or radio/tab-like semantics.
- Add local modal state, e.g. `selectedDetailProfileId`, initialized from `movieStore.activeMaturityProfileId` whenever a movie opens and reset when opening a different movie.
- Compute compatibility rows from the selected detail profile’s `values`, not directly from global `movieStore.maxMaturityCat`.
- Selecting a profile chip updates only the modal’s detail-profile state. It must **not** mutate the active Discover profile/filter.
- Keep a clear label such as `Compatible with: <selected profile>` above the reasoning panel.
- Remove the redundant `.watch-summary` Suitability card/div. Preserve list/watched actions in the existing action chip row; do not remove list/watched summary affordances unless the remaining action chips clearly communicate the same state and remain visible.
- Use clear selected/unselected chip states; non-fitting profile chips can show a warning marker or text but should not use destructive red as “selected”.
- Ensure the selected profile chip explains both fits and failures, especially “why not suitable with my kids?”.

**Non-goals**
- Do not add create/edit profile flows to the modal.
- Do not change Discover’s active profile when a modal chip is tapped.
- Do not fetch new maturity data or invent categories beyond current data.
- Do not change `user.js` profile/list persistence.

**Acceptance criteria**
- Profile chips in movie details are keyboard/touch selectable controls with `aria-pressed` or radio/tab-like semantics.
- Tapping or keyboard-activating `Adults`, `Family`, `Kids`, etc. refreshes the next reasoning section for that profile without changing Discover filters.
- Selected detail profile state resets to the active Discover profile whenever a different movie opens.
- Redundant `Suitability` summary wrapper is gone; the chip row and reasoning section carry the decision.
- If a title exceeds a selected profile, the reasoning panel identifies which categories exceed and why.
- Existing IMDb/CSM parental-guide links remain available.

**Verification gates**
- `npm run build`
- Manual/mobile smoke at ~375px and desktop width: open a movie from `/discover`; tap each profile chip; confirm selected state, reasoning text, and Discover filter persistence after closing.
- Keyboard/screen-reader smoke: Tab to profile chips in modal, activate with Enter/Space, verify selected state is announced/understandable, and close with Escape.

**Risk**
- Modal state can leak between movies if not reset on `props.movie` changes. Add a focused watcher.
- Using `UiChip` for non-button route/link cases must preserve accessibility attributes.

**Dependencies**
- Uses existing `movieStore.maturityProfiles`, `profileLabel`, `MATURITY_CATEGORIES`, `SEVERITY_LABELS`, and `getScore`.

**Expected UX outcome**
Movie details become an interactive appropriateness explanation instead of a passive verdict. Users can answer “is this okay for this audience?” without changing browsing context.

---

### Sprint 3 — Merge maturity evidence and clean provider details

**Priority**: P1, improves mobile readability and reduces duplicated decision blocks after Sprint 2 establishes the controller.

**Goal**
Turn the selected-profile reasoning into a compact, scannable maturity table that uses horizontal space well, highlights the score, keeps one decimal, preserves evidence links, and removes redundant availability copy.

**Files to read before coding**
- `reports/ceo/20260718-ceo-walk-the-store.md`
- `VISION.md` sections: Movie details → Suitability, Availability
- `DESIGN_GUIDELINES.md` section: Movie details
- `src/components/MovieModal.vue`
- `src/maturity.js`
- `src/assets/global.css` if shared CSS variables are needed

**Files likely touched**
- `src/components/MovieModal.vue`

**Scope**
- Merge the current `compatibility-summary` category rows with the useful progress-bar/evidence affordances from `Parental-guide details`.
- For each maturity category row, show:
  - category label,
  - prominent movie score with one decimal (`1.0/5`, not tiny integer text),
  - a horizontal progress bar using existing severity color classes when a numeric score exists,
  - selected profile allowance using numeric-first copy such as `Allowed 1 (mild)` or `No limit set`,
  - fit/exceeds/unknown status,
  - supporting tags/details when available.
- Use a compact row layout that takes advantage of horizontal space on desktop and remains readable on mobile without horizontal overflow.
- Define sparse-data behavior: if `movie.mat` is missing, show an unknown suitability state instead of a misleading pass/fail table; if a category score is missing, show `Unknown`; if the selected profile has no limit for a category, show `No limit set`; if tags are missing, omit the tags row without leaving empty chrome.
- Keep IMDb guide and CSM links visible/useful near the maturity section; avoid burying them under a competing duplicate table.
- Enlarge IMDb/TMDb/FilmAffinity tap targets/logos from the current 12px visual height to a mobile-friendlier size, with adequate inline link hit area.
- Remove the `availabilityDetail.label` sentence above provider chips (`Available on xxx`, `Not available...`) unless it adds distinct action value. Keep the `Where to watch` header, provider chips, selected-provider ordering, custom providers, and Settings link when services need setup.

**Non-goals**
- Do not implement true Included/Free/Rent/Buy provider groups; backend data does not support them yet.
- Do not change provider bitmask semantics or custom provider persistence.
- Do not introduce a new modal design system.
- Do not fetch or depend on external reviews for the main acceptance path.

**Acceptance criteria**
- There is one primary maturity reasoning table/section, not two competing tables.
- Category score is visually easy to scan and displayed with one decimal when known; unknown scores have an explicit non-misleading state.
- Progress bars and allowed/exceeded/unknown copy are aligned in each row.
- Missing `movie.mat`, missing category scores, no-limit profiles, and missing tags all render gracefully without empty rows or false precision.
- IMDb guide and CSM links remain available.
- IMDb/TMDb/FilmAffinity links are easier to tap on mobile.
- `Where to watch` shows actual provider chips without a redundant `Available on X` label above them.

**Verification gates**
- `npm run build`
- Manual/mobile smoke at ~375px and desktop width: movie detail with known maturity scores and sparse/unknown maturity where possible; verify no horizontal overflow, scores readable, links tappable, and provider chips remain usable.
- Manual desktop smoke: modal layout still scans and close control remains reachable.

**Risk**
- This is the densest UI slice. Keep data computation separate from layout CSS and avoid mixing with Sprint 2 if possible.
- Removing the availability warning sentence could hide setup guidance; preserve the Settings link/action when provider setup matters.

**Dependencies**
- Should start after Sprint 2 so the maturity table is driven by selected detail profile.

**Expected UX outcome**
The detail page feels more credible and easier to scan: the important number and “allowed vs movie” comparison are obvious, while duplicated suitability/availability wrappers disappear.

---

### Sprint 4 — Settings → Lists row affordance and boundaries

**Priority**: P1/P2, focused Settings trust/wayfinding polish.

**Goal**
Make the list-management screen clearly show where each list starts/ends and that tapping a row opens its movies.

**Files to read before coding**
- `reports/ceo/20260718-ceo-walk-the-store.md`
- `VISION.md` sections: Settings → My Lists, List view
- `DESIGN_GUIDELINES.md` sections: Settings, Lists
- `CODING_STANDARDS.md` sections: Settings, Reusable UI first
- `src/components/SettingsView.vue`
- `src/components/SettingsRow.vue`
- `src/views/ListView.vue`
- `src/router/index.js`
- `src/stores/user.js` only to understand list fields; do not alter persistence.

**Files likely touched**
- `src/components/SettingsView.vue`
- optionally a new small local/reusable list-row component only if it reduces markup; avoid a broad Settings refactor.

**Scope**
- Strengthen visual grouping of each list row without reverting to heavy nested cards: subtle row background or inset surface, clearer vertical spacing, visible hover/focus state, chevron/open affordance, and consistent action placement.
- Make the primary clickable area read as navigation to the list contents; title/count stay grouped together, while management actions are visually separated as secondary controls and do not steal the whole row.
- Consider copy such as `Open list` as an accessible/visual affordance if a chevron alone is insufficient; keep it compact.
- Preserve existing keyboard behavior (`Enter`/`Space`) and click-stop on actions.
- Ensure mobile layout makes actions reachable without obscuring row boundaries.

**Non-goals**
- Do not change list tokens, ownership, import/delete semantics, sharing behavior, or `/lists/:listId` route behavior.
- Do not add a new primary Lists nav tab.
- Do not redesign the full Settings home.

**Acceptance criteria**
- On `/settings/lists`, each list row has a clear boundary, grouped title/count, visible hover/focus state, and a chevron or compact open affordance.
- Secondary actions are visually separate from the primary row navigation.
- Tapping/clicking the row still opens `/lists/:listId`; Rename/Copy/Remove still only perform their action.
- Keyboard focus is visible and activation works.
- Empty state and create/import forms remain usable.

**Verification gates**
- `npm run build`
- Manual/mobile smoke at ~375px and desktop width: `/settings/lists` with at least two lists if available; confirm row boundaries, row navigation, visible focus/hover states, and secondary actions.
- Manual route smoke: opening a list lands on `/lists/:listId` and displays the poster grid.

**Risk**
- Over-styling list rows can violate the no-boxes guidance. Use subtle grouping and affordance, not oversized cards.

**Dependencies**
- Existing lists/profile state. No backend or routing changes required.

**Expected UX outcome**
Settings → Lists becomes legible as a navigation-and-management list instead of an ambiguous run of inline controls.

## PM prioritization pass

- **P0 first-screen/product coherence**: Sprint 1 is first because it fixes misleading claims (`On n services`) and redundant poster labels on the home page where every session starts.
- **P0 trust differentiator**: Sprint 2 follows immediately because appropriateness explanation is Ohana’s differentiator; profile chips must actually answer the selected audience question.
- **P1 evidence quality**: Sprint 3 deepens the same trust surface only after interaction semantics are correct, avoiding overbuilding a table around the wrong state model.
- **P1/P2 Settings polish**: Sprint 4 is contained and valuable, but it should not interrupt the Discover/detail trust path.
- **Avoid overbuilding**: unsupported availability modes are readonly; provider grouping waits for data; no route/persistence rewrites; no new global design system.

## UX/design pass

- **Hierarchy**: Remove redundant wrappers before polishing them. Poster cards should not repeat active filters; movie details should have one suitability controller and one reasoning surface.
- **Progressive disclosure**: Disabled availability modes can be visible as future/unsupported choices, but they must stay quiet and not invite impossible actions.
- **Scanning**: The maturity row redesign should make the score, bar, allowance, and status scannable in one row.
- **Mobile touch**: Larger external-link targets and non-sticky chip states are required; icon-only clear needs a strong accessible label.
- **Consistency**: Dropdown chips, toggle chips, profile chips, provider chips, and list rows must each have distinct semantics but shared visual rules.

## Principal engineer implementation guidance

- Keep each sprint in a separate commit or at least a separately reviewable diff when implementation begins.
- Run `npm run build` after each implementation sprint.
- For Sprint 1, be cautious with shared `UiChip` state changes; prefer adding props/classes via `FilterMenu` over global behavior changes.
- For Sprint 2/3, add computed helpers before changing markup so the modal state model is testable by inspection.
- For Sprint 4, preserve `openList(list)`, action `@click.stop`, and keyboard handlers.
- Do not modify `src/stores/user.js` unless a later implementation task explicitly requires it.

## Cross-functional signoff

- **Principal Engineer**: Aligned. The plan is sequenced by risk and dependency, keeps the CEO fixes independent from older execution plans, and avoids persistence/backend churn. Main engineering risk is shared chip styling; mitigate with prop-scoped behavior and manual checks for every dropdown.
- **PM-Technical**: Aligned after tightening exact availability labels, disabled semantics, `/settings/streaming` routing acceptance, modal profile-chip accessibility, sparse maturity states, and mobile/keyboard regression checks. Sprint 1 and Sprint 2 remain true P0s; Sprint 3 must not delay selectable profile chips; Sprint 4 remains contained polish.
- **UX Designer**: Aligned after adding explicit keyboard/screen-reader semantics, touch-width checks, no-horizontal-overflow criteria, and clearer Settings list affordance criteria. The plan removes noise before adding UI, separates dropdown/toggle/selection states, improves mobile tap targets, and makes list rows navigable without violating the no-heavy-boxes principle.

## Unresolved tradeoffs / decisions for implementation

- Whether Discover poster cards should keep `Review for <profile>` warnings when maturity filtering is inactive or title maturity is unknown. Recommendation: keep only non-tautological warning/unknown states; remove guaranteed-fit labels.
- Whether the availability dropdown should show disabled modes with a small `Not tracked yet` caption or rely on disabled state alone. Recommendation: use one quiet caption in the menu, not per option.
- Whether list rows need a visible `Open` text affordance in addition to a chevron. Recommendation: start with chevron + stronger row surface; add compact `Open` only if manual mobile review still feels ambiguous.

## Documentation/linkage update

Add a concise pointer in `VISION_EXECUTION.md` under Current focus / Next useful slices so future planning agents review this dated CEO walk-store execution plan before continuing implementation.
