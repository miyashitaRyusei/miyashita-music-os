// ============================================
// Chord Parser — コード進行テキストのパースユーティリティ
// ============================================
// 入力形式:  | C | F G < | [Key:+1] Db |
// 出力形式:  [{ measure: 1, chords: [{ name: "C", syncopated: false }] }, ...]
//
// 将来的に「Cメジャーへの自動移調ロジック」をこのモジュールに追加する想定。
// ============================================

/**
 * コード進行テキストをパースし、構造化データの配列に変換する。
 *
 * ルール:
 *   - `|` で小節を区切る
 *   - 小節内のコードはスペース区切り
 *   - `<` は直前のコードにシンコペーション(前倒し)を付与
 *   - `[Key:+1]` や `[Key:-2]` は転調マーカー
 *
 * @param {string} text - ユーザーの生入力テキスト
 * @returns {Array<Object>} パース済みの小節データ配列
 */
export function parseChordInput(text) {
  if (!text || !text.trim()) return [];

  // `|` で分割し、空セグメントを除外
  const segments = text
    .split('|')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const measures = [];

  segments.forEach((segment, index) => {
    const tokens = segment.split(/\s+/).filter((t) => t.length > 0);

    const measure = {
      measure: index + 1,
      chords: [],
    };

    tokens.forEach((token) => {
      // --- 転調マーカーの検出: [Key:+1], [Key:-2] など ---
      const keyMatch = token.match(/^\[Key:([^\]]+)\]$/i);
      if (keyMatch) {
        measure.keyChange = keyMatch[1].trim();
        return;
      }

      // --- シンコペーション記号: < ---
      if (token === '<') {
        // 直前のコードに syncopated フラグを付与
        if (measure.chords.length > 0) {
          measure.chords[measure.chords.length - 1].syncopated = true;
        }
        return;
      }

      // --- コード名 ---
      measure.chords.push({
        name: token,
        syncopated: false,
      });
    });

    // コードか転調マーカーが存在する小節のみ追加
    if (measure.chords.length > 0 || measure.keyChange) {
      measures.push(measure);
    }
  });

  return measures;
}

/**
 * パース済みデータを整形テキストに変換する（将来のエクスポート用）
 *
 * @param {Array<Object>} measures - パース済みの小節データ配列
 * @returns {string} 整形されたコード進行テキスト
 */
export function formatChordProgression(measures) {
  if (!measures || measures.length === 0) return '';

  return measures
    .map((m) => {
      let parts = [];
      if (m.keyChange) {
        parts.push(`[Key:${m.keyChange}]`);
      }
      m.chords.forEach((chord) => {
        parts.push(chord.name);
        if (chord.syncopated) {
          parts.push('<');
        }
      });
      return parts.join(' ');
    })
    .map((s) => `| ${s} `)
    .join('')
    .concat('|');
}
