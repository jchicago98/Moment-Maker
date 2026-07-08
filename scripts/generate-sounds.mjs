// Generates the placeholder sound palette into assets/sounds/.
// Marimba + soft woodblock only (see CLAUDE.md §4 — no white noise, no whooshes).
// These are additive-synth placeholders; swap for recorded samples in the juice pass.
//
// Usage: node scripts/generate-sounds.mjs

import { Buffer } from 'node:buffer';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SR = 44100;
const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'sounds');

function writeWav(name, samples) {
  const n = samples.length;
  const buf = Buffer.alloc(44 + n * 2);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + n * 2, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16); // PCM chunk size
  buf.writeUInt16LE(1, 20); // PCM format
  buf.writeUInt16LE(1, 22); // mono
  buf.writeUInt32LE(SR, 24);
  buf.writeUInt32LE(SR * 2, 28); // byte rate
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

function silence(durationSec) {
  return new Float32Array(Math.round(SR * durationSec));
}

// A decaying sine partial — the building block of struck-bar sounds.
function addPartial(buf, freq, amp, tau) {
  for (let i = 0; i < buf.length; i++) {
    const t = i / SR;
    buf[i] += amp * Math.sin(2 * Math.PI * freq * t) * Math.exp(-t / tau);
  }
}

function attack(buf, ms = 2) {
  const n = Math.round((SR * ms) / 1000);
  for (let i = 0; i < n && i < buf.length; i++) buf[i] *= i / n;
}

function fadeTail(buf, ms = 15) {
  const n = Math.round((SR * ms) / 1000);
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

// Marimba bars have inharmonic partials near 1×, ~3.9×, ~9.2× the fundamental.
function marimba(freq, durationSec = 0.7) {
  const buf = silence(durationSec);
  addPartial(buf, freq, 1.0, 0.28);
  addPartial(buf, freq * 3.93, 0.3, 0.09);
  addPartial(buf, freq * 9.2, 0.1, 0.04);
  attack(buf, 2);
  fadeTail(buf);
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

// C major pentatonic across two octaves — any tick sequence sounds pleasant.
// (When background music lands in M5, tick pitches quantize to its key.)
const PENTATONIC = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.26, 783.99, 880.0];

mkdirSync(OUT, { recursive: true });
console.log(`Writing sounds to ${OUT}`);

PENTATONIC.forEach((freq, i) => {
  writeWav(`marimba-${String(i).padStart(2, '0')}.wav`, marimba(freq));
});

writeWav('woodblock.wav', woodblock(850)); // pickup tap
writeWav('knock.wav', woodblock(620)); // gift knocking from inside

// Reveal resolution: a soft C-major chord with marimba voicing.
const chord = silence(1.8);
for (const freq of [261.63, 329.63, 392.0, 523.25]) {
  addPartial(chord, freq, 0.5, 0.5);
  addPartial(chord, freq * 3.93, 0.1, 0.12);
}
attack(chord, 4);
fadeTail(chord, 60);
writeWav('chord.wav', normalize(chord));

console.log('Done.');
