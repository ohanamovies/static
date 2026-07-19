# Archived full sprint plan — 2026-07-13

Historical full plan preserved for audit/debugging. It includes completed sprint acceptance criteria and may contain stale status labels; do not use it as the current work selector.

## Sprint plan

Current sprint: **Sprint 9 — PM/QA trust, retrieval, and accessibility follow-ups**. Sprint 7 row-header/control-state work landed through Slice 72, Sprint 8 movie-detail hierarchy landed in Slice 69, and Sprint 9 retrieval ranking started in Slice 73. Continue with Adults/no-limit suitability reasoning, availability annotations, profile-aware Discover row naming, language normalization, and Settings input labels.

### Sprint 1 — Finish list-first Discover integration
Goal: make lists support discovery without becoming a competing promo surface.

Scope:
- Remove any remaining “Start with what you already saved.” banner/headline from `FromYourLists.vue`.
- Make the first Discover list surface a normal content row headed exactly **From your lists**.
- Keep a lightweight selector for **All lists** plus individual lists.
- Apply the active temporary Discover filters to the list preview row.
- Keep **Manage lists** as a secondary Settings action.

Acceptance criteria:
- No extra list promo headline/banner appears above the row.
- **All lists** shows one deduped preview row, capped enough that recommendations still appear soon after on mobile.
- Selecting one list affects only the list preview section, not global Discover rows.
- The preview row respects active genre/rating/maturity/content-type/availability filters.
- Empty/no-match list states are compact and do not push recommendations far down the page.

Dependencies:
- Existing `FromYourLists.vue`, user list store, Discover filters, and movie row/card components.

Verification:
- `npm run build`.
- Manual mobile review of `/discover` with no lists, one list, multiple lists, and active filters.

### Sprint 2 — Add dedicated list route and poster-grid view
Goal: complete the `/lists/:listId` vision requirement for full saved-list browsing.

Scope:
- Add route `/lists/:listId`.
- Resolve the list by id from persisted user/profile data.
- Render all available movies in that list as a responsive poster grid, not a horizontal row.
- Add **See all** links from specific-list Discover rows to `/lists/:listId`.
- Add a compact invalid/missing-list state with a path back to Discover or Settings → My Lists.

Acceptance criteria:
- `/lists/:listId` shows the selected list title and all available poster items through vertical scrolling.
- The full list page prioritizes completeness; it must not use carousel curation or row slicing.
- Specific-list Discover rows expose **See all** and navigate to the correct id.
- Movie detail still opens from grid cards.
- Invalid list ids fail calmly without breaking the app shell.

Dependencies:
- Sprint 1 list selector/row behavior.
- Existing router, list store, poster card, and movie modal wiring.

Verification:
- `npm run build`.
- Route smoke tests: `/lists/<known-id>`, `/lists/bad-id`, `/discover`, `/settings/lists`.
- Manual mobile check for grid density, tap targets, and bottom-nav interaction.

### Sprint 3 — Consolidate reusable UI primitives
Goal: make repeated controls consistent without broad redesign.

Scope:
- Apply `UiChip` only to repeated chip/action surfaces where it removes duplicated behavior or CSS.
- Confirm repeated metadata badges use `UiBadge`.
- Confirm repeated section/action headings use `SectionHeader`.
- Keep Settings rows on `SettingsRow`.
- Remove duplicate CSS variants made obsolete by those primitives.

Acceptance criteria:
- Chip selected/disabled/focus/nowrap behavior is centralized for repeated chip surfaces.
- Chips never wrap to two lines; long labels truncate or move into menu/detail surfaces.
- Poster/search cards do not regain platform/provider badges.
- Component consolidation does not flatten distinct semantic controls into misleading generic UI.

Dependencies:
- Existing `UiChip`, `UiBadge`, `SectionHeader`, and `SettingsRow` work from slices 31–35.

Verification:
- `npm run build`.
- Spot-check `/discover`, `/search`, `/settings`, `/settings/streaming`, `/settings/maturity`, and movie detail modal.

### Sprint 4 — Audit and narrow legacy `ConfigModal.vue`
Goal: avoid stale duplicate settings flows while protecting persistence and onboarding paths.

Scope:
- Audit every remaining `ConfigModal.vue` entry point before changing behavior.
- Keep only genuinely needed flows, likely shared-list onboarding or temporary compatibility bridges.
- Move any remaining core profile/list/maturity behavior to route-backed Settings pages only if the path is safe and small.
- Delete dead modal UI/CSS only after confirming no route/query flow depends on it.

Acceptance criteria:
- Profile, streaming, maturity, and list management do not require the broad legacy modal.
- Any remaining modal use is narrow, named, and documented in this file.
- Shared-list invite/add flows and movie add-to-list query paths still work.
- KV/profile merge behavior is untouched unless explicitly scoped and verified.

Dependencies:
- Settings route functionality from slices 24, 25, 27, and 29.
- Careful inspection of `App.vue`, `user.js`, query params, and list/profile persistence.

Verification:
- `npm run build`.
- Smoke: create/restore profile, create/import/share/rename/remove list, change maturity profile, open movie with add-to-list action, and any shared-list invite/add query behavior.

### Sprint 5 — Prototype lightweight structured Search
Goal: improve intentional retrieval without inventing backend entities.

Scope:
- Add inferred collection grouping only when existing title data makes confidence high.
- Keep Search vertical; do not add carousels.
- Preserve exact-title priority for specific searches.
- Do not add person/studio search until backend data exists.

Acceptance criteria:
- Search still ignores Discover filters and annotates results instead.
- Queries like “The Godfather” prioritize exact title retrieval.
- Queries like “James Bond” or “Harry Potter” may show a collection-like grouped section only when multiple matching titles support it.
- Compatibility, availability, and list annotations remain visible.

Dependencies:
- Existing Fuse search and movie metadata only.

Verification:
- `npm run build`.
- Manual searches: `godfather`, `james bond`, `harry potter`, typo query, and empty query recents.

### Sprint 6 — Mobile CX review and polish
Status: current. Start here next; Sprints 1–5 have implementation slices recorded above.

Goal: verify the redesigned experience against `VISION.md`, `AGENTS.md`, and `CODING_STANDARDS.md` on a phone-sized viewport.

Scope:
- Review header height and visible **Ohana TV** brand.
- Review icon-only bottom tab clarity and consistent icon weight/tap targets.
- Review Discover first-screen density and list row weight.
- Review Search first-screen spacing.
- Review Settings list density.
- Review movie detail on mobile: full-screen presentation, fixed top close button, suitability details visible and understandable.
- Review lightweight structured Search sections: exact title first, related title grouping only when clearly supported, remaining fuzzy results still visible.
- Review `/lists/:listId` grid as a complete saved-list view; do not turn it back into a curated carousel or over-filtered discovery preview.
- Audit nested boxes, chip wrapping, card metadata noise, and selected states.

Acceptance criteria:
- Discover recommendations appear quickly after controls/list preview.
- Search starts with the search field and useful content immediately after.
- Settings feels like a compact index, not a form dump.
- Movie detail on mobile uses the available screen, keeps close reachable at top, and does not bury suitability reasoning behind a vague verdict.
- Structured Search improves retrieval clarity without pretending to have real collection/person backend entities.
- Full-list pages prioritize completeness and simple poster scanning.
- No screen relies on nested decorative boxes where spacing/type would work.
- No chips wrap; icon tabs remain label-free and non-emoji.

Dependencies:
- Ideally after Sprints 1–3.

Verification:
- `npm run build`.
- Manual mobile review on Tailscale (`http://100.85.92.106:5174/`).
- Manual searches: `godfather`, `james bond`, `harry potter`, typo query, and empty query recents.
- Record findings and any follow-up slices in this file before starting more implementation.

### Sprint 7 — CEO feedback: control states and row headers
Status: current / nearly closed. Availability row copy and row-title list selector are implemented; remaining focus is chip/dropdown state semantics and touch verification.

Goal: fix the visible control/state problems Alex flagged without broad redesign.

Scope:
- Fix chip dropdown interaction failures in Discover/list controls.
- Normalize chip selected/unselected/disabled/hover visuals so non-destructive chips and menu options never use red/accent treatment.
- Verify the list selector remains integrated into the row-title/header pattern: **From your lists — All lists ▼**.
- Keep availability row copy short: **Available on <service>** or **Available on your services**.

Acceptance criteria:
- Every dropdown chip opens and applies its selection on touch/mobile and desktop.
- Chips have clear selected and unselected states; disabled/unavailable is quiet, not red.
- The list selector reads as part of the **From your lists** row header, not as a separate loud toolbar.
- Availability row headers are short enough to scan on mobile.
- Source review confirms generic chip/menu selected and hover states use neutral/teal/blue interaction colors, reserving red for destructive/error states.

Verification:
- `npm run build`.
- Manual mobile check of `/discover` controls, list selector, and all chip states.
- Source/CSS grep or visual review confirms no generic chip/menu selected, hover, active, or disabled style uses red/destructive treatment.

### Sprint 8 — CEO feedback: movie-detail decision hierarchy
Status: implemented in Slice 69; pending manual phone/profile QA.

Goal: make movie details more decisive by removing duplication and adding cross-profile suitability.

Scope:
- Remove the duplicate/first movie-detail availability block that does not add information beyond the fuller provider section.
- Keep one clear availability section with provider detail/value.
- Add a compact suitability glance across configured/built-in profiles, e.g. **Adults ✔**, **Family ✔**, **Kids ❌**.
- Preserve detailed active-profile suitability reasoning and category scores.

Acceptance criteria:
- Movie detail shows availability once.
- The user can scan which profiles a title suits without changing the active profile.
- Active-profile reasoning remains visible and understandable.
- No new backend availability/profile model is required; use existing local profile/provider data.

Verification:
- `npm run build`.
- Manual movie-detail checks for permissive Adults profile, restrictive kids/family profile, and custom profile when available.
- Confirm no duplicate availability copy remains in the modal/page.

### Sprint 9 — PM/QA trust, retrieval, and accessibility follow-ups
Goal: cover the remaining product-vision and QA findings that are not generic chrome polish.

Scope:
- Make movie-detail suitability reasoning visible for every active profile, including Adults/no-limit profiles where rows should show **No limit set** instead of disappearing.
- Tune Search exact/near-exact ranking so canonical/high-confidence user intent wins over weak exact-title noise, starting with `godfather`.
- Add abstract availability annotations to Search results first; evaluate poster cards only if it stays visually calm and never reintroduces provider names on cards.
- Rename the first Discover row with active profile context, e.g. **Recommended for Adults**.
- Normalize primary Discover control language to one locale; default to English until real i18n is planned.
- Add real labels/accessibility names to Settings text inputs flagged by QA.
- Improve no-profile vs wrong-profile copy for list-gated surfaces.
- Extend QA/modal coverage so future reports inspect the movie-detail dialog content, close control, focus/scroll state, suitability, and availability rows.

Acceptance criteria:
- Movie details always explain suitability without requiring users to open raw parental-guide details.
- `/search?q=godfather` puts `The Godfather` 1972 first or clearly first among canonical suggestions; `harry potter` and `james bond` still behave sensibly.
- Search results annotate availability without filtering intentional retrieval and without provider-name clutter.
- Discover first row communicates the active maturity profile.
- Primary controls do not mix English and Spanish chrome.
- Settings-route input probes find no unlabeled visible inputs.
- `/settings/lists` and `/lists/:bad` explain profile/list state accurately and tersely.

Verification:
- `npm run build`.
- Manual checks: `/discover`, `/search?q=godfather`, `/search?q=harry%20potter`, `/search?q=james%20bond`, typo query, `/settings/profile`, `/settings/maturity`, `/settings/lists`, `/lists/bad-id`, and a movie-detail deep link.

### Sprint 10 — CEO feedback: Settings list navigation and copy-share behavior
Status: implemented and build/route-smoke verified in Slice 71.

Goal: make Settings → Lists behave like a useful list hub, not an admin table or raw-link copier.

Scope:
- Make each list row/title in `/settings/lists` open the dedicated `/lists/:listId` poster-grid view.
- Keep Rename, Share/Copy, and Remove as secondary actions; their clicks must not accidentally navigate to the list page.
- Change list sharing on this surface to clipboard-first behavior: generate the existing share URL, copy it immediately, and show local **Copied** feedback for about 1 second.
- Keep manual copy prompt only as a clipboard-failure fallback.
- Preserve current token/share URL generation and profile/list persistence semantics.

Acceptance criteria:
- Tapping/clicking a list row in Settings shows the movies in that list.
- `/lists/:listId` remains a complete poster-grid view, not a filtered discovery preview.
- Pressing Share/Copy does not show a raw URL in the happy path.
- Feedback says **Copied** rather than **Shared**, clears after roughly 1 second, and does not interrupt the list-management flow.
- Secondary list actions do not trigger row navigation.

Verification:
- `npm run build`.
- Route smoke: `/settings/lists`, `/lists/bad-id`, and a real `/lists/:listId` where local profile/list data exists.
- Manual check: row navigation, Rename, Share/Copy, Remove, and clipboard fallback behavior where possible.
