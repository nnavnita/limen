// Shared colours and the seeded randomness that makes each session look like itself.

export const COLORS = {
  sky: '#1b1430',
  buildingWall: '#3b2c47',
  buildingTrim: '#5d4468',
  roof: '#7b4a5e',
  floorA: '#c08552',
  floorB: '#b0743f',
  wall: '#e6ccaa',
  wallShade: '#d2b287',
  wallTrim: '#8c5d3b',
  wood: '#8a5a38',
  woodDark: '#6b442a',
  woodLight: '#a97544',
  screen: '#8fe3d0',
  screenOff: '#3d5a58',
  cork: '#c69a63',
  corkDark: '#a87f4c',
  paper: '#f4ead6',
  ink: '#3a2c2c',
  leaf: '#5aa055',
  leafDark: '#3f7a41',
  pot: '#a85c48',
  night: 'rgba(14, 10, 28, 0.74)',
  glow: 'rgba(255, 214, 140, 0.16)',
};

export const SKINS = ['#f2c896', '#e4aa78', '#c98d5e', '#a06844', '#7d4e33', '#ffd8b4'];
export const HAIRS = ['#33231d', '#6b3f2a', '#c9793a', '#e8c15a', '#8b4a6b', '#41598b',
                      '#2c3a48', '#a03c3c', '#d8d0c3', '#5c3a7c', '#3f7a5c', '#b5651d'];
export const SHIRTS = ['#4a7fd4', '#4ab06a', '#d45a5a', '#d48f3a', '#8a5ad4', '#3aa6b0',
                       '#d46a9a', '#6f8090', '#c4a23a', '#5f8f5f'];
export const PANTS = ['#3a4256', '#4a3a30', '#2f3f35', '#4d3a49', '#565a66'];

// Document spines get their own colours so a bookshelf reads at a glance.
export const SPINES = ['#b34b4b', '#4b7bb3', '#4fa06a', '#c08a3a', '#8a5ab3', '#3f9aa6', '#b35a8a'];

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pick(rng, list) {
  return list[Math.floor(rng() * list.length) % list.length];
}

// One seed in, one consistent character out — the same session always looks the same.
export function appearance(seed) {
  const rng = mulberry32(seed);
  return {
    skin: pick(rng, SKINS),
    hair: pick(rng, HAIRS),
    shirt: pick(rng, SHIRTS),
    pants: pick(rng, PANTS),
    longHair: rng() < 0.45,
    hat: rng() < 0.18,
  };
}
