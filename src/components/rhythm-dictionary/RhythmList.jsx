import { useState } from 'react';
import useAppStore from '../../store/useAppStore';
import { playRhythmSequence, stopAudio } from '../../utils/audioPlayer';
import { useDictionaryFilter } from '../../hooks/useDictionaryFilter';
import CommonFilter from '../common/CommonFilter';
import RhythmAdvancedFilter from './RhythmAdvancedFilter';
import EditTagsModal from '../common/EditTagsModal';
import { TrashIcon, PlayCircleIcon, StopCircleIcon, PencilIcon } from '@heroicons/react/24/outline';

function RhythmPatternItem({ pattern }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const toggleRhythmFavorite = useAppStore((s) => s.toggleRhythmFavorite);
  const editRhythmPattern = useAppStore((s) => s.editRhythmPattern);

  const getSourceClass = (src) => src === '自作曲' || src === 'original' ? 'badge-source--original' : 'badge-source--reference';
  const getPrefClass = (pref) => pref === '好き' || pref === 'like' ? 'badge-pref--like' : 'badge-pref--dislike';
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

  const sourceClass = getSourceClass(pattern.source);
  const prefClass = getPrefClass(pattern.preference);

  const [showHistory, setShowHistory] = useState(false);

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
  // アウフタクトがある場合はマイナス（-0.25, -0.5...）からスタートする
  const gridLines = [];
  const startBeat = Math.floor(minTime * 4);
  const endBeat = Math.ceil(maxTime * 4);
  for (let i = startBeat; i <= endBeat; i++) {
    const beatTime = i * 0.25;
    gridLines.push(beatTime);
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
          <span className="dict-card__play-btn" style={{ background: isPlaying ? 'var(--accent-orange)' : '', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer' }}>
            {isPlaying ? <StopCircleIcon style={{ width: '20px', height: '20px', color: 'white' }} /> : <PlayCircleIcon style={{ width: '20px', height: '20px' }} />}
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
            <span className="dict-card__id" style={{ 
              whiteSpace: 'nowrap', 
              overflow: 'hidden', 
              textOverflow: 'ellipsis', 
              maxWidth: '180px',
              display: 'inline-block',
              verticalAlign: 'bottom'
            }} title={pattern.id || pattern.description || 'Rhythm'}>
              {pattern.id || pattern.description || 'Rhythm'}
            </span>
            {pattern.description && pattern.description !== '自動抽出パターン' && (
              <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{pattern.description}</span>
            )}
          </div>
          {pattern.count > 1 && (
            <span className="badge badge--orange" style={{ flexShrink: 0 }}>×{pattern.count}</span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleRhythmFavorite(pattern.id);
            }}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px', fontSize: '1.1rem', color: pattern.is_favorite ? '#f5a623' : 'var(--text-tertiary)', lineHeight: 1 }}
            title={pattern.is_favorite ? 'お気に入りを解除' : 'お気に入りに登録'}
          >
            {pattern.is_favorite ? '★' : '☆'}
          </button>
          <button 
            className="btn btn--sm btn--ghost" 
            style={{ color: 'var(--text-secondary)', padding: '4px', background: 'transparent', border: 'none', cursor: 'pointer' }}
            onClick={(e) => {
              e.stopPropagation();
              setIsEditing(true);
            }}
            title="タグを編集"
          >
            <PencilIcon style={{ width: '18px', height: '18px' }} />
          </button>
          <button 
            className="btn btn--sm btn--ghost" 
            style={{ color: '#ef4444', padding: '4px', background: 'transparent', border: 'none', cursor: 'pointer' }}
            onClick={(e) => {
              e.stopPropagation();
              if (window.confirm('このリズムパターンを削除しますか？')) {
                useAppStore.getState().removeRhythmPattern(pattern.id);
              }
            }}
            title="削除"
          >
            <TrashIcon style={{ width: '18px', height: '18px' }} />
          </button>
        </div>
      </div>

      <div className="dict-card__visual" style={{ padding: '24px 16px' }}>
        <div className="rhythm-timeline">
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
            // シンコペーション（食い）の判定
            // オフビートで始まり、拍の境界（0.25の倍数）をまたぐノート
            const start = t.normalizedTime;
            const end = start + t.normalizedDuration;
            const isOffBeat = Math.abs(start % 0.25) > 0.01 && Math.abs((start % 0.25) - 0.25) > 0.01;
            const crossesBeat = Math.floor(start / 0.25) < Math.floor((end - 0.01) / 0.25);
            const isSyncopated = isOffBeat && crossesBeat;

            return (
              <div
                key={i}
                className="rhythm-timeline__block"
                style={{
                  left: `${getLeftPct(t.normalizedTime)}%`,
                  width: `${Math.max(1, getWidthPct(t.normalizedDuration))}%`,
                  background: isSyncopated ? 'var(--accent-orange)' : undefined,
                  boxShadow: isSyncopated ? '0 0 8px rgba(245, 166, 35, 0.4)' : undefined,
                  borderRadius: '4px',
                }}
                title={isSyncopated ? 'シンコペーション（食い）' : ''}
              />
            );
          })}
        </div>
      </div>

      <div className="dict-card__meta" style={{ justifyContent: 'flex-end', gap: '8px' }}>
        <div style={{ display: 'flex', gap: '4px' }}>
          <span className={`badge-tag ${sourceClass}`}>{pattern.source === 'original' ? '自作曲' : pattern.source}</span>
          <span className={`badge-tag ${prefClass}`}>{pattern.preference === 'like' ? '好き' : pattern.preference}</span>
          {pattern.section && (
            <span className={`badge-tag ${getSectionClass(pattern.section)}`}>
              {pattern.section.replace('_', ' ')}
            </span>
          )}
        </div>
        {pattern.history && pattern.history.length > 1 && (
          <button 
            className="btn btn--sm btn--ghost" 
            style={{ padding: '2px 6px', fontSize: '0.75rem', height: 'auto', minHeight: 'unset', color: 'var(--accent-orange)' }}
            onClick={(e) => {
              e.stopPropagation();
              setShowHistory(true);
            }}
          >
            +他{pattern.history.length - 1}件
          </button>
        )}
      </div>

      {showHistory && (
        <div className="modal-overlay" onClick={(e) => { e.stopPropagation(); setShowHistory(false); }} style={{ zIndex: 9999 }}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px', width: '90%' }}>
            <div className="modal-header">
              <h2 style={{ fontSize: '1.2rem', margin: 0 }}>ストック履歴</h2>
              <button className="modal-close" onClick={() => setShowHistory(false)}>×</button>
            </div>
            <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
              <p style={{ marginBottom: '16px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                このパターンは以下の楽曲・セクションでストックされています。
              </p>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {(pattern.history || []).map((h, i) => (
                  <li key={i} style={{ background: 'var(--bg-color)', padding: '12px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '0.95rem' }}>{h.song_title || '不明な楽曲'}</div>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <span className={`badge-tag ${getSourceClass(h.source)}`}>{h.source}</span>
                      <span className={`badge-tag ${getPrefClass(h.preference)}`}>{h.preference}</span>
                      {h.section && <span className={`badge-tag ${getSectionClass(h.section)}`}>{h.section}</span>}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {isEditing && (
        <EditTagsModal
          pattern={pattern}
          type="rhythm"
          onSave={editRhythmPattern}
          onClose={() => setIsEditing(false)}
        />
      )}
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
