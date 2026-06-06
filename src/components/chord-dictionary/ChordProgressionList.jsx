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
    <div className="chord-block">
      <div className="chord-block__header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button 
            className="list-item__play-btn"
            onClick={onTogglePlay}
            title={isPlaying ? "停止" : "再生"}
          >
            {isPlaying ? '■' : '▶'}
          </button>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span className="chord-block__label">{progression.id || progression.label || 'Chord Progression'}</span>
            {progression.label && progression.label !== '新規コード進行 (from C)' && !progression.label.startsWith('新規コード進行') && (
              <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{progression.label}</span>
            )}
          </div>
          {progression.count > 1 && (
            <span className="badge badge--orange">×{progression.count}</span>
          )}
        </div>
        <span className="badge">{progression.key}</span>
      </div>
      
      <div className="chord-block__progression">
        {(progression.chords || []).map((chord, i) => (
          <span key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="chord-block__chord">{chord}</span>
            {i < (progression.chords || []).length - 1 && (
              <span className="chord-block__arrow">→</span>
            )}
          </span>
        ))}
      </div>
      
      <div className="chord-block__meta" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span className={`badge-tag ${sourceClass}`}>{progression.source === 'original' ? '自作曲' : progression.source}</span>
          <span className={`badge-tag ${prefClass}`}>{progression.preference === 'like' ? '好き' : progression.preference}</span>
        </div>
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          {progression.sections?.map((sec, i) => sec ? (
            <span key={i} className={`badge-tag ${getSectionClass(sec)}`}>
              {sec.replace('_', ' ')}
            </span>
          ) : null)}
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
            onClick={() => {
              if (window.confirm('このコード進行を削除しますか？')) {
                useAppStore.getState().removeChordProgression(progression.id);
              }
            }}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px', fontSize: '0.9rem' }}
            title="削除"
          >
            🗑️
          </button>
        </div>
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
      {chordProgressions.length > 0 && (
        <div style={{ marginBottom: '16px', display: 'flex', gap: '8px' }}>
          <button
            className={`btn btn--sm ${filters.favoritesOnly ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilters(f => ({ ...f, favoritesOnly: !f.favoritesOnly }))}
            style={{ fontSize: '0.85rem' }}
          >
            ★ お気に入りのみ{filters.favoritesOnly ? ' (表示中)' : ''}
          </button>
        </div>
      )}
      <div className="stagger">
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
          <div className="empty-state">
            <span className="empty-state__icon">♬</span>
            <span className="empty-state__text">データがありません</span>
          </div>
        )}
      </div>
    </div>
  );
}
