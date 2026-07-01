import { notes, indexToNote } from './notes';
import { formatChord } from './formatChord';

/**
 * ルート音から完全5度上（半音7つ上）の音を返す
 * @param {string} root 
 * @returns {string|null}
 */
function getPerfectFifthAbove(root) {
  const rootIndex = notes[root];
  if (rootIndex === undefined) return null;
  const targetIndex = (rootIndex + 7) % 12;
  return indexToNote[targetIndex];
}

/**
 * リハモルール定義配列
 * @type {import('./types').ReharmRule[]}
 */
export const reharmRules = [
  {
    id: "rule_001",
    name: "セカンダリードミナント",
    chapter: "3-1",
    enabled: true,
    type: "insert_before_target",
    strength: 2,
    tags: ["定番", "ドミナント", "目的地感"],
    description: "次のコードを一時的なトニックと見て、そのV7を直前に挿入する。",
    
    /**
     * @param {import('./types').Chord[]} chords - 解析済みのコード進行配列
     * @param {number} targetIndex - 適用を試みる対象のインデックス
     * @returns {import('./types').ReharmCandidate[]}
     */
    apply: (chords, targetIndex) => {
      // 最初のコード(index 0)には適用しない
      if (targetIndex === 0) return [];

      const targetChord = chords[targetIndex];
      // 今回はKey Cのダイアトニックコードのルート(C, D, E, F, G, A)を対象とする
      const validTargets = ['C', 'D', 'E', 'F', 'G', 'A'];
      
      // 対象判定は root 基準（Am でも Am7 でも可）
      if (!validTargets.includes(targetChord.root)) {
        return [];
      }

      // 完全5度上の音を求める
      const vRoot = getPerfectFifthAbove(targetChord.root);
      if (!vRoot) return [];

      const insertedChordObj = {
        original: `${vRoot}7`,
        root: vRoot,
        quality: "7",
        bass: null
      };
      const insertedChordStr = formatChord(insertedChordObj);

      // すでに直前が同じドミナントかチェック
      const prevChord = chords[targetIndex - 1];
      if (prevChord && prevChord.root === insertedChordObj.root && prevChord.quality === insertedChordObj.quality) {
        return [];
      }

      const displayText = `${insertedChordStr} | ${targetChord.original}`;

      return [
        {
          id: `rule_001_${targetIndex}_${Date.now()}`,
          targetIndex,
          originalChord: targetChord.original,
          candidateChords: [insertedChordStr, targetChord.original],
          displayText,
          ruleId: "rule_001",
          ruleName: "セカンダリードミナント",
          description: `${targetChord.original}に向かうために、直前に${insertedChordStr}を挿入。`,
          strength: 2,
          tags: ["定番", "ドミナント", "目的地感"],
          melodyMatch: null
        }
      ];
    }
  }
];
