// The small device caption at the bottom-left of every era screen ("DEC VT100", "Ubuntu", …):
// Inter Display SemiBold (plain Inter runs ~3 % wide),
// ~85 % white, cap-top at y=966, left ink edge at x=120.
const FONT = '600 25.3px "Inter Display", Inter';
export function addLabel(root, env, text, opts = {}) {
  const { canvas, ctx } = env.canvas(root);
  canvas.style.zIndex = '10';
  const draw = () => {
    ctx.clearRect(0, 0, 1920, 1080);
    ctx.font = FONT;
    ctx.letterSpacing = '0.15px';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = opts.color || 'rgba(255,255,255,0.85)';
    const m = ctx.measureText(text);
    ctx.fillText(text, 120 + m.actualBoundingBoxLeft, 985);
  };
  const ready = document.fonts.load(FONT, text).then(draw);
  return { canvas, ready };
}
