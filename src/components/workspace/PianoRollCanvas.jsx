import { useRef, useEffect, useState, useCallback } from 'react';
import useAppStore from '../../store/useAppStore';
import { parseMidiFile, readFileAsArrayBuffer } from '../../utils/midiParser';
import { midiToNoteName } from '../../utils/noteUtils';
import { transposeToC } from '../../utils/noteUtils';
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
const TOP_MARGIN = 24;
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
  const setSelectedRegion = useAppStore((s) => s.setSelectedRegion);

  const [isDragging, setIsDragging] = useState(false);
  const [dragStartPx, setDragStartPx] = useState(null);
  const [dragEndPx, setDragEndPx] = useState(null);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 400 });
  const [scrollX, setScrollX] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);

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
    if (isDragging && dragStartPx && dragEndPx) {
      const rx = Math.min(dragStartPx.x, dragEndPx.x);
      const ry = Math.min(dragStartPx.y, dragEndPx.y);
      const rw = Math.abs(dragEndPx.x - dragStartPx.x);
      const rh = Math.abs(dragEndPx.y - dragStartPx.y);

      ctx.fillStyle = COLORS.selectionFill;
      ctx.fillRect(rx, ry, rw, rh);
      ctx.strokeStyle = COLORS.selectionStroke;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(rx, ry, rw, rh);
    }

  }, [canvasSize, midiData, scrollX, selectedNotes, isDragging, dragStartPx, dragEndPx]);

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
    setDragStartPx({ x, y });
    setDragEndPx({ x, y });
    setIsDragging(true);
  };

  const handleMouseMove = (e) => {
    if (!isDragging || !midiData) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = Math.max(LEFT_MARGIN, Math.min(e.clientX - rect.left, canvasSize.width));
    const y = Math.max(TOP_MARGIN, Math.min(e.clientY - rect.top, canvasSize.height - BOTTOM_MARGIN));
    setDragEndPx({ x, y });
  };

  const handleMouseUp = () => {
    if (!isDragging || !dragStartPx || !dragEndPx || !midiData) {
      setIsDragging(false);
      return;
    }

    // ピクセル座標 → 時間/ピッチ座標に変換
    const startTime = pxToTime(Math.min(dragStartPx.x, dragEndPx.x));
    const endTime = pxToTime(Math.max(dragStartPx.x, dragEndPx.x));
    const topPitch = pxToPitch(Math.min(dragStartPx.y, dragEndPx.y));
    const bottomPitch = pxToPitch(Math.max(dragStartPx.y, dragEndPx.y));

    setSelectedRegion({
      startTime: Math.max(0, startTime),
      endTime,
      startPitch: Math.min(bottomPitch, topPitch),
      endPitch: Math.max(bottomPitch, topPitch),
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

  return (
    <div className="piano-roll-wrapper">
      {/* MIDI情報バー */}
      {midiData && (
        <div className="piano-roll__info-bar">
          <span className="piano-roll__info-item">
            {midiData.name}
          </span>
          <span className="piano-roll__info-item">
            BPM {Math.round(midiData.tempo)}
          </span>
          <span className="piano-roll__info-item">
            {midiData.timeSignature.numerator}/{midiData.timeSignature.denominator}
          </span>
          <span className="piano-roll__info-item">
            {midiData.notes.length} notes
          </span>
          {selectedNotes.length > 0 && (
            <span className="piano-roll__info-item piano-roll__info-item--accent">
              {selectedNotes.length} selected
            </span>
          )}
        </div>
      )}

      {/* Canvas コンテナ */}
      <div
        ref={containerRef}
        className={`piano-roll-canvas-container${isDragOver ? ' piano-roll-canvas-container--drag-over' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <canvas
          ref={canvasRef}
          className="piano-roll-canvas"
          style={{ width: canvasSize.width, height: canvasSize.height }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
        />
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
