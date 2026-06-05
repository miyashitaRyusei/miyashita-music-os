import { useState } from 'react';
import useAppStore from '../../store/useAppStore';
import { playPitchSequence, stopAudio } from '../../utils/audioPlayer';

// 階名から相対的なピッチ値を計算するヘルパー（Cメジャー基準）
function degreeToValue(degreeStr) {
  const baseMap = {
    'Do': 0, 'Do#': 1, 'Re': 2, 'Re#': 3, 'Mi': 4, 'Fa': 5, 'Fa#': 6,
    'Sol': 7, 'Sol#': 8, 'La': 9, 'La#': 10, 'Si': 11
  };
  
  let name = degreeStr.replace(/[↑↓]/g, '');
  let val = baseMap[name] !== undefined ? baseMap[name] : 0;
  
  // オクターブシフトの計算
  const upCount = (degreeStr.match(/↑/g) || []).length;
  const downCount = (degreeStr.match(/↓/g) || []).length;
  
  return val + (upCount * 12) - (downCount * 12);
}

function PitchPatternItem({ pattern }) {
  const [isPlaying, setIsPlaying] = useState(false);

  const sourceLabel = pattern.source === 'original' ? '自作曲' : 'リファレンス';
  const prefLabel = pattern.preference === 'like' ? '好き' : '嫌い';

  // --- グラフ描画用のデータ計算 ---
  const values = pattern.degrees.map(degreeToValue);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = maxVal - minVal;
  
  const SVG_WIDTH = 400;
  const SVG_HEIGHT = 80;
  const PADDING_X = 30;
  const PADDING_Y = 20;

  // X座標の計算（等間隔）
  const getX = (index) => {
    if (values.length <= 1) return SVG_WIDTH / 2;
    return PADDING_X + (index / (values.length - 1)) * (SVG_WIDTH - PADDING_X * 2);
  };

  // Y座標の計算（値の範囲に応じてスケーリング）
  const getY = (val) => {
    if (range === 0) return SVG_HEIGHT / 2;
    // Y軸は上がマイナス（0）なので反転させる
    const normalized = (val - minVal) / range;
    return SVG_HEIGHT - PADDING_Y - normalized * (SVG_HEIGHT - PADDING_Y * 2);
  };

  const points = values.map((val, i) => `${getX(i)},${getY(val)}`).join(' ');

  const handlePlay = async (e) => {
    e.stopPropagation();
    if (isPlaying) {
      stopAudio();
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
      await playPitchSequence(pattern.degrees, () => {
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
          <span className="dict-card__id">{pattern.id || 'Pattern'}</span>
          {pattern.count > 1 && (
            <span className="badge badge--orange">×{pattern.count}</span>
          )}
        </div>
        <button 
          onClick={(e) => {
            e.stopPropagation();
            if (window.confirm('このピッチパターンを削除しますか？')) {
              useAppStore.getState().removePitchPattern(pattern.id);
            }
          }}
          style={{ background: 'transparent', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: '4px', fontSize: '0.9rem' }}
          title="削除"
        >
          🗑️
        </button>
      </div>

      <div className="dict-card__visual">
        <svg viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`} className="pitch-sparkline">
          {/* 背景のグリッド線（中央） */}
          <line x1="0" y1={SVG_HEIGHT/2} x2={SVG_WIDTH} y2={SVG_HEIGHT/2} className="pitch-sparkline__grid" />
          
          {/* 折れ線 */}
          <polyline points={points} className="pitch-sparkline__line" />
          
          {/* プロット点と音名ラベル */}
          {values.map((val, i) => (
            <g key={i}>
              <circle cx={getX(i)} cy={getY(val)} r="4" className="pitch-sparkline__point" />
              <text 
                x={getX(i)} 
                y={getY(val) + (val >= (maxVal + minVal) / 2 ? 16 : -10)} // 上下位置の調整
                className="pitch-sparkline__label"
                textAnchor="middle"
              >
                {pattern.degrees[i]}
              </text>
            </g>
          ))}
        </svg>
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

export default function PitchList({ searchQuery = '' }) {
  const pitchPatterns = useAppStore((s) => s.pitchPatterns);

  const filtered = pitchPatterns.filter((prog) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return prog.degrees.join(' ').toLowerCase().includes(q);
  });

  return (
    <div className="dict-grid">
      {filtered.length > 0 ? (
        filtered.map((pattern, i) => (
          <PitchPatternItem key={pattern.id || i} pattern={pattern} />
        ))
      ) : (
        <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
          <span className="empty-state__icon">♫</span>
          <span className="empty-state__text">データがありません</span>
        </div>
      )}
    </div>
  );
}
