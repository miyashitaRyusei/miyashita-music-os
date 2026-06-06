import { useState } from 'react';
import useAppStore from '../store/useAppStore';
import ChordInputArea from '../components/workspace/ChordInputArea';
import PianoRollCanvas from '../components/workspace/PianoRollCanvas';
import StockControls from '../components/workspace/StockControls';
import { transposeChordProgression, transposeChord } from '../utils/chordTransposer';
import { midiToPitchClassKatakana } from '../utils/noteUtils';

export default function Workspace() {
  const {
    stockAttributes,
    parsedChords,
    extractedPitch,
    extractedRhythm,
    addPitchPattern,
    addRhythmPattern,
    addChordProgression,
    addMelodyChordRelation,
    midiData,
    activeSongId,
    registeredSongs,
    pitchPatterns,
    rhythmPatterns,
    chordProgressions,
  } = useAppStore();

  const [toastMessage, setToastMessage] = useState('');

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const handleStockPitchAndRhythm = () => {
    if (extractedPitch.length === 0 || extractedRhythm.length === 0) {
      showToast('⚠️ ピアノロールでノートを選択してください');
      return;
    }
    
    const song = registeredSongs.find(s => s.id === activeSongId);
    const songTitle = song ? song.title : (midiData?.name || '未設定楽曲');

    // ピッチの連番生成
    const pitchMax = pitchPatterns.reduce((max, p) => {
      const match = String(p.id).match(/#(\d+)$/);
      return match ? Math.max(max, parseInt(match[1], 10)) : max;
    }, 0);
    const pitchId = `${songTitle} - ピッチ #${String(pitchMax + 1).padStart(3, '0')}`;

    // リズムの連番生成
    const rhythmMax = rhythmPatterns.reduce((max, r) => {
      const match = String(r.id).match(/#(\d+)$/);
      return match ? Math.max(max, parseInt(match[1], 10)) : max;
    }, 0);
    const rhythmId = `${songTitle} - リズム #${String(rhythmMax + 1).padStart(3, '0')}`;

    addPitchPattern({
      id: pitchId,
      degrees: extractedPitch,
      source: stockAttributes.source,
      preference: stockAttributes.preference,
      section: stockAttributes.section,
      songId: activeSongId,
    });
    addRhythmPattern({
      id: rhythmId,
      timings: extractedRhythm,
      description: '自動抽出パターン',
      source: stockAttributes.source,
      preference: stockAttributes.preference,
      section: stockAttributes.section,
      songId: activeSongId,
    });
    showToast('✅ ピッチ＆リズム辞書にストックしました');
  };

  const handleStockChord = () => {
    if (parsedChords.length === 0) {
      showToast('⚠️ コードを入力してください');
      return;
    }
    // parsedChords からコード名のフラットな配列を作成
    const flatChords = parsedChords.flatMap((m) => m.chords.map((c) => c.name));
    
    // Cメジャーに移調
    const transposedChords = transposeChordProgression(flatChords, stockAttributes.originalKey);
    
    const song = registeredSongs.find(s => s.id === activeSongId);
    const songTitle = song ? song.title : (midiData?.name || '未設定楽曲');

    // コードの連番生成
    const chordMax = chordProgressions.reduce((max, c) => {
      const match = String(c.id).match(/#(\d+)$/);
      return match ? Math.max(max, parseInt(match[1], 10)) : max;
    }, 0);
    const chordId = `${songTitle} - コード #${String(chordMax + 1).padStart(3, '0')}`;

    addChordProgression({
      id: chordId,
      chords: transposedChords,
      label: `新規コード進行 (from ${stockAttributes.originalKey})`,
      key: 'C', // 常にCメジャー（正規化後）
      source: stockAttributes.source,
      preference: stockAttributes.preference,
      sections: [stockAttributes.section], // UPSERT対応のため配列
      songId: activeSongId,
    });
    showToast('✅ コード辞書にストックしました（Cメジャーに移調済）');
  };

  const handleStockMelodyChordRelations = () => {
    if (parsedChords.length === 0) {
      showToast('⚠️ コードを入力してください');
      return;
    }
    if (!midiData || !midiData.notes || midiData.notes.length === 0) {
      showToast('⚠️ ピアノロールにMIDIを読み込んでください');
      return;
    }

    const measureDuration = midiData.measureDuration || 2.0; // デフォルト2秒
    const originalKey = stockAttributes.originalKey;
    const song = registeredSongs.find(s => s.id === activeSongId);
    const songTitle = song ? song.title : (midiData.name || '未設定楽曲');

    let relationCount = 0;

    parsedChords.forEach((m) => {
      const chordsInMeasure = m.chords.length;
      if (chordsInMeasure === 0) return;
      const timePerChord = measureDuration / chordsInMeasure;
      
      m.chords.forEach((chord, i) => {
        const chordTime = (m.measure - 1) * measureDuration + i * timePerChord;
        
        // chordTimeの瞬間に鳴っているノートを探す
        // 同時鳴りの場合は一番高い音（メロディライン）を優先する
        const soundingNotes = midiData.notes.filter(
          n => n.time <= chordTime + 0.05 && n.time + n.duration >= chordTime - 0.05
        );

        if (soundingNotes.length > 0) {
          // 最も高いピッチを選ぶ
          const highestNote = soundingNotes.reduce((prev, current) => (prev.midi > current.midi) ? prev : current);
          
          // ノートのピッチをCメジャー基準の階名に変換
          // (一度Cメジャーへの差分を計算してから階名にする)
          const keyOffsets = {
            'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4,
            'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11
          };
          const offset = keyOffsets[originalKey] || 0;
          const transposedMidi = highestNote.midi - offset;
          const degree = midiToPitchClassKatakana(transposedMidi);
          
          const transposedChord = transposeChord(chord.name, originalKey);
          
          const relationId = `${songTitle}-${m.measure}-${i}-${Date.now()}`;

          addMelodyChordRelation({
            id: relationId,
            songId: activeSongId,
            melodyDegree: degree,
            chordName: transposedChord,
            source: stockAttributes.source,
            preference: stockAttributes.preference,
            section: stockAttributes.section,
          });
          relationCount++;
        }
      });
    });

    if (relationCount > 0) {
      showToast(`✅ ${relationCount}件の「メロディ×コード」ペアをストックしました`);
    } else {
      showToast('⚠️ コードの切り替わりタイミングで鳴っているメロディが見つかりませんでした');
    }
  };

  return (
    <div className="page animate-fade-in">
      <div className="page__header">
        <h1 className="page__title">作業場エディタ</h1>
        <p className="page__subtitle">MIDIの読み込み・フレーズの切り出し・コードの手入力</p>
      </div>

      {/* ピアノロールコンテナ */}
      <div className="workspace-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span className="workspace-section__label">ピアノロール（ドラッグ＆ドロップでMIDI読み込み）</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="workspace-attr-label" style={{ marginBottom: 0 }}>Original Key</span>
              <select 
                className="input" 
                style={{ width: '80px', padding: '4px 8px' }}
                value={stockAttributes.originalKey} 
                onChange={(e) => useAppStore.getState().setStockOriginalKey(e.target.value)}
              >
                {['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'].map(k => (
                  <option key={k} value={k}>{k}</option>
                ))}
              </select>
            </div>
            <button className="btn btn--primary" onClick={handleStockPitchAndRhythm}>
              ♫ ピッチ＆リズム辞書へストック
            </button>
          </div>
        </div>
        <PianoRollCanvas />
      </div>

      {/* コード入力エリア */}
      <div className="workspace-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '8px' }}>
          <span className="workspace-section__label">コード進行入力（小節は「|」で区切る）</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button className="btn btn--outline" onClick={handleStockMelodyChordRelations}>
              🎵 メロディ×コード関係性を抽出
            </button>
            <button className="btn btn--primary" onClick={handleStockChord}>
              🎹 コード辞書へストック
            </button>
          </div>
        </div>
        <ChordInputArea />
      </div>

      {/* 属性設定 */}
      <div className="workspace-section">
        <span className="workspace-section__label">ストック属性の設定</span>
        <StockControls />
      </div>

      {/* トースト通知 */}
      {toastMessage && (
        <div className="toast">
          {toastMessage}
        </div>
      )}
    </div>
  );
}
