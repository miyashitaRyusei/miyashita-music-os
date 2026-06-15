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

export function calculateMetrics({
  pitchPatterns = [],
  rhythmPatterns = [],
  chordProgressions = [],
  melodyChordRelations = [],
  registeredSongs = []
}) {
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
    let totalScaleScore = 0;
    let totalPEntropyScore = 0;
    let validPitchPatterns = 0;
    
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
      // エントロピー・スケール用のローカル計算
      let localPitchClassCounts = {};
      p.degrees.forEach(deg => {
        const baseName = deg.replace(/[↑↓]/g, '');
        localPitchClassCounts[baseName] = (localPitchClassCounts[baseName] || 0) + 1;
      });
      
      const localUniquePitches = Object.keys(localPitchClassCounts).length;
      if (localUniquePitches > 0) {
        // スケール制限度: 12音中の使用音数が少ないほど高い
        const localScaleScore = Math.max(0, 100 - ((localUniquePitches - 1) / 11) * 100);
        totalScaleScore += localScaleScore;
        
        // 音程エントロピー (最大値: log2(12) ≒ 3.58)
        const localEntropy = calculateEntropy(localPitchClassCounts);
        const localEntropyScore = Math.min(100, (localEntropy / 3.58) * 100);
        totalPEntropyScore += localEntropyScore;
        
        validPitchPatterns++;
      }
    });

    let syncopationCount = 0;
    let totalRhythmNotes = 0;
    let anacrusisCount = 0;
    let totalDuration = 0;
    let totalREntropyScore = 0;
    let validRhythmPatterns = 0;

    group.rhythm.forEach(r => {
      // アウフタクト
      if (r.timings.length > 0 && r.timings[0].normalizedTime < 0) {
        anacrusisCount++;
      }
      
      let localDurationCounts = {};
      r.timings.forEach(t => {
        // シンコペーション (拍の頭0, 0.25, 0.5, 0.75以外)
        const decimal = t.normalizedTime % 0.25;
        if (decimal > 0.01 && decimal < 0.24) syncopationCount++;
        
        const durStr = t.normalizedDuration.toFixed(3);
        localDurationCounts[durStr] = (localDurationCounts[durStr] || 0) + 1;
        
        totalRhythmNotes++;
        totalDuration += t.normalizedDuration;
      });
      
      if (r.timings.length > 0) {
        // 音価エントロピー (最大値を適当に3とする)
        const localREntropy = calculateEntropy(localDurationCounts);
        const localREntropyScore = Math.min(100, (localREntropy / 3) * 100);
        totalREntropyScore += localREntropyScore;
        validRhythmPatterns++;
      }
    });

    // 1. 跳躍進行率
    const leapRate = totalIntervals > 0 ? (leapCount / totalIntervals) * 100 : 0;
    // 2. シンコペーション率
    const syncRate = totalRhythmNotes > 0 ? (syncopationCount / totalRhythmNotes) * 100 : 0;
    // 3. 音符密度 (1小節=1.0あたりに8音符で100%とする)
    const density = totalDuration > 0 ? Math.min(100, (totalRhythmNotes / totalDuration) / 8 * 100) : 0;
    // 4. フレーズ上昇率
    const riseRate = group.pitch.length > 0 ? (phraseRiseCount / group.pitch.length) * 100 : 0;
    // 5. 音程エントロピー 
    const pEntropyScore = validPitchPatterns > 0 ? (totalPEntropyScore / validPitchPatterns) : 0;
    // 6. 音価エントロピー 
    const rEntropyScore = validRhythmPatterns > 0 ? (totalREntropyScore / validRhythmPatterns) : 0;
    // 7. スケール制限度 
    const scaleScore = validPitchPatterns > 0 ? (totalScaleScore / validPitchPatterns) : 0;
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

  const radarChartData = [
    { axis: '跳躍進行率', 好き: calcGroupScores(groups.like).leapRate, 嫌い: calcGroupScores(groups.dislike).leapRate, 自作曲: calcGroupScores(groups.original).leapRate },
    { axis: 'シンコペーション率', 好き: calcGroupScores(groups.like).syncRate, 嫌い: calcGroupScores(groups.dislike).syncRate, 自作曲: calcGroupScores(groups.original).syncRate },
    { axis: '音符密度', 好き: calcGroupScores(groups.like).density, 嫌い: calcGroupScores(groups.dislike).density, 自作曲: calcGroupScores(groups.original).density },
    { axis: 'フレーズ上昇率', 好き: calcGroupScores(groups.like).riseRate, 嫌い: calcGroupScores(groups.dislike).riseRate, 自作曲: calcGroupScores(groups.original).riseRate },
    { axis: '音程予測不能度', 好き: calcGroupScores(groups.like).pEntropyScore, 嫌い: calcGroupScores(groups.dislike).pEntropyScore, 自作曲: calcGroupScores(groups.original).pEntropyScore },
    { axis: '音価予測不能度', 好き: calcGroupScores(groups.like).rEntropyScore, 嫌い: calcGroupScores(groups.dislike).rEntropyScore, 自作曲: calcGroupScores(groups.original).rEntropyScore },
    { axis: 'スケール制限度', 好き: calcGroupScores(groups.like).scaleScore, 嫌い: calcGroupScores(groups.dislike).scaleScore, 自作曲: calcGroupScores(groups.original).scaleScore },
    { axis: 'アウフタクト発生率', 好き: calcGroupScores(groups.like).anacrusisRate, 嫌い: calcGroupScores(groups.dislike).anacrusisRate, 自作曲: calcGroupScores(groups.original).anacrusisRate },
  ];

  // ========== セクション分布計算 ==========
  const sectionCounts = {};
  const countSection = (item) => {
    if (!item.sections) return;
    item.sections.forEach(sec => {
      if (!sec) return;
      const name = sec.replace('_', ' ');
      sectionCounts[name] = (sectionCounts[name] || 0) + 1;
    });
  };
  pitchPatterns.forEach(countSection);
  rhythmPatterns.forEach(countSection);
  chordProgressions.forEach(countSection);

  const sectionData = Object.entries(sectionCounts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  // ========== コード統計計算 ==========
  const chordFrequencies = {};
  let totalChords = 0;
  let nonDiatonicCount = 0;

  chordProgressions.forEach(prog => {
    if (!prog.chords) return;
    prog.chords.forEach(chordObj => {
      const name = chordObj.chord;
      if (!name) return;
      chordFrequencies[name] = (chordFrequencies[name] || 0) + 1;
      totalChords++;
      // 簡易ノンダイアトニック判定（#やbが含まれるルート音を調外とみなす。実際はキーによるが目安として）
      if (name.includes('#') || (name.includes('b') && !name.includes('dim'))) {
        nonDiatonicCount++;
      }
    });
  });

  const topChords = Object.entries(chordFrequencies)
    .map(([chord, count]) => ({ chord, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const nonDiatonicRate = totalChords > 0 ? Math.round((nonDiatonicCount / totalChords) * 100) : 0;

  // ========== 楽曲BPM・キー統計 ==========
  const bpmCounts = {};
  const keyCounts = {};
  registeredSongs.forEach(song => {
    if (song.bpm) {
      const bucket = Math.floor(song.bpm / 10) * 10;
      const label = `${bucket}s`;
      bpmCounts[label] = (bpmCounts[label] || 0) + 1;
    }
    if (song.originalKey) {
      keyCounts[song.originalKey] = (keyCounts[song.originalKey] || 0) + 1;
    }
  });

  const bpmData = Object.entries(bpmCounts)
    .map(([range, count]) => ({ range, count }))
    .sort((a, b) => parseInt(a.range) - parseInt(b.range));

  const topKeys = Object.entries(keyCounts)
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // ========== メロディ×コード ヒートマップ計算 ==========
  const degreeOrder = ['ド', 'ド#', 'レ', 'レ#', 'ミ', 'ファ', 'ファ#', 'ソ', 'ソ#', 'ラ', 'ラ#', 'シ'];
  // 基本的なコード種別にまとめるためのマッピング関数
  const getChordType = (chordName) => {
    if (!chordName) return 'Other';
    if (chordName.includes('mM7')) return 'mM7';
    if (chordName.includes('m7')) return 'm7';
    if (chordName.includes('M7')) return 'M7';
    if (chordName.includes('7')) return '7th';
    if (chordName.includes('dim')) return 'dim';
    if (chordName.includes('aug')) return 'aug';
    if (chordName.includes('sus4')) return 'sus4';
    if (chordName.includes('m')) return 'Minor';
    return 'Major';
  };

  const chordTypesOrder = ['Major', 'Minor', 'M7', 'm7', '7th', 'sus4', 'dim', 'aug'];
  const heatmapCounts = {};
  let totalRelations = 0;

  melodyChordRelations.forEach(rel => {
    if (!rel.chordName || !rel.melodyDegree) return;
    const type = getChordType(rel.chordName);
    const deg = rel.melodyDegree;
    if (!heatmapCounts[type]) heatmapCounts[type] = {};
    heatmapCounts[type][deg] = (heatmapCounts[type][deg] || 0) + 1;
    totalRelations++;
  });

  // ヒートマップ用の配列を生成（縦: ChordType, 横: Degree）
  const heatmapData = chordTypesOrder.map(cType => {
    const row = { chordType: cType };
    degreeOrder.forEach(deg => {
      row[deg] = heatmapCounts[cType] ? (heatmapCounts[cType][deg] || 0) : 0;
    });
    return row;
  });

  return {
    histogramData,
    radarChartData,
    sectionData,
    topChords,
    nonDiatonicRate,
    bpmData,
    topKeys,
    heatmapData,
    degreeOrder,
    chordTypesOrder,
    totalRelations
  };
}
