/**
 * 楽曲分析データを元に、LLM（Gemini等）へ入力するためのプロンプトを生成する
 */
export function generateAIPrompt({ 
  radarData, 
  pitchPatterns, 
  rhythmPatterns, 
  chordProgressions, 
  melodyChordRelations, 
  sectionData, 
  topChords, 
  nonDiatonicRate, 
  topKeys 
}) {
  // マクロデータのテキスト化（8軸）
  const macroText = radarData
    .map((d) => `- ${d.axis}: 自作曲(Original)=${d.original}, 理想(Like)=${d.like}`)
    .join('\n');

  // ミクロデータのテキスト化（代表的なパターンを抜粋）
  const microPitch = pitchPatterns
    .filter(p => p.source === 'original')
    .slice(0, 5)
    .map(p => `- [出現回数: ${p.count || 1}] ${p.degrees.join(' → ')}`)
    .join('\n');

  const microRhythm = rhythmPatterns
    .filter(p => p.source === 'original')
    .slice(0, 5)
    .map(p => `- [出現回数: ${p.count || 1}] ${p.description || 'パターン'}`)
    .join('\n');

  const microChords = (chordProgressions || [])
    .filter(p => p.source === 'original')
    .slice(0, 5)
    .map(p => `- [出現回数: ${p.count || 1}] ${p.chords.join(' → ')}`)
    .join('\n');

  const microMelodyChord = (melodyChordRelations || [])
    .slice(0, 5)
    .map(r => `- コード[${r.chordName || r.chord_name}]の時にメロディ[${r.melodyDegree || r.melody_degree}]を鳴らす (出現率トップ)`)
    .join('\n');

  // セクションやキーの情報
  const sectionsText = (sectionData || [])
    .map(s => `${s.name}: ${s.value}%`)
    .join(', ');

  const keysText = (topKeys || [])
    .map(k => `${k.key} (${k.count}曲)`)
    .join(', ');

  const topChordsText = (topChords || [])
    .slice(0, 5)
    .map(c => `${c.chord} (${c.count}回)`)
    .join(', ');

  // マークダウン文字列の生成
  return `
# 楽曲分析データと処方箋作成依頼

以下は、私が制作したメロディや進行（自作曲）と、目標とするリファレンス曲（理想）の分析データです。

## 1. 【基本情報】
- テンポ: 120 BPM前後（ミッドテンポ）
- ジャンル: ポップス / エレクトロニカベース
- よく使うキー: ${keysText || 'データなし'}
- よく使うコード (全体): ${topChordsText || 'データなし'}
- 各セクションの割合: ${sectionsText || 'データなし'}
- ノンダイアトニックコード使用率: ${nonDiatonicRate !== undefined ? nonDiatonicRate + '%' : 'データなし'}

## 2. 【マクロ分析データ】（スコア比較）
レーダーチャート（0〜100）による特徴比較です。
${macroText}

## 3. 【ミクロ分析データ】（自作曲の抽出フレーズ・手癖）
▽ ピッチパターン（階名推移）の傾向
${microPitch || 'データなし'}

▽ リズムパターンの傾向
${microRhythm || 'データなし'}

▽ よく使うコード進行（手癖）
${microChords || 'データなし'}

▽ コードとメロディの組み合わせ（手癖）
${microMelodyChord || 'データなし'}

## 4. 【システムプロンプト】（あなたの役割と指示）
あなたはプロフェッショナルな音楽プロデューサー兼・トップクリエイターです。
上記の「マクロ分析データ（自作曲と参考曲のスコア差）」と「ミクロ分析データ（具体的な手癖や頻出パターン）」を多角的に解釈し、自作曲を理想のクオリティに近づけるための具体的な処方箋を提示してください。

[厳守事項]
1. 単純に数値を読み上げるだけの分析（例：「跳躍進行が少ないですね」など）は禁止します。
2. 「なぜそのスコア差が生まれているのか」「コード進行やメロディの手癖がどう影響しているのか」を高度な音楽理論に基づいて考察してください。
3. リファレンスに近づけるため、私がDAW（作曲ソフト）ですぐに実践できる具体的なアクション（作編曲のハック）を3つ提案してください。
   （例：「〇小節目の2拍目に休符を入れてシンコペーションを強調する」「メジャー3度の音を避けて四六抜きにし、裏コードを挿入する」など、超具体的に）
4. 必要であれば、既存のコード進行（手癖）に対して、よりエモくなるリハーモナイズの提案も行ってください。
`.trim();
}
