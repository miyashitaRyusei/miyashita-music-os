import { parseChord } from './parseChord';

/**
 * コード進行文字列をパースする
 * @param {string} progressionStr - 例: "C | Am | Dm | G7 | C"
 * @returns {{ chords: import('./types').Chord[], error: string | null }}
 */
export function parseProgression(progressionStr) {
  if (!progressionStr) {
    return { chords: [], error: null };
  }

  // | や , や 空白 で分割する
  const tokens = progressionStr
    .split(/[\s|,]+/)
    .filter(token => token.trim() !== '');

  const chords = [];
  
  for (const token of tokens) {
    const parsed = parseChord(token);
    if (!parsed) {
      return { chords: [], error: `コード "${token}" を解析できませんでした。` };
    }
    chords.push(parsed);
  }

  return { chords, error: null };
}
