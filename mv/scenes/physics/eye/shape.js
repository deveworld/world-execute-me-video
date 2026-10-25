// Eye outline data (1080p): lid ridges per column.
// Curves are polylines through these points (drawn with Catmull-Rom smoothing).

export const CORNER_L = [692, 557];
export const CORNER_R = [1751, 523];

// open eye at 48.1 s
export const UPPER_OPEN = [
  CORNER_L, [700, 538], [750, 479], [800, 442], [850, 413], [900, 387], [950, 367], [1000, 350], [1050, 337],
  [1100, 327], [1150, 322], [1200, 320.5], [1250, 324], [1300, 331], [1350, 343], [1400, 358], [1450, 377],
  [1500, 399], [1550, 424], [1600, 450], [1650, 476], [1700, 502], CORNER_R,
];
export const LOWER_OPEN = [
  CORNER_L, [705, 577], [755, 611], [805, 638], [855, 661], [905, 683], [955, 704], [1005, 722], [1055, 741],
  [1105, 757], [1155, 769], [1205, 776], [1255, 779], [1305, 780], [1355, 779], [1380, 774], [1405, 767],
  [1430, 757], [1455, 746], [1480, 733], [1505, 718], [1555, 683], [1605, 643], [1655, 599], [1705, 555], CORNER_R,
];
// closed eye: first frame of the shot (47.73) and during the blink (49.4)
export const CLOSED_A = [
  CORNER_L, [700, 565], [750, 585], [800, 599], [850, 613], [900, 624], [950, 635], [1000, 646], [1050, 656],
  [1100, 665], [1150, 674], [1200, 678], [1250, 682], [1300, 682], [1350, 680], [1400, 671], [1450, 659],
  [1500, 643], [1550, 622], [1600, 599], [1650, 571], [1700, 544], CORNER_R,
];
export const CLOSED_B = [
  CORNER_L, [700, 566], [750, 590], [800, 605], [850, 619], [900, 633], [950, 645], [1000, 657], [1050, 670],
  [1100, 677], [1150, 685], [1200, 691], [1250, 694], [1300, 694], [1350, 690], [1400, 682], [1450, 668],
  [1500, 651], [1550, 631], [1600, 602], [1650, 574], [1700, 546], CORNER_R,
];
// faint crease line above the upper lid (open eye) and above the closed lid
export const CREASE_OPEN = [
  [775, 452], [800, 425], [850, 375], [900, 338], [950, 312], [1000, 292], [1050, 276], [1100, 265], [1150, 257],
  [1200, 254], [1250, 254], [1300, 259], [1350, 268], [1400, 282], [1450, 300], [1500, 322], [1550, 348],
  [1600, 377], [1650, 410], [1700, 448], [1725, 470],
];
export const CREASE_CLOSED_A = [
  [860, 569], [910, 571], [960, 573], [1010, 576], [1060, 580], [1110, 585], [1160, 589], [1210, 594], [1260, 597],
  [1310, 598], [1360, 598], [1410, 595], [1460, 589], [1510, 579], [1560, 567],
];
export const CREASE_CLOSED_B = [
  [860, 576], [910, 579], [960, 583], [1010, 587], [1060, 592], [1110, 597], [1160, 602], [1210, 606], [1260, 609],
  [1310, 610], [1360, 609], [1410, 605], [1460, 597], [1510, 587], [1560, 573], [1610, 557],
];

// resample a polyline at the given x positions (assumes x increasing). Cubic Hermite through the
// points (tangents from neighbouring chords) keeps the steep lid ends near the eye corners round.
export function sampleAtX(pts, xs) {
  const n = pts.length, slope = (i) => (pts[i + 1][1] - pts[i][1]) / Math.max(1e-6, pts[i + 1][0] - pts[i][0]);
  const tan = pts.map((_, i) => (i === 0 ? slope(0) : i === n - 1 ? slope(n - 2) : (slope(i - 1) + slope(i)) / 2));
  const out = [];
  let j = 0;
  for (const x of xs) {
    while (j < n - 2 && pts[j + 1][0] < x) j++;
    const [x0, y0] = pts[j], [x1, y1] = pts[j + 1], h = x1 - x0;
    if (h <= 0) { out.push(y0); continue; }
    const u = Math.min(1, Math.max(0, (x - x0) / h)), u2 = u * u, u3 = u2 * u;
    out.push((2 * u3 - 3 * u2 + 1) * y0 + (u3 - 2 * u2 + u) * h * tan[j] + (-2 * u3 + 3 * u2) * y1 + (u3 - u2) * h * tan[j + 1]);
  }
  return out;
}

// Catmull-Rom path through points
export function catmull(ctx, pts, move = true) {
  if (move) ctx.moveTo(pts[0][0], pts[0][1]); else ctx.lineTo(pts[0][0], pts[0][1]);
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    ctx.bezierCurveTo(
      p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6,
      p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6,
      p2[0], p2[1],
    );
  }
}
