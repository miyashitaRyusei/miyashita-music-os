// ============================================
// Mock Data — みやした音楽OS
// ============================================

// --- Dashboard Mock Data ---

// 8軸のレーダーチャートデータ（0-100のスコア）
export const radarChartData = [
  { axis: '跳躍進行率', original: 45, like: 80, dislike: 20 },
  { axis: 'シンコペーション率', original: 60, like: 90, dislike: 30 },
  { axis: '音符密度（早口度）', original: 75, like: 65, dislike: 95 },
  { axis: '4小節後半上昇率', original: 30, like: 85, dislike: 10 },
  { axis: '音程の予測不能度', original: 55, like: 70, dislike: 40 },
  { axis: '音価の予測不能度', original: 65, like: 75, dislike: 25 },
  { axis: 'スケール制限度', original: 90, like: 50, dislike: 100 },
  { axis: 'アウフタクト発生率', original: 20, like: 60, dislike: 15 },
];

// 音程分布（割合%データ。各属性の合計が100%になるように設定）
export const histogramData = [
  { pitch: 'Do', original: 30, like: 20, dislike: 40 },
  { pitch: 'Re', original: 10, like: 15, dislike: 5 },
  { pitch: 'Mi', original: 20, like: 25, dislike: 10 },
  { pitch: 'Fa', original: 5,  like: 5,  dislike: 15 },
  { pitch: 'Sol', original: 25, like: 20, dislike: 20 },
  { pitch: 'La', original: 5,  like: 10, dislike: 5 },
  { pitch: 'Si', original: 5,  like: 5,  dislike: 5 },
];

// --- Dashboard: AI処方箋 ---
export const aiPrescriptionText = `あなたの自作メロディには「順次進行（隣の音へ動く）」と「反復パターン」が多い傾向があります。
一方、好きな曲の分析からは「シンコペーション」と「リズム密度」のスコアが高く、リズムに特徴を出す作り方が好みのようです。

【処方箋】
・意識的に「裏拍から始まるフレーズ」を取り入れてみましょう
・4度〜5度の跳躍を1フレーズに1回入れると、メロディにメリハリが出ます
・「好きな曲」のリズム辞書から3つパターンを選び、自作メロディに当てはめてみてください`;

// --- Dashboard: 統計サマリー ---
export const statsSummary = {
  totalPitchPatterns: 47,
  totalRhythmPatterns: 32,
  totalChordProgressions: 18,
  totalAnalyzed: 97,
};

// --- Pitch Dictionary ---
export const mockPitchPatterns = [
  { id: 'p1', degrees: ['Do', 'Re', 'Mi', 'Fa', 'Mi'], count: 5, source: 'original', preference: 'like', section: 'verse_a' },
  { id: 'p2', degrees: ['Sol', 'La', 'Sol', 'Mi'], count: 3, source: 'reference', preference: 'like', section: 'chorus' },
  { id: 'p3', degrees: ['Mi', 'Re', 'Do', 'Re', 'Mi', 'Mi'], count: 2, source: 'original', preference: 'like', section: 'intro' },
  { id: 'p4', degrees: ['Do', 'Mi', 'Sol', 'Do↑'], count: 4, source: 'reference', preference: 'like', section: 'chorus' },
  { id: 'p5', degrees: ['La', 'Sol', 'Fa', 'Mi', 'Re'], count: 1, source: 'original', preference: 'dislike', section: 'bridge' },
  { id: 'p6', degrees: ['Sol', 'Sol', 'La', 'Si', 'Do↑'], count: 3, source: 'reference', preference: 'like', section: 'verse_b' },
  { id: 'p7', degrees: ['Re', 'Mi', 'Fa', 'Sol', 'La', 'Sol'], count: 2, source: 'original', preference: 'like', section: 'outro' },
  { id: 'p8', degrees: ['Do', 'Do', 'Re', 'Do'], count: 6, source: 'original', preference: 'dislike', section: 'verse_a' },
];

// --- Rhythm Dictionary ---
export const mockRhythmPatterns = [
  { 
    id: 'r1', 
    description: '基本の4拍（4分音符x4）', count: 7, source: 'original', preference: 'like', section: 'intro',
    timings: [
      { normalizedTime: 0.0, normalizedDuration: 0.25, degreeName: 'Do' },
      { normalizedTime: 0.25, normalizedDuration: 0.25, degreeName: 'Do' },
      { normalizedTime: 0.5, normalizedDuration: 0.25, degreeName: 'Do' },
      { normalizedTime: 0.75, normalizedDuration: 0.25, degreeName: 'Do' },
    ]
  },
  { 
    id: 'r2', 
    description: '8分ウラからのシンコペーション', count: 4, source: 'reference', preference: 'like', section: 'chorus',
    timings: [
      { normalizedTime: 0.0, normalizedDuration: 0.125, degreeName: 'Mi' },
      { normalizedTime: 0.125, normalizedDuration: 0.375, degreeName: 'Sol' }, // 付点4分相当で食う
      { normalizedTime: 0.5, normalizedDuration: 0.25, degreeName: 'La' },
      { normalizedTime: 0.75, normalizedDuration: 0.25, degreeName: 'Sol' },
    ]
  },
  { 
    id: 'r3', 
    description: '3連符パターン', count: 3, source: 'original', preference: 'like', section: 'verse_b',
    timings: [
      { normalizedTime: 0.0, normalizedDuration: 0.333, degreeName: 'Do' },
      { normalizedTime: 0.333, normalizedDuration: 0.333, degreeName: 'Re' },
      { normalizedTime: 0.666, normalizedDuration: 0.333, degreeName: 'Mi' }, // 2拍3連相当
    ]
  },
  { 
    id: 'r4', 
    description: 'アウフタクト（弱起）', count: 5, source: 'reference', preference: 'like', section: 'verse_a',
    timings: [
      { normalizedTime: -0.25, normalizedDuration: 0.125, degreeName: 'Sol↓' },
      { normalizedTime: -0.125, normalizedDuration: 0.125, degreeName: 'La↓' },
      { normalizedTime: 0.0, normalizedDuration: 0.5, degreeName: 'Do' },
    ]
  },
  { 
    id: 'r5', 
    description: '16分刻みのラッシュ', count: 2, source: 'original', preference: 'dislike', section: 'bridge',
    timings: [
      { normalizedTime: 0.0, normalizedDuration: 0.0625, degreeName: 'Do' },
      { normalizedTime: 0.0625, normalizedDuration: 0.0625, degreeName: 'Re' },
      { normalizedTime: 0.125, normalizedDuration: 0.0625, degreeName: 'Mi' },
      { normalizedTime: 0.1875, normalizedDuration: 0.0625, degreeName: 'Fa' },
      { normalizedTime: 0.25, normalizedDuration: 0.25, degreeName: 'Sol' },
    ]
  },
];

// --- Chord Dictionary ---
export const mockChordProgressions = [
  { id: 'c1', chords: ['Am', 'F', 'C', 'G'], label: '小室進行', source: 'reference', preference: 'like', key: 'C major', count: 3, sections: ['chorus', 'verse_a'] },
  { id: 'c2', chords: ['C', 'G', 'Am', 'F'], label: 'ポップパンク進行', source: 'reference', preference: 'like', key: 'C major', count: 2, sections: ['chorus'] },
  { id: 'c3', chords: ['Dm7', 'G7', 'CM7', 'AM7'], label: 'ツーファイブ進行', source: 'original', preference: 'like', key: 'C major', count: 1, sections: ['bridge'] },
  { id: 'c4', chords: ['Em', 'C', 'D', 'G'], label: 'Aメロ候補A', source: 'original', preference: 'like', key: 'G major', count: 1, sections: ['verse_a'] },
  { id: 'c5', chords: ['Fm', 'Cm', 'Ab', 'Eb'], label: 'ダーク進行', source: 'reference', preference: 'dislike', key: 'Ab major', count: 1, sections: ['verse_b'] },
  { id: 'c6', chords: ['C', 'Am', 'Dm', 'G7'], label: '50s進行', source: 'reference', preference: 'like', key: 'C major', count: 2, sections: ['intro', 'outro'] },
];
