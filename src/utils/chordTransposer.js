const ROOT_TO_INDEX = {
  'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4,
  'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9,
  'A#': 10, 'Bb': 10, 'B': 11
};

// Cメジャーで表記する際の一般的なルート名
const INDEX_TO_ROOT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

/**
 * ひとつのコード名を指定されたOriginal KeyからCメジャー基準に移調する
 * 例: transposeChord('Gmaj7', 'D') -> 'Fmaj7'
 * 
 * @param {string} chordName - 元のコード名（例: "Am7", "F#dim"）
 * @param {string} originalKey - 元のキーのルート音（例: "D", "Eb"）
 * @returns {string} Cメジャーに移調されたコード名
 */
export function transposeChord(chordName, originalKey) {
  if (!chordName || !originalKey || originalKey === 'C') return chordName;

  // コードのルート部分（例: C, C#, Db）と修飾子（m7, maj7等）を分離
  const match = chordName.match(/^([A-G][#b]?)(.*)$/);
  if (!match) return chordName; // パースできない場合はそのまま返す

  const chordRoot = match[1];
  const modifier = match[2];

  const rootIndex = ROOT_TO_INDEX[chordRoot];
  const keyIndex = ROOT_TO_INDEX[originalKey];

  if (rootIndex === undefined || keyIndex === undefined) return chordName;

  // C（0）へのシフト量を計算
  let offset = -keyIndex;
  
  // 新しいルートのインデックス（0〜11に丸める）
  const newIndex = (rootIndex + offset + 12) % 12;

  return INDEX_TO_ROOT[newIndex] + modifier;
}

/**
 * コード進行配列をすべてCメジャー基準に移調する
 * 
 * @param {Array<string>} chords - コードの配列 (例: ['D', 'G', 'A'])
 * @param {string} originalKey - 元のキー (例: 'D')
 * @returns {Array<string>} 移調されたコードの配列
 */
export function transposeChordProgression(chords, originalKey) {
  return chords.map(chord => transposeChord(chord, originalKey));
}
