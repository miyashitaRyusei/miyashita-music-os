/**
 * 内部のChordオブジェクトから文字列に変換する
 * @param {import('./types').Chord} chordObj 
 * @returns {string} 
 */
export function formatChord(chordObj) {
  if (!chordObj) return "";
  
  const root = chordObj.root;
  // qualityがmajorの場合は空文字にする
  const quality = chordObj.quality === 'major' ? '' : chordObj.quality;
  const bass = chordObj.bass ? `/${chordObj.bass}` : '';

  return `${root}${quality}${bass}`;
}
