// Fonts that live in this segment's folder (scenes/execution/fonts/), registered on demand.
// Families are prefixed with "X " so they can't collide with anything in assets/fonts.
const BASE = new URL('../fonts/', import.meta.url).href;
const FONTS = {
  'X Archivo': ['Archivo-wdth-wght.ttf', { weight: '100 900', stretch: '62% 125%' }],
  'X Fraktur': ['UnifrakturMaguntia-Book.ttf', {}],
  'X AlfaSlab': ['AlfaSlabOne-Regular.ttf', {}],
  'X BlackHan': ['BlackHanSans-net.ttf', {}],
  'X Jost': ['Jost-wght.ttf', { weight: '100 900' }],
  'X MaShan': ['MaShanZheng-liu.ttf', {}],
  'X Cascadia Mono': ['CascadiaMono-wght.ttf', { weight: '200 700' }],
  'X DejaVu Mono': ['DejaVuSansMono.ttf', {}],
  'X Archivo Black': ['ArchivoBlack-Regular.ttf', {}],
  'X Montserrat Black': ['Montserrat-Black.otf', {weight:'900'}],
  'X Poppins Black': ['Poppins-Black.ttf', {weight:'900'}],
  'X DMSerif': ['DMSerifDisplay-Regular.ttf', {}],
  'X DMSerif Italic': ['DMSerifDisplay-Italic.ttf', {}],
};
const loaded = new Map();

export function loadExecFonts(families) {
  return Promise.all(families.map((fam) => {
    if (!loaded.has(fam)) {
      const [file, desc] = FONTS[fam];
      const face = new FontFace(fam, `url(${BASE}${file})`, desc);
      document.fonts.add(face);
      loaded.set(fam, face.load());
    }
    return loaded.get(fam);
  }));
}
