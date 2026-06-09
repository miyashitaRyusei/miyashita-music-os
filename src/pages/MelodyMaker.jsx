import { useState, useMemo } from 'react';
import useAppStore from '../store/useAppStore';
import { playCombinedSequence, stopAudio } from '../utils/audioPlayer';
import { PlayIcon, BookmarkIcon, TrashIcon, PuzzlePieceIcon } from '@heroicons/react/24/outline';
import { PlayIcon as PlayIconSolid, StopIcon as StopIconSolid } from '@heroicons/react/24/solid';
import RhythmPatternCanvas from '../components/rhythm-dictionary/RhythmPatternCanvas';

export default function MelodyMaker() {
  const { 
    pitchPatterns, 
    rhythmPatterns, 
    generatedMelodies,
    saveGeneratedMelody,
    removeGeneratedMelody,
    registeredSongs
  } = useAppStore();

  const [baseType, setBaseType] = useState('pitch'); // 'pitch' or 'rhythm'
  const [selectedBaseId, setSelectedBaseId] = useState(null);
  const [selectedTargetId, setSelectedTargetId] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // ベースとなるパターンのリスト
  const basePatterns = useMemo(() => {
    return baseType === 'pitch' ? pitchPatterns : rhythmPatterns;
  }, [baseType, pitchPatterns, rhythmPatterns]);

  // 選択されたベースパターン
  const selectedBase = useMemo(() => {
    if (!selectedBaseId) return null;
    return basePatterns.find(p => p.id === selectedBaseId);
  }, [basePatterns, selectedBaseId]);

  // ベースの音数
  const baseNoteCount = useMemo(() => {
    if (!selectedBase) return 0;
    return baseType === 'pitch' ? (selectedBase.degrees || []).length : (selectedBase.timings || []).length;
  }, [selectedBase, baseType]);

  // 相方となるパターンのリスト（音数が一致するものだけ）
  const targetPatterns = useMemo(() => {
    if (!selectedBase) return [];
    if (baseType === 'pitch') {
      return rhythmPatterns.filter(r => (r.timings || []).length === baseNoteCount);
    } else {
      return pitchPatterns.filter(p => (p.degrees || []).length === baseNoteCount);
    }
  }, [selectedBase, baseType, pitchPatterns, rhythmPatterns, baseNoteCount]);

  // 選択されたターゲットパターン
  const selectedTarget = useMemo(() => {
    if (!selectedTargetId) return null;
    if (baseType === 'pitch') {
      return rhythmPatterns.find(r => r.id === selectedTargetId);
    } else {
      return pitchPatterns.find(p => p.id === selectedTargetId);
    }
  }, [baseType, rhythmPatterns, pitchPatterns, selectedTargetId]);

  const handleBaseSelect = (id) => {
    setSelectedBaseId(id);
    setSelectedTargetId(null);
    stopAudio();
    setIsPlaying(false);
  };

  const handleTargetSelect = (id) => {
    setSelectedTargetId(id);
    stopAudio();
    setIsPlaying(false);
  };

  const handlePlayCombination = () => {
    if (!selectedBase || !selectedTarget) return;
    
    if (isPlaying) {
      stopAudio();
      setIsPlaying(false);
      return;
    }

    setIsPlaying(true);
    const pitch = baseType === 'pitch' ? selectedBase : selectedTarget;
    const rhythm = baseType === 'pitch' ? selectedTarget : selectedBase;

    playCombinedSequence(pitch.degrees, rhythm.timings, () => {
      setIsPlaying(false);
    });
  };

  const handleSave = () => {
    if (!selectedBase || !selectedTarget) return;
    const pitchId = baseType === 'pitch' ? selectedBase.id : selectedTarget.id;
    const rhythmId = baseType === 'pitch' ? selectedTarget.id : selectedBase.id;
    
    // 既に保存済みかチェック
    const isAlreadySaved = generatedMelodies.some(m => m.pitch_pattern_id === pitchId && m.rhythm_pattern_id === rhythmId);
    if (isAlreadySaved) {
      alert('この組み合わせは既に保存されています！');
      return;
    }

    saveGeneratedMelody(pitchId, rhythmId);
  };

  const renderPitchCard = (pattern, isSelected, onClick) => {
    const song = registeredSongs.find(s => s.id === pattern.songId);
    return (
      <div 
        key={pattern.id}
        className={`dict-card ${isSelected ? 'selected' : ''}`}
        onClick={() => onClick(pattern.id)}
        style={{ cursor: 'pointer', border: isSelected ? '2px solid var(--accent-blue)' : 'none' }}
      >
        <div className="dict-card__header">
          <div className="dict-card__title">{song?.title || '不明な楽曲'}</div>
        </div>
        <div className="dict-card__body">
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '8px' }}>
            {(pattern.degrees || []).map((deg, i) => (
              <span key={i} className="pitch-badge">{deg}</span>
            ))}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>音数: {(pattern.degrees || []).length}音</div>
        </div>
      </div>
    );
  };

  const renderRhythmCard = (pattern, isSelected, onClick) => {
    const song = registeredSongs.find(s => s.id === pattern.songId);
    return (
      <div 
        key={pattern.id}
        className={`dict-card ${isSelected ? 'selected' : ''}`}
        onClick={() => onClick(pattern.id)}
        style={{ cursor: 'pointer', border: isSelected ? '2px solid var(--accent-orange)' : 'none' }}
      >
        <div className="dict-card__header">
          <div className="dict-card__title">{song?.title || '不明な楽曲'}</div>
        </div>
        <div className="dict-card__body" style={{ height: '60px', position: 'relative' }}>
          <RhythmPatternCanvas timings={pattern.timings || []} height={60} isPlaying={false} currentProgress={0} />
        </div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '8px' }}>音数: {(pattern.timings || []).length}音</div>
      </div>
    );
  };

  return (
    <div className="page-container" style={{ padding: '24px', display: 'flex', flexDirection: 'column', height: '100vh', boxSizing: 'border-box' }}>
      <header className="page-header" style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <PuzzlePieceIcon style={{ width: '28px', height: '28px', color: 'var(--accent-purple)' }} />
        <h1 style={{ margin: 0 }}>メロディメーカー</h1>
      </header>

      <div style={{ display: 'flex', gap: '24px', flex: 1, overflow: 'hidden' }}>
        
        {/* 左カラム：ベース選択 */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-secondary)', borderRadius: '12px', padding: '16px', overflow: 'hidden' }}>
          <h2 style={{ fontSize: '1.2rem', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>1. ベースを選ぶ</h2>
          
          <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
            <button 
              className={`btn ${baseType === 'pitch' ? 'btn--primary' : 'btn--ghost'}`}
              onClick={() => { setBaseType('pitch'); setSelectedBaseId(null); setSelectedTargetId(null); }}
            >
              ピッチから選ぶ
            </button>
            <button 
              className={`btn ${baseType === 'rhythm' ? 'btn--primary' : 'btn--ghost'}`}
              style={{ backgroundColor: baseType === 'rhythm' ? 'var(--accent-orange)' : '' }}
              onClick={() => { setBaseType('rhythm'); setSelectedBaseId(null); setSelectedTargetId(null); }}
            >
              リズムから選ぶ
            </button>
          </div>

          <div style={{ overflowY: 'auto', flex: 1, paddingRight: '8px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {basePatterns.map(pattern => 
                baseType === 'pitch' 
                  ? renderPitchCard(pattern, selectedBaseId === pattern.id, handleBaseSelect)
                  : renderRhythmCard(pattern, selectedBaseId === pattern.id, handleBaseSelect)
              )}
              {basePatterns.length === 0 && <p style={{ color: 'var(--text-secondary)' }}>辞書にデータがありません</p>}
            </div>
          </div>
        </div>

        {/* 中央カラム：ターゲット選択 */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-secondary)', borderRadius: '12px', padding: '16px', overflow: 'hidden' }}>
          <h2 style={{ fontSize: '1.2rem', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
            2. 相方を選ぶ {selectedBase ? `(音数: ${baseNoteCount}音)` : ''}
          </h2>
          
          {!selectedBase ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
              先にベースとなるパターンを選択してください
            </div>
          ) : (
            <div style={{ overflowY: 'auto', flex: 1, paddingRight: '8px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {targetPatterns.map(pattern => 
                  baseType === 'pitch' 
                    ? renderRhythmCard(pattern, selectedTargetId === pattern.id, handleTargetSelect)
                    : renderPitchCard(pattern, selectedTargetId === pattern.id, handleTargetSelect)
                )}
                {targetPatterns.length === 0 && <p style={{ color: 'var(--text-secondary)' }}>同じ音数のパターンがありません</p>}
              </div>
            </div>
          )}
        </div>

        {/* 右カラム：プレビューと保存済み */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '24px', overflow: 'hidden' }}>
          
          <div style={{ background: 'var(--bg-secondary)', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column' }}>
            <h2 style={{ fontSize: '1.2rem', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>3. プレビュー＆保存</h2>
            
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '20px', padding: '24px 0' }}>
              <button 
                className="btn btn--lg"
                style={{ 
                  borderRadius: '50%', 
                  width: '80px', 
                  height: '80px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  background: (selectedBase && selectedTarget) ? 'var(--accent-purple)' : 'var(--bg-color)',
                  opacity: (selectedBase && selectedTarget) ? 1 : 0.5,
                  cursor: (selectedBase && selectedTarget) ? 'pointer' : 'not-allowed'
                }}
                disabled={!selectedBase || !selectedTarget}
                onClick={handlePlayCombination}
              >
                {isPlaying ? <StopIconSolid style={{ width: '32px', height: '32px' }} /> : <PlayIconSolid style={{ width: '32px', height: '32px', marginLeft: '4px' }} />}
              </button>

              <button 
                className="btn btn--secondary"
                disabled={!selectedBase || !selectedTarget}
                onClick={handleSave}
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <BookmarkIcon style={{ width: '18px', height: '18px' }} />
                この組み合わせを保存
              </button>
            </div>
          </div>

          <div style={{ flex: 1, background: 'var(--bg-secondary)', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <h2 style={{ fontSize: '1.2rem', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>保存したメロディ</h2>
            
            <div style={{ overflowY: 'auto', flex: 1, paddingRight: '8px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {generatedMelodies.map(melody => {
                  const pitchPattern = pitchPatterns.find(p => p.id === melody.pitch_pattern_id);
                  const rhythmPattern = rhythmPatterns.find(r => r.id === melody.rhythm_pattern_id);
                  if (!pitchPattern || !rhythmPattern) return null;
                  
                  const noteCount = (pitchPattern.degrees || []).length;

                return (
                  <div key={melody.id} style={{ background: 'var(--bg-color)', borderRadius: '8px', padding: '12px', position: 'relative' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <div style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>{noteCount}音のメロディ</div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button 
                          className="btn btn--sm btn--ghost"
                          onClick={() => {
                            stopAudio();
                            playCombinedSequence(pitchPattern.degrees, rhythmPattern.timings);
                          }}
                        >
                          <PlayIcon style={{ width: '14px', height: '14px' }} />
                        </button>
                        <button 
                          className="btn btn--sm btn--ghost"
                          style={{ color: 'var(--accent-red)' }}
                          onClick={() => removeGeneratedMelody(melody.id)}
                        >
                          <TrashIcon style={{ width: '14px', height: '14px' }} />
                        </button>
                      </div>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div>🎵 ピッチ: {registeredSongs.find(s => s.id === pitchPattern.songId)?.title || '不明'}</div>
                      <div>🥁 リズム: {registeredSongs.find(s => s.id === rhythmPattern.songId)?.title || '不明'}</div>
                    </div>
                  </div>
                );
              })}
              {generatedMelodies.length === 0 && <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>保存されたメロディはありません</p>}
            </div>
          </div>
          </div>
        </div>

      </div>
    </div>
  );
}
