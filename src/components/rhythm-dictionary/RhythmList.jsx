import { useState } from 'react';
import useAppStore from '../../store/useAppStore';
import { playRhythmSequence, stopAudio } from '../../utils/audioPlayer';
import { useDictionaryFilter } from '../../hooks/useDictionaryFilter';
import CommonFilter from '../common/CommonFilter';
import RhythmAdvancedFilter from './RhythmAdvancedFilter';

function RhythmPatternItem({ pattern }) {
  const [isPlaying, setIsPlaying] = useState(false);

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
            <span className="dict-card__id">{pattern.id || pattern.description || 'Rhythm'}</span>
            {pattern.description && pattern.description !== '自動抽出パターン' && (
              <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{pattern.description}</span>
            )}
          </div>
          {pattern.count > 1 && (
            <span className="badge badge--orange">×{pattern.count}</span>
          )}
        </div>
        <button 
          onClick={(e) => {
            e.stopPropagation();
            if (window.confirm('このリズムパターンを削除しますか？')) {
              useAppStore.getState().removeRhythmPattern(pattern.id);
            }
          }}
          style={{ background: 'transparent', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: '4px', fontSize: '0.9rem' }}
          title="削除"
        >
          🗑️
        </button>
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
          <span className={`badge-tag ${sourceClass}`}>{pattern.source === 'original' ? '自作曲' : pattern.source}</span>
          <span className={`badge-tag ${prefClass}`}>{pattern.preference === 'like' ? '好き' : pattern.preference}</span>
        </div>
        {pattern.section && (
          <span className={`badge-tag ${getSectionClass(pattern.section)}`}>
            {pattern.section.replace('_', ' ')}
          </span>
        )}
      </div>
    </div>
  );
}

export default function RhythmList() {
  const rhythmPatterns = useAppStore((s) => s.rhythmPatterns);
  const { filters, setFilters, advancedFilters, setAdvancedFilters, filteredItems } = useDictionaryFilter(rhythmPatterns, 'rhythm');

  return (
    <div>
      <CommonFilter filters={filters} setFilters={setFilters}>
        <RhythmAdvancedFilter 
          advancedFilters={advancedFilters} 
          setAdvancedFilters={setAdvancedFilters} 
        />
      </CommonFilter>
      <div className="dict-grid">
        {filteredItems.length > 0 ? (
          filteredItems.map((pattern, i) => (
            <RhythmPatternItem key={pattern.id || i} pattern={pattern} />
          ))
        ) : (
          <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
            <span className="empty-state__icon">⏱</span>
            <span className="empty-state__text">データがありません</span>
          </div>
        )}
      </div>
    </div>
  );
}
