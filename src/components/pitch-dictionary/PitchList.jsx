import { useState } from 'react';
import useAppStore from '../../store/useAppStore';
import { playPitchSequence, stopAudio } from '../../utils/audioPlayer';
import { useDictionaryFilter } from '../../hooks/useDictionaryFilter';
import CommonFilter from '../common/CommonFilter';
import PitchAdvancedFilter from './PitchAdvancedFilter';

// 階名から相対的なピッチ値を計算するヘルパー（Cメジャー基準）
function degreeToValue(degreeStr) {
  const baseMap = {
    'ド': 0, 'ド#': 1, 'レ': 2, 'レ#': 3, 'ミ': 4, 'ファ': 5, 'ファ#': 6,
    'ソ': 7, 'ソ#': 8, 'ラ': 9, 'ラ#': 10, 'シ': 11,
    // 既存データ（Do, Re）へのフォールバック対応
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
  const togglePitchFavorite = useAppStore((s) => s.togglePitchFavorite);

  // バッジのスタイル計算
  const sourceClass = pattern.source === '自作曲' || pattern.source === 'original' ? 'badge-source--original' : 'badge-source--reference';
  const prefClass = pattern.preference === '好き' || pattern.preference === 'like' ? 'badge-pref--like' : 'badge-pref--dislike';
  const getSectionClass = (sec) => {
    switch (sec) {
      case 'イントロ': return 'badge-section--intro';
      case 'Aメロ': return 'badge-section--a';
      case 'Bメロ': return 'badge-section--b';
      case 'Cメロ': return 'badge-section--c';
      case 'Dメロ': return 'badge-section--d';
      case '間奏': return 'badge-section--inter';
      case 'アウトロ': return 'badge-section--outro';
      default: return 'badge-section--a';
    }
  };

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
  // 下に塗りつぶすためのポリゴン座標（線の終点から下へ、始点の下へ、そして始点へ戻る）
  const polygonPoints = values.length > 0 
    ? `${points} ${getX(values.length - 1)},${SVG_HEIGHT} ${getX(0)},${SVG_HEIGHT}` 
    : '';

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
          <span className="dict-card__id" style={{ 
            whiteSpace: 'nowrap', 
            overflow: 'hidden', 
            textOverflow: 'ellipsis', 
            maxWidth: '180px',
            display: 'inline-block',
            verticalAlign: 'bottom'
          }} title={pattern.id || 'Pattern'}>
            {pattern.id || 'Pattern'}
          </span>
          {pattern.count > 1 && (
            <span className="badge badge--orange">×{pattern.count}</span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              togglePitchFavorite(pattern.id);
            }}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px', fontSize: '1.1rem', color: pattern.is_favorite ? '#f5a623' : 'var(--text-tertiary)', lineHeight: 1 }}
            title={pattern.is_favorite ? 'お気に入りを解除' : 'お気に入りに登録'}
          >
            {pattern.is_favorite ? '★' : '☆'}
          </button>
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
      </div>

      <div className="dict-card__visual">
        <svg viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`} className="pitch-sparkline">
          <defs>
            <linearGradient id={`grad-${encodeURIComponent(pattern.id).replace(/%/g, '_')}`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="var(--accent-primary)" stopOpacity="0.2" />
              <stop offset="100%" stopColor="var(--accent-primary)" stopOpacity="0" />
            </linearGradient>
          </defs>
          
          {/* 背景のグリッド線（中央） */}
          <line x1="0" y1={SVG_HEIGHT/2} x2={SVG_WIDTH} y2={SVG_HEIGHT/2} className="pitch-sparkline__grid" />
          
          {/* エリアチャート（塗りつぶし） */}
          {polygonPoints && (
            <polygon points={polygonPoints} fill={`url(#grad-${encodeURIComponent(pattern.id).replace(/%/g, '_')})`} />
          )}

          {/* 折れ線 */}
          <polyline points={points} className="pitch-sparkline__line" style={{ strokeWidth: 3 }} />
          
          {/* プロット点と音名ラベル */}
          {values.map((val, i) => {
            const degreeStr = pattern.degrees[i];
            const isNonDiatonic = degreeStr.includes('#');
            const color = isNonDiatonic ? 'var(--accent-orange)' : 'currentColor';
            
            return (
              <g key={i}>
                <circle cx={getX(i)} cy={getY(val)} r="4" 
                  className="pitch-sparkline__point" 
                  style={{ stroke: color }}
                />
                <text 
                  x={getX(i)} 
                  y={getY(val) + (val >= (maxVal + minVal) / 2 ? 16 : -10)} // 上下位置の調整
                  className={`pitch-sparkline__label ${isNonDiatonic ? 'pitch-sparkline__label--nondiatonic' : ''}`}
                  textAnchor="middle"
                  style={{ fill: color, fontWeight: isNonDiatonic ? 'bold' : 'normal' }}
                >
                  {degreeStr}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="dict-card__meta" style={{ justifyContent: 'flex-end', gap: '8px' }}>
        <span className={`badge-tag ${sourceClass}`}>{pattern.source === 'original' ? '自作曲' : pattern.source}</span>
        <span className={`badge-tag ${prefClass}`}>{pattern.preference === 'like' ? '好き' : pattern.preference}</span>
        {pattern.section && (
          <span className={`badge-tag ${getSectionClass(pattern.section)}`}>
            {pattern.section.replace('_', ' ')}
          </span>
        )}
      </div>
    </div>
  );
}

export default function PitchList() {
  const pitchPatterns = useAppStore((s) => s.pitchPatterns);
  const { filters, setFilters, advancedFilters, setAdvancedFilters, filteredItems } = useDictionaryFilter(pitchPatterns, 'pitch');

  return (
    <div>
      <CommonFilter filters={filters} setFilters={setFilters}>
        <PitchAdvancedFilter 
          advancedFilters={advancedFilters} 
          setAdvancedFilters={setAdvancedFilters} 
        />
      </CommonFilter>
      <div className="dict-grid">
        {filteredItems.length > 0 ? (
          filteredItems.map((pattern, i) => (
            <PitchPatternItem key={pattern.id || i} pattern={pattern} />
          ))
        ) : (
          <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
            <span className="empty-state__icon">♫</span>
            <span className="empty-state__text">データがありません</span>
          </div>
        )}
      </div>
    </div>
  );
}
