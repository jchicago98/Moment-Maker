// Generates the placeholder sound palette into assets/sounds/.
// Voice: soft flute for the pitched cues (cozy, airy — no white noise, no
// whooshes; see CLAUDE.md §4), woodblock for taps and knocks.
// NOTE: the pitched-note files keep their historical `marimba-XX.wav` names so
// the sound engine's imports stay stable; the voice inside is flute.
//
// Usage: node scripts/generate-sounds.mjs

import { Buffer } from 'node:buffer';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SR = 44100;
const MUSIC_SR = 22050; // soft pads don't need full rate; halves the file size
const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'sounds');

function writeWav(name, samples, sampleRate = SR) {
  const n = samples.length;
  const buf = Buffer.alloc(44 + n * 2);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + n * 2, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16); // PCM chunk size
  buf.writeUInt16LE(1, 20); // PCM format
  buf.writeUInt16LE(1, 22); // mono
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * 2, 28); // byte rate
  buf.writeUInt16LE(2, 32); // block align
  buf.writeUInt16LE(16, 34); // bits per sample
  buf.write('data', 36);
  buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    buf.writeInt16LE(Math.round(s * 32767), 44 + i * 2);
  }
  writeFileSync(join(OUT, name), buf);
  console.log(`  ${name} (${(buf.length / 1024).toFixed(1)} KB)`);
}

function silence(durationSec, sampleRate = SR) {
  return new Float32Array(Math.round(sampleRate * durationSec));
}

// A decaying sine partial — building block for struck/plucked sounds.
function addPartial(buf, freq, amp, tau, sampleRate = SR) {
  for (let i = 0; i < buf.length; i++) {
    const t = i / sampleRate;
    buf[i] += amp * Math.sin(2 * Math.PI * freq * t) * Math.exp(-t / tau);
  }
}

function attack(buf, ms = 2, sampleRate = SR) {
  const n = Math.round((sampleRate * ms) / 1000);
  for (let i = 0; i < n && i < buf.length; i++) buf[i] *= i / n;
}

function fadeTail(buf, ms = 15, sampleRate = SR) {
  const n = Math.round((sampleRate * ms) / 1000);
  for (let i = 0; i < n && i < buf.length; i++) {
    buf[buf.length - 1 - i] *= i / n;
  }
}

function normalize(buf, peak = 0.85) {
  let max = 0;
  for (const s of buf) max = Math.max(max, Math.abs(s));
  if (max === 0) return buf;
  for (let i = 0; i < buf.length; i++) buf[i] = (buf[i] / max) * peak;
  return buf;
}

// Soft flute: strong fundamental, weak upper harmonics, a breathy 12ms
// attack, gentle decay, and a hint of vibrato once the note settles.
function flute(freq, durationSec = 0.4) {
  const buf = silence(durationSec);
  for (let i = 0; i < buf.length; i++) {
    const t = i / SR;
    const vibrato = t > 0.08 ? 1 + 0.003 * Math.sin(2 * Math.PI * 5.2 * t) : 1;
    const phase = 2 * Math.PI * freq * vibrato * t;
    const envelope = Math.min(1, t / 0.012) * Math.exp(-t / 0.13);
    buf[i] =
      envelope *
      (Math.sin(phase) + 0.22 * Math.sin(2 * phase) + 0.07 * Math.sin(3 * phase));
  }
  fadeTail(buf, 20);
  return normalize(buf);
}

function woodblock(freq = 850) {
  const buf = silence(0.16);
  addPartial(buf, freq, 1.0, 0.045);
  addPartial(buf, freq * 2.1, 0.5, 0.028);
  attack(buf, 1);
  fadeTail(buf, 8);
  return normalize(buf);
}

// C major pentatonic across two octaves — any tick sequence sounds pleasant,
// and it lives inside the C-major music loops so ticks are always in key.
const PENTATONIC = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.26, 783.99, 880.0];

mkdirSync(OUT, { recursive: true });
console.log(`Writing sounds to ${OUT}`);

PENTATONIC.forEach((freq, i) => {
  writeWav(`marimba-${String(i).padStart(2, '0')}.wav`, flute(freq));
});

writeWav('woodblock.wav', woodblock(850)); // pickup tap
writeWav('knock.wav', woodblock(620)); // gift knocking from inside

// Reveal resolution: a soft C-major chord, flute voicing.
const chord = silence(1.8);
for (const freq of [261.63, 329.63, 392.0, 523.25]) {
  for (let i = 0; i < chord.length; i++) {
    const t = i / SR;
    const envelope = Math.min(1, t / 0.015) * Math.exp(-t / 0.55);
    chord[i] += 0.5 * envelope * (Math.sin(2 * Math.PI * freq * t) + 0.2 * Math.sin(4 * Math.PI * freq * t));
  }
}
fadeTail(chord, 60);
writeWav('chord.wav', normalize(chord));

// ---------------------------------------------------------------------------
// Background music: four Animal Crossing-flavored loops (morning / day /
// dusk / night) — a swung, whistle-like lead melody, a walking sine bass, and
// soft chord stabs on the offbeats. All in C major so the flute ticks are
// always in key. Notes render with wraparound (tails spill back to the loop
// start) so every loop is seamless.

const HZ = {
  C2: 65.41, D2: 73.42, E2: 82.41, F2: 87.31, G2: 98.0, A2: 110.0, B2: 123.47,
  C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196.0, A3: 220.0, B3: 246.94,
  C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.0, A4: 440.0, B4: 493.88,
  C5: 523.25, D5: 587.33, E5: 659.26, F5: 698.46, G5: 783.99, A5: 880.0,
};

const CHORDS = {
  C: ['C3', 'E3', 'G3'],
  F: ['F3', 'A3', 'C4'],
  G: ['G3', 'B3', 'D4'],
  Am: ['A3', 'C4', 'E4'],
  Em: ['E3', 'G3', 'B3'],
};

// Voices, all rendered with wraparound into the loop buffer.
function addVoice(buf, startSec, freq, amp, { tau, harmonics, vibrato = 0 }) {
  const start = Math.round(startSec * MUSIC_SR);
  const length = Math.round(MUSIC_SR * tau * 4);
  for (let i = 0; i < length; i++) {
    const t = i / MUSIC_SR;
    const wobble = vibrato > 0 && t > 0.09 ? 1 + vibrato * Math.sin(2 * Math.PI * 5.5 * t) : 1;
    const phase = 2 * Math.PI * freq * wobble * t;
    const envelope = Math.min(1, t / 0.015) * Math.exp(-t / tau);
    let sample = 0;
    for (let h = 0; h < harmonics.length; h++) {
      sample += harmonics[h] * Math.sin(phase * (h + 1));
    }
    buf[(start + i) % buf.length] += amp * envelope * sample;
  }
}

const LEAD = { tau: 0.32, harmonics: [1, 0.2, 0.06], vibrato: 0.004 }; // whistle-like
const BASS = { tau: 0.3, harmonics: [1, 0.08] };
const STAB = { tau: 0.12, harmonics: [1, 0.15] }; // muted pluck

// Swing: the "and" of each beat lands late (2:1-ish triplet feel).
function swing(beat) {
  const whole = Math.floor(beat);
  const frac = beat - whole;
  return frac === 0.5 ? whole + 0.66 : beat;
}

/**
 * Render one loop.
 * bars×4 beats at `bpm`; `progression` = one chord symbol per bar (bass walks
 * root→fifth, stabs hit beats 2 & 4); `melody` = [beat, note, amp] with beats
 * in eighth-note positions (swing applied automatically).
 */
function renderLoop(name, bpm, progression, melody, { leadAmp = 0.3, bassAmp = 0.26, stabAmp = 0.1 } = {}) {
  const beatSec = 60 / bpm;
  const bars = progression.length;
  const buf = silence(bars * 4 * beatSec, MUSIC_SR);

  progression.forEach((symbol, bar) => {
    const barStart = bar * 4;
    const [root, third, fifth] = CHORDS[symbol];
    // Walking bass: root, fifth, root, fifth (an octave below the chord tones).
    const rootHz = HZ[root] / 2;
    const fifthHz = HZ[fifth] / 2;
    addVoice(buf, barStart * beatSec, rootHz, bassAmp, BASS);
    addVoice(buf, (barStart + 1) * beatSec, fifthHz, bassAmp * 0.8, BASS);
    addVoice(buf, (barStart + 2) * beatSec, rootHz, bassAmp * 0.9, BASS);
    addVoice(buf, (barStart + 3) * beatSec, fifthHz, bassAmp * 0.8, BASS);
    // Chord stabs on 2 and 4.
    for (const beat of [1, 3]) {
      for (const tone of [root, third, fifth]) {
        addVoice(buf, (barStart + beat) * beatSec, HZ[tone], stabAmp, STAB);
      }
    }
  });

  for (const [beat, note, amp] of melody) {
    addVoice(buf, swing(beat) * beatSec, HZ[note], leadAmp * amp, LEAD);
  }

  writeWav(`${name}.wav`, normalize(buf, 0.5), MUSIC_SR); // quiet by design
}

// Morning: unhurried, rising, a little sleepy-sweet.
renderLoop('music-morning', 84, ['C', 'C', 'F', 'F', 'Am', 'F', 'C', 'G'], [
  [0, 'E4', 1], [1.5, 'G4', 0.8], [2, 'A4', 0.9], [3.5, 'G4', 0.7],
  [4, 'E4', 0.9], [6, 'D4', 0.8], [7, 'C4', 0.7],
  [8, 'F4', 1], [9.5, 'A4', 0.8], [10, 'C5', 0.9], [12, 'A4', 0.8], [14, 'G4', 0.7],
  [16, 'E4', 0.9], [17.5, 'C4', 0.7], [18, 'A3', 0.8], [20, 'C4', 0.8], [22, 'D4', 0.7],
  [24, 'E4', 1], [25.5, 'D4', 0.7], [26, 'C4', 0.8], [28, 'D4', 0.9], [29.5, 'B3', 0.7], [30, 'G3', 0.6],
]);

// Day: jaunty and syncopated — the errands-with-friends hour.
renderLoop('music-day', 104, ['C', 'G', 'F', 'C', 'C', 'G', 'F', 'G'], [
  [0, 'G4', 1], [0.5, 'A4', 0.7], [1, 'G4', 0.9], [2.5, 'E4', 0.8], [3, 'G4', 0.9],
  [4, 'B4', 0.9], [5.5, 'A4', 0.7], [6, 'G4', 0.8], [7.5, 'D4', 0.6],
  [8, 'A4', 1], [8.5, 'C5', 0.8], [9, 'A4', 0.9], [10.5, 'F4', 0.7], [11, 'A4', 0.8],
  [12, 'G4', 0.9], [13.5, 'E4', 0.7], [14, 'C4', 0.8],
  [16, 'E4', 0.9], [16.5, 'G4', 0.7], [17, 'C5', 1], [18.5, 'B4', 0.7], [19, 'G4', 0.8],
  [20, 'B4', 0.9], [21.5, 'G4', 0.7], [22, 'D4', 0.7],
  [24, 'A4', 0.9], [25, 'C5', 0.9], [26.5, 'A4', 0.7], [27, 'F4', 0.8],
  [28, 'G4', 1], [29.5, 'A4', 0.7], [30, 'B4', 0.8], [31, 'D5', 0.6],
], { leadAmp: 0.28 });

// Dusk: mellow, minor-leaning, golden-hour wistful.
renderLoop('music-dusk', 88, ['Am', 'Am', 'F', 'F', 'C', 'G', 'Am', 'Em'], [
  [0, 'A4', 0.9], [2, 'E4', 0.8], [3.5, 'D4', 0.6],
  [4, 'C4', 0.8], [6, 'E4', 0.7],
  [8, 'F4', 0.9], [10, 'A4', 0.8], [11.5, 'G4', 0.6],
  [12, 'E4', 0.8], [14, 'C4', 0.6],
  [16, 'E4', 0.9], [18, 'G4', 0.8], [19.5, 'E4', 0.6],
  [20, 'D4', 0.8], [22, 'B3', 0.7],
  [24, 'C4', 0.9], [26, 'A3', 0.7],
  [28, 'B3', 0.7], [30, 'E4', 0.6],
], { leadAmp: 0.26, stabAmp: 0.08 });

// Night: sparse and low — mostly space and starlight.
renderLoop('music-night', 66, ['Am', 'F', 'C', 'Em', 'Am', 'Em'], [
  [0, 'E4', 0.7], [3, 'C4', 0.5],
  [4, 'A3', 0.6], [7, 'C4', 0.4],
  [8, 'G3', 0.6], [11, 'E4', 0.4],
  [12, 'B3', 0.5],
  [16, 'A3', 0.6], [19, 'E3', 0.4],
  [20, 'G3', 0.5],
], { leadAmp: 0.24, bassAmp: 0.22, stabAmp: 0.06 });

console.log('Done.');
