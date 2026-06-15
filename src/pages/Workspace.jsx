import { useState } from 'react';
import { Square3Stack3DIcon } from '@heroicons/react/24/outline';
import useAppStore from '../store/useAppStore';
import ChordInputArea from '../components/workspace/ChordInputArea';
import PianoRollCanvas from '../components/workspace/PianoRollCanvas';
import StockControls from '../components/workspace/StockControls';
import ExternalChordImportModal from '../components/workspace/ExternalChordImportModal';
import { transposeChord, getEffectiveKeyAtTime, getEffectiveKeyForMeasure, getTransposeOffset } from '../utils/chordTransposer';
import { midiToPitchClassKatakana, midiToDegreeName } from '../utils/noteUtils';

export default function Workspace() {
  const {
    stockAttributes,
    parsedChords,
    extractedPitch,
    extractedRhythm,
    selectedNotes,
    selectedRegion,
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
    selectedChordIndices,
    clearChordSelection,
  } = useAppStore();

  const [toastMessage, setToastMessage] = useState('');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const handleStockPitchAndRhythm = () => {
    if (extractedPitch.length === 0 || extractedRhythm.length === 0) {
      showToast('ピアノロールでノートを選択してください');
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

    // 転調を考慮したピッチのCメジャー移調
    const transposedPitch = extractedPitch.map(note => {
      const effectiveKey = getEffectiveKeyAtTime(note.time, midiData.measureDuration, parsedChords, stockAttributes.originalKey);
      const offset = getTransposeOffset(effectiveKey);
      return midiToDegreeName(note.midi - offset);
    });

    // 転調を考慮したリズムのCメジャー移調
    const transposedRhythm = extractedRhythm.map(note => {
      const effectiveKey = getEffectiveKeyAtTime(note.absoluteTime, midiData.measureDuration, parsedChords, stockAttributes.originalKey);
      const offset = getTransposeOffset(effectiveKey);
      return {
        ...note,
        degreeName: midiToDegreeName(note.midi - offset)
      };
    });

    addPitchPattern({
      id: pitchId,
      degrees: transposedPitch,
      source: stockAttributes.source,
      preference: stockAttributes.preference,
      section: stockAttributes.section,
      songId: activeSongId,
    });
    addRhythmPattern({
      id: rhythmId,
      timings: transposedRhythm,
      description: '自動抽出パターン',
      source: stockAttributes.source,
      preference: stockAttributes.preference,
      section: stockAttributes.section,
      songId: activeSongId,
    });
    showToast('ピッチ＆リズム辞書にストックしました');
  };

  const handleStockChord = () => {
    if (parsedChords.length === 0) {
      showToast('コードを入力してください');
      return;
    }

    if (!selectedChordIndices || selectedChordIndices.length === 0) {
      showToast('コードトラック上のバッジをクリックして、ストックしたいコードを選択してください');
      return;
    }

    const selectedChords = [];
    let flatIndex = 0;
    
    parsedChords.forEach((m, mIndex) => {
      const measureKey = getEffectiveKeyForMeasure(mIndex, parsedChords, stockAttributes.originalKey);
      m.chords.forEach((chord) => {
        if (selectedChordIndices.includes(flatIndex)) {
          // 4/4拍子を前提とし、1小節内のコード数で長さを均等分割する
          const beats = 4 / m.chords.length;
          selectedChords.push({
            name: transposeChord(chord.name, measureKey),
            beats: beats
          });
        }
        flatIndex++;
      });
    });

    if (selectedChords.length === 0) {
      showToast('選択されたコードが見つかりません');
      return;
    }
    
    // 移調済みのコードをそのまま使用
    const transposedChords = selectedChords;
    
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
    
    clearChordSelection();
    showToast('コード辞書にストックしました（Cメジャーに移調済）');
  };

  const handleStockMelodyChordRelations = async () => {
    if (parsedChords.length === 0) {
      showToast('コードを入力してください');
      return;
    }
    if (!midiData || !midiData.notes || midiData.notes.length === 0) {
      showToast('ピアノロールにMIDIを読み込んでください');
      return;
    }

    const measureDuration = midiData.measureDuration || 2.0; // デフォルト2秒
    const originalKey = stockAttributes.originalKey;
    const song = registeredSongs.find(s => s.id === activeSongId);
    const songTitle = song ? song.title : (midiData.name || '未設定楽曲');

    let relationCount = 0;
    const promises = [];

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
          
          // 転調を考慮したキーの計算
          // ここは m (parsedChordsの要素) と i (和音のインデックス) のループ内
          // m.measure は 1-indexed なので、インデックスは m.measure - 1
          const effectiveKey = getEffectiveKeyForMeasure(m.measure - 1, parsedChords, originalKey);
          const offset = getTransposeOffset(effectiveKey);

          const transposedMelodyDegree = midiToPitchClassKatakana(highestNote.midi - offset);
          const transposedChord = transposeChord(chord.name, effectiveKey);
          
          const relationId = `${songTitle}-${m.measure}-${i}-${Date.now()}`;

          promises.push(
            addMelodyChordRelation({
              id: relationId,
              songId: activeSongId,
              melodyDegree: transposedMelodyDegree,
              chordName: transposedChord,
              source: stockAttributes.source,
              preference: stockAttributes.preference,
              section: stockAttributes.section,
            })
          );
          relationCount++;
        }
      });
    });

    if (promises.length > 0) {
      await Promise.all(promises);
    }

    if (relationCount > 0) {
      showToast(`タイムライン全体から ${relationCount} 件のメロディ×コード関係を抽出しました`);
    } else {
      showToast('コードの切り替わりタイミングで鳴っているメロディが見つかりませんでした');
    }
  };

  const handleStockMusicalPhrase = () => {
    if (parsedChords.length === 0) {
      showToast('コードを入力してください');
      return;
    }
    if (!midiData || !midiData.notes || midiData.notes.length === 0) {
      showToast('ピアノロールにMIDIを読み込んでください');
      return;
    }
    if (!selectedNotes || selectedNotes.length === 0) {
      showToast('ストックしたいメロディの範囲を選択してください');
      return;
    }

    const song = registeredSongs.find(s => s.id === activeSongId);
    const songTitle = song ? song.title : (midiData.name || '未設定楽曲');
    
    // BPMによる拍の計算 (1拍あたりの秒数)
    const tempo = midiData.tempo || 120;
    const secondsPerBeat = 60 / tempo;
    
    const firstNoteTimeSec = Math.min(...selectedNotes.map(n => n.time));
    
    // notesのJSON化 (フレーズ開始位置を0拍とした相対拍単位・Cメジャー移調済み)
    const notesJson = selectedNotes.map(n => {
      const effectiveKey = getEffectiveKeyAtTime(n.time, midiData.measureDuration, parsedChords, stockAttributes.originalKey);
      const offset = getTransposeOffset(effectiveKey);
      return {
        pitch: n.midi - offset,
        pitch_name: midiToDegreeName(n.midi - offset),
        start: (n.time - firstNoteTimeSec) / secondsPerBeat,
        duration: n.duration / secondsPerBeat,
        velocity: n.velocity,
        lyric: null
      };
    });

    // chordsのJSON化 (Cメジャー移調済み)
    const regionStartSec = selectedRegion.x;
    const regionEndSec = selectedRegion.x + selectedRegion.width;
    const chordsJson = [];
    
    parsedChords.forEach((m, mIndex) => {
      const measureDurationSec = midiData.measureDuration || 2.0;
      const chordsInMeasure = m.chords.length;
      if (chordsInMeasure === 0) return;
      
      const timePerChordSec = measureDurationSec / chordsInMeasure;
      const effectiveKey = getEffectiveKeyForMeasure(mIndex, parsedChords, stockAttributes.originalKey);
      
      m.chords.forEach((chord, i) => {
        const chordTimeSec = (m.measure - 1) * measureDurationSec + i * timePerChordSec;
        const chordEndSec = chordTimeSec + timePerChordSec;
        
        // 選択リージョン（メロディの範囲）と重なっているコードのみ抽出
        if (chordEndSec > regionStartSec && chordTimeSec < regionEndSec) {
           const transposedName = transposeChord(chord.name, effectiveKey);
           chordsJson.push({
              name: transposedName, 
              root: transposedName.replace(/m|M|7|dim|aug|sus4|b5|add9/g, ''), 
              quality: transposedName.replace(/^[A-G][#b]?/, '') || 'M',
              start: (chordTimeSec - firstNoteTimeSec) / secondsPerBeat,
              duration: timePerChordSec / secondsPerBeat
           });
        }
      });
    });

    const phraseId = `phrase-${Date.now()}`;
    const datasetTypeMap = {
      '自作曲': 'original',
      'リファレンス': stockAttributes.preference === '好き' ? 'like' : 'dislike'
    };
    const datasetType = datasetTypeMap[stockAttributes.source] || 'original';
    
    useAppStore.getState().addMusicalPhrase({
      id: phraseId,
      songId: activeSongId,
      songTitle: songTitle,
      artist: song?.artist || '',
      datasetType: datasetType,
      section: stockAttributes.section,
      key: stockAttributes.originalKey,
      bpm: tempo,
      meter: midiData.timeSignature ? `${midiData.timeSignature.numerator}/${midiData.timeSignature.denominator}` : '4/4',
      startBeat: firstNoteTimeSec / secondsPerBeat,
      startBar: Math.floor(firstNoteTimeSec / (midiData.measureDuration || 2.0)) + 1,
      notes: notesJson,
      chords: chordsJson
    });

    // 既存の辞書機能への登録も同時に行う
    handleStockPitchAndRhythm();
    
    showToast('👑 統合フレーズとして分析データベースに保存しました！');
  };

  return (
    <div className="page-full animate-fade-in">
      <div className="page__header">
        <h1 className="page__title" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Square3Stack3DIcon style={{ width: '32px', height: '32px', color: 'var(--accent-blue)' }} />
          作業場エディタ
        </h1>
        <p className="page__subtitle">MIDIの読み込み・フレーズの切り出し・コードの手入力</p>
      </div>

      <div className="workspace-layout">
        {/* === 左カラム：メインエディタ === */}
        <div className="workspace-main">
          {/* ピアノロールコンテナ */}
          <div className="workspace-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span className="workspace-section__label">ピアノロール（ドラッグ＆ドロップでMIDI読み込み）</span>
            </div>
            <PianoRollCanvas />
          </div>

          {/* コード入力エリア */}
          <div className="workspace-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <span className="workspace-section__label" style={{ marginBottom: 0 }}>コード進行</span>
              <button className="btn btn--sm btn--secondary" onClick={() => setIsImportModalOpen(true)}>
                🤖 外部テキストから自動パース
              </button>
            </div>
            <ChordInputArea />
          </div>
        </div>

        {/* === 右カラム：ストックステーション（インスペクター） === */}
        <div className="workspace-sidebar">
          <div className="workspace-section" style={{ position: 'sticky', top: '24px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 'bold', marginBottom: '24px', color: 'var(--text-primary)', borderBottom: '1px solid var(--border-default)', paddingBottom: '12px' }}>
              ストック・パネル
            </h3>

            {/* グローバル属性 */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span className="workspace-attr-label" style={{ marginBottom: 0, fontWeight: 600 }}>Original Key</span>
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
            </div>

            {/* 詳細属性 (StockControls) */}
            <StockControls />

            {/* アクションボタン群 */}
            <div className="workspace-sidebar-actions" style={{ marginTop: '32px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button 
                className="btn btn--primary" 
                style={{ width: '100%', justifyContent: 'center', padding: '16px 0', fontSize: '15px', fontWeight: 'bold', background: 'linear-gradient(135deg, var(--accent-orange), var(--accent-red))' }} 
                onClick={handleStockMusicalPhrase}
              >
                👑 統合フレーズとしてストック
              </button>
              
              <div style={{ height: '1px', background: 'var(--border-default)', margin: '16px 0' }} />
              
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)', textAlign: 'center' }}>▼ 個別ストック（旧方式） ▼</span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn btn--secondary" style={{ flex: 1, justifyContent: 'center', fontSize: '12px' }} onClick={handleStockPitchAndRhythm}>
                  ♫ ピッチ＆リズム
                </button>
                <button className="btn btn--secondary" style={{ flex: 1, justifyContent: 'center', fontSize: '12px' }} onClick={handleStockChord}>
                  🎹 選択コード
                </button>
              </div>
              <button className="btn btn--secondary" style={{ width: '100%', justifyContent: 'center', fontSize: '12px' }} onClick={handleStockMelodyChordRelations}>
                ♫ メロディ×コード関係を一括抽出
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* トースト通知 */}
      {toastMessage && (
        <div className="toast">
          {toastMessage}
        </div>
      )}

      {/* 外部テキストインポートモーダル */}
      {isImportModalOpen && (
        <ExternalChordImportModal onClose={() => setIsImportModalOpen(false)} />
      )}
    </div>
  );
}
