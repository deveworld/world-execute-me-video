import { rng } from '../../../engine/lib/anim.js';

// Refreshes include key repeats and terminal redraws as well as the normal sampling clock.
export const REFRESH_FRAMES = [9761, 9768, 9774, 9781, 9788, 9792, 9795, 9799, 9802, 9806, 9809,
  9813, 9816, 9819, 9823, 9826, 9830, 9833, 9837, 9840, 9844, 9847, 9851, 9854, 9858, 9861,
  9864, 9868, 9871, 9875, 9878, 9882, 9885, 9892, 9899, 9906, 9913, 9920, 9924, 9954, 9961,
  9968, 9975, 9982, 9989, 9996, 10003, 10010, 10017, 10024, 10031, 10038, 10044, 10051,
  10058, 10065, 10072, 10079, 10086, 10093, 10100, 10107, 10114, 10121, 10128, 10134,
  10141, 10148, 10155, 10162, 10169, 10174, 10176, 10183, 10190, 10197];

const NAMES = ['me', 'params', 'world', 'title', 'seq', 'drop1', 'verse1', 'current', 'vision', 'epoch',
  'inspiral', 'sims', 'tetris', 'chorus1', 'eggplant', 'tomato', 'tabby', 'verse2', 'breakdown', 'ampm',
  'roles', 'trance', 'bridge', 'left', 'defrag', 'hearts', 'sudo', 'interlude', 'globe', 'life',
  'prechorus', 'countdown', 'htop'];
const round = (x) => Math.round(x);
const cpuTime = (seconds) => {
  const cs = Math.round(seconds * 100);
  return `${Math.floor(cs / 6000)}:${String(Math.floor(cs / 100) % 60).padStart(2, '0')}.${String(cs % 100).padStart(2, '0')}`;
};
const uptime = (seconds) => `00:${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(Math.floor(seconds) % 60).padStart(2, '0')}`;
const RESOURCES = { killed: 9982 / 60, zombie: 9954 / 60, threads: 10155 / 60 };

// Processes draw allocations from a few memory classes and retain them for their lifetime.
// CPU counters integrate scheduled quanta, with the renderer always runnable and background
// processes waking in brief batches. After termination, allocations return to the allocator;
// the surviving process gradually claims them again and eventually starts seven workers.
export function createSystem() {
  const random = rng(7331);
  const procs = NAMES.map((name, i) => {
    if (i === 0) return [1, name, '12.3G', '612M', '38912', '3.8'];
    if (i === 32) return [33, name, '11272', '5248', '3840', '0.0'];
    const virt = round(1100 + random() * 2400);
    const resident = random() < 0.24 ? round(105 + random() * 84) * 1024 : round(30000 + random() * 65000);
    const shared = round(10500 + random() * 39000);
    const res = resident >= 100 * 1024 ? `${round(resident / 1024)}M` : String(resident);
    return [i + 1, name, `${virt}M`, res, String(shared), (resident / (15.5 * 1024 * 1024) * 100).toFixed(1)];
  });
  const counters = NAMES.map((_, i) => i === 0 ? 162.60 : i === 32 ? 0.01
    : (i % 8 === 6 ? 14.78 : i % 4 === 1 && i > 4 ? 7.38 : 3.72) + (random() - 0.5) * 0.3);
  const screens = [];
  let previous = REFRESH_FRAMES[0] / 60;
  const load = [1.86, 0.83, 0.32], loadPeriods = [60, 300, 900];
  let nextLoad = 165.217, queueSum = 0, queueTime = 0;
  for (let k = 0; k < REFRESH_FRAMES.length; k++) {
    const t = REFRESH_FRAMES[k] / 60;
    if (k > 0 && t - previous < 0.095) { screens.push(screens[screens.length - 1]); continue; }
    const dt = t - previous;
    const workers = t >= RESOURCES.threads, dead = t >= RESOURCES.zombie;
    const pulse = dead ? 0 : Math.pow(Math.max(0, Math.cos((t - 162.683) * Math.PI * 2 / (60 / 130))), 12);
    const ticks = k % 3 === 0 ? 11 : 12;
    const quanta = NAMES.map((_, i) => {
      if (i === 0) return workers ? 8 * ticks : ticks - (random() < 0.18 ? 2 : 3);
      if (i === 32) return random() < 0.24 ? 1 : 0;
      return dead ? 0 : random() < 0.055 + 0.52 * pulse ? 1 + (pulse > 0.8 && random() < 0.18 ? 1 : 0) : 0;
    });
    const rows = {};
    let running = 2;
    quanta.forEach((q, i) => {
      if (k > 0) counters[i] += q / ticks * dt;
      const active = i === 0 || i === 32 || (q > 0 && random() < 0.25);
      if (i > 0 && i < 32 && active) running++;
      rows[i + 1] = [active ? 'R' : 'S', (100 * q / ticks).toFixed(1), cpuTime(counters[i])];
    });
    const cpu = Array.from({ length: 8 }, (_, i) => {
      const load = workers ? 100 : i === 0 ? 100 * quanta[0] / ticks
        : 100 * Math.min(ticks, round(pulse * (2 + random() * 4)) + (random() < 0.13 ? 1 : 0)) / ticks;
      const bars = Math.ceil(load / 100 * (i < 4 ? 32 : 33));
      return [bars, pulse > 0.75 && i > 0 && random() < 0.25 ? 3 : 0, load.toFixed(1)];
    });
    const reclaimed = t < RESOURCES.zombie ? 0 : Math.min(5, Math.max(0, 1 + Math.floor((t - 166.833 + 1e-5) / (60 / 130))));
    const memory = t < RESOURCES.zombie ? 4.46 : 2.04 + 2.42 * reclaimed / 5;
    queueSum += running * dt; queueTime += dt;
    if (t >= nextLoad - 1 / 120) {
      const queue = queueSum / Math.max(0.001, queueTime);
      load.forEach((value, i) => { const decay = Math.exp(-5 / loadPeriods[i]); load[i] = value * decay + queue * (1 - decay); });
      nextLoad += 5; queueSum = 0; queueTime = 0;
    }
    rows[34] = ['R', '100.0', cpuTime(Math.max(0, t - RESOURCES.threads + 0.11))];
    screens.push({ t, cpu, mem: t < RESOURCES.zombie ? 18 : 13 + reclaimed,
      memTxt: `${memory.toFixed(2)}G`, tasks: [t >= RESOURCES.killed ? 2 : 33, workers ? 7 : 0, workers ? 8 : running],
      load: load.map(value => value.toFixed(2)), up: uptime(t), rows });
    previous = t;
  }
  return { procs, at(t) {
    const frame = Math.round(t * 60);
    let lo = 0, hi = REFRESH_FRAMES.length;
    while (lo + 1 < hi) { const m = (lo + hi) >> 1; if (REFRESH_FRAMES[m] <= frame) lo = m; else hi = m; }
    return screens[lo];
  } };
}
