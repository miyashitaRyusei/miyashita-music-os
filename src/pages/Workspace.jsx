import { useState } from 'react';
import useAppStore from '../store/useAppStore';
import ChordInputArea from '../components/workspace/ChordInputArea';
import PianoRollCanvas from '../components/workspace/PianoRollCanvas';
import StockControls from '../components/workspace/StockControls';
import { transposeChordProgression } from '../utils/chordTransposer';

export default function Workspace() {
  const {
    stockAttributes,
    parsedChords,
    extractedPitch,
    extractedRhythm,
    addPitchPattern,
    addRhythmPattern,
    addChordProgression,
    midiData,
    activeSongId,
  } = useAppStore();

  const [toastMessage, setToastMessage] = useState('');

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const handleStockPitch = () => {
    if (extractedPitch.length === 0) {
      showToast('⚠️ ピアノロールでノートを選択してください');
      return;
    }
    addPitchPattern({
      id: `p_${Date.now()}`,
      degrees: extractedPitch,
      source: stockAttributes.source,
      preference: stockAttributes.preference,
      section: stockAttributes.section,
      songId: activeSongId,
    });
    showToast('✅ ピッチ辞書にストックしました');
  };

  const handleStockRhythm = () => {
    if (extractedRhythm.length === 0) {
      showToast('⚠️ ピアノロールでノートを選択してください');
      return;
    }
    addRhythmPattern({
      id: `r_${Date.now()}`,
      timings: extractedRhythm,
      description: '自動抽出パターン',
      source: stockAttributes.source,
      preference: stockAttributes.preference,
      section: stockAttributes.section,
      songId: activeSongId,
    });
    showToast('✅ リズム辞書にストックしました');
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
    
    addChordProgression({
      id: `c_${Date.now()}`,
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

  return (
    <div className="page animate-fade-in">
      <div className="page__header">
        <h1 className="page__title">作業場エディタ</h1>
        <p className="page__subtitle">MIDIの読み込み・フレーズの切り出し・コードの手入力</p>
      </div>

      {/* ピアノロールコンテナ */}
      <div className="workspace-section">
        <span className="workspace-section__label">ピアノロール（ドラッグ＆ドロップでMIDI読み込み）</span>
        <PianoRollCanvas />
      </div>

      {/* コード入力エリア */}
      <div className="workspace-section">
        <ChordInputArea />
      </div>

      {/* 属性選択＆ストック実行 */}
      <div className="workspace-section">
        <span className="workspace-section__label">ストック属性</span>
        <StockControls 
          onStockPitch={handleStockPitch}
          onStockRhythm={handleStockRhythm}
          onStockChord={handleStockChord}
        />
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
