let ready;
export function loadMathFonts() {
  if (!ready) ready = Promise.all([
    ['STIXTwoText-wght.ttf', 'normal'], ['STIXTwoText-Italic-wght.ttf', 'italic'],
  ].map(async ([file, style]) => {
    const face = new FontFace('MathSTIX', `url(${new URL(`../fonts/${file}`, import.meta.url)})`, { weight: '400 700', style });
    document.fonts.add(face);
    await face.load();
  }));
  return ready;
}
