# CEO feedback report — Ohana TV

Date: 2026-07-13  
Source: Alex product review, Telegram message #2515  
Status: Documented for planning. Do **not** implement immediately without sprint selection/review.

## Executive summary

Alex’s feedback is not a request for another generic polish pass. It identifies six concrete trust/CX issues in the current Sprint 6 UI:

1. Chip dropdowns do not work.
2. The **From your lists** row selector is still too visually separate; it should be subtle and integrated into the row title: `From your lists — All Lists ▼`.
3. `Included with your services` is too long as a row title; use shorter contextual copy such as `Available on Netflix` / `Available on your services`.
4. Movie detail currently shows availability twice. Remove the first/duplicate availability block; keep only the version that adds real decision value.
5. Movie detail suitability is good context but should show suitability across profiles at a glance, not only the current profile: e.g. `Adults ✔`, `Kids ❌`, etc.
6. Chips still turn red when disabled. Chips must have only selected and unselected visual states; red is not a disabled/toggled-off state.

## Product interpretation

The underlying direction is clear: Ohana should feel calmer and more decisive. Controls should be obvious and working, row titles should carry context without becoming long marketing copy, and movie details should avoid duplicate information while improving the decision summary.

## PM/vision updates required

Update `VISION.md` so these become acceptance criteria:

- Chip/dropdown controls must be functional, not decorative.
- Chip states are selected/unselected only; disabled/unavailable may be quiet, but never red unless destructive.
- The **From your lists** selector belongs inside the row-title treatment, not as a loud secondary control strip.
- Availability row titles should be short and contextual: `Available on <service>` / `Available on your services`, not long explanatory phrases.
- Movie detail should show availability once.
- Movie detail should show a profile suitability glance across configured/built-in profiles.

## UX design-guideline updates required

Update `DESIGN_GUIDELINES.md`:

- Row-header controls should read as part of the row title when they select row scope.
- Avoid long row titles; optimize horizontal-row headers for scanning.
- Red is reserved for destructive/error states only, never disabled chips.
- Detail pages must not duplicate the same decision signal in multiple blocks.
- Suitability should support both current-profile reasoning and cross-profile scanability.

## Principal engineer execution-plan updates required

Add explicit sprint work to `VISION_EXECUTION.md` rather than implementing ad hoc:

- Sprint 7: control-state and row-header correction.
  - Fix chip dropdown interaction failures.
  - Normalize chip selected/unselected/disabled states; eliminate red disabled chips.
  - Integrate **From your lists — All Lists ▼** into the row-title/header pattern.
  - Shorten availability row title copy.
- Sprint 8: movie-detail decision hierarchy.
  - Remove duplicate availability block.
  - Add cross-profile suitability glance.
  - Preserve detailed current-profile suitability reasoning.

## Priority

P0: broken chip dropdowns and red disabled chip states.  
P1: From-your-lists row title integration and shorter availability row title.  
P1: movie-detail duplicate availability removal and cross-profile suitability glance.

## Non-goal

Do not implement full backend availability category logic, new provider data, or new maturity taxonomy as part of this feedback. Use existing profile/provider data and current UI primitives.
