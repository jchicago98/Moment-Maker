// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*"],
  },
  {
    // Reanimated gesture/animation choreography: shared values are mutated
    // from worklets and press handlers by design, and confetti randomness is
    // deliberately impure. These components carry 'use no memo' so the React
    // Compiler skips them; the compiler-derived lint rules don't honor the
    // directive, so silence them here (and only here).
    files: [
      "src/components/DraggableIdeaCard.tsx",
      "src/components/ConfettiBurst.tsx",
      "src/app/reveal.tsx",
    ],
    rules: {
      "react-hooks/immutability": "off",
      "react-hooks/purity": "off",
    },
  },
  {
    // ideaIcon() is a static Record lookup, not a component factory — the
    // returned Lucide component is module-stable, so rendering it is safe.
    // The rule can't see through the lookup.
    files: ["src/components/IdeaEtching.tsx"],
    rules: {
      "react-hooks/static-components": "off",
    },
  },
]);
