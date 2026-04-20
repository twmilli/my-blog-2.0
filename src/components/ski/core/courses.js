/**
 * Single hand-authored terrain park: fixed bounds, lateral limits, and features.
 * Coordinates: x across slope (0 = center-ish), y increases downhill.
 */
export const terrainPark = {
  id: "terrain-park",
  label: "Terrain Park",
  world: {
    width: 920,
    /** Course length; rider finishes when y >= this */
    length: 2100,
    minX: 80,
    maxX: 840,
    /** Finish line (world y) */
    finishY: 1980,
  },
  /** Decorative / boundary trees (circle) */
  trees: [
    { x: 120, y: 120, r: 22 },
    { x: 780, y: 180, r: 24 },
    { x: 140, y: 420, r: 20 },
    { x: 800, y: 520, r: 26 },
    { x: 110, y: 780, r: 22 },
    { x: 790, y: 900, r: 24 },
    { x: 150, y: 1180, r: 21 },
    { x: 770, y: 1320, r: 25 },
    { x: 130, y: 1580, r: 22 },
    { x: 800, y: 1720, r: 23 },
  ],
  /** Launch ramps: axis-aligned; triggers once per approach from above */
  kickers: [
    { x: 380, y: 280, w: 160, h: 36 },
    { x: 520, y: 640, w: 140, h: 34 },
    { x: 300, y: 1040, w: 180, h: 38 },
    { x: 480, y: 1460, w: 150, h: 36 },
  ],
  /** Low boxes / rails (visual + slight speed trim on overlap) */
  rails: [
    { x: 260, y: 520, w: 200, h: 14 },
    { x: 520, y: 980, w: 220, h: 14 },
    { x: 240, y: 1380, w: 260, h: 14 },
  ],
};
