# CLAUDE.md — Moment Maker (working title)

> A playful mobile app that kills "what should we do today?" decision fatigue. Users flick through head-to-head idea cards, a meter "brews" their plan, and a gift bursts open to reveal a personalized experience plan. Every interaction teaches the algorithm who the user is.

This file is the source of truth for building the app. Read it fully before making changes. When in doubt, choose the more playful, cozier option.

---

## 1. Product vision

- The app generates **experience plans** (an evening, an afternoon, a date, a family outing) by having the user pick between two idea cards, repeated up to 5 rounds, then assembling a plan from what it learned.
- The emotional arc of every session: **playful choosing → mounting anticipation → ceremonial reveal**. This arc is sacred. Every feature should reinforce it.
- Tone: Animal Crossing warmth. Cozy, musical, tactile, never pushy. No dark patterns, no guilt notifications, no streak-shaming.
- The app must feel great **offline-first**. All personalization is local. No accounts required for v1.

## 2. Tech stack

- **Expo** (managed workflow, latest SDK) + **React Native** + **TypeScript** (strict mode).
- **expo-router** for navigation.
- **react-native-reanimated** + **react-native-gesture-handler** for all drag/throw/spring physics. Animations run on the UI thread — never animate via setState on JS thread.
- **zustand** for app state; **expo-sqlite** for the idea database, user profile, session logs, and history. AsyncStorage only for tiny flags/settings.
- **expo-audio** for sound playback; **expo-haptics** for tactile feedback.
- **expo-location** (coarse, with permission) + **Open-Meteo API** (free, no API key) for weather. Cache the forecast; degrade gracefully to indoor-only suggestions if permission denied or offline.
- Test continuously in **Expo Go** on a real device — the drag physics and sound cannot be evaluated in a simulator alone.

## 3. Design language (do not drift from this)

> **v3 (current)** — "Gazette · After Dark": an evening paper read by lamplight. Grown-up, editorial, warm-dark. Replaced the pastel v2 and the chunky candy v1.

- **Ground**: warm near-black `#191613`, flat, tinted almost imperceptibly by the time of day (`daypartGround` in `src/lib/theme.ts`). Status bar light.
- **Text**: cream `#EAE3D6` (headlines `#F0EADD`, secondary `#96897A`, faint `#6E675C`). **Accent**: ember red `#C25B4E` — links, stars, progress, active states.
- **Section inks**: every mood owns a muted editorial hue (`moodHue` in `src/lib/theme.ts` — cozy amber, active viridian, romantic wine, chill slate, …). An idea's ink comes from its first mood (`ideaHue`) and colors exactly two things: its watermark etching and its category line.
- **Idea etchings** (the signature visual): every idea carries its **own thin-line drawing** — a bike, a tent, a pancake stack — ghosted at ~10–13% opacity in its mood ink, bleeding off the card's bottom-right corner like pressed watermark paper (`IdeaEtching`, backed by the Lucide line-icon set via each idea's `icon` name; deep imports in `src/lib/icons.ts`). No emoji anywhere. User-added ideas pick their watermark from a curated shelf in Add idea.
- **Surfaces**: cards `#211E19` with 1px hairline borders `#37322A` and `overflow: hidden` (to crop the etching); horizontal rules `#322E27`. No shadows, no gradients — hairlines carry the depth. Radius 6 (cards/buttons, editorial and squared), 10 (wells, inputs).
- **Type**: serif display (**Fraunces**, bundled) for headlines and idea titles; italic serif for descriptions and asides; system sans for buttons/labels/meta. Small-caps utility labels (11px, +1.6 letter-spacing) for datelines, categories, round counters; tabular numerals on anything counted.
- **Layout signature**: the two picker cards are **dealt diagonally** with opposite ±4° tilts and an italic "— or —" between them. Tilt never exceeds 5° (legibility). Details live in the tap-to-peek modal.
- **Navigation**: bottom bar of small-caps text labels (Today · Ideas · Add · Journal · More) over a hairline; active = cream with a 2px ember underline. Hidden during quizzes/ceremonies.
- **Motion**: physics stays bouncy (throws, deal-ins, gift shake) but chrome is still — no idle pulsing. Respect the OS reduce-motion setting.
- Copy: warm, brief, lowercase-leaning for hints ("tap to read · throw to choose"); the scrapbook is called the **journal**.

## 4. Sound & haptics (core identity, not polish)

- **No white noise / whooshes.** The sound palette is **felt piano + a woody knock** — quiet, warm, lamplit, and **sparing**: sound marks decisive moments only.
- **Dragging is silent.** No ticks, no pickup tap — a light haptic is the only pickup feedback. The first sound a card makes is its throw-off.
- Locked-in throw = quick two-note felt-piano rise (brighter with harder flings). Deal-in = two quiet low notes. Reveal = ascending three notes resolving into a warm low chord.
- **Gift shake** = 3–4 quick woody knocks (the gift "knocking from inside").
- Haptics: light impact on pickup (silent), medium on throw, success notification on reveal. Scale haptic intensity with throw velocity where the platform allows.
- Background music: slow felt-piano **nocturnes** that change by time of day (morning / day / dusk / night). Placeholder loops generated by `scripts/generate-sounds.mjs`; quiet and toggleable. All sound has a global mute in settings.
- Implementation: pre-load short samples with expo-audio; do not synthesize at runtime. (Historical note: pitched-note files are named `marimba-XX.wav` from v1.)

## 5. Screens & flow

1. **Onboarding** (first launch only): a short, fun this-or-that quiz (6–8 picks, same card-throw mechanic) that seeds the preference profile so the very first real session already feels personal. Ask time-availability + group size + rough location permission here.
2. **Home / session setup**: pick who's playing (solo / partner / friends / family), how much time they have, and rough budget. Big friendly "Deal me in" button.
3. **Picker screen** (the core loop):
   - Two diagonal tilted cards, VS badge, round counter ("2 / 5").
   - **Cards are physically draggable.** Throw a card off-screen (velocity > threshold OR displacement > ~120pt) to lock it in; gentle release springs it back with a bounce.
   - The losing card fades, next pair deals in with sound.
   - "Just surprise me" pill button (dice icon) always visible — instantly auto-picks and fast-forwards.
   - **Brewing meter** pinned at the bottom: gift icon + "Your evening is brewing…" + progress bar that fills 1/N per pick. Max 5 rounds — never more (decision fatigue).
4. **Gift reveal screen** (full screen, the emotional climax):
   - "100% brewed / Your evening is ready", a breathing gift box, "Tap to open".
   - On tap: **quick 0.4s eager shake** (short — a long shake deflates anticipation), lid pops, confetti burst, box scales away.
   - The plan unfolds **card by card** (staggered slide-ups on an ascending melody): each step shows time, icon, title, one-line tip. Footer: total time / budget. "Start my evening" primary button.
5. **Plan view**: the active plan with steps, map links, a "swap this step" option (re-rolls one step using the algorithm), and a "we did it!" completion action.
6. **History / scrapbook**: past generated plans as a collection — date, plan summary, **1–5 star experience rating**, optional photo attached to completed plans. This should feel like a keepsake shelf, not a log table.
7. **Browse view**: ideas the user can explore directly (not algorithm-generated), with filters: budget tier, duration, group size, indoor/outdoor, energy level (chill ↔ active), **drivability toggle → distance radius; walking → walking distance**, accessibility needs, time of day. Weather-aware badge on outdoor ideas.
8. **Add your own idea**: simple form (title, tags via friendly chips, cost, duration, indoor/outdoor). User-added ideas enter the deck AND count as strong positive signals to the profile (see §7).
9. **Settings**: sound/music/haptics toggles, reduce motion, location permission, reset profile.

## 6. Data models (TypeScript)

```ts
type Mood = 'cozy' | 'active' | 'silly' | 'romantic' | 'adventurous' | 'creative' | 'chill' | 'social' | 'tasty';

interface Idea {
  id: string;
  title: string;
  description: string;
  moods: Mood[];              // 1–3 moods
  setting: 'indoor' | 'outdoor' | 'either';
  costTier: 0 | 1 | 2 | 3;    // free, $, $$, $$$
  durationMin: number;         // typical minutes
  groupFit: ('solo' | 'couple' | 'friends' | 'family')[];
  energy: 1 | 2 | 3;           // chill → active
  timeOfDay: ('morning' | 'afternoon' | 'evening' | 'night')[];
  weatherSensitive: boolean;   // true = needs decent weather if outdoor
  requiresTravel: boolean;
  icon: string;                // icon name for the card
  source: 'seed' | 'user';
  createdAt: string;
}

interface UserProfile {
  // one weight per attribute dimension, all initialized to 0, kept in [-1, 1]
  moodWeights: Record<Mood, number>;
  settingWeight: number;       // + = prefers outdoor, − = indoor
  costWeight: number;          // + = comfortable spending
  energyWeight: number;        // + = prefers active
  durationWeight: number;      // + = prefers longer experiences
  socialWeights: Record<'solo' | 'couple' | 'friends' | 'family', number>;
  timeOfDayWeights: Record<'morning' | 'afternoon' | 'evening' | 'night', number>;
  totalSessions: number;
  updatedAt: string;
}

interface PickEvent {
  id: string;
  sessionId: string;
  winnerId: string;
  loserId: string;
  throwVelocity: number;       // fun signal: confident flings vs hesitant drags
  timestamp: string;
}

interface ExperienceLog {
  id: string;
  planId: string;
  rating?: 1 | 2 | 3 | 4 | 5;
  completed: boolean;
  photoUri?: string;
  date: string;
}
```

## 7. The algorithm (read carefully — this is the heart of the app)

The founder is intentionally not prescribing an ML framework. Build the simplest thing that genuinely learns: a **content-based preference model** — every idea is a feature vector over the attributes above, and the user profile is a weight vector over the same space. No server, no training pipeline, fully local, explainable.

### 7.1 Learning rule — the algorithm learns on EVERY generation

**Non-negotiable requirement: every single time the user generates ideas, the algorithm must learn from it.** There is no "read-only" session. Concretely:

- **Each this-or-that pick is a pairwise preference.** On every throw: for each attribute where winner and loser differ, nudge the profile toward the winner's value and away from the loser's. Learning rate ~0.05 per pick. Where they share an attribute, apply a small reinforcement (~0.02). Clamp all weights to [-1, 1] and renormalize occasionally so no dimension runs away.
- **Fun extra signal**: scale the nudge slightly by throw velocity (a confident hard fling = ~1.25× learning rate; a hesitant slow drag-off = ~0.8×).
- **Post-experience ratings are the strongest signal.** A 4–5 star rating multiplies that idea's attribute nudges by ~3×; a 1–2 star rating applies a negative update of similar magnitude. Completion without rating = mild positive.
- **User-added ideas** (§5.8) are strong positive updates toward their attributes (~2× pick strength) — the user literally told us what they like.
- **Skips and "surprise me"** teach too: ideas repeatedly shown but never chosen decay slightly; "surprise me" outcomes that later get good ratings boost exploration confidence.
- **Recency matters**: apply a light time decay (e.g., multiply all weights by 0.995 per session) so the profile tracks who the user is *now*.
- Log every PickEvent to SQLite. The profile update runs synchronously at pick time (it is a few multiplications — it must never lag the throw animation).

### 7.2 Scoring & candidate selection

For each generation session:
1. **Hard-filter** the deck by context: available time, budget cap, group makeup, time of day, and weather (if an idea is outdoor + weatherSensitive and the cached forecast is bad, filter it out or swap to its indoor sibling).
2. **Score** remaining ideas: dot product of profile weights and the idea's feature vector, minus a **novelty penalty** for ideas shown in the last ~10 sessions, plus small random noise.
3. **Exploration**: with ~12% probability per pair slot, inject a wildcard idea from an under-explored attribute region. This prevents a filter bubble and keeps sessions surprising (surprise is the product).
4. **Informative pairing**: build the 5 pairs like a soft decision tree — pair ideas that *differ* on the profile's most uncertain dimensions (weights near 0), so each pick maximally teaches us. Later rounds narrow toward the emerging winner-space.
5. **Plan assembly**: after 5 picks, compose 2–3 complementary steps around the strongest signals (e.g., cozy+tasty picks → dinner-ish step + cozy wrap-up step), respecting the total time budget and logical ordering (outdoor/daylight steps first, wind-down last).
6. **The reveal must visibly reflect the session's picks.** The moment users learn "my choices mattered" is the retention engine. If they threw cozy cards all session, the plan must look cozy.

### 7.3 Cold start

- Onboarding quiz picks (§5.1) initialize the profile before the first real session.
- Until totalSessions ≥ 3, blend scores 50/50 with a global "crowd-pleaser" prior baked into the seed data (a `broadAppeal: 0–1` field is acceptable to add to Idea).

## 8. Seed idea database

**On project setup, generate 120+ seed ideas** into `assets/seedIdeas.json` conforming exactly to the `Idea` schema. Requirements for the generated set:

- Broad coverage across every mood, cost tier, duration bucket (30 min → full day), group type, indoor/outdoor, and energy level — the learning algorithm needs a diverse space to explore.
- Titles must be **specific and charming**, not generic ("Midnight pancake experiment", not "Cook food"). Every idea gets a one-sentence description with one insider tip.
- Include weather-sensitive outdoor ideas AND an indoor sibling where natural.
- Nothing requiring specific local venues (the seed set must work in any city); location-specific discovery is a later feature.

Style reference — the first 10 seeds (generate the rest in this spirit):

```json
[
  { "id": "seed-001", "title": "Backyard blanket fort movie night", "description": "Build it ridiculous. String lights mandatory, structural integrity optional.", "moods": ["cozy", "silly"], "setting": "either", "costTier": 0, "durationMin": 120, "groupFit": ["couple", "family", "friends"], "energy": 1, "timeOfDay": ["evening", "night"], "weatherSensitive": true, "requiresTravel": false, "icon": "tent", "source": "seed", "createdAt": "2026-07-07" },
  { "id": "seed-002", "title": "Neighborhood photo scavenger hunt", "description": "Ten prompts, one hour, most creative shot wins dessert.", "moods": ["active", "creative", "silly"], "setting": "outdoor", "costTier": 0, "durationMin": 60, "groupFit": ["couple", "friends", "family"], "energy": 2, "timeOfDay": ["afternoon", "evening"], "weatherSensitive": true, "requiresTravel": false, "icon": "map-search", "source": "seed", "createdAt": "2026-07-07" },
  { "id": "seed-003", "title": "Midnight pancake experiment", "description": "One normal batch, one chaos batch. Rank them without mercy.", "moods": ["silly", "tasty", "cozy"], "setting": "indoor", "costTier": 1, "durationMin": 45, "groupFit": ["solo", "couple", "friends"], "energy": 1, "timeOfDay": ["night"], "weatherSensitive": false, "requiresTravel": false, "icon": "egg", "source": "seed", "createdAt": "2026-07-07" },
  { "id": "seed-004", "title": "Stargazing with hot cocoa", "description": "Download a star map app first. Marshmallow ratio: excessive.", "moods": ["calm", "cozy", "romantic"], "setting": "outdoor", "costTier": 1, "durationMin": 60, "groupFit": ["solo", "couple", "family"], "energy": 1, "timeOfDay": ["night"], "weatherSensitive": true, "requiresTravel": false, "icon": "moon-stars", "source": "seed", "createdAt": "2026-07-07" },
  { "id": "seed-005", "title": "Thrift store outfit challenge", "description": "Fixed budget, 30 minutes, dress each other. Dinner in the results.", "moods": ["silly", "creative", "social"], "setting": "indoor", "costTier": 1, "durationMin": 90, "groupFit": ["couple", "friends"], "energy": 2, "timeOfDay": ["afternoon"], "weatherSensitive": false, "requiresTravel": true, "icon": "shirt", "source": "seed", "createdAt": "2026-07-07" },
  { "id": "seed-006", "title": "DIY pizza showdown", "description": "Same dough, secret toppings. Blind taste test decides the champion.", "moods": ["tasty", "social", "creative"], "setting": "indoor", "costTier": 2, "durationMin": 90, "groupFit": ["couple", "family", "friends"], "energy": 2, "timeOfDay": ["evening"], "weatherSensitive": false, "requiresTravel": false, "icon": "pizza", "source": "seed", "createdAt": "2026-07-07" },
  { "id": "seed-007", "title": "Sunset bike loop", "description": "Route ends somewhere with a view. Golden hour does the rest.", "moods": ["active", "adventurous"], "setting": "outdoor", "costTier": 0, "durationMin": 60, "groupFit": ["solo", "couple", "friends"], "energy": 3, "timeOfDay": ["evening"], "weatherSensitive": true, "requiresTravel": false, "icon": "bike", "source": "seed", "createdAt": "2026-07-07" },
  { "id": "seed-008", "title": "Board game tournament, bracket and all", "description": "Draw an actual bracket. Loser of each round narrates the next one.", "moods": ["cozy", "social", "silly"], "setting": "indoor", "costTier": 0, "durationMin": 120, "groupFit": ["family", "friends"], "energy": 1, "timeOfDay": ["evening", "night"], "weatherSensitive": false, "requiresTravel": false, "icon": "dice-5", "source": "seed", "createdAt": "2026-07-07" },
  { "id": "seed-009", "title": "Living room karaoke hour", "description": "Phone in a cup is the microphone. Ballads earn double points.", "moods": ["silly", "social"], "setting": "indoor", "costTier": 0, "durationMin": 60, "groupFit": ["couple", "family", "friends"], "energy": 2, "timeOfDay": ["evening", "night"], "weatherSensitive": false, "requiresTravel": false, "icon": "microphone-2", "source": "seed", "createdAt": "2026-07-07" },
  { "id": "seed-010", "title": "Mystery cookie bake-off", "description": "Each baker adds one secret ingredient. Confess only after tasting.", "moods": ["tasty", "silly", "creative"], "setting": "indoor", "costTier": 1, "durationMin": 90, "groupFit": ["couple", "family", "friends"], "energy": 1, "timeOfDay": ["afternoon", "evening"], "weatherSensitive": false, "requiresTravel": false, "icon": "cookie", "source": "seed", "createdAt": "2026-07-07" }
]
```

(Note: "calm" appears above — add it to the `Mood` union. Extend moods if the seed set needs it, but keep the total mood vocabulary ≤ 12 so the profile stays learnable.)

## 9. Weather integration

- Fetch a same-day + next-day forecast from Open-Meteo using coarse coordinates; cache for 3 hours.
- The algorithm's hard filter (§7.2.1) consumes it. Outdoor cards in the picker show a tiny live weather chip ("72° clear").
- If permission is denied or the fetch fails, silently behave as "weather unknown": don't exclude outdoor ideas, just drop the chip. Never block a session on weather.

## 10. Engineering guidelines

- File structure: `app/` (expo-router screens), `components/`, `lib/algorithm/` (scoring, learning, pairing — pure functions, fully unit-tested), `lib/audio/`, `lib/db/`, `assets/`.
- The algorithm module must be **pure TypeScript with zero React imports** and covered by unit tests (pick updates, decay, filtering, pairing informativeness, plan assembly under time budgets).
- 60fps is a requirement on the picker screen. All gesture-driven transforms via Reanimated worklets. Test throws on a mid-range Android device, not just an iPhone.
- Generous touch targets on tilted cards (the full card is the target, min 44pt everywhere else).
- Accessibility: reduce-motion swaps throws for a tap-to-pick fallback; all sound optional; labels on every interactive element.
- Privacy: everything stays on-device in v1. No analytics SDKs. Location is coarse and used only for weather.
- Commit style: small, working increments. The app should boot and demo the core loop at the end of every work session.

## 11. Build order (suggested milestones)

1. **M1 — Core loop skeleton**: Expo project, seed data generated + loaded into SQLite, static picker screen with tap-to-pick, brewing meter, hardcoded reveal.
2. **M2 — Physics & sound**: drag/throw with Reanimated + gesture-handler, velocity-scaled marimba ticks, haptics, gift shake + confetti reveal.
3. **M3 — The algorithm**: profile model, learning on every pick, filtering/scoring/pairing, plan assembly, onboarding quiz. Ratings feed back in.
4. **M4 — The rest of the app**: history scrapbook with ratings + photos, browse/filter view, add-your-own-idea, weather integration, settings.
5. **M5 — Juice pass**: time-of-day theming + music, micro-animations, copy polish, empty states, reduce-motion fallbacks.