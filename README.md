# TLINH Tarot

A bilingual, browser-only Tarot reflection experience. The project uses plain HTML, CSS, and JavaScript; it has no build step, account, API key, or external service dependency.

## Run it

Open `index.html` in a current desktop or mobile browser. If the browser restricts local file behavior, serve this folder with any static file server and open the resulting local address. No package installation is required.

## Features

- 78 Rider–Waite–Smith inspired cards, with English and Vietnamese names, keywords, upright and reversed meanings, symbols, lessons, and topic lenses.
- One, three, five, seven, and Celtic Cross readings. Three-card readings include four position layouts.
- Shuffling, card-by-card reveal, contextual reflection, and orientation-preserving saved entries.
- Searchable and filterable card library with local favorites.
- Private journal with notes, mood, search, JSON import, and JSON export.
- Learning center, Vietnamese and English interface, keyboard focus states, responsive layout, and reduced-motion support.
- ChatGPT prompt builder that uses the current reading. TLINH does not call an AI service; opening ChatGPT is a user-initiated external action.

## Local data

Journal entries and favorites use this browser's `localStorage`. They do not sync between browsers or devices. Clearing browser site data removes them. Export a JSON backup from the Journal section before moving browsers.

## Checks

With Node.js installed, run these commands from this folder:

```text
node --check app.js
node --check deck.js
node tests/dom-check.cjs
```

The dependency-free DOM harness exercises all spread sizes and three-card layouts, current-reading prompt contents, library filters/favorites/details, both languages, and journal save/edit/search/import/export/delete paths. It checks application behavior without rendering a real browser window, so use a desktop and mobile browser for final visual review.

## Project files

- `index.html` — page structure and accessible controls.
- `styles.css` — responsive, reduced-motion-aware visual design.
- `deck.js` — offline card meanings and metadata.
- `app.js` — reading, library, prompt, language, and journal behavior.

The card faces use original, locally generated SVG symbolism that varies by card and suit. The project does not bundle Rider–Waite–Smith card scans.
