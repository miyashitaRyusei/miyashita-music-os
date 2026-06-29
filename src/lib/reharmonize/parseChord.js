import { notes } from './notes';
import { qualityAliases } from './chordQualities';

/**
 * コード文字列をパースする
 * @param {string} chordStr - 例: "Fm6/Ab", "C"
 * @returns {import('./types').Chord | null} パース結果。失敗時は null
 */
export function parseChord(chordStr) {
  if (!chordStr || chordStr.trim() === '') return null;
  
  const trimmed = chordStr.trim();
  
  // N.C. などの処理（必要に応じて拡張）
  if (trimmed.toUpperCase() === 'N.C.') return null;

  // ベース音の分離
  const parts = trimmed.split('/');
  const chordPart = parts[0];
  let bass = parts[1] || null;

  // ルート音の抽出
  // 臨時記号(b, #)を含めるため、最初の1文字または2文字を取得
  let root;
  let rest;
  
  if (chordPart.length > 1 && (chordPart[1] === 'b' || chordPart[1] === '#')) {
    root = chordPart.substring(0, 2);
    rest = chordPart.substring(2);
  } else {
    root = chordPart.substring(0, 1);
    rest = chordPart.substring(1);
  }

  // ルート音が妥当かチェック
  // 今回は簡易的に notes に定義されているフラット系への変換（またはそのまま許可）を行う
  // #をbに変換する簡易ロジック
  const enharmonicMap = { 'C#': 'Db', 'D#': 'Eb', 'F#': 'Gb', 'G#': 'Ab', 'A#': 'Bb' };
  if (enharmonicMap[root]) {
    root = enharmonicMap[root];
  }

  if (notes[root] === undefined) {
    return null; // 無効なルート
  }

  // qualityの抽出
  let quality = null;
  // 長いエイリアスから順にマッチング
  for (const alias of qualityAliases) {
    if (rest.startsWith(alias.match)) {
      // 完全に一致している、あるいは残りが無いか確認（"m7" と "m" のような場合の誤爆は配列順で回避される）
      // 残りの文字列がalias.matchと一致しているか
      if (rest === alias.match) {
        quality = alias.quality;
        break;
      }
    }
  }

  if (quality === null) {
    return null; // 解析不能なquality
  }

  // ベース音の正規化（必要に応じて）
  if (bass) {
    if (enharmonicMap[bass]) {
      bass = enharmonicMap[bass];
    }
    if (notes[bass] === undefined) {
      return null;
    }
  }

  return {
    original: trimmed,
    root,
    quality,
    bass
  };
}
