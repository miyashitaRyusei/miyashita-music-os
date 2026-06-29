/**
 * @typedef {Object} Chord
 * @property {string} original - オリジナルのコード文字列
 * @property {string} root - ルート音 (例: C, D, Eb)
 * @property {string} quality - コードの品質 (例: major, m7, 7)
 * @property {string|null} bass - ベース音 (例: E, G, null)
 */

/**
 * @typedef {Object} ReharmRule
 * @property {string} id - ルールID
 * @property {string} name - ルール名
 * @property {string} [chapter] - 理論書の章など
 * @property {boolean} enabled - デフォルトで有効か
 * @property {string} type - ルールの適用タイプ
 * @property {number} strength - リハモによる変化の度合い
 * @property {string[]} tags - ルールの特徴タグ
 * @property {string} description - ルールの説明
 * @property {function(Chord[], number): ReharmCandidate[]} apply - ルール適用関数
 */

/**
 * @typedef {Object} ReharmCandidate
 * @property {string} id - 候補ID
 * @property {string} originalProgression - 元の進行文字列
 * @property {string} reharmonizedProgression - リハモ後の進行文字列
 * @property {string} ruleId - 適用されたルールID
 * @property {string} ruleName - 適用されたルール名
 * @property {number} changedIndex - 変化の起点となったインデックス
 * @property {string} [insertedChord] - 挿入されたコード
 * @property {string} [targetChord] - ターゲットになったコード
 * @property {string} description - この候補の説明
 * @property {number} strength - 変化の度合い
 * @property {string[]} tags - 特徴タグ
 */
