/**
 * 階名（ド↑など）から相対的なピッチ値（半音単位）を計算するヘルパー
 * C4(ド) を基準(0)とする。
 */
export function degreeToValue(degreeStr) {
  if (!degreeStr) return 0;
  
  const baseMap = {
    'ド': 0, 'ド#': 1, 'レ': 2, 'レ#': 3, 'ミ': 4, 'ファ': 5, 'ファ#': 6,
    'ソ': 7, 'ソ#': 8, 'ラ': 9, 'ラ#': 10, 'シ': 11,
    'Do': 0, 'Do#': 1, 'Re': 2, 'Re#': 3, 'Mi': 4, 'Fa': 5, 'Fa#': 6,
    'Sol': 7, 'Sol#': 8, 'La': 9, 'La#': 10, 'Si': 11
  };
  
  // 空白の除去と全角/半角の正規化
  let normalizedStr = String(degreeStr).trim().replace(/♯/g, '#').replace(/♭/g, 'b');
  
  // 階名部分の抽出（矢印などを除外）
  let name = normalizedStr.replace(/[↑↓⬆⬇⇧⇩]/g, '');
  let val = baseMap[name] !== undefined ? baseMap[name] : 0;
  
  // オクターブシフトの計算
  const upCount = (normalizedStr.match(/[↑⬆⇧]/g) || []).length;
  const downCount = (normalizedStr.match(/[↓⬇⇩]/g) || []).length;
  
  return val + (upCount * 12) - (downCount * 12);
}
