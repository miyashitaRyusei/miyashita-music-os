// ピッチ名から半音単位の相対値を計算
function degreeToValue(degreeStr) {
  const baseMap = {
    'ド': 0, 'ド#': 1, 'レ': 2, 'レ#': 3, 'ミ': 4, 'ファ': 5, 'ファ#': 6,
    'ソ': 7, 'ソ#': 8, 'ラ': 9, 'ラ#': 10, 'シ': 11
  };
  const name = degreeStr.replace(/[↑↓]/g, '');
  const val = baseMap[name] !== undefined ? baseMap[name] : 0;
  const upCount = (degreeStr.match(/↑/g) || []).length;
  const downCount = (degreeStr.match(/↓/g) || []).length;
  return val + (upCount * 12) - (downCount * 12);
}

// エントロピー計算
function calculateEntropy(counts) {
  const total = Object.values(counts).reduce((sum, c) => sum + c, 0);
  if (total === 0) return 0;
  let entropy = 0;
  for (const c of Object.values(counts)) {
    const p = c / total;
    if (p > 0) entropy -= p * Math.log2(p);
  }
  return entropy;
}

export function calculateMetrics(pitchPatterns, rhythmPatterns) {
  // グループ分け（自作曲、好き、嫌い）
  const groups = {
    original: { pitch: [], rhythm: [] },
    like: { pitch: [], rhythm: [] },
    dislike: { pitch: [], rhythm: [] }
  };

  pitchPatterns.forEach(p => {
    if (p.source === 'original' || p.source === '自作曲') groups.original.pitch.push(p);
    else if (p.preference === 'like' || p.preference === '好き') groups.like.pitch.push(p);
    else if (p.preference === 'dislike' || p.preference === '嫌い') groups.dislike.pitch.push(p);
  });

  rhythmPatterns.forEach(r => {
    if (r.source === 'original' || r.source === '自作曲') groups.original.rhythm.push(r);
    else if (r.preference === 'like' || r.preference === '好き') groups.like.rhythm.push(r);
    else if (r.preference === 'dislike' || r.preference === '嫌い') groups.dislike.rhythm.push(r);
  });

  // ========== ヒストグラム計算 ==========
  const allPitches = ['ド', 'ド#', 'レ', 'レ#', 'ミ', 'ファ', 'ファ#', 'ソ', 'ソ#', 'ラ', 'ラ#', 'シ'];
  const histogramData = allPitches.map(pitch => ({ pitch, original: 0, like: 0, dislike: 0 }));

  const countPitches = (groupPitchArray) => {
    const counts = {};
    let total = 0;
    groupPitchArray.forEach(p => {
      p.degrees.forEach(deg => {
        const baseName = deg.replace(/[↑↓]/g, '');
        counts[baseName] = (counts[baseName] || 0) + 1;
        total++;
      });
    });
    return { counts, total };
  };

  const origCounts = countPitches(groups.original.pitch);
  const likeCounts = countPitches(groups.like.pitch);
  const dislikeCounts = countPitches(groups.dislike.pitch);

  histogramData.forEach(item => {
    item.original = origCounts.total > 0 ? Math.round((origCounts.counts[item.pitch] || 0) / origCounts.total * 100) : 0;
    item.like = likeCounts.total > 0 ? Math.round((likeCounts.counts[item.pitch] || 0) / likeCounts.total * 100) : 0;
    item.dislike = dislikeCounts.total > 0 ? Math.round((dislikeCounts.counts[item.pitch] || 0) / dislikeCounts.total * 100) : 0;
  });

  // ========== レーダーチャート計算 ==========
  const calcGroupScores = (group) => {
    let leapCount = 0;
    let totalIntervals = 0;
    let phraseRiseCount = 0;
    let pitchClassCounts = {};
    
    group.pitch.forEach(p => {
      const vals = p.degrees.map(degreeToValue);
      // 跳躍進行率
      for (let i = 1; i < vals.length; i++) {
        if (Math.abs(vals[i] - vals[i - 1]) >= 3) leapCount++;
        totalIntervals++;
      }
      // フレーズ上昇率
      if (vals.length > 1 && vals[vals.length - 1] > vals[0]) {
        phraseRiseCount++;
      }
      // エントロピー・スケール用
      p.degrees.forEach(deg => {
        const baseName = deg.replace(/[↑↓]/g, '');
        pitchClassCounts[baseName] = (pitchClassCounts[baseName] || 0) + 1;
      });
    });

    let syncopationCount = 0;
    let totalRhythmNotes = 0;
    let anacrusisCount = 0;
    let totalDuration = 0;
    let durationCounts = {};

    group.rhythm.forEach(r => {
      // アウフタクト
      if (r.timings.length > 0 && r.timings[0].normalizedTime < 0) {
        anacrusisCount++;
      }
      r.timings.forEach(t => {
        // シンコペーション (拍の頭0, 0.25, 0.5, 0.75以外)
        const decimal = t.normalizedTime % 0.25;
        if (decimal > 0.01 && decimal < 0.24) syncopationCount++;
        
        const durStr = t.normalizedDuration.toFixed(3);
        durationCounts[durStr] = (durationCounts[durStr] || 0) + 1;
        totalRhythmNotes++;
        totalDuration += t.normalizedDuration;
      });
    });

    // 1. 跳躍進行率
    const leapRate = totalIntervals > 0 ? (leapCount / totalIntervals) * 100 : 0;
    // 2. シンコペーション率
    const syncRate = totalRhythmNotes > 0 ? (syncopationCount / totalRhythmNotes) * 100 : 0;
    // 3. 音符密度 (1小節=1.0あたりに8音符で100%とする)
    const density = totalDuration > 0 ? Math.min(100, (totalRhythmNotes / totalDuration) / 8 * 100) : 0;
    // 4. フレーズ上昇率
    const riseRate = group.pitch.length > 0 ? (phraseRiseCount / group.pitch.length) * 100 : 0;
    // 5. 音程エントロピー (最大値: log2(12) ≒ 3.58)
    const pEntropy = calculateEntropy(pitchClassCounts);
    const pEntropyScore = Math.min(100, (pEntropy / 3.58) * 100);
    // 6. 音価エントロピー (最大値を適当に3とする)
    const rEntropy = calculateEntropy(durationCounts);
    const rEntropyScore = Math.min(100, (rEntropy / 3) * 100);
    // 7. スケール制限度 (12音階中の使用音数が少ないほど高い。7音階で50%, 5音階で80%目安)
    const uniquePitches = Object.keys(pitchClassCounts).length;
    let scaleScore = 0;
    if (uniquePitches > 0) {
      scaleScore = Math.max(0, 100 - ((uniquePitches - 1) / 11) * 100); 
    }
    // 8. アウフタクト発生率
    const anacrusisRate = group.rhythm.length > 0 ? (anacrusisCount / group.rhythm.length) * 100 : 0;

    return {
      leapRate: Math.round(leapRate),
      syncRate: Math.round(syncRate),
      density: Math.round(density),
      riseRate: Math.round(riseRate),
      pEntropyScore: Math.round(pEntropyScore),
      rEntropyScore: Math.round(rEntropyScore),
      scaleScore: Math.round(scaleScore),
      anacrusisRate: Math.round(anacrusisRate)
    };
  };

  const origScores = calcGroupScores(groups.original);
  const likeScores = calcGroupScores(groups.like);
  const dislikeScores = calcGroupScores(groups.dislike);

  const radarChartData = [
    { axis: '跳躍進行率', 自作曲: origScores.leapRate, 好き: likeScores.leapRate, 嫌い: dislikeScores.leapRate },
    { axis: 'シンコペーション率', 自作曲: origScores.syncRate, 好き: likeScores.syncRate, 嫌い: dislikeScores.syncRate },
    { axis: '音符密度', 自作曲: origScores.density, 好き: likeScores.density, 嫌い: dislikeScores.density },
    { axis: 'フレーズ上昇率', 自作曲: origScores.riseRate, 好き: likeScores.riseRate, 嫌い: dislikeScores.riseRate },
    { axis: '音程の予測不能度', 自作曲: origScores.pEntropyScore, 好き: likeScores.pEntropyScore, 嫌い: dislikeScores.pEntropyScore },
    { axis: '音価の予測不能度', 自作曲: origScores.rEntropyScore, 好き: likeScores.rEntropyScore, 嫌い: dislikeScores.rEntropyScore },
    { axis: 'スケール制限度', 自作曲: origScores.scaleScore, 好き: likeScores.scaleScore, 嫌い: dislikeScores.scaleScore },
    { axis: 'アウフタクト発生率', 自作曲: origScores.anacrusisRate, 好き: likeScores.anacrusisRate, 嫌い: dislikeScores.anacrusisRate },
  ];

  return { histogramData, radarChartData };
}
