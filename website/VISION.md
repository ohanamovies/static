# Ohana Web App Redesign

## Vision

Ohana helps people confidently choose what to watch.

Most streaming services optimize for popularity or personalization. Ohana adds something equally important: **appropriateness**. It helps people discover movies and TV shows that match their interests **and** their personal sensibilities, while making it effortless to find where they can watch them.

The product revolves around three core capabilities:

- **Discover** movies and TV shows that fit your preferences.
- **Understand** whether a title is appropriate for you or the people you're watching with.
- **Know where to watch** it with the streaming services you already have.

Lists remain an important part of the experience, but they support discovery rather than becoming a separate product.

The redesign aims to make Ohana feel simple, calm, and highly focused.

---

# Design principles

Durable design principles live in [`DESIGN_GUIDELINES.md`](./DESIGN_GUIDELINES.md).

This document remains the product source of truth for Ohana's vision, information architecture, and concrete UX acceptance criteria.

---

# Specific product and UX requirements

These are concrete constraints from product review. Treat them as acceptance criteria, not vague preferences.

## Brand/header

- The main app header must visibly include the text **Ohana TV**.
- Do not rely on only a logo mark, emoji, icon, or browser title for brand presence.

## Discover diversity

- The same movie or show must not appear in the first two visible positions of more than one Discover row.
- If a title already appeared in an earlier row, either remove it from later rows or push it several positions back so the first screen feels diverse.
- Recommendation row generation should dedupe by title/id across rows before slicing visible row results.

## Visual hierarchy and containers

- Stop nesting boxes inside boxes.
- Use whitespace, typography, and grouping instead of stacked cards, panels, and borders.
- Search starts with the search bar at the very top of the Search view, not inside a secondary wrapper card.
- Settings home should feel like a quick settings list/index, not an endless scroll of oversized boxes.

## Cards and metadata

- Posters/cards should not display streaming platforms.
- Platforms belong in the movie/show detail view where the user is deciding where to watch.
- Cards may show only the minimum needed to choose: poster, title, year/rating, suitability/fit, and an abstract availability signal if useful. Do not show streaming provider/platform names on cards.

## Navigation

- Bottom navigation tabs should show icons only: no text labels.
- Use proper high-bar app icons such as Material Design Icons or equivalent SVG/icon components, not emojis.
- Icon size, stroke/fill weight, selected state, and tap target must be consistent across tabs.

## Chips and compact controls

- Chip text must never wrap to two lines.
- Long chip labels should truncate, shorten, or move into a menu/detail surface.
- Controls should be reusable and consistent rather than one-off CSS variants.
- Chip dropdowns must work reliably; a chip that opens a menu is not decorative.
- Chips have only clear selected and unselected visual states. Disabled/unavailable may be quiet, but must not turn red. Red is reserved for destructive/error states.
- On touch/mobile, chips must not rely on hover color changes that can stick after tapping. Use stable selected/open/pressed states instead.

## Implementation quality

- Code UI primitives as reusable components when the same pattern appears more than once.
- Reuse shared controls for chips, settings rows, bottom tabs, section headers, and metadata badges instead of copying markup/styles.

---

# Information Architecture

The application has three primary tabs.

## Discover

Find something to watch.

## Search

Find a specific title, collection or person.

## Settings

Configure your Ohana experience.

---

# Discover

## Purpose

Discover is the heart of Ohana.

It combines personal preferences, streaming availability and maturity filtering to recommend appropriate content.

Unlike Search, Discover is intentionally curated.

## Layout

The page is organized into three sections:

1. Discovery controls
2. From your lists
3. Discovery rows

---

## Discovery controls

Discovery filters are temporary.

They affect only the current browsing session.

Permanent preferences live under Settings.

### Availability

Single-select dropdown.

Options:

- Included with my services
- Free with ads
- Rent
- Buy

Initially only "Included with my services" may be supported until backend capabilities expand.

The availability/platform dropdown should include a clear path to edit configured platforms in Settings. This is navigation to configuration, not a change to backend provider semantics.

### Maturity profile

Single-select dropdown.

Examples:

- Me
- Family
- With kids
- Adults

The selected profile becomes the active viewing context for the application.

Compatibility shown throughout the app uses this profile.

When a maturity filter is active, poster/card fit labels should not merely restate the filter, such as **Fits Adults** on a screen where every visible title already fits Adults. Keep poster suitability signals only when they add distinction.

### Content type

Two chips:

- Movie
- TV Show

Behavior:

- One selected = filter
- None selected = both
- Both cannot be selected simultaneously

### Genre

Single-select dropdown.

Examples:

- Comedy
- Drama
- Adventure
- Animation

No multi-select.

### Rating

Minimum rating slider.

Examples:

- Any
- 6+
- 7+
- 8+
- 9+

A thin mobile-friendly slider is preferred.

---

## From your lists

Lists are integrated into discovery rather than having their own navigation tab.

This section appears near the top of Discover.

Header:

**From your lists**

Do not add a separate banner, hero title, or explanatory headline such as “Start with what you already saved.” The section itself is the first row: a normal content row headed **From your lists**.

Dropdown:

- All lists
- Watchlist
- Family
- Christmas
- Shared...

The selector should read as a subtle part of the row title, for example:

**From your lists — All lists ▼**

Do not let the list selector become a separate loud toolbar above the row.

Action:

**Manage lists**

Secondary action:

**See all**

Selecting **All lists** shows a deduped preview across saved lists so this section remains a discovery row, not a full library dump.

Selecting a specific list filters this section only. The global Discover filters still apply to the row, so the saved titles respect the current temporary viewing context. For a specific list, **See all** opens that list's dedicated grid view.

Users can quickly continue browsing recommendations below without changing screens.

This allows users to first revisit things they already intended to watch before exploring something new.

The **See all** action opens a dedicated list view for the selected list.

---

## List view

Ohana supports a dedicated route for viewing one saved list.

URL input is the list id.

Example:

`/lists/:listId`

This view shows all movies in that list as posters.

Because this is a full laundry-list view rather than a recommendation preview, use a responsive poster grid instead of a horizontal row.

The same temporary Discover filters may be applied when navigating from Discover, but the page’s primary job is completeness: show the selected list clearly, with all available poster items visible through scrolling.

Every **From your lists** row for a specific list should include a **See all** link that navigates to this route for that list id.

Settings → My Lists should also use this route as the primary way to inspect a list: clicking/tapping a list row opens `/lists/:listId` so the user can see the movies in that list. Rename, share, remove, and other management actions remain secondary row actions.

---

## Discovery sections

The remainder of the page consists of curated horizontal rows.

Examples:

- Recommended for this profile
- Available on Netflix
- Available on your services
- Popular now
- Hidden gems
- Because you like Comedy
- Family favourites

Keep row titles short. Avoid long labels such as **Included with your services** when a shorter contextual title like **Available on Netflix** or **Available on your services** communicates the same thing faster.

Each row uses large posters.

Opening a movie always goes to the same movie detail page.

---

## Movie cards

Cards should remain visually simple.

Display:

- Poster
- Title
- Year
- Rating
- Primary availability
- Compatibility indicator

Optional metadata:

- Already watched
- Saved in list

Primary action:

Open details.

Secondary action:

Add to list.

---

## Movie details

Movie details combine Ohana's three differentiators.

### Mobile detail surface

On mobile, the movie detail view should feel full-screen, not like a small floating desktop modal.

- Use the full viewport height and width available on the phone.
- Keep the close button fixed at the top so it remains reachable while scrolling details.
- Avoid trapping key decision information below awkward modal chrome.

### Overview

- Poster
- Title
- Synopsis
- Year
- Runtime
- Genres

### Suitability

The active maturity profile is clearly displayed.

Example:

> Compatible with: **With kids**

Movie details should also show suitability across profiles at a glance, using compact scan labels such as:

- Adults ✔
- Family ✔
- Kids ❌

This glance must complement, not replace, the active-profile reasoning.

These profile chips are interactive drill-down controls for the current movie only. Tapping a profile chip should reveal why the title fits or fails that profile, especially to answer “why is this not suitable with my kids?”, without changing the active Discover maturity filter.

Suitability must help people make informed decisions, not blindly accept a verdict. Summary labels are useful at the filter/poster level, but the detail view must expose the underlying reasons per movie.

Each maturity category shows:

- Movie intensity / score
- Allowed level for the selected profile, using numeric-first copy such as **Allowed 1 (mild)** rather than label-only copy such as **Allowed mild**
- Compatible or exceeds
- Specific supporting details/tags when available

Categories may include:

- Violence
- Sex & nudity
- Language
- Frightening scenes
- Drugs
- Alcohol

Users understand *why* a title matches instead of seeing only a single score. If the current implementation has lost the previous score/detail presentation, check the original Ohana repo/history and restore the useful parts rather than inventing a new opaque summary.

Avoid generic wrapper boxes that add labels without decisions. A box titled **Suitability** before the profile/chips, or a separate list box that duplicates list chips/actions, should be removed rather than polished.

### Availability

Availability appears once in movie details. Do not duplicate a shallow availability summary above the fuller provider section unless the shallow summary adds distinct decision value.

Providers grouped by:

- Included
- Free with ads
- Rent
- Buy

Providers already configured by the user appear first.

### Actions

- Add to list
- Mark watched
- Share

---

# Search

## Purpose

Search is for intentional retrieval.

Unlike Discover, Search does **not** attempt to recommend.

It helps users quickly find what they already have in mind.

## Search behavior

Search ignores discovery filters.

Searching for "The Godfather" should always return The Godfather.

Instead of filtering results, Search annotates them.

Each result can show:

- Compatibility with active maturity profile
- Availability
- List membership

Search answers:

> "Help me find something specific."

Discover answers:

> "What should I watch?"

## Search landing page

Before typing:

- Recent searches
- Recently viewed titles

Future versions may include:

- Suggested searches

## Results

Unlike Discover's carousels, Search uses a vertical list.

Each result shows:

- Poster
- Title
- Year
- Movie or TV show
- Short synopsis
- Rating
- Compatibility
- Availability

This provides enough information to distinguish similar titles.

## Structured results

Search returns different entity types.

### Collections

Examples:

- James Bond Collection
- Harry Potter Collection
- Marvel Cinematic Universe

### Movies & TV Shows

Standard title results.

### People

- Actors
- Directors
- Writers

Future versions may also return:

- Lists
- Studios
- Genres

Searching for "James Bond" should prioritize the collection rather than listing twenty-five movies individually.

---

# Settings

## Purpose

Settings contains permanent user configuration.

Instead of one long scrolling page, Settings acts as an index.

Every item opens its own dedicated screen.

This improves navigation while allowing deep links from elsewhere in the application.

---

## Settings home

The Settings index should summarize the current state as compact two-line rows: label/category plus current state/title. Do not add routine third-line helper copy; it makes Settings feel loaded and belongs inside the dedicated setting route when needed.

### Watching

**Streaming services**

Netflix • Disney+ • Prime Video

**Maturity profiles**

Me • Family • Kids

**My Lists**

5 lists • 2 shared

### Account

**Profile**

Alex

**Recovery token**

Configured

### General

- About
- Privacy
- Language

Each row opens its own page.

---

## Profile

Contains:

- Display name
- Recovery token
- Copy token
- Restore profile
- Create new profile

The recovery token is explained as a backup mechanism rather than a login.

---

## Streaming services

Users select the services they subscribe to.

Examples:

- Netflix
- Disney+
- Prime Video
- Apple TV+
- Max
- Filmin

These services influence:

- Discover
- Availability
- Ranking

---

## Maturity profiles

Users may define multiple profiles.

Examples:

- Me
- Family
- With kids
- Adults

Each profile contains limits for every maturity category.

Users can:

- Create
- Edit
- Duplicate
- Rename
- Delete

One profile can be marked as default.

The active profile is selected from Discover.

---

## Profile editor

Each category exposes a simple maximum intensity.

Example:

### Violence

- None
- Mild
- Moderate
- Strong
- Any

The same applies to every supported maturity category.

---

## My Lists

This page manages user lists.

Capabilities:

- Create
- Rename
- Copy share link
- Import
- Delete
- Leave shared list

Opening a list shows its contents.

List rows are primarily navigational: tapping the list opens the dedicated `/lists/:listId` poster-grid view.

Sharing a list should copy the share URL automatically and show brief local **Copied** feedback for about 1 second. Do not display the raw URL as normal UI after the action; manual copy prompts are only fallback behavior when clipboard access fails.

Unlike the original proposal, this page is **not** a primary navigation destination.

Lists are managed here but primarily consumed from Discover.

---

# Deep linking

One benefit of Settings acting as an index is direct navigation.

Examples:

**No streaming services configured**

→ Settings → Streaming services

**Movie exceeds current profile**

→ Settings → Maturity profiles → Family

**Manage lists**

→ Settings → My Lists

Deep links should be used throughout the application whenever users need to change permanent preferences.

---

# Navigation summary

## Discover

- Discovery filters
- From your lists
- Recommendation rows
- Movie details

## Search

- Recent searches
- Search results
- Collections
- Movie details

## Settings

- Profile
- Recovery token
- Streaming services
- Maturity profiles
- My Lists
- About

---

# Future opportunities

The architecture intentionally leaves room for future expansion.

Potential additions include:

- Mood-based discovery
- "Watching with..." recommendations
- Public curated lists
- Collaborative lists
- Friends
- Notifications
- AI-powered recommendations
- Better availability filters
- Watch history
- Recommendation explanations

None of these require changes to the primary navigation.

---

# Product summary

The redesigned Ohana experience revolves around three simple user intentions.

## Discover

> Help me decide what to watch.

Preference-aware recommendations powered by streaming availability and maturity profiles.

## Search

> Help me find something specific.

Fast, comprehensive search that always returns relevant titles while still showing compatibility and availability.

## Settings

> Help me configure Ohana.

A clean settings hub that summarizes the user's configuration and links to dedicated pages for streaming services, maturity profiles, lists and account settings.

---

The biggest conceptual change in this redesign is treating **lists as part of discovery rather than as a separate destination**.

Instead of maintaining two parallel browsing experiences, users first see content they've already saved through **From your lists**, then naturally continue exploring new recommendations.

The navigation is now organized around user intent:

- **Discover** → *I don't know what to watch yet.*
- **Search** → *I know what I'm looking for.*
- **Settings** → *I want to configure Ohana.*

Every design decision should support a single guiding principle:

> **Help people confidently choose the right movie or TV show for the moment, while respecting who they're watching with.**
