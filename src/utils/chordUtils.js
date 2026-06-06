// Cメジャーキー基準でのダイアトニック判定
const DIATONIC_CHORDS_IN_C = {
  // Root -> allowed qualities (regex)
  // C: C, Cmaj7, CM7, C6, Cadd9, etc. Not Cm, C7
  'C': /^(maj7|M7|△7|6|add9|M|maj)?$/i,
  
  // D: Dm, Dm7, Dm9, D-7
  'D': /^m(7|9|11)?$|^\-7?$/i,
  
  // E: Em, Em7, E-7
  'E': /^m(7|11)?$|^\-7?$/i,
  
  // F: F, Fmaj7, FM7, F6, Fadd9
  'F': /^(maj7|M7|△7|6|add9|M|maj)?$/i,
  
  // G: G, G7, G9, G13, Gsus4
  'G': /^(7|9|11|13|sus4)?$/i,
  
  // A: Am, Am7, Am9, A-7
  'A': /^m(7|9|11)?$|^\-7?$/i,
  
  // B: Bdim, Bm7b5, B-7b5
  'B': /^(dim|dim7|m7b5|\-7b5|o)$/i,
};

/**
 * コードネームをRootとQualityに分割する
 * 例: "Cmaj7" -> { root: "C", quality: "maj7" }
 * 例: "F#m7b5" -> { root: "F#", quality: "m7b5" }
 */
export function parseChord(chordName) {
  // 最初の1〜2文字（大文字アルファベット + 任意の #/b）をルートとする
  const match = chordName.match(/^([A-G][#b]?)(.*)$/);
  if (!match) return { root: chordName, quality: '' };
  
  return {
    root: match[1],
    quality: match[2]
  };
}

/**
 * コードがCメジャーダイアトニックかどうかを判定する
 * 四和音（M7, m7, 7, m7b5）等も考慮
 */
export function isDiatonicInC(chordName) {
  // ベース指定がある場合（例: ConE）は、一旦ベースを無視して上のコードで判定する
  const mainChord = chordName.split('/')[0].split('on')[0];
  
  const { root, quality } = parseChord(mainChord);
  
  // ルートがCメジャースケール外の場合は一発アウト
  if (!DIATONIC_CHORDS_IN_C[root]) {
    return false;
  }
  
  // クオリティのチェック
  const regex = DIATONIC_CHORDS_IN_C[root];
  return regex.test(quality);
}

/**
 * コード進行配列の中に、ノンダイアトニックコードが1つでも含まれているか判定
 */
export function hasNonDiatonic(chordsArray) {
  return chordsArray.some(chord => !isDiatonicInC(chord));
}
