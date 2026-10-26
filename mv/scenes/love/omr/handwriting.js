// Rounded pencil strokes describe the long initial and the small tilted letters.
export function drawHandwriting(ctx) {
  ctx.save();
  ctx.lineWidth = 9.2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(1217, 795);
  ctx.lineTo(1205, 915);
  ctx.lineTo(1267, 916);
  ctx.stroke();
  for (const dx of [0, 136, 272]) {
    ctx.beginPath();
    ctx.moveTo(1317 + dx, 853);
    ctx.bezierCurveTo(1289 + dx, 848, 1276 + dx, 910, 1304 + dx, 916);
    ctx.bezierCurveTo(1331 + dx, 923, 1344 + dx, 856, 1317 + dx, 853);
    ctx.stroke();
  }
  for (const x of [1363, 1499]) {
    ctx.beginPath();
    ctx.moveTo(x, 880);
    ctx.lineTo(x + 33, 880);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(1628, 855);
  ctx.lineTo(1641, 916);
  ctx.lineTo(1670, 855);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(1685, 895);
  ctx.bezierCurveTo(1703, 886, 1743, 867, 1720, 855);
  ctx.bezierCurveTo(1701, 844, 1680, 871, 1685, 899);
  ctx.bezierCurveTo(1688, 922, 1710, 924, 1724, 902);
  ctx.stroke();
  ctx.restore();
}
