# Moment Maker

A playful mobile app that kills "what should we do today?" decision fatigue. Flick through head-to-head idea cards, watch your plan brew, and open the gift to reveal a personalized experience plan.

See [CLAUDE.md](./CLAUDE.md) for the full product spec, design language, and build order.

## Status

**M1 — core loop skeleton** ✅

- Expo (SDK 57) + expo-router + TypeScript strict
- 130 seed ideas generated into `assets/seedIdeas.json` and loaded into SQLite on first launch
- Home screen: who's playing / time / budget → "Deal me in"
- Picker screen: diagonal tilted cards, VS badge, round counter, tap-to-pick, "Just surprise me", brewing meter
- Gift reveal: breathing gift box, 0.4s eager shake, plan unfolds card by card (assembled from the session's winners)

Coming next (M2): drag/throw physics, velocity-scaled marimba ticks, haptics polish, confetti.

## Run it

```bash
npm install
npx expo start
```

Scan the QR code with **Expo Go** on a real device — the card feel can't be judged in a simulator.

## Structure

- `src/app/` — expo-router screens (home → picker → reveal)
- `src/components/` — IdeaCard, VsBadge, BrewMeter, chips & buttons
- `src/lib/db/` — expo-sqlite schema + seed loading
- `src/lib/store/` — zustand session state (pairs, picks, plan assembly)
- `assets/seedIdeas.json` — the seed idea database
