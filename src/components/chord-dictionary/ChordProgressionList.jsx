import { useState } from 'react';
import useAppStore from '../../store/useAppStore';
import { playChordProgression, stopAudio } from '../../utils/audioPlayer';

function ChordProgressionItem({ progression, isPlaying, onTogglePlay }) {
  const sourceLabel = progression.source === 'original' ? '自作曲' : 'リファレンス';
  const prefLabel = progression.preference === 'like' ? '好き' : '嫌い';

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
          <span className="chord-block__label">{progression.label}</span>
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
          <span>{sourceLabel}</span>
          <span>·</span>
          <span>{prefLabel}</span>
        </div>
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          {progression.sections?.map((sec, i) => (
            <span key={i} className="section-chip section-chip--small">
              {sec ? sec.replace('_', ' ').toUpperCase() : ''}
            </span>
          ))}
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

export default function ChordProgressionList({ searchQuery = '' }) {
  const chordProgressions = useAppStore((s) => s.chordProgressions) || [];
  const [playingId, setPlayingId] = useState(null);
  
  const filtered = chordProgressions.filter((prog) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (prog.label || '').toLowerCase().includes(q) ||
      (prog.chords || []).join(' ').toLowerCase().includes(q) ||
      (prog.key || '').toLowerCase().includes(q)
    );
  });

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
    <div className="stagger">
      {filtered.length > 0 ? (
        filtered.map((prog) => (
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
  );
}

export function ChordSearchFilter({ value, onChange }) {
  return (
    <div className="search-bar">
      <span className="search-bar__icon">⌕</span>
      <input
        className="search-bar__input"
        type="text"
        placeholder="コード進行を検索（例: Am, 小室, ツーファイブ）"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
