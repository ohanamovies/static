# Ohana QA deep-dive report — localhost:5174

Date: 2026-07-13 09:58 Europe/Madrid  
Scope: safe browser QA click-through of `http://localhost:5174` across desktop `1440×1000` and mobile `390×844`.

Evidence:
- Automated crawl: `reports/cx-review/2026-07-13T07-50-45-111Z.md`
- Interactive click-through evidence: `reports/qa-deep-dive/2026-07-13T07-52-59-752Z/evidence.md`
- Screenshots: `reports/qa-deep-dive/2026-07-13T07-52-59-752Z/`

Note: destructive/external-write actions were not submitted. Profile/list creation and persistence writes hit the remote KV API, so this pass inspected those surfaces but did not create data.

## Executive verdict

The app is directionally good: Discover/Search/Settings IA is now coherent, mobile density is much better than the earlier direction, Search deep links work, and Settings subroutes are usable. The remaining problems are mostly sprint-planning polish and trust issues, not architecture collapse.

The biggest real bug is the `extra.json` preload failure in movie details. The biggest UX risk is still first-screen Discover overload: it technically fits, but the first screen reads like controls + dense poster rail, not yet like a calm family decision surface.

## Priority tasks for sprint planning

### P0 — Fix `extra.json` preload failure in movie details

**Evidence**
- Console repeatedly logs: `Failed to preload extra.json table: SyntaxError: Unexpected token '<', "<!DOCTYPE "... is not valid JSON`.
- Triggered on desktop and mobile when opening movie details.
- Source: `src/components/MovieModal.vue` fetches `/extra.json`; `public/extra.json` is absent, so Vite serves HTML fallback.

**Why it matters**
This is a trust-killer in QA and masks real runtime errors. It also means the parental-guide enrichment path silently degrades.

**Action**
- Add `public/extra.json` if the dataset is required, or gate the fetch behind an existence/HTTP/content-type check.
- Do not `console.error` on expected optional enrichment absence; downgrade to `console.info` or no-op if optional.
- Add a tiny regression check for `/extra.json` behavior or modal open with no console errors.

**Acceptance**
- Opening a movie detail produces no console errors.
- Missing optional enrichment does not break CSM/IMDb links or parental-guide display.

---

### P1 — Add real labels to Settings text inputs

**Evidence**
Unlabeled fields detected on both desktop and mobile:
- `/settings/profile`: `Your name`, `Paste recovery token`
- `/settings/maturity`: `Movie night, grandparents…`

**Why it matters**
Placeholders are not labels. This hurts accessibility and makes forms feel less solid, especially on mobile when text is partially hidden or cleared.

**Action**
- Add visible or visually-hidden `<label>` elements for profile name, recovery token, and custom maturity profile name.
- Keep placeholder examples, but do not rely on them as the accessible name.

**Acceptance**
- Automated field probe finds zero unlabeled visible inputs on Settings routes.
- Keyboard/screen-reader users can identify every input.

---

### P1 — Tighten mobile Discover first-screen decision hierarchy

**Evidence**
Mobile `/discover` first screen shows:
- Header + H1
- Five controls: availability, profile, content type, genre, rating
- Immediate dense poster rail

The recommendations are visible, which is good, but the decision framing is still weak: a family user sees controls before any explanation of why these titles are safe/good *for this viewing context*.

**Action**
- Keep the compact controls, but add one small contextual line under the H1 or row title that explains the active state, e.g. `Adults · any genre · included services`.
- Consider moving the least-used control (`Rating`) behind a secondary “More filters” affordance on phone widths if first-screen crowding returns.
- Make the first row title/metadata do more work: `Recommended for Adults` is stronger than generic `Recommended for this profile`.

**Acceptance**
- On `390×844`, users see brand, task, active context, and at least the first movie card without vertical scrolling.
- First row communicates the active maturity profile without needing to open a filter menu.

---

### P1 — Search ranking: exact canonical title should beat weak exact-alias noise

**Evidence**
Search for `godfather` returns under **Best matches**:
1. `Godfather` 2022, rating 5.1
2. `Godfather` 1991, rating 8.6
3. `The Godfather` 1972, rating 9.2

The canonical/high-confidence user intent is almost certainly `The Godfather` 1972. Current exact-title logic is technically explainable but user-hostile.

**Action**
- Bias exact-title matches by popularity/rating/year canonicality when multiple exact/near-exact matches exist.
- Treat leading articles (`the`, `a`, localized variants later) as weakly ignorable for exact matching.
- Promote high-rating/high-popularity canonical matches above obscure exact same-name titles.

**Acceptance**
- `/search?q=godfather` puts `The Godfather` 1972 first or clearly first among canonical suggestions.
- `Related titles` still contains Part II/III and `Godfather of Harlem` without polluting best-match ordering.

---

### P2 — Normalize language on primary controls

**Evidence**
Discover mixes English and Spanish:
- `Series`
- `Películas`
- `Categorías`
- `Rating`

**Why it matters**
The product can be bilingual later, but mixed chrome reads accidental. It makes the UI feel like implementation residue.

**Action**
- Pick one locale for current chrome. Recommendation: English for now (`Movies`, `Categories`) because most surrounding copy is English.
- If Spanish is intentional, make the whole navigation/filter layer Spanish.

**Acceptance**
- Primary navigation and filter controls use one language consistently.

---

### P2 — Make Settings list/profile gates more instructive

**Evidence**
- `/settings/lists` unauthenticated state says only `Create profile to use lists`.
- `/lists/bad-id` says `This list is not attached to the current profile` even when there is no profile.

**Why it matters**
These are calm states, but too terse. A first-time user does not know whether lists are local, shareable, recoverable, or profile-scoped.

**Action**
- On `/settings/lists`, add one sentence: `Lists sync through your profile and can be shared by token.`
- On `/lists/:bad`, branch copy for no-profile vs wrong-profile/missing-list.

**Acceptance**
- No-profile list states explain the next action and why profile creation is needed.
- Bad-list route distinguishes “no profile” from “not attached”.

---

### P2 — Re-check movie detail screenshot/probe coverage after modal work

**Evidence**
The modal does open and focus correctly on direct query (`/discover?movie=tt0120737`), but generic page probes mostly report background headings/controls because the modal is teleported after the app shell. This makes automated QA under-report modal content.

**Action**
- Improve the QA harness to explicitly detect `.modal[role="dialog"]`, capture modal text, close button position, focus trap state, and body scroll lock.
- Add modal-specific screenshots after direct deep-link load and after card click.

**Acceptance**
- Future QA reports include a dedicated `Movie detail` section with title, close button presence, suitability rows, availability rows, and parental-guide state.

---

### P3 — Revisit long card-title overflow handling

**Evidence**
The probe flags long poster card titles as horizontal overflow suspects, e.g. `The Lord of the Rings: The Fellowship of the Ring`.

**Assessment**
This may be intentional truncation, not a bug. Still worth a visual pass because family users need recognizable titles and many franchises have long names.

**Action**
- Confirm card title line-clamp/truncation is deliberate and visually clean on phone and desktop.
- If recognition suffers, allow two title lines on poster cards while keeping metadata to one line.

**Acceptance**
- Long known titles remain recognizable without causing layout overflow or wrapping metadata soup.

## Routes/interactions covered

- `/discover`
- Discover availability/profile/genre/rating menus
- Movie detail via card/deep link
- `/search`
- `/search?q=godfather`
- `/search?q=zzzzunlikelytitle`
- Search result detail via query param
- `/settings`
- `/settings/profile`
- `/settings/streaming`
- `/settings/maturity`
- `/settings/lists`
- `/lists/bad-id`
- `/roadmap`

## Principal SDE pickup checklist

- [ ] Fix optional `extra.json` preload behavior first.
- [ ] Add labels to Settings inputs.
- [ ] Decide chrome language and normalize filters.
- [ ] Tune Search best-match ranking for canonical titles.
- [ ] Add no-profile copy improvements for list/profile-gated surfaces.
- [ ] Extend QA harness modal detection before relying on modal reports.
