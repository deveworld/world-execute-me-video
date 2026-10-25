// Beat grid of the song: 130.00 BPM, beat 0 at 0.1396 s.
// Hard cuts in the original land on this grid (mostly on bar or half-bar lines).
export const BPM = 130;
export const BEAT0 = 0.1396;
export const SPB = 60 / BPM;

export const beatAt = (t) => (t - BEAT0) / SPB;
export const timeAt = (b) => BEAT0 + b * SPB;
export const barAt = (t) => beatAt(t) / 4;
