// Generates the placeholder sound palette into assets/sounds/.
// Voice: felt piano — soft-attack, damped, dark — plus a woody knock for the
// gift. Lamplit and quiet (see CLAUDE.md §4).
// NOTE: the pitched-note files keep their historical `marimba-XX.wav` names so
// the sound engine's imports stay stable; the voice inside is felt piano.
//
// Usage: node scripts/generate-sounds.mjs

import { Buffer } from 'node:buffer';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SR = 44100;
const MUSIC_SR = 22050; // quiet piano sketches don't need full rate
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

// Felt piano: 6ms soft attack, damped fundamental with weak upper partials,
// slight string inharmonicity, highs rolled off. Warm, close-mic'd, quiet.
const FELT_PARTIALS = [
  [1, 1.0, 0.5],
  [2, 0.32, 0.24],
  [3, 0.1, 0.14],
  [4, 0.03, 0.09],
];

function feltInto(buf, startSec, freq, amp, sampleRate, tauScale = 1) {
  const start = Math.round(startSec * sampleRate);
  const length = Math.min(buf.length, Math.round(sampleRate * 0.55 * tauScale * 4));
  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    const attackEnv = Math.min(1, t / 0.006);
    let sample = 0;
    for (const [n, pAmp, pTau] of FELT_PARTIALS) {
      const partialFreq = freq * n * (1 + 0.0004 * n * n); // string stiffness
      sample += pAmp * Math.sin(2 * Math.PI * partialFreq * t) * Math.exp(-t / (pTau * tauScale));
    }
    buf[(start + i) % buf.length] += amp * attackEnv * sample;
  }
}

function felt(freq, durationSec = 0.9, tauScale = 1) {
  const buf = silence(durationSec);
  feltInto(buf, 0, freq, 1, SR, tauScale);
  fadeTail(buf, 25);
  return normalize(buf, 0.8);
}

// The gift still knocks in wood.
function woodblock(freq = 620) {
  const buf = silence(0.16);
  for (let i = 0; i < buf.length; i++) {
    const t = i / SR;
    buf[i] =
      Math.sin(2 * Math.PI * freq * t) * Math.exp(-t / 0.05) +
      0.45 * Math.sin(2 * Math.PI * freq * 2.1 * t) * Math.exp(-t / 0.03);
  }
  for (let i = 0; i < 44 && i < buf.length; i++) buf[i] *= i / 44; // 1ms attack
  fadeTail(buf, 8);
  return normalize(buf);
}

// C major pentatonic across two octaves — any velocity-scaled tick sequence
// sounds pleasant, and it sits inside the C-family nocturne loops.
const PENTATONIC = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.26, 783.99, 880.0];

mkdirSync(OUT, { recursive: true });
console.log(`Writing sounds to ${OUT}`);

PENTATONIC.forEach((freq, i) => {
  writeWav(`marimba-${String(i).padStart(2, '0')}.wav`, felt(freq));
});

writeWav('woodblock.wav', felt(110, 0.45, 0.5)); // pickup: low felt tap (A2)
writeWav('knock.wav', woodblock(620)); // gift knocking from inside

// Reveal resolution: a warm low felt-piano chord.
const chord = silence(2.6);
for (const freq of [130.81, 164.81, 196.0, 261.63]) {
  feltInto(chord, 0, freq, 0.5, SR, 2.4);
}
fadeTail(chord, 120);
writeWav('chord.wav', normalize(chord, 0.8));

// ---------------------------------------------------------------------------
// Background music: four slow felt-piano nocturne sketches (morning / day /
// dusk / night). Sparse low chords with occasional single-note phrases, all in
// the C-major family so the ticks are always in key. Notes render with
// wraparound so every loop is seamless. Quiet by design.

const HZ = {
  C2: 65.41, E2: 82.41, F2: 87.31, G2: 98.0, A2: 110.0,
  C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196.0, A3: 220.0, B3: 246.94,
  C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.0, A4: 440.0,
  C5: 523.25, D5: 587.33, E5: 659.26,
};

const CHORDS = {
  C: ['C2', 'G2', 'E3'],
  F: ['F2', 'C3', 'A3'],
  G: ['G2', 'D3', 'B3'],
  Am: ['A2', 'E3', 'C4'],
  Em: ['E2', 'B3', 'G3'],
};

/**
 * One nocturne: `bars` bars of 4 beats at `bpm`; a low felt chord opens each
 * bar; `phrase` = [beat, note, amp] single melody notes floating above.
 */
function renderNocturne(name, bpm, progression, phrase, { chordAmp = 0.22, leadAmp = 0.3 } = {}) {
  const beatSec = 60 / bpm;
  const buf = silence(progression.length * 4 * beatSec, MUSIC_SR);

  progression.forEach((symbol, bar) => {
    const tones = CHORDS[symbol];
    tones.forEach((tone, i) => {
      // Gently rolled chord: each tone lands a hair after the last.
      feltInto(buf, (bar * 4 + i * 0.06) * beatSec, HZ[tone], chordAmp, MUSIC_SR, 3.2);
    });
  });

  for (const [beat, note, amp] of phrase) {
    feltInto(buf, beat * beatSec, HZ[note], leadAmp * amp, MUSIC_SR, 2.2);
  }

  writeWav(`${name}.wav`, normalize(buf, 0.45), MUSIC_SR);
}

// Morning: unhurried, major, first-coffee light.
renderNocturne('music-morning', 60, ['C', 'F', 'C', 'G', 'C', 'F', 'Am', 'G'], [
  [1.5, 'E4', 0.9], [3, 'G4', 0.7],
  [6, 'A4', 0.8], [7.5, 'G4', 0.6],
  [9.5, 'E4', 0.8],
  [13, 'D4', 0.7], [14.5, 'C4', 0.6],
  [17.5, 'G4', 0.8], [19, 'E4', 0.6],
  [22, 'A4', 0.7],
  [25.5, 'C5', 0.7], [27, 'A4', 0.5],
  [29.5, 'D4', 0.7], [31, 'B3', 0.5],
]);

// Day: a touch more movement, still soft.
renderNocturne('music-day', 66, ['C', 'Am', 'F', 'G', 'C', 'Am', 'F', 'G'], [
  [1, 'G4', 0.8], [2, 'E4', 0.6], [3, 'C4', 0.5],
  [5, 'A4', 0.7], [6.5, 'E4', 0.5],
  [9, 'F4', 0.7], [10.5, 'A4', 0.6], [11.5, 'C5', 0.5],
  [13, 'G4', 0.7], [15, 'D4', 0.5],
  [17, 'E4', 0.7], [18.5, 'G4', 0.6],
  [21, 'C4', 0.6],
  [25, 'A4', 0.7], [26.5, 'F4', 0.5],
  [29, 'D4', 0.6], [30.5, 'G4', 0.5],
], { leadAmp: 0.28 });

// Dusk: minor-leaning, golden-hour wistful.
renderNocturne('music-dusk', 58, ['Am', 'F', 'C', 'Em', 'Am', 'F', 'G', 'Em'], [
  [1.5, 'E4', 0.8], [3.5, 'C4', 0.6],
  [6, 'A3', 0.7],
  [9.5, 'G4', 0.7], [11, 'E4', 0.5],
  [13.5, 'B3', 0.6],
  [17.5, 'C4', 0.7], [19, 'E4', 0.5],
  [22, 'A3', 0.6],
  [25.5, 'D4', 0.7],
  [29.5, 'E4', 0.5],
], { leadAmp: 0.26 });

// Night: barely there — low chords and a few distant notes.
renderNocturne('music-night', 52, ['Am', 'Em', 'F', 'Em', 'Am', 'Em'], [
  [2, 'E3', 0.6],
  [7, 'A3', 0.5],
  [11, 'C4', 0.45],
  [15, 'B3', 0.4],
  [19, 'E4', 0.4],
], { chordAmp: 0.2, leadAmp: 0.24 });

console.log('Done.');
