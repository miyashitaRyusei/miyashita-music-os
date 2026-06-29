export const notes = {
  C: 0,
  Db: 1,
  D: 2,
  Eb: 3,
  E: 4,
  F: 5,
  Gb: 6,
  G: 7,
  Ab: 8,
  A: 9,
  Bb: 10,
  B: 11
};

// 逆引き用
export const indexToNote = Object.fromEntries(
  Object.entries(notes).map(([note, index]) => [index, note])
);
