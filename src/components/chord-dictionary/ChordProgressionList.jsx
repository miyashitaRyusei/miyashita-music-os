import { useState } from 'react';
import useAppStore from '../../store/useAppStore';
import { playChordProgression, stopAudio } from '../../utils/audioPlayer';
import { useDictionaryFilter } from '../../hooks/useDictionaryFilter';
import CommonFilter from '../common/CommonFilter';
import ChordAdvancedFilter from './ChordAdvancedFilter';

function ChordProgressionItem({ progression, isPlaying, onTogglePlay }) {
  const toggleChordFavorite = useAppStore((s) => s.toggleChordFavorite);
  // バッジのスタイル計算
  const sourceClass = progression.source === '自作曲' || progression.source === 'original' ? 'badge-source--original' : 'badge-source--reference';
  const prefClass = progression.preference === '好き' || progression.preference === 'like' ? 'badge-pref--like' : 'badge-pref--dislike';
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

  return (
    <div className={`dict-card ${isPlaying ? 'dict-card--playing' : ''}`} onClick={onTogglePlay}>
      <div className="dict-card__header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="dict-card__play-btn" style={{ background: isPlaying ? 'var(--accent-orange)' : '' }}>
            {isPlaying ? '■' : '▶'}
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
            <span className="dict-card__id" style={{ 
              whiteSpace: 'nowrap', 
              overflow: 'hidden', 
              textOverflow: 'ellipsis', 
              maxWidth: '180px',
              display: 'inline-block',
              verticalAlign: 'bottom'
            }} title={progression.id || progression.label || 'Chord Progression'}>
              {progression.id || progression.label || 'Chord Progression'}
            </span>
            {progression.label && progression.label !== '新規コード進行 (from C)' && !progression.label.startsWith('新規コード進行') && (
              <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{progression.label}</span>
            )}
          </div>
          {progression.count > 1 && (
            <span className="badge badge--orange" style={{ flexShrink: 0 }}>×{progression.count}</span>
          )}
          <span className="badge" style={{ marginLeft: 'auto', flexShrink: 0 }}>{progression.key}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleChordFavorite(progression.id);
            }}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px', fontSize: '1.1rem', color: progression.is_favorite ? '#f5a623' : 'var(--text-tertiary)', lineHeight: 1 }}
            title={progression.is_favorite ? 'お気に入りを解除' : 'お気に入りに登録'}
          >
            {progression.is_favorite ? '★' : '☆'}
          </button>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              if (window.confirm('このコード進行を削除しますか？')) {
                useAppStore.getState().removeChordProgression(progression.id);
              }
            }}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: '4px', fontSize: '0.9rem' }}
            title="削除"
          >
            🗑️
          </button>
        </div>
      </div>
      
      <div className="dict-card__visual" style={{ padding: '24px 16px', display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', minHeight: '100px' }}>
        {(progression.chords || []).map((chord, i) => {
          const isMinor = chord.includes('m') || chord.includes('dim');
          return (
            <span key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="chord-block__chord" style={{ 
                borderLeft: isMinor ? '4px solid var(--accent-purple)' : '4px solid var(--accent-orange)',
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-default)',
                borderLeftWidth: '4px',
                fontSize: '1rem',
                minWidth: '48px',
                textAlign: 'center',
                padding: '8px 12px'
              }}>{chord}</span>
              {i < (progression.chords || []).length - 1 && (
                <span className="chord-block__arrow" style={{ opacity: 0.5 }}>→</span>
              )}
            </span>
          );
        })}
      </div>
      
      <div className="dict-card__meta" style={{ justifyContent: 'flex-end', gap: '8px' }}>
        <span className={`badge-tag ${sourceClass}`}>{progression.source === 'original' ? '自作曲' : progression.source}</span>
        <span className={`badge-tag ${prefClass}`}>{progression.preference === 'like' ? '好き' : progression.preference}</span>
        {progression.sections?.map((sec, i) => sec ? (
          <span key={i} className={`badge-tag ${getSectionClass(sec)}`}>
            {sec.replace('_', ' ')}
          </span>
        ) : null)}
      </div>
    </div>
  );
}

export default function ChordProgressionList() {
  const chordProgressions = useAppStore((s) => s.chordProgressions) || [];
  const { filters, setFilters, advancedFilters, setAdvancedFilters, filteredItems } = useDictionaryFilter(chordProgressions, 'chord');
  const [playingId, setPlayingId] = useState(null);

  const handlePlayToggle = async (progression) => {
    if (playingId === progression.id) {
      stopAudio();
      setPlayingId(null);
      return;
    }
    stopAudio();
    setPlayingId(progression.id);
    await playChordProgression(progression.chords || [], () => {
      setPlayingId((current) => current === progression.id ? null : current);
    });
  };

  return (
    <div>
      <CommonFilter filters={filters} setFilters={setFilters}>
        <ChordAdvancedFilter 
          advancedFilters={advancedFilters} 
          setAdvancedFilters={setAdvancedFilters} 
        />
      </CommonFilter>
      <div className="dict-grid">
        {filteredItems.length > 0 ? (
          filteredItems.map((prog) => (
            <ChordProgressionItem 
              key={prog.id} 
              progression={prog} 
              isPlaying={playingId === prog.id}
              onTogglePlay={() => handlePlayToggle(prog)}
            />
          ))
        ) : (
          <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
            <span className="empty-state__icon">♬</span>
            <span className="empty-state__text">データがありません</span>
          </div>
        )}
      </div>
    </div>
  );
}
