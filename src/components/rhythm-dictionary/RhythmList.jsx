import { useState } from 'react';
import useAppStore from '../../store/useAppStore';
import { playRhythmSequence, stopAudio } from '../../utils/audioPlayer';

function RhythmPatternItem({ pattern }) {
  const [isPlaying, setIsPlaying] = useState(false);

  const sourceLabel = pattern.source === 'original' ? 'Original' : 'Reference';
  const prefLabel = pattern.preference === 'like' ? 'Like' : 'Dislike';

  // --- タイムライン描画用の計算 ---
  const timings = pattern.timings || [];
  
  // アウフタクト（マイナス時間）がある場合のオフセット計算
  const minTime = Math.min(0, ...timings.map(t => t.normalizedTime));
  const offset = Math.abs(minTime);
  
  // 描画領域の最大幅（最低1小節分 = 1.0）
  const maxTime = Math.max(1.0, ...timings.map(t => t.normalizedTime + t.normalizedDuration));
  const totalWidthSpan = maxTime + offset;

  // パーセンテージ変換ヘルパー
  const getLeftPct = (normTime) => ((normTime + offset) / totalWidthSpan) * 100;
  const getWidthPct = (normDur) => (normDur / totalWidthSpan) * 100;

  // グリッド線（4拍分 = 0, 0.25, 0.5, 0.75 の位置）
  // 複数小節にまたがる場合は 1.0, 1.25... と続く
  const gridLines = [];
  for (let i = 0; i <= Math.ceil(maxTime * 4); i++) {
    const beatTime = i * 0.25;
    if (beatTime + offset >= 0) {
      gridLines.push(beatTime);
    }
  }

  const handlePlay = async (e) => {
    e.stopPropagation();
    if (isPlaying) {
      stopAudio();
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
      await playRhythmSequence(pattern.timings, () => {
        setIsPlaying(false);
      });
    }
  };

  return (
    <div className={`dict-card ${isPlaying ? 'dict-card--playing' : ''}`} onClick={handlePlay}>
      <div className="dict-card__header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="dict-card__play-btn" style={{ background: isPlaying ? 'var(--accent-orange)' : '' }}>
            {isPlaying ? '■' : '▶'}
          </span>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span className="dict-card__id">{pattern.description || pattern.id || 'Rhythm'}</span>
            <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{pattern.id}</span>
          </div>
        </div>
        {pattern.count > 1 && (
          <span className="badge badge--orange">×{pattern.count}</span>
        )}
      </div>

      <div className="dict-card__visual" style={{ padding: '24px 16px' }}>
        <div className="rhythm-timeline">
          {/* 背景の拍グリッド線 */}
          {gridLines.map((beatTime) => (
            <div 
              key={beatTime} 
              className={`rhythm-timeline__grid${beatTime % 1 === 0 ? ' rhythm-timeline__grid--strong' : ''}`}
              style={{ left: `${getLeftPct(beatTime)}%` }}
            />
          ))}

          {/* 音符ブロック */}
          {timings.map((t, i) => (
            <div
              key={i}
              className="rhythm-timeline__block"
              style={{
                left: `${getLeftPct(t.normalizedTime)}%`,
                width: `${Math.max(1, getWidthPct(t.normalizedDuration))}%`,
              }}
            >
              <span className="rhythm-timeline__label">{t.degreeName}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="dict-card__meta">
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span>{sourceLabel}</span>
          <span>·</span>
          <span>{prefLabel}</span>
        </div>
        {pattern.section && (
          <span className="section-chip section-chip--small">
            {pattern.section.replace('_', ' ').toUpperCase()}
          </span>
        )}
      </div>
    </div>
  );
}

export default function RhythmList({ searchQuery = '' }) {
  const rhythmPatterns = useAppStore((s) => s.rhythmPatterns);

  const filtered = rhythmPatterns.filter((prog) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (prog.description || '').toLowerCase().includes(q) || 
           (prog.id || '').toLowerCase().includes(q);
  });

  return (
    <div className="dict-grid">
      {filtered.length > 0 ? (
        filtered.map((pattern, i) => (
          <RhythmPatternItem key={pattern.id || i} pattern={pattern} />
        ))
      ) : (
        <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
          <span className="empty-state__icon">⏱</span>
          <span className="empty-state__text">データがありません</span>
        </div>
      )}
    </div>
  );
}
