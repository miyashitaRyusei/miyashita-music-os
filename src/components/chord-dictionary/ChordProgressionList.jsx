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

  // ダイアトニックコード（Cメジャー基準）の判定
  const diatonicChords = [
    'C', 'Dm', 'Em', 'F', 'G', 'Am', 'Bdim', 
    'CM7', 'Cmaj7', 'Cmaj',
    'Dm7', 'Em7', 
    'FM7', 'Fmaj7', 'Fmaj',
    'G7', 'Am7', 
    'Bm7b5', 'Bm7-5'
  ];
  const isNonDiatonic = (chord) => {
    return !diatonicChords.includes(chord);
  };

  // コードを小節(4拍)ごとにチャンク化する
  const measures = [];
  let currentMeasure = [];
  let currentBeats = 0;
  
  (progression.chords || []).forEach(chordItem => {
    const chordName = typeof chordItem === 'string' ? chordItem : chordItem.name;
    const beats = typeof chordItem === 'string' ? 4 : (chordItem.beats || 4);
    
    // 現在の小節に入りきらない場合は次の小節へ（本来はタイで繋ぐべきですが簡易実装）
    if (currentBeats + beats > 4) {
      measures.push(currentMeasure);
      currentMeasure = [];
      currentBeats = 0;
    }
    
    currentMeasure.push({ name: chordName, beats });
    currentBeats += beats;
    
    if (currentBeats >= 4) {
      measures.push(currentMeasure);
      currentMeasure = [];
      currentBeats = 0;
    }
  });
  if (currentMeasure.length > 0) {
    measures.push(currentMeasure);
  }

  return (
    <div className={`dict-card ${isPlaying ? 'dict-card--playing' : ''}`} onClick={onTogglePlay}>
      <div className="dict-card__header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
          <span className="dict-card__play-btn" style={{ background: isPlaying ? 'var(--accent-orange)' : '' }}>
            {isPlaying ? '■' : '▶'}
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
            <span className="dict-card__id" style={{ 
              whiteSpace: 'nowrap', 
              overflow: 'hidden', 
              textOverflow: 'ellipsis', 
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
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '16px' }}>
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
      
      <div className="dict-card__visual" style={{ 
        padding: '24px 16px', 
        display: 'grid', 
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '8px', 
        background: 'var(--bg-primary)'
      }}>
        {measures.map((measure, mIndex) => (
          <div key={mIndex} style={{ 
            display: 'flex', 
            width: '100%', 
            height: '40px',
            border: '1px solid var(--border-strong)',
            borderRadius: '4px',
            overflow: 'hidden',
            background: 'var(--bg-secondary)',
            position: 'relative'
          }}>
            {/* 拍の区切り線（薄い点線） */}
            <div style={{ position: 'absolute', left: '25%', top: 0, bottom: 0, borderLeft: '1px dashed var(--border-default)', zIndex: 0 }} />
            <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, borderLeft: '1px dashed var(--border-default)', zIndex: 0 }} />
            <div style={{ position: 'absolute', left: '75%', top: 0, bottom: 0, borderLeft: '1px dashed var(--border-default)', zIndex: 0 }} />
            
            {measure.map((c, i) => (
              <div key={i} style={{ 
                width: `${(c.beats / 4) * 100}%`,
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRight: i < measure.length - 1 ? '1px solid var(--border-strong)' : 'none',
                background: isNonDiatonic(c.name) ? 'rgba(242, 153, 74, 0.1)' : 'var(--bg-primary)',
                color: isNonDiatonic(c.name) ? 'var(--accent-orange)' : 'var(--text-primary)',
                fontWeight: isNonDiatonic(c.name) ? 'bold' : '600',
                fontSize: '0.85rem',
                whiteSpace: 'nowrap',
                position: 'relative',
                zIndex: 1
              }}>
                {c.name}
              </div>
            ))}
          </div>
        ))}
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
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
