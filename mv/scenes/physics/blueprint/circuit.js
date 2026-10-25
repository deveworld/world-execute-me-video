// Blueprint "SWITCH MY CURRENT": geometry + timing of the bridge-rectifier schematic.

export const T_SCENE = 2671 / 60;          // first frame of the shot in the original (44.5167)
export const P = 60 / 130;                  // source period = one beat (2.17 Hz label)
export const K = 125.75;                    // flow-dot speed for unit current (px/s)

// normalized source voltage: a cosine that starts at the shot's first frame
export const vSrc = (t) => Math.cos((2 * Math.PI * (t - T_SCENE)) / P);

export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const sstep = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };

// ---- timeline ----
export const TL = {
  s1Close: T_SCENE + 0.1133,     // S1 arm reaches the contact (ease-in quad from the first frame)
  s1Angle: 30.6,                 // open angle (deg)
  pulse0: 44.630, pulseV: 5340,  // power-on wavefront from S1's right contact
  dotsOn0: 44.975, dotsOn1: 45.005,
  inSweep: T_SCENE + 1.75 * P,   // IN scope trigger (rising zero crossing)
  diodeOn0: 45.885, diodeOn1: 45.935,
  outSweep: T_SCENE + 4 * P,     // OUT scope trigger (|v| peak)
  s2Start: 47.075, s2Close: 47.167, s2Angle: 29.9,
  ch0: 47.154, ch1: 47.268, peak: T_SCENE + 6 * P, dc: 47.300,
  outClear0: 47.30, outClear1: 47.40,
};

const blip = (t) => 0.5 * Math.exp(-(((t - 47.508) / 0.018) ** 2));

// Normalized branch currents (dot speed = K * current).
export function currents(t) {
  const v = vSrc(t), av = Math.abs(v);
  const up = sstep((t - TL.ch0) / 0.03), dn = 1 - clamp((t - TL.ch1) / (TL.dc - TL.ch1));
  const charge = t >= TL.ch0 && t < TL.dc, dc = t >= TL.dc;
  const surge = 2.0 * up * dn;
  const Ib = charge ? surge + av * (1 - up) : dc ? blip(t) : av;
  const Ir = t < TL.peak ? av : 1.0;
  const I14 = charge ? surge + Math.max(v, 0) * (1 - up) : dc ? 0 : Math.max(v, 0);
  const I23 = charge ? Math.max(-v, 0) * (1 - up) : dc ? blip(t) : Math.max(-v, 0);
  const Im = charge ? -surge - v * (1 - up) : dc ? blip(t) : -v;
  let Ic = 0;
  if (t >= TL.ch0) {
    if (t < TL.ch1) Ic = Ib;
    else if (t < TL.dc) Ic = 2.0 - ((t - TL.ch1) / (TL.dc - TL.ch1)) * 2.93;
    else Ic = -0.93 + blip(t);
  }
  return { Ib, Ir, I14, I23, Im, Ic };
}

// ---- geometry ----
export const N = {
  L: [560, 580], T: [840, 300], R: [1120, 580], B: [840, 860],
  S1L: [640, 580], S1R: [720, 580], G1L: [800, 580], G1R: [880, 580],
  TS: [840, 220], BS: [840, 940], J1: [1280, 220], J2: [1280, 940], TR: [1440, 220], BR: [1440, 940],
  R1t: [1440, 540], R1b: [1440, 620], S2t: [1280, 300], S2b: [1280, 380], Ct: [1280, 572], Cb: [1280, 588],
};

// Undirected wire graph for the power-on wave (S1 arm included; S2 is open at that time).
export const EDGES = [
  ['S1R', 'S1L'], ['S1L', 'L'], ['S1R', 'G1L'], ['G1L', 'G1R'], ['G1R', 'R'],
  ['L', 'T'], ['L', 'B'], ['R', 'T'], ['R', 'B'],
  ['T', 'TS'], ['B', 'BS'], ['TS', 'J1'], ['BS', 'J2'], ['J1', 'TR'], ['J2', 'BR'],
  ['TR', 'R1t'], ['R1t', 'R1b'], ['R1b', 'BR'], ['J1', 'S2t'], ['J2', 'Cb'],
];

// Flow-dot paths: polyline, current name, phase (px, at integral 0 = 44.5 s).
export const DOT_PATHS = [
  { pts: [N.T, N.TS, N.J1], cur: 'Ib', s0: 16.03 },
  { pts: [N.J1, N.TR], cur: 'Ir', s0: 15.84 },
  { pts: [N.TR, N.BR], cur: 'Ir', s0: 23.80 },
  { pts: [N.BR, N.J2], cur: 'Ir', s0: 5.81 },
  { pts: [N.J2, N.BS, N.B], cur: 'Ib', s0: 17.74 },
  { pts: [N.L, N.R], cur: 'Im', s0: 10.22 },
  { pts: [N.L, N.T], cur: 'I14', s0: 16.77 },
  { pts: [N.B, N.R], cur: 'I14', s0: 16.78 },
  { pts: [N.R, N.T], cur: 'I23', s0: 1.43 },
  { pts: [N.B, N.L], cur: 'I23', s0: 1.38 },
  { pts: [N.J1, N.Ct], cur: 'Ic', s0: 25.78, c1: true },
  { pts: [N.Cb, N.J2], cur: 'Ic', s0: 21.82, c1: true },
];
export const DOT_SPACING = 28;

// rectangles where dots are hidden (component bodies)
export const DOT_HIDE = [
  [800, 540, 880, 620],   // G1 circle
  [1426, 538, 1454, 622], // R1 body
  [1260, 572, 1300, 588], // C1 gap
];

export const DIODES = [
  { id: 'D1', a: 'L', b: 'T', grp: 14 },
  { id: 'D2', a: 'R', b: 'T', grp: 23 },
  { id: 'D3', a: 'B', b: 'L', grp: 23 },
  { id: 'D4', a: 'B', b: 'R', grp: 14 },
];

// Labels (Architects Daughter, lavender); baseline-left positions.
export const LABELS = [
  ['D1', 658, 417, 26.5], ['D2', 996, 417, 26.5], ['D3', 654, 759, 26.5], ['D4', 996, 759, 26.5],
  ['G1', 828, 525, 26.5], ['S1', 669, 612, 27], ['2.17 HZ', 800, 651, 26.5], ['S2', 1235, 349, 27.5],
  ['C1', 1315, 574, 26.5], ['4700 µF', 1308, 603, 26.5], ['R1', 1464, 574, 26.5], ['10K', 1467, 604, 27],
  ['+', 1238, 568, 22],
];

export const SCOPES = {
  in: { x: 120, y: 480, w: 250, h: 200, label: 'IN', lx: 119, ly: 464 },
  out: { x: 1550, y: 480, w: 250, h: 200, label: 'OUT', lx: 1550, ly: 464 },
};
