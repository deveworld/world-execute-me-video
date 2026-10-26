// Leaves are released at a constant motor rate and fall around a horizontal hinge.
// Several leaves can be in flight while the wheel turns through its character set.
const LETTERS = ' ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const DIGITS = '9876543210 ';
const CARDS = ['BOARDING', 'MOON LANDING', 'FIRST FLIGHT', 'COLUMBUS', 'MARCO POLO', 'VESUVIUS', 'ANNO DOMINI', 'GREAT PYRAMID'];

export function wheel(characters, initial, targets, rate, duration = .085) {
  const leaves = [];
  let previous = initial;
  for (const [start, target, speed = rate] of targets) {
    let index = characters.indexOf(previous), step = 0;
    const end = characters.indexOf(target);
    if (index < 0 || end < 0) throw new Error('The target must belong to its flap wheel.');
    while (index !== end) {
      const next = (index + 1) % characters.length;
      leaves.push({ from: characters[index].trim(), to: characters[next].trim(), at: start + step++ / speed });
      index = next;
    }
    previous = target;
  }
  return {
    at(t) {
      let top = initial.trim(), bottom = top;
      const moving = [];
      for (const leaf of leaves) {
        if (t < leaf.at) break;
        top = leaf.to;
        const p = (t - leaf.at) / duration;
        if (p >= 1) bottom = leaf.to;
        else moving.push({ ...leaf, p });
      }
      return { top, bottom, moving };
    },
  };
}

export function createBoardWheels() {
  const rows = [
    ['OH WE CAN', [0, 0, 0, 51.088, 51.497, 0, 52.185, 52.237, 51.967]],
    ['TRAVEL   ', [52.207, 52.265, 52.658, 52.198, 52.588, 52.445, 0, 0, 0]],
    ['TO AD    ', [52.986, 53.111, 0, 53.471, 53.42, 0, 0, 0, 0]],
    ['TO BC    ', [53.853, 53.975, 0, 54.55, 54.543, 0, 0, 0, 0]],
  ];
  const destinations = rows.map(([text, starts]) => [...text].map((target, i) => {
    const initial = starts[i] ? ' ' : target;
    return wheel(LETTERS, initial, starts[i] ? [[starts[i], target]] : [], 45, .05);
  }));
  const years = [
    [51.911, '1969'], [52.375, '1903'], [52.839, '1492'], [53.297, '1271'],
    [53.745, '  79'], [54.225, '   1'], [54.69, '2560'],
  ];
  const dates = [...'2026'].map((initial, i) => wheel(DIGITS, initial,
    years.map(([t, year], event) => [t + (event === 6 ? [0, .067, .1, .15][i] : 0), year[i], event === 6 ? 60 : 36]), 36, .06));
  const era = wheel([' ', 'AD', 'BC'], ' ', [[53.488, 'AD'], [54.56, 'BC']], 12.5);
  const card = wheel(CARDS, CARDS[0], [52.088, 52.482, 52.909, 53.297, 53.776, 54.324, 54.558]
    .map((start, i) => [start, CARDS[i + 1]]), 12.5);
  return { destinations, dates, era, card };
}
