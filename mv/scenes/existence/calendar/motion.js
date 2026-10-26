// Each beat moves the current-time rule down one hour with a damped settling
// response. Later beats are twice as close together.
const STEPS = [93.434, 93.901, 94.351, 94.818, 95.034, 95.284];
export function calendarMarker(t) {
  if (t < 93.008) return null;
  let y = 266.5;
  for (const start of STEPS) {
    const u = Math.max(0, t - start);
    const k = Math.min(1, 1 - Math.exp(-31 * u));
    y += 40 * k;
  }
  return y;
}

export const dimStarts = [93.9833, 94.450, 95.1333, 95.3667, Infinity, Infinity, Infinity, Infinity, Infinity];
