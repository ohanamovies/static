# CEO feedback report — movie-detail suitability and filter chips

Date: 2026-07-14 02:10 Europe/Madrid
Source: Alex product review, Telegram message #2614
Status: Documented for planning. Do **not** implement immediately unless Alex explicitly asks.

## Raw feedback

- On the movie serial/detail page, suitability chips should let users tap them to see details for each maturity profile. The user wants to quickly check why a title is not suitable to watch with kids.
- This does not change the actual filter on the discovery page; it is drill-down for the current movie only.
- Around that suitability area, the box titled **Suitability** before the child/profile does not add value.
- The box with the lists is also redundant with the chips.
- Avoid hover chip color changes on mobile because they do not work well with tapping.
- On filters, add a link to edit configured platforms from the platforms dropdown.
- Numeric sensibility levels are good, but **allowed mild** is not a number. Prefer copy like **Allowed 1 (mild)**.
- When a maturity level is set on the discovery page, the poster label **Fits Adults** does not help because every displayed movie already fits that filter.

## Executive interpretation

This is a decision-confidence refinement, not a new filtering model. Discover filters define the browsing context; movie details should let users interrogate that context and quickly compare other maturity profiles without jumping to Settings or changing the current Discover filter. The biggest product issue is redundant, static summary chrome where the app should instead provide tappable explanations.

## Required PM/vision response

- Clarify that movie-detail cross-profile suitability chips are interactive drill-down controls for the current title, not Discover-filter mutations.
- Make redundant detail containers a product anti-pattern: avoid a generic **Suitability** wrapper and avoid a separate list box when chips/actions already provide the same information.
- Add acceptance criteria that platform/provider dropdowns must offer a path to edit configured platforms in Settings.
- Update maturity copy acceptance so allowed levels pair numeric scale with human label, e.g. **Allowed 1 (mild)**.
- Suppress tautological poster fit badges when the active Discover maturity filter already guarantees the same outcome.

## Required UX/design response

- On touch/mobile, chips must not rely on hover color changes; tap/pressed/focus/open states should be stable and not create sticky color confusion.
- Detail surfaces should use chips for compact cross-profile/list status only when tapping reveals useful detail or action.
- Remove wrapper/card treatments that only label the obvious; hierarchy should come from row labels, chips, and revealed details.

## Required principal-engineer response

- Add a quick CEO-priority slice before broader modal QA: make movie-detail suitability chips tappable and remove redundant Suitability/list boxes.
- Add a touch CSS audit for chip hover states under coarse pointers.
- Add the platforms-dropdown Settings link without changing provider filtering semantics or backend availability groups.
- Normalize maturity-level copy to **Allowed n (label)**.
- Hide/reword poster fit labels that repeat the active maturity filter.
- Verify on phone/touch plus `npm run build`; include a movie-detail deep link and `/discover` filter state in checks.

## Suggested priority

- P0 — Tappable movie-detail suitability drill-down for each maturity profile, plus removal of redundant Suitability/list boxes. This is the core “why not with my kids?” trust task.
- P1 — Touch/mobile chip hover-state cleanup; sticky hover makes tappable chips feel broken.
- P1 — Platforms dropdown should link to Settings → platforms so users can fix missing services in context.
- P1 — Numeric maturity copy: **Allowed n (label)**.
- P2 — Suppress tautological poster labels such as **Fits Adults** when the active maturity filter already guarantees fit.

## Non-goals

- Do not change Discover filter behavior when tapping movie-detail suitability chips.
- Do not invent new maturity taxonomy, backend suitability data, or provider availability groups.
- Do not reintroduce provider/platform names on poster cards.
- Do not expand this into a broad modal redesign beyond the redundant containers and drill-down interaction.
