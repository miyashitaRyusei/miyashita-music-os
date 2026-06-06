import { useRef, useEffect, useState, useCallback } from 'react';
import useAppStore from '../../store/useAppStore';
import { parseMidiFile, readFileAsArrayBuffer } from '../../utils/midiParser';
import { midiToNoteName, transposeToC } from '../../utils/noteUtils';
import { playMidiNotes, stopAudio } from '../../utils/audioPlayer';
import MidiMetadataModal from './MidiMetadataModal';

// ============================================
// PianoRollCanvas — Canvas ベースのピアノロール
// ============================================
// MIDIファイルを読み込み、ノートをバーとして描画。
// マウスドラッグで自由に範囲選択し、交差するノートをハイライトする。
// ============================================

// --- 描画定数 ---
const NOTE_HEIGHT = 8;
const PIXELS_PER_SECOND = 120;
const LEFT_MARGIN = 48;      // ピッチラベル用のマージン
const TOP_MARGIN = 48;       // コードトラック＆小節番号用のマージン（広め）
const BOTTOM_MARGIN = 16;

// --- カラー定数（Notion風ライトモード） ---
const COLORS = {
  bg: '#fafaf9',
  gridLine: '#f0efec',
  gridLineStrong: '#e3e2e0',
  measureLine: '#d3d3d0',
  noteBar: '#37352f',
  noteBarSelected: '#2383e2',
  selectionFill: 'rgba(35, 131, 226, 0.10)',
  selectionStroke: 'rgba(35, 131, 226, 0.45)',
  pitchLabel: '#b4b4b0',
  timeLabel: '#b4b4b0',
  blackKeyBg: 'rgba(0, 0, 0, 0.02)',
};

// 黒鍵かどうか
function isBlackKey(midi) {
  const pc = midi % 12;
  return [1, 3, 6, 8, 10].includes(pc);
}

export default function PianoRollCanvas() {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  const midiData = useAppStore((s) => s.midiData);
  const setMidiData = useAppStore((s) => s.setMidiData);
  const selectedNotes = useAppStore((s) => s.selectedNotes);
  const selectedRegion = useAppStore((s) => s.selectedRegion);
  const setSelectedRegion = useAppStore((s) => s.setSelectedRegion);
  const parsedChords = useAppStore((s) => s.parsedChords);

  const [isDragging, setIsDragging] = useState(false);
  const [dragStartData, setDragStartData] = useState(null); // { time, pitch }
  const [dragEndData, setDragEndData] = useState(null);     // { time, pitch }
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 400 });
  
  // マウスが画面外で離されたときのフェイルセーフ
  useEffect(() => {
    const handleGlobalMouseUp = () => setIsDragging(false);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);
  const [scrollX, setScrollX] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const [playbackCursor, setPlaybackCursor] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // --- ピクセル → 時間/ピッチ変換 ---
  const pxToTime = useCallback((px) => {
    return (px - LEFT_MARGIN + scrollX) / PIXELS_PER_SECOND;
  }, [scrollX]);

  const pxToPitch = useCallback((py) => {
    if (!midiData) return 60;
    const { pitchRange } = midiData;
    const drawableHeight = canvasSize.height - TOP_MARGIN - BOTTOM_MARGIN;
    const totalPitches = pitchRange.max - pitchRange.min + 1;
    const pitchFromTop = (py - TOP_MARGIN) / drawableHeight * totalPitches;
    return Math.round(pitchRange.max - pitchFromTop);
  }, [midiData, canvasSize.height]);

  // --- コンテナサイズ監視 ---
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setCanvasSize({
          width: Math.floor(width),
          height: Math.max(300, Math.floor(height)),
        });
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // --- Canvas描画 ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    canvas.width = canvasSize.width * dpr;
    canvas.height = canvasSize.height * dpr;
    ctx.scale(dpr, dpr);

    // 背景クリア
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);

    if (!midiData) {
      drawEmptyState(ctx, canvasSize);
      return;
    }

    const { notes, pitchRange, measureDuration, totalDuration } = midiData;
    const drawableHeight = canvasSize.height - TOP_MARGIN - BOTTOM_MARGIN;
    const totalPitches = pitchRange.max - pitchRange.min + 1;
    const pitchHeight = drawableHeight / totalPitches;

    // ヘルパー: ピッチ → Y座標
    const pitchToY = (midi) => {
      return TOP_MARGIN + (pitchRange.max - midi) / totalPitches * drawableHeight;
    };

    // ヘルパー: 時間 → X座標
    const timeToX = (time) => {
      return LEFT_MARGIN + time * PIXELS_PER_SECOND - scrollX;
    };

    // --- 黒鍵の背景ストライプ ---
    for (let p = pitchRange.min; p <= pitchRange.max; p++) {
      if (isBlackKey(p)) {
        const y = pitchToY(p);
        ctx.fillStyle = COLORS.blackKeyBg;
        ctx.fillRect(LEFT_MARGIN, y, canvasSize.width - LEFT_MARGIN, pitchHeight);
      }
    }

    // --- 水平グリッド線（ピッチごと） ---
    ctx.strokeStyle = COLORS.gridLine;
    ctx.lineWidth = 0.5;
    for (let p = pitchRange.min; p <= pitchRange.max; p++) {
      const y = pitchToY(p);
      // Cのノートは強調線
      if (p % 12 === 0) {
        ctx.strokeStyle = COLORS.gridLineStrong;
        ctx.lineWidth = 1;
      } else {
        ctx.strokeStyle = COLORS.gridLine;
        ctx.lineWidth = 0.5;
      }
      ctx.beginPath();
      ctx.moveTo(LEFT_MARGIN, y);
      ctx.lineTo(canvasSize.width, y);
      ctx.stroke();
    }

    // --- 垂直グリッド線（小節線） ---
    if (measureDuration > 0) {
      const totalMeasures = Math.ceil(totalDuration / measureDuration) + 1;
      for (let m = 0; m <= totalMeasures; m++) {
        const x = timeToX(m * measureDuration);
        if (x < LEFT_MARGIN || x > canvasSize.width) continue;

        ctx.strokeStyle = COLORS.measureLine;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, TOP_MARGIN);
        ctx.lineTo(x, canvasSize.height - BOTTOM_MARGIN);
        ctx.stroke();

        // 小節番号
        ctx.fillStyle = COLORS.timeLabel;
        ctx.font = '10px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`${m + 1}`, x, TOP_MARGIN - 6);
      }
    }

    // --- コード進行の描画 (タイムライン上部) ---
    if (parsedChords && parsedChords.length > 0 && measureDuration > 0) {
      ctx.font = 'bold 12px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      parsedChords.forEach((m) => {
        const measureStartSeconds = (m.measure - 1) * measureDuration;
        const timePerChord = measureDuration / Math.max(1, m.chords.length);
        
        m.chords.forEach((chord, i) => {
          const chordTime = measureStartSeconds + i * timePerChord;
          const x = timeToX(chordTime);
          const nextX = timeToX(chordTime + timePerChord);
          const w = nextX - x;
          
          if (x + w < LEFT_MARGIN || x > canvasSize.width) return;

          // 小節の区画をうっすら色付け
          ctx.fillStyle = 'rgba(224, 49, 49, 0.05)';
          ctx.fillRect(Math.max(LEFT_MARGIN, x), 0, Math.min(w, canvasSize.width - x), TOP_MARGIN);

          // コードの背景ラベル（少し大きめ、下寄りに配置）
          const textWidth = ctx.measureText(chord.name).width;
          const labelWidth = Math.max(textWidth + 16, 32);
          const centerX = x + w / 2;
          
          if (centerX >= LEFT_MARGIN && centerX <= canvasSize.width) {
            ctx.fillStyle = '#e03131'; // 赤
            roundRect(ctx, centerX - labelWidth / 2, 16, labelWidth, 20, 4);
            ctx.fill();

            // コードのテキスト
            ctx.fillStyle = '#ffffff'; // 白抜き
            ctx.fillText(chord.name, centerX, 26);
          }
        });
      });
    }

    // --- ピッチラベル（左端） ---
    ctx.fillStyle = COLORS.pitchLabel;
    ctx.font = '9px Inter, sans-serif';
    ctx.textAlign = 'right';
    for (let p = pitchRange.min; p <= pitchRange.max; p++) {
      if (p % 12 === 0) { // Cのみラベル表示
        const y = pitchToY(p) + pitchHeight / 2 + 3;
        ctx.fillText(midiToNoteName(p), LEFT_MARGIN - 6, y);
      }
    }

    // --- 選択済みノートのセット（高速ルックアップ） ---
    const selectedSet = new Set(selectedNotes.map((n) => `${n.time}_${n.midi}`));

    // --- ノートバー描画 ---
    notes.forEach((note) => {
      const x = timeToX(note.time);
      const w = Math.max(2, note.duration * PIXELS_PER_SECOND);
      const y = pitchToY(note.midi);
      const h = Math.max(3, pitchHeight - 1);

      // 画面外のノートはスキップ
      if (x + w < LEFT_MARGIN || x > canvasSize.width) return;

      const isSelected = selectedSet.has(`${note.time}_${note.midi}`);

      // ノートバー
      ctx.fillStyle = isSelected ? COLORS.noteBarSelected : COLORS.noteBar;
      ctx.globalAlpha = isSelected ? 1.0 : 0.75;
      roundRect(ctx, x, y, w, h, 2);
      ctx.fill();
      ctx.globalAlpha = 1.0;
    });

    // --- ドラッグ選択矩形 ---
    // 描画順：ノートの上に描画しつつ、コードトラック(y=0)から最下部まで覆うように変更
    if (isDragging && dragStartData && dragEndData) {
      const rx1 = timeToX(dragStartData.time);
      const rx2 = timeToX(dragEndData.time);
      
      const rx = Math.max(LEFT_MARGIN, Math.min(rx1, rx2));
      const rw = Math.min(Math.max(rx1, rx2) - rx, canvasSize.width - rx);
      // y座標を0にしてコード進行エリアも覆うようにする
      const ry = 0;
      const rh = canvasSize.height - BOTTOM_MARGIN;

      if (rw > 0 && rh > 0) {
        ctx.fillStyle = COLORS.selectionFill;
        ctx.fillRect(rx, ry, rw, rh);
        ctx.strokeStyle = COLORS.selectionStroke;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(rx, ry, rw, rh);
      }
    }

    // --- 選択領域の持続描画 (ドラッグ完了後) ---
    if (!isDragging && selectedRegion) {
      const startX = Math.max(LEFT_MARGIN, timeToX(selectedRegion.startTime));
      const endX = Math.min(canvasSize.width, timeToX(selectedRegion.endTime));
      
      if (endX > LEFT_MARGIN && startX < canvasSize.width) {
        ctx.fillStyle = 'rgba(35, 131, 226, 0.08)';
        // y座標を0にしてコード進行エリアも覆うようにする
        ctx.fillRect(startX, 0, endX - startX, canvasSize.height - BOTTOM_MARGIN);
        
        ctx.strokeStyle = 'rgba(35, 131, 226, 0.4)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(startX, 0);
        ctx.lineTo(startX, canvasSize.height - BOTTOM_MARGIN);
        ctx.moveTo(endX, 0);
        ctx.lineTo(endX, canvasSize.height - BOTTOM_MARGIN);
        ctx.stroke();
      }
    }

    // --- 再生カーソルの描画 ---
    const cursorX = timeToX(playbackCursor);
    if (cursorX >= LEFT_MARGIN && cursorX <= canvasSize.width) {
      ctx.beginPath();
      ctx.strokeStyle = '#e03131'; // 赤
      ctx.lineWidth = 2;
      ctx.moveTo(cursorX, TOP_MARGIN);
      ctx.lineTo(cursorX, canvasSize.height - BOTTOM_MARGIN);
      ctx.stroke();

      // カーソル上の三角
      ctx.beginPath();
      ctx.fillStyle = '#e03131';
      ctx.moveTo(cursorX - 5, TOP_MARGIN - 5);
      ctx.lineTo(cursorX + 5, TOP_MARGIN - 5);
      ctx.lineTo(cursorX, TOP_MARGIN + 2);
      ctx.fill();
    }

    // ドロップUI
    if (isDragOver) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);
    }

  }, [canvasSize, midiData, scrollX, selectedNotes, selectedRegion, isDragging, dragStartData, dragEndData, playbackCursor, isDragOver, parsedChords]);

  // --- 空の状態の描画 ---
  function drawEmptyState(ctx, size) {
    ctx.fillStyle = '#b4b4b0';
    ctx.font = '14px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('MIDIファイルをドラッグ＆ドロップで読み込み', size.width / 2, size.height / 2 - 10);
    ctx.font = '12px Inter, sans-serif';
    ctx.fillStyle = '#d3d3d0';
    ctx.fillText('.mid ファイルをここにドロップ', size.width / 2, size.height / 2 + 14);
  }

  // --- 角丸四角形ヘルパー ---
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }

  // --- マウスイベント ---
  const handleMouseDown = (e) => {
    if (!midiData) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const time = pxToTime(x);
    const pitch = pxToPitch(y);
    setDragStartData({ time, pitch });
    setDragEndData({ time, pitch });
    setIsDragging(true);
  };

  const handleMouseMove = (e) => {
    if (!isDragging || !midiData) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const x = Math.max(LEFT_MARGIN, Math.min(clientX, canvasSize.width));
    const y = Math.max(TOP_MARGIN, Math.min(e.clientY - rect.top, canvasSize.height - BOTTOM_MARGIN));
    
    setDragEndData({ time: pxToTime(x), pitch: pxToPitch(y) });

    // エッジスクロール (画面端でのドラッグでスクロール)
    const edgeThreshold = 40;
    const scrollSpeed = 12;
    if (clientX > canvasSize.width - edgeThreshold) {
      const maxScroll = Math.max(0, midiData.totalDuration * PIXELS_PER_SECOND - (canvasSize.width - LEFT_MARGIN));
      setScrollX((prev) => Math.min(maxScroll, prev + scrollSpeed));
    } else if (clientX < LEFT_MARGIN + edgeThreshold) {
      setScrollX((prev) => Math.max(0, prev - scrollSpeed));
    }
  };

  const handleMouseUp = (e) => {
    if (!isDragging || !dragStartData || !dragEndData || !midiData) {
      setIsDragging(false);
      return;
    }

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    
    // ドラッグせずにクリックだけした場合は再生カーソルをセットし、選択を解除
    const startX = timeToX(dragStartData.time);
    if (Math.abs(x - startX) < 5) {
      const clickedTime = pxToTime(x);
      setPlaybackCursor(Math.max(0, clickedTime));
      setSelectedRegion(null);
      setIsDragging(false);
      return;
    }

    // 時間/ピッチ座標から選択範囲を決定
    const startTime = Math.min(dragStartData.time, dragEndData.time);
    const endTime = Math.max(dragStartData.time, dragEndData.time);
    const topPitch = Math.max(dragStartData.pitch, dragEndData.pitch);
    const bottomPitch = Math.min(dragStartData.pitch, dragEndData.pitch);

    setSelectedRegion({
      startTime: Math.max(0, startTime),
      endTime,
      startPitch: bottomPitch,
      endPitch: topPitch,
    });

    setIsDragging(false);
  };

  const setIsAnalyzing = useAppStore((s) => s.setIsAnalyzing);

  const [pendingMidiData, setPendingMidiData] = useState(null);

  // --- ファイルドロップ ---
  const handleDrop = async (e) => {
    e.preventDefault();
    setIsDragOver(false);

    const file = e.dataTransfer.files[0];
    if (!file || !file.name.toLowerCase().endsWith('.mid') && !file.name.toLowerCase().endsWith('.midi')) {
      return;
    }

    try {
      const arrayBuffer = await readFileAsArrayBuffer(file);
      const data = parseMidiFile(arrayBuffer);
      
      // パースが成功したら、すぐにはsetMidiDataせず、メタデータ入力モーダルを表示するための状態にセットする
      setPendingMidiData(data);
    } catch (err) {
      console.error('MIDI parse error:', err);
    }
  };

  // --- モーダルの確定時処理 ---
  const handleMetadataConfirm = async ({ rootNote, bpm, title, artist }) => {
    if (!pendingMidiData) return;

    // モーダルを閉じる
    const dataToProcess = pendingMidiData;
    setPendingMidiData(null);

    // ローディングUI（エモい画面）を表示
    setIsAnalyzing(true);

    try {
      // 1. ユーザー入力によるBPMの上書き
      // 状態を直接変異させないようにコピー
      const dataWithTempo = { ...dataToProcess, tempo: bpm };
      
      // 元のキーでの最高音・最低音を取得
      const minNote = midiToNoteName(dataToProcess.pitchRange.min);
      const maxNote = midiToNoteName(dataToProcess.pitchRange.max);

      // 楽曲をストアに登録
      const songId = `s_${Date.now()}`;
      useAppStore.getState().registerSong({
        id: songId,
        title,
        artist,
        originalKey: rootNote,
        bpm,
        minNote,
        maxNote,
        importedAt: new Date().toISOString(),
      });
      
      // 2. Cメジャー基準への自動移調処理（ノーマライズ）
      // ※注意：この時点でデータ自体が書き換わるため、描画もC基準となる
      const transposedData = transposeToC(dataWithTempo, rootNote);

      // バックエンド（Render）での重い音楽解析処理をシミュレート
      await new Promise((resolve) => setTimeout(resolve, 10000));

      setMidiData(transposedData);
      setScrollX(0);
    } catch (err) {
      console.error('MIDI process error:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleMetadataCancel = () => {
    setPendingMidiData(null);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  // --- 横スクロール ---
  const handleWheel = (e) => {
    if (!midiData) return;
    e.preventDefault();
    const maxScroll = Math.max(0, midiData.totalDuration * PIXELS_PER_SECOND - (canvasSize.width - LEFT_MARGIN));
    setScrollX((prev) => Math.max(0, Math.min(maxScroll, prev + e.deltaX + e.deltaY)));
  };

  const togglePlayback = async () => {
    if (isPlaying) {
      stopAudio();
      setIsPlaying(false);
    } else {
      if (!midiData) return;
      setIsPlaying(true);
      await playMidiNotes(midiData.notes, playbackCursor, () => {
        setIsPlaying(false);
      });
    }
  };

  return (
    <div className="piano-roll-wrapper">
      <div 
        className="piano-roll-container" 
        ref={containerRef}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{ position: 'relative' }}
      >
        <canvas ref={canvasRef} style={{ display: 'block' }} />
        
        {/* 再生コントロール */}
        <div style={{ position: 'absolute', top: '8px', left: '8px', display: 'flex', gap: '8px', zIndex: 10 }}>
          <button 
            className="btn btn--sm" 
            style={{ 
              background: isPlaying ? 'var(--accent-orange)' : 'var(--bg-elevated)', 
              color: isPlaying ? '#fff' : 'var(--text-primary)',
              border: '1px solid var(--border-default)',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}
            onClick={(e) => { e.stopPropagation(); togglePlayback(); }}
          >
            {isPlaying ? '■ 停止' : '▶ 再生'}
          </button>
        </div>
      </div>

      {/* メタデータ入力モーダル */}
      {pendingMidiData && (
        <MidiMetadataModal
          initialBpm={pendingMidiData.tempo}
          onConfirm={handleMetadataConfirm}
          onCancel={handleMetadataCancel}
        />
      )}
    </div>
  );
}
