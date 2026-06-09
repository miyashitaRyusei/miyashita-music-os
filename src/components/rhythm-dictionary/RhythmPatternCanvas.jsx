import React from 'react';

export default function RhythmPatternCanvas({ timings = [], height = 60 }) {
  // アウフタクト（マイナス時間）がある場合のオフセット計算
  const minTime = Math.min(0, ...timings.map(t => t.normalizedTime || 0));
  const offset = Math.abs(minTime);
  
  // 描画領域の最大幅（最低1小節分 = 1.0）
  const maxTime = Math.max(1.0, ...timings.map(t => (t.normalizedTime || 0) + (t.normalizedDuration || 0.25)));
  const totalWidthSpan = maxTime + offset;

  // パーセンテージ変換ヘルパー
  const getLeftPct = (normTime) => ((normTime + offset) / totalWidthSpan) * 100;
  const getWidthPct = (normDur) => (normDur / totalWidthSpan) * 100;

  // グリッド線（4拍分 = 0, 0.25, 0.5, 0.75 の位置）
  const gridLines = [];
  const startBeat = Math.floor(minTime * 4);
  const endBeat = Math.ceil(maxTime * 4);
  for (let i = startBeat; i <= endBeat; i++) {
    const beatTime = i * 0.25;
    gridLines.push(beatTime);
  }

  return (
    <div className="rhythm-timeline" style={{ height: `${height}px`, position: 'relative', width: '100%', padding: '8px 0' }}>
      {/* 背景の拍グリッド線 */}
      {gridLines.map((beatTime) => {
        let className = 'rhythm-timeline__grid';
        if (beatTime === 0) {
          className += ' rhythm-timeline__grid--zero';
        } else if (beatTime % 1 === 0) {
          className += ' rhythm-timeline__grid--strong';
        }
        return (
          <div 
            key={beatTime} 
            className={className}
            style={{ left: `${getLeftPct(beatTime)}%` }}
          />
        );
      })}

      {/* 音符ブロック */}
      {timings.map((t, i) => {
        const start = t.normalizedTime || 0;
        const duration = t.normalizedDuration || 0.25;
        const end = start + duration;
        const isOffBeat = Math.abs(start % 0.25) > 0.01 && Math.abs((start % 0.25) - 0.25) > 0.01;
        const crossesBeat = Math.floor(start / 0.25) < Math.floor((end - 0.01) / 0.25);
        const isSyncopated = isOffBeat && crossesBeat;

        return (
          <div
            key={i}
            className="rhythm-timeline__block"
            style={{
              left: `${getLeftPct(start)}%`,
              width: `${Math.max(1, getWidthPct(duration))}%`,
              background: isSyncopated ? 'var(--accent-orange)' : undefined,
              boxShadow: isSyncopated ? '0 0 8px rgba(245, 166, 35, 0.4)' : undefined,
              borderRadius: '4px',
            }}
          />
        );
      })}
    </div>
  );
}
