import { useState, useMemo } from 'react';
import useAppStore from '../store/useAppStore';
import { playCombinedSequence, stopAudio } from '../utils/audioPlayer';
import { generateMidiBlob, downloadMidiBlob } from '../utils/midiExporter';
import { PlayIcon, BookmarkIcon, TrashIcon, PuzzlePieceIcon, SparklesIcon, ArrowDownTrayIcon, DocumentArrowDownIcon } from '@heroicons/react/24/outline';
import { PlayIcon as PlayIconSolid, StopIcon as StopIconSolid } from '@heroicons/react/24/solid';
import RhythmPatternCanvas from '../components/rhythm-dictionary/RhythmPatternCanvas';
import PitchPatternCanvas from '../components/pitch-dictionary/PitchPatternCanvas';

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
  
  // 新機能: ベースの音数フィルタリングとテンポ調整
  const [baseNoteCountFilter, setBaseNoteCountFilter] = useState('');
  const [baseTagFilter, setBaseTagFilter] = useState('');
  const [tempo, setTempo] = useState(120);

  // 利用可能なすべてのタグを抽出
  const availableTags = useMemo(() => {
    const tags = new Set();
    const addTags = (p) => {
      if (p.source) tags.add(p.source);
      if (p.preference) tags.add(p.preference);
      if (p.section) tags.add(p.section);
      if (Array.isArray(p.sections)) p.sections.forEach(s => tags.add(s));
    };
    pitchPatterns.forEach(addTags);
    rhythmPatterns.forEach(addTags);
    return [...tags].filter(t => t);
  }, [pitchPatterns, rhythmPatterns]);

  // 利用可能な音数のリスト（ピッチとリズム両方に存在する音数のみ）
  const availableNoteCounts = useMemo(() => {
    const pitchCounts = new Set(pitchPatterns.map(p => (p.degrees || []).length).filter(c => c > 0));
    const rhythmCounts = new Set(rhythmPatterns.map(r => (r.timings || []).length).filter(c => c > 0));
    
    // 両方に存在する音数だけを抽出
    const commonCounts = [...pitchCounts].filter(c => rhythmCounts.has(c));
    return commonCounts.sort((a, b) => a - b);
  }, [pitchPatterns, rhythmPatterns]);

  // ベースパターンのリスト（音数でフィルタリング対応）
  const basePatterns = useMemo(() => {
    let patterns = baseType === 'pitch' ? pitchPatterns : rhythmPatterns;
    if (baseNoteCountFilter !== '') {
      const targetCount = parseInt(baseNoteCountFilter, 10);
      patterns = patterns.filter(p => {
        const count = baseType === 'pitch' ? (p.degrees || []).length : (p.timings || []).length;
        return count === targetCount;
      });
    }
    
    if (baseTagFilter !== '') {
      patterns = patterns.filter(p => {
        const hasSource = p.source === baseTagFilter;
        const hasPref = p.preference === baseTagFilter;
        const hasSection = p.section === baseTagFilter || (Array.isArray(p.sections) && p.sections.includes(baseTagFilter));
        return hasSource || hasPref || hasSection;
      });
    }
    
    return patterns;
  }, [baseType, pitchPatterns, rhythmPatterns, baseNoteCountFilter, baseTagFilter]);

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

  const handleBaseTypeSwitch = (type) => {
    setBaseType(type);
    setSelectedBaseId(null);
    setSelectedTargetId(null);
    stopAudio();
    setIsPlaying(false);
  };

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

  const handlePlayCombo = async () => {
    if (!selectedBase || !selectedTarget) return;
    
    if (isPlaying) {
      stopAudio();
      setIsPlaying(false);
      return;
    }

    setIsPlaying(true);
    const pitch = baseType === 'pitch' ? selectedBase : selectedTarget;
    const rhythm = baseType === 'pitch' ? selectedTarget : selectedBase;

    await playCombinedSequence(pitch.degrees, rhythm.timings, tempo, () => {
      setIsPlaying(false);
    });
  };

  const handleRandomGenerate = () => {
    stopAudio();
    setIsPlaying(false);
    
    // フィルターが空なら共通の音数からランダムに1つ選ぶ、指定されていればそれを使う
    let targetCount = baseNoteCountFilter ? parseInt(baseNoteCountFilter, 10) : null;
    
    if (!targetCount) {
      if (availableNoteCounts.length === 0) {
        alert('組み合わせ可能なパターンがありません！辞書にデータを追加してください。');
        return;
      }
      targetCount = availableNoteCounts[Math.floor(Math.random() * availableNoteCounts.length)];
    }
    
    // 選ばれた音数に一致するピッチとリズムのリストを取得（タグフィルタも考慮）
    const matchTag = (p) => {
      if (!baseTagFilter) return true;
      const hasSource = p.source === baseTagFilter;
      const hasPref = p.preference === baseTagFilter;
      const hasSection = p.section === baseTagFilter || (Array.isArray(p.sections) && p.sections.includes(baseTagFilter));
      return hasSource || hasPref || hasSection;
    };

    const availablePitches = pitchPatterns.filter(p => (p.degrees || []).length === targetCount && matchTag(p));
    const availableRhythms = rhythmPatterns.filter(r => (r.timings || []).length === targetCount && matchTag(r));
    
    if (availablePitches.length === 0 || availableRhythms.length === 0) {
      alert('その音数の組み合わせが見つかりませんでした。');
      return;
    }
    
    // ランダムに1つずつ選択
    const randomPitch = availablePitches[Math.floor(Math.random() * availablePitches.length)];
    const randomRhythm = availableRhythms[Math.floor(Math.random() * availableRhythms.length)];
    
    // baseType に合わせて ID をセット
    if (baseType === 'pitch') {
      setSelectedBaseId(randomPitch.id);
      setSelectedTargetId(randomRhythm.id);
    } else {
      setSelectedBaseId(randomRhythm.id);
      setSelectedTargetId(randomPitch.id);
    }
    
    // UIの更新を待ってから再生＆スクロール
    setTimeout(async () => {
      // 選択されたカードまでスクロール
      const baseEl = document.getElementById(`base-card-${baseType === 'pitch' ? randomPitch.id : randomRhythm.id}`);
      if (baseEl) baseEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      
      const targetEl = document.getElementById(`target-card-${baseType === 'pitch' ? randomRhythm.id : randomPitch.id}`);
      if (targetEl) targetEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

      setIsPlaying(true);
      await playCombinedSequence(randomPitch.degrees, randomRhythm.timings, tempo, () => {
        setIsPlaying(false);
      });
    }, 100);
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

  const handleExportMidi = (pitchDegrees, rhythmTimings, defaultFilename) => {
    try {
      const blob = generateMidiBlob(pitchDegrees, rhythmTimings, tempo);
      downloadMidiBlob(blob, defaultFilename);
    } catch (e) {
      console.error(e);
      alert('MIDIの生成に失敗しました。');
    }
  };

  const handleDragStartMidi = (e, pitchDegrees, rhythmTimings, defaultFilename) => {
    try {
      const blob = generateMidiBlob(pitchDegrees, rhythmTimings, tempo);
      const url = URL.createObjectURL(blob);
      e.dataTransfer.setData('DownloadURL', `audio/midi:${defaultFilename}:${url}`);
      e.dataTransfer.effectAllowed = 'copy';
    } catch (err) {
      console.error(err);
    }
  };

  const renderPitchCard = (pattern, isSelected, onClick, idPrefix = 'card') => {
    const song = registeredSongs.find(s => s.id === pattern.songId);
    return (
      <div 
        key={pattern.id}
        id={`${idPrefix}-${pattern.id}`}
        className={`dict-card ${isSelected ? 'selected' : ''}`}
        onClick={() => onClick(pattern.id)}
        style={{ cursor: 'pointer', border: isSelected ? '2px solid var(--accent-blue)' : 'none', minHeight: '120px' }}
      >
        <div className="dict-card__header">
          <div className="dict-card__title">{song?.title || '不明な楽曲'}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>音数: {(pattern.degrees || []).length}音</div>
        </div>
        <div className="dict-card__body" style={{ height: '80px', position: 'relative' }}>
          <PitchPatternCanvas degrees={pattern.degrees || []} id={pattern.id} height={80} />
        </div>
      </div>
    );
  };

  const renderRhythmCard = (pattern, isSelected, onClick, idPrefix = 'card') => {
    const song = registeredSongs.find(s => s.id === pattern.songId);
    return (
      <div 
        key={pattern.id}
        id={`${idPrefix}-${pattern.id}`}
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
      <header className="page-header" style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <PuzzlePieceIcon style={{ width: '28px', height: '28px', color: 'var(--accent-purple)' }} />
          <h1 style={{ margin: 0 }}>メロディメーカー</h1>
        </div>
        
        <button 
          className="btn" 
          onClick={handleRandomGenerate}
          style={{ 
            background: 'var(--accent-purple)', 
            color: 'white', 
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 20px',
            borderRadius: '24px',
            boxShadow: '0 2px 8px rgba(105, 64, 165, 0.25)',
            fontWeight: '600'
          }}
        >
          <SparklesIcon style={{ width: '20px', height: '20px' }} />
          <span>おまかせ生成</span>
        </button>
      </header>

      <div style={{ display: 'flex', gap: '24px', flex: 1, overflow: 'hidden' }}>
        
        {/* 左カラム：ベース選択 */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-secondary)', borderRadius: '12px', padding: '16px', overflow: 'hidden' }}>
          <h2 style={{ fontSize: '1.2rem', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>1. ベースを選ぶ</h2>
          
          <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexDirection: 'column' }}>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                className={`btn ${baseType === 'pitch' ? 'btn--primary' : 'btn--outline'}`}
                onClick={() => handleBaseTypeSwitch('pitch')}
                style={{ flex: 1 }}
              >
                ピッチから選ぶ
              </button>
              <button 
                className={`btn ${baseType === 'rhythm' ? 'btn--primary' : 'btn--outline'}`}
                onClick={() => handleBaseTypeSwitch('rhythm')}
                style={{ flex: 1 }}
              >
                リズムから選ぶ
              </button>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>音数フィルタ:</span>
              <select 
                value={baseNoteCountFilter} 
                onChange={(e) => setBaseNoteCountFilter(e.target.value)}
                style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border-default)', background: 'var(--bg-color)', color: 'var(--text-primary)' }}
              >
                <option value="">すべて表示</option>
                {availableNoteCounts.map(count => (
                  <option key={count} value={count}>{count}音</option>
                ))}
              </select>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>タグフィルタ:</span>
              <select 
                value={baseTagFilter} 
                onChange={(e) => setBaseTagFilter(e.target.value)}
                style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border-default)', background: 'var(--bg-color)', color: 'var(--text-primary)', flex: 1 }}
              >
                <option value="">すべて表示</option>
                {availableTags.map(tag => (
                  <option key={tag} value={tag}>{tag}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ overflowY: 'auto', flex: 1, paddingRight: '8px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {basePatterns.map(pattern => 
                baseType === 'pitch' 
                  ? renderPitchCard(pattern, selectedBaseId === pattern.id, handleBaseSelect, 'base-card')
                  : renderRhythmCard(pattern, selectedBaseId === pattern.id, handleBaseSelect, 'base-card')
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
                    ? renderRhythmCard(pattern, selectedTargetId === pattern.id, handleTargetSelect, 'target-card')
                    : renderPitchCard(pattern, selectedTargetId === pattern.id, handleTargetSelect, 'target-card')
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
            
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '24px' }}>
              
              {/* テンポ調整 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%', maxWidth: '200px' }}>
                <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>BPM: {tempo}</span>
                <input 
                  type="range" 
                  min="60" 
                  max="240" 
                  value={tempo} 
                  onChange={(e) => setTempo(Number(e.target.value))}
                  style={{ flex: 1 }}
                />
              </div>

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
                onClick={handlePlayCombo}
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

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', marginTop: '16px', opacity: (selectedBase && selectedTarget) ? 1 : 0.5 }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>DAWへ直接ドラッグ＆ドロップ対応！</div>
                <button 
                  className="btn btn--outline"
                  disabled={!selectedBase || !selectedTarget}
                  draggable={selectedBase && selectedTarget}
                  onDragStart={(e) => {
                    const pitch = baseType === 'pitch' ? selectedBase : selectedTarget;
                    const rhythm = baseType === 'pitch' ? selectedTarget : selectedBase;
                    handleDragStartMidi(e, pitch.degrees, rhythm.timings, `melody_combo_${tempo}bpm.mid`);
                  }}
                  onClick={() => {
                    const pitch = baseType === 'pitch' ? selectedBase : selectedTarget;
                    const rhythm = baseType === 'pitch' ? selectedTarget : selectedBase;
                    handleExportMidi(pitch.degrees, rhythm.timings, `melody_combo_${tempo}bpm.mid`);
                  }}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: (selectedBase && selectedTarget) ? 'grab' : 'not-allowed', borderColor: 'var(--accent-blue)', color: 'var(--accent-blue)' }}
                >
                  <DocumentArrowDownIcon style={{ width: '18px', height: '18px' }} />
                  MIDIを書き出す (Drag me!)
                </button>
              </div>
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
                            playCombinedSequence(pitchPattern.degrees, rhythmPattern.timings, tempo);
                          }}
                        >
                          <PlayIcon style={{ width: '14px', height: '14px' }} />
                        </button>
                        <button 
                          className="btn btn--sm btn--ghost"
                          title="MIDIダウンロード (DAWにドラッグも可)"
                          draggable={true}
                          onDragStart={(e) => handleDragStartMidi(e, pitchPattern.degrees, rhythmPattern.timings, `saved_melody_${tempo}bpm.mid`)}
                          onClick={() => handleExportMidi(pitchPattern.degrees, rhythmPattern.timings, `saved_melody_${tempo}bpm.mid`)}
                        >
                          <ArrowDownTrayIcon style={{ width: '14px', height: '14px' }} />
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
