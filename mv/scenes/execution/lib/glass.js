// The C64/Amiga monitor glass: the bright picture is
// a distorted rounded rect with a small corner radius, surrounded by a ~11 px dim bezel lip (the rim)
// whose outline has a much larger radius. Both outlines bow with their own barrel coefficients.
export const GLASS = {
  glass: [73.67, 19.86, 1846.33, 1060.14], radius: 29.5, kg: [-0.0187, -0.0689],
  rim: [62.43, 12.52, 1856.48, 1067.2], rimRadius: 61.1, kr: [-0.0186, -0.0683],
  outside: [2.3 / 255, 2.3 / 255, 2.3 / 255],
};
