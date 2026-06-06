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
 * コード進行の配列を指定したキーからCメジャー基準に移調する。
 * 
 * @param {Array<string>} chords - コード進行の配列 (例: ['D', 'A', 'Bm', 'G'])
 * @param {string} originalKey - 元のキー (例: 'D')
 * @returns {Array<string>} 移調後のコード進行配列
 */
export function transposeChordProgression(chords, originalKey) {
  return chords.map(chord => transposeChord(chord, originalKey));
}

/**
 * 現在のキーに対して、[Key:+1] などの転調マーカーを適用した新しいキーを算出する。
 * 
 * @param {string} currentKey - 現在のキー (例: 'C')
 * @param {string} keyChangeStr - 転調マーカー (例: '+1', '-2')
 * @returns {string} 転調後のキー
 */
export function getEffectiveKey(currentKey, keyChangeStr) {
  if (!keyChangeStr || !currentKey) return currentKey;
  
  const change = parseInt(keyChangeStr.replace('+', ''), 10);
  if (isNaN(change)) return currentKey;

  const currentIndex = ROOT_TO_INDEX[currentKey];
  if (currentIndex === undefined) return currentKey;

  let newIndex = (currentIndex + change) % 12;
  if (newIndex < 0) newIndex += 12;

  return INDEX_TO_ROOT[newIndex] || currentKey;
}

/**
 * 指定した小節インデックスにおける有効なキーを計算する。
 * 
 * @param {number} measureIndex - 0始まりの小節インデックス
 * @param {Array<Object>} parsedChords - パース済みのコード配列
 * @param {string} originalKey - 曲の元のキー
 * @returns {string} その小節での有効なキー
 */
export function getEffectiveKeyForMeasure(measureIndex, parsedChords, originalKey) {
  let currentKey = originalKey;
  for (let i = 0; i <= measureIndex; i++) {
    const m = parsedChords[i];
    if (m && m.keyChange) {
      currentKey = getEffectiveKey(currentKey, m.keyChange);
    }
  }
  return currentKey;
}

/**
 * 指定した時間における有効なキーを計算する。
 * 
 * @param {number} time - 時間（秒）
 * @param {number} measureDuration - 1小節の長さ（秒）
 * @param {Array<Object>} parsedChords - パース済みのコード配列
 * @param {string} originalKey - 曲の元のキー
 * @returns {string} その時間での有効なキー
 */
export function getEffectiveKeyAtTime(time, measureDuration, parsedChords, originalKey) {
  if (!measureDuration || measureDuration <= 0) return originalKey;
  const measureIndex = Math.floor(time / measureDuration);
  return getEffectiveKeyForMeasure(measureIndex, parsedChords, originalKey);
}

/**
 * 指定したキーからCメジャーへの移調オフセット（半音数）を取得する。
 * 
 * @param {string} key - キー (例: 'D')
 * @returns {number} オフセット値
 */
export function getTransposeOffset(key) {
  return ROOT_TO_INDEX[key] || 0;
}
