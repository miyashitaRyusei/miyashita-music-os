import { useState } from 'react';
import useAppStore from '../../store/useAppStore';
import { playPitchSequence, stopAudio } from '../../utils/audioPlayer';
import { useDictionaryFilter } from '../../hooks/useDictionaryFilter';
import CommonFilter from '../common/CommonFilter';
import PitchAdvancedFilter from './PitchAdvancedFilter';
import { TrashIcon, PlayCircleIcon, StopCircleIcon } from '@heroicons/react/24/outline';
import PitchPatternCanvas from './PitchPatternCanvas';

function PitchPatternItem({ pattern }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const togglePitchFavorite = useAppStore((s) => s.togglePitchFavorite);

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

  const [showHistory, setShowHistory] = useState(false);

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
          <span className="dict-card__play-btn" style={{ background: isPlaying ? 'var(--accent-orange)' : '', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer' }}>
            {isPlaying ? <StopCircleIcon style={{ width: '20px', height: '20px', color: 'white' }} /> : <PlayCircleIcon style={{ width: '20px', height: '20px' }} />}
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
            className="btn btn--sm btn--ghost" 
            style={{ color: '#ef4444', padding: '4px', background: 'transparent', border: 'none', cursor: 'pointer' }}
            onClick={(e) => {
              e.stopPropagation();
              if (window.confirm('このピッチパターンを削除しますか？')) {
                useAppStore.getState().removePitchPattern(pattern.id);
              }
            }}
            title="削除"
          >
            <TrashIcon style={{ width: '18px', height: '18px' }} />
          </button>
        </div>
      </div>

      <div className="dict-card__visual">
              </g>
            );
          })}
        </svg>
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
