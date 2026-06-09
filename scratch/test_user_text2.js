import { Chord } from '@tonaljs/tonal';

function normalizeChordNotation(chordName) {
  if (!chordName) return '';
  let n = chordName.trim();
  
  // 全角記号の置換
  n = n.replace(/♭/g, 'b').replace(/♯/g, '#');
  
  // -5, +5, -9, +9, -11, +11, -13, +13 を b5, #5 などに変換
  n = n.replace(/-([59]|11|13)/g, 'b$1');
  n = n.replace(/\+([59]|11|13)/g, '#$1');
  
  // 括弧で囲まれたテンションの括弧を外す
  n = n.replace(/\((.*?)\)/g, '$1');
  
  // ナチュラルテンション（9, 11, 13）の場合は、7を省略する Tonal.js の仕様に合わせる
  // maj, M, △ は大文字小文字区別する（Mはメジャー、mはマイナーのため）
  n = n.replace(/(M|maj|Maj|MAJ|△)79/g, 'maj9');
  n = n.replace(/(M|maj|Maj|MAJ|△)711/g, 'maj11');
  n = n.replace(/(M|maj|Maj|MAJ|△)713/g, 'maj13');
  n = n.replace(/m79/g, 'm9');
  n = n.replace(/m711/g, 'm11');
  n = n.replace(/m713/g, 'm13');
  // 属七
  n = n.replace(/(?<![#b])79/g, '9');
  n = n.replace(/(?<![#b])711/g, '11');
  n = n.replace(/(?<![#b])713/g, '13');
  
  // その他の記号の揺れ
  n = n.replace(/△7/g, 'M7');
  n = n.replace(/△/g, 'maj');
  n = n.replace(/maj7/gi, 'M7');
  
  return n;
}

const testChords = ['BM7(9)', 'C7(b9)', 'Cm7(-5)', 'F#m7(11)', 'G7(13)', 'C△7(9)'];

for (let chord of testChords) {
  const norm = normalizeChordNotation(chord);
  const isValid = !Chord.get(norm).empty;
  console.log(`${chord} -> ${norm} (Valid: ${isValid})`);
}
