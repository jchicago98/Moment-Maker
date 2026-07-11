# Moment Maker

A playful mobile app that kills "what should we do today?" decision fatigue. Flick through head-to-head idea cards, watch your moment brew, and open the gift to reveal one idea made just for you.

See [CLAUDE.md](./CLAUDE.md) for the full product spec, design language, and build order.

## Status

**M1–M5 complete** ✅ · **UX revamp v2** ✅ · **Scheduling** ✅ · **Design v3 "Gazette · After Dark"** ✅ · **Idea etchings + journal notes** ✅

Latest round (idea etchings, chosen from a treatment mockup board):

- **Idea etchings**: every idea carries its own ghosted thin-line drawing (a bike, a tent, a pancake stack — Lucide icons keyed off each idea's `icon` name), tinted in a per-mood editorial hue (`moodHue`), bleeding off the card corner like a watermark. Applied across picker, browse, detail modal, reveal, home, and journal; the mood hue also inks each idea's category line. No emoji anywhere; Add idea picks a watermark from a curated shelf with a live preview
- **Silent drags**: no more ticks or pickup taps — the first sound a card makes is its throw-off. Deal-in, gift knocks, reveal chord, and the nocturne loops remain
- **Journal**: entries show the date *and time* they happened, open into a sheet with editable stars, photo, and a written note "for future you," and can be removed (torn out) with confirmation
- Fixed: home's pending-moment eyebrow was hardcoded "This evening" — it now derives from the schedule ("This morning", "Tonight", "Tomorrow", "For Saturday", or "Up next")

Design v3 (previous round):

- **Dark editorial restyle app-wide**: warm near-black ground (subtly tinted by the hour), cream serif headlines (Fraunces, bundled), hairline-bordered cards, one ember-red accent, small-caps labels, tabular numerals. Emoji demoted to small glyphs in dark wells on list rows; picker cards are text-only (category line · serif title · italic tip)
- **Text-label tab bar** (Today · Ideas · Add · Journal · More) with an ember underline; the scrapbook is now the **Journal**
- **Felt-piano sound**: soft damped notes replace the marimba/flute ticks (rate + pitch still scale with throw velocity), a low felt tap on pickup, a warm low chord on reveal; background music is now four slow felt-piano **nocturnes** cycling with the daypart
- Everything else unchanged: throw physics, tap-to-peek modal, scheduling ("Today · 7:30 PM", edit time, mark as done, check-in after the scheduled hour), All/My-ideas shelves, emoji icon picker, weather, and the learning algorithm

- Expo (SDK 57) + expo-router + TypeScript strict; 130 seed ideas in `assets/seedIdeas.json`, loaded into SQLite on first launch
- **Bottom tab bar** (Home · Browse · Add idea · Scrapbook · Settings), hidden during onboarding/setup/picker/reveal
- **State-driven home**: "What should we do today?" prompt (Help me pick / I'll browse) — or, when a moment is planned, that moment front and center, flipping to a "So… did it happen?" check-in after ~3 hours / the next day
- **Setup step**: who / time / budget chips → "Deal me in 🃏"
- **Picker**: physically throwable cards (velocity or ~120pt locks in), tap opens a **detail modal** (full description + attribute chips + "Pick this one"), velocity-scaled **flute ticks** on a pentatonic scale, brew meter with 5 spring-fill segments and a **percentage**
- **Single-idea reveal**: gift shake → confetti → ONE freshly generated idea (never one you just saw), chosen by the post-session profile; "Let's do it!" / one-time "Maybe another" / "Not tonight"
- **Confirmed-only scrapbook**: moments land on the shelf only after you tell us they happened — stars (3× learning on first rating), photos copied into app storage
- **The algorithm** (`src/lib/algorithm/`, pure TS, 42 unit tests — `npm test`): learns on every pick (velocity-scaled), hard filter → scoring with cold-start blend + novelty penalties, informative pairing with 12% exploration wildcards, final-idea generation (multi-step plan assembly kept in the lib for a possible future mode)
- **Browse**: collapsible filter panel with **multi-select moods & times of day**, single caps for budget/length, walking-distance toggle, 2-column candy grid, weather badges
- **Music**: four Animal Crossing-flavored loops (swung whistle lead, walking bass, offbeat chord stabs) cycling morning/day/dusk/night, in C major so ticks stay in key; behind the global mute + its own toggle
- Weather (Open-Meteo, coarse location, 3h cache), onboarding quiz, time-of-day canvas theming, reduce-motion fallbacks throughout

## Backlog (post-v1 ideas)

- Recorded flute/woodblock samples + music to replace the synth placeholders
- A true deep-blue night palette (needs dark variants of ink, chips, and cards)
- Accessibility-needs filter in browse (needs a field on the `Idea` schema)
- Location-specific idea discovery

## Run it

```bash
npm install
npx expo start
```

Scan the QR code with **Expo Go** on a real device — the card feel can't be judged in a simulator.

## Structure

- `src/app/(tabs)/` — tabbed screens (home, browse, add-idea, scrapbook, settings)
- `src/app/` — quiz & ceremony screens (onboarding, setup, picker, reveal)
- `src/components/` — DraggableIdeaCard, IdeaDetailModal, VsBadge, BrewMeter, chips & buttons
- `src/lib/algorithm/` — learning, scoring, pairing, final-idea generation (pure TS, tested)
- `src/lib/db/` — expo-sqlite schema, seed loading, moments
- `src/lib/store/` — zustand session state
- `assets/seedIdeas.json` — the seed idea database
- `scripts/generate-sounds.mjs` — regenerates the placeholder sound palette
