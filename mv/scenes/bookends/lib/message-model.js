// Pixel cells breathe with the percussion. Notes hold beat offset, pulse strength and a small attack delay in milliseconds;
// one attack/decay envelope drives the cell size and its lavender illumination.
const SPB = 60 / 130;
const clamp = (x) => Math.max(0, Math.min(1, x));
const mix = (a, b, k) => a.map((v, i) => v + (b[i] - v) * k);
const INTRO_NOTES = [
  [1.0,2.968,-1],[2.0,3.884,-4],[3.0,4.318,-5],[4.0,4.178,0],[4.5,2.006,15],
  [5.0,2.604,0],[6.0,2.949,10],[7.0,4.542,5],[8.0,4.014,4],[8.25,1.812,2],
  [9.0,4.566,0],[10.0,3.842,-3],[11.0,3.125,-6]];
const REPRISE_NOTES = [
  [1.0,2.372,1],[2.5,2.022,-8],[3.0,2.239,11],[4.0,4.401,-4],[5.0,2.459,5],
  [7.0,2.283,0],[8.0,4.395,-10],[9.0,2.75,4],[10.0,1.994,-11],[11.0,1.954,4],
  [12.0,4.292,-10],[12.25,2.15,25],[13.0,2.353,-3],[15.0,2.293,6],[15.5,2.492,19],
  [16.0,4.209,-9],[17.0,2.241,4],[19.0,2.326,4],[20.0,4.468,0],[20.5,1.92,2],
  [21.0,2.901,4],[21.25,1.8,6],[22.0,1.936,6],[23.75,2.26,19],[24.0,3.968,2],
  [25.0,3.166,8],[25.5,4.263,-5],[25.75,3.054,6]];
const pulse = (age, rise, decay, power) => age <= 0 ? 0
  : Math.exp(-Math.pow(age / decay, power)) * (1 - Math.exp(-age / rise));
const beatPulse = (t) => {
  const age = ((t - 0.212) % SPB + SPB) % SPB;
  return Math.exp(-age / 0.12);
};

export function messageMotion(t, reprise) {
  const start = reprise ? 193.596615 : 22.365846;
  const notes = reprise ? REPRISE_NOTES : INTRO_NOTES;
  const age = Math.max(0, t - start);
  const opening = Math.exp(-Math.pow(age / (reprise ? 0.2948 : 0.2214), reprise ? 1.31 : 1.08));
  let energy = 0;
  for (const [beat, strength, delay] of notes) {
    const a = t - start - beat * SPB - delay / 1000 + (reprise ? 0.0108 : 0.0119);
    energy += strength * pulse(a, reprise ? 0.0124 : 0.0082, reprise ? 0.1554 : 0.164, reprise ? 1.06 : 1.1)
      / (reprise ? 0.7665 : 0.8394);
  }
  const floor = reprise ? 4.908 : 4.872;
  const swelling = energy + opening * (reprise ? 6.401 : 10.299);
  let size = floor + swelling;
  const drift = clamp(age / (reprise ? 12 : 5.5));
  const light = Math.exp(-Math.pow(age / (reprise ? 0.26286 : 0.12571), reprise ? 2.1206 : 0.9706));
  let color = reprise
    ? [88.739 + 6.287 * energy + 23.897 * light - 1.951 * drift,
       88.051 + 6.199 * energy + 23.519 * light - 2.296 * drift,
       112.426 + 7.165 * energy + 40.883 * light + 0.547 * drift]
    : [88.522 + 6.693 * energy + 104.685 * light + 1.809 * drift,
       88.097 + 6.497 * energy + 103.544 * light + 1.270 * drift,
       113.925 + 8.321 * energy + 139.793 * light + 1.659 * drift];
  if (!reprise && t >= 27.9) { size = 5.166; color = [97.55,97.04,121.12]; }
  if (reprise && t >= 205.6) { size = 9.497; color = [88.83,88.16,112.68]; }
  let binary = 0.04 + 0.1 * beatPulse(t);
  if (!reprise) {
    if (t < 22.4) binary = 0;
    else binary = Math.max(binary, Math.exp(-(t - 22.4) / 0.075));
  } else {
    if (t < 194.85) binary = 0;
    else if (t < 197.3) binary = 1;
    else binary = Math.max(binary, Math.exp(-(t - 197.3) / 0.073));
    if (t >= 205.65) binary = Math.max(binary, 0.63 * Math.exp(-(t - 205.65) / 0.07));
  }
  return { size, color, binary, energy };
}

const ramp = (t, start, duration) => {
  const u = clamp((t - start) / duration);
  return u * u * (3 - 2 * u);
};
const decay = (t, start, tau) => Math.exp(-Math.max(0, t - start) / tau);
const flash = (t, start, tau) => t < start ? 0 : decay(t, start, tau);
const white = [252,253,255], lavender = [116,117,252];

export function messagePalette(t, reprise, energy) {
  const beat = beatPulse(t);
  const globe = mix(lavender, white, decay(t, 24.25, 0.115));
  if (t > 24.6) for (let i = 0; i < 2; i++) globe[i] += 13 * beat + 1.2 * energy;
  const comp = mix([235,235,254], white, decay(t, 26.1, 0.11));
  if (t >= 27.9) for (let i = 0; i < 2; i++) comp[i] += 17 * decay(t, 27.9, 0.11);
  const pt = Math.min(t, 28.8167);
  let person = mix(white, [253,226,201], ramp(pt, 27.95, 0.21));
  person = mix(person, [255,239,220], 0.65 * flash(pt, 28.43, 0.08));
  person = mix(person, [249,234,250], 0.95 * Math.exp(-Math.pow((pt - 28.61) / 0.047, 2)));
  person = mix(person, [255,235,221], ramp(pt, 28.72, 0.09));
  const rperson = mix(white, [255,222,196], ramp(t, 205.64, 0.48));
  const violet = Math.exp(-Math.pow((t - 205.85) / 0.047, 2));
  for (let i = 0; i < 3; i++) rperson[i] += [-10,-8,30][i] * violet;
  let heart = mix([109,111,249], white, decay(t, 201.94, 0.085));
  if (t > 202.1 && t < 206.4) {
    const hit = 12 * beat + 3 * Math.sin((t - 202) * 2.1);
    heart[0] += hit; heart[1] += hit; heart[2] += 3 * beat;
    heart = mix(heart, [204,204,255], flash(t, 205.65, 0.08));
  }
  if (t >= 206.4) heart = [108,108,249.3];
  return {
    globe, comp, person: reprise ? rperson : person, heart,
    me: mix([204,204,252], white, decay(t, 24.2167, 0.075)),
    machine: mix([231,231,252], [250,250,255], decay(t, 26.0667, 0.09)),
    you: mix([253,229,217], [255,254,255], decay(t, 27.94, 0.075)),
  };
}

// A shrinking silhouette accelerates into its point while its centre follows a cubic ease.
export function personScale(t) {
  const age = Math.max(0, t - 28.821);
  return Math.exp(-5.852 * age - 3.043 * age * age - 7.186 * age ** 3);
}

// After the beam closes, a stationary phosphor dot holds, then loses its charge.
export function shutdownPoint(t) {
  const opening = ramp(t, 209.07, 0.65), fade = clamp((t - 209.75) / 0.05);
  const emission = (1 - fade) * 1.3 + fade * 0.87 * decay(t, 209.8, 0.72) * clamp((211.3 - t) / 0.5);
  const ring = t < 209.78 ? 0.095 : 0.16 * decay(t, 209.78, 0.7) * (1 - 0.6 * ramp(t, 210.2, 0.12));
  const halo = t < 209.78 ? 0.058 : 0.03 * decay(t, 209.78, 0.25) + 0.004 * ramp(t, 210.5, 0.5);
  const die = 1 - ramp(t, 211.1, 0.2);
  return [960, 5.68 - 0.12 * opening + 0.44 * fade, 3.69 + 0.15 * opening + 0.1 * fade,
    emission * 1.08, ring * die, halo * die];
}
