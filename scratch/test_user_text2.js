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
  
  // + が単独で使われている場合（例: C+7 -> Caug7 -> C7#5）
  n = n.replace(/\+(?!5|9|11|13)/g, 'aug');
  
  // ナチュラルテンション（9, 11, 13）の場合は、7を省略する Tonal.js の仕様に合わせる
  n = n.replace(/(M|maj|Maj|MAJ|△)79/g, 'maj9');
  n = n.replace(/(M|maj|Maj|MAJ|△)711/g, 'maj11');
  n = n.replace(/(M|maj|Maj|MAJ|△)713/g, 'maj13');
  n = n.replace(/m79/g, 'm9');
  n = n.replace(/m711/g, 'm11');
  n = n.replace(/m713/g, 'm13');
  n = n.replace(/(?<![#b])79/g, '9');
  n = n.replace(/(?<![#b])711/g, '11');
  n = n.replace(/(?<![#b])713/g, '13');
  
  // aug の対応: Tonal.jsは aug9 などを解釈できないため 9#5 などに変換
  n = n.replace(/augmaj9/gi, 'maj9#5');
  n = n.replace(/augM9/g, 'maj9#5');
  n = n.replace(/augmaj7/gi, 'maj7#5');
  n = n.replace(/augM7/g, 'maj7#5');
  n = n.replace(/aug9/gi, '9#5');
  n = n.replace(/aug7/gi, '7#5');
  n = n.replace(/maug/gi, 'm#5');
  n = n.replace(/aug/gi, '#5');
  
  // #5, b5 とテンションの順序を整理 (例: 7#59 -> 9#5)
  n = n.replace(/7#59/g, '9#5');
  n = n.replace(/7b59/g, '9b5');
  n = n.replace(/#59/g, '9#5');
  n = n.replace(/b59/g, '9b5');
  n = n.replace(/#57/g, '7#5');
  n = n.replace(/b57/g, '7b5');
  
  // その他の記号の揺れ
  n = n.replace(/△7/g, 'M7');
  n = n.replace(/△/g, 'maj');
  n = n.replace(/maj7/gi, 'M7');
  
  return n;
}

const testChords = ['Eaug7(9)', 'Eaug9', 'E+7(9)', 'E7#5(9)', 'CaugM7(9)'];

for (let chord of testChords) {
  const norm = normalizeChordNotation(chord);
  const isValid = !Chord.get(norm).empty;
  console.log(`${chord} -> ${norm} (Valid: ${isValid})`);
}
