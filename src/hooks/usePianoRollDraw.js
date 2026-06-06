import { useEffect, useState, useCallback } from 'react';
import { midiToNoteName } from '../utils/noteUtils';

// --- 描画定数 ---
export const PIXELS_PER_SECOND = 120;
export const LEFT_MARGIN = 48;
export const TOP_MARGIN = 48;
export const BOTTOM_MARGIN = 16;

// --- カラー定数 ---
export const COLORS = {
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

// --- ヘルパー関数 ---
export function isBlackKey(midi) {
  const pc = midi % 12;
  return [1, 3, 6, 8, 10].includes(pc);
}

function drawEmptyState(ctx, size) {
  ctx.fillStyle = '#b4b4b0';
  ctx.font = '14px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('MIDIファイルをドラッグ＆ドロップで読み込み', size.width / 2, size.height / 2 - 10);
  ctx.font = '12px Inter, sans-serif';
  ctx.fillStyle = '#d3d3d0';
  ctx.fillText('.mid ファイルをここにドロップ', size.width / 2, size.height / 2 + 14);
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/**
 * Canvasの描画ロジック＆リサイズ監視をまとめたカスタムフック。
 */
export function usePianoRollDraw({
  canvasRef,
  containerRef,
  midiData,
  scrollX,
  selectedNotes,
  selectedRegion,
  isDragging,
  dragStartData,
  dragEndData,
  playbackCursor,
  isDragOver,
  parsedChords,
  timeToX,
  pitchToY,
}) {
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 400 });

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
  }, [containerRef]);

  // --- Canvas描画 ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    canvas.width = canvasSize.width * dpr;
    canvas.height = canvasSize.height * dpr;
    ctx.scale(dpr, dpr);

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

    // --- 黒鍵の背景ストライプ ---
    for (let p = pitchRange.min; p <= pitchRange.max; p++) {
      if (isBlackKey(p)) {
        const y = pitchToY(p);
        ctx.fillStyle = COLORS.blackKeyBg;
        ctx.fillRect(LEFT_MARGIN, y, canvasSize.width - LEFT_MARGIN, pitchHeight);
      }
    }

    // --- 水平グリッド線 ---
    ctx.strokeStyle = COLORS.gridLine;
    ctx.lineWidth = 0.5;
    for (let p = pitchRange.min; p <= pitchRange.max; p++) {
      const y = pitchToY(p);
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
        ctx.fillStyle = COLORS.timeLabel;
        ctx.font = '10px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`${m + 1}`, x, TOP_MARGIN - 6);
      }
    }

    // --- コード進行の区画着色 ---
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
          ctx.fillStyle = 'rgba(224, 49, 49, 0.05)';
          ctx.fillRect(Math.max(LEFT_MARGIN, x), 0, Math.min(w, canvasSize.width - x), TOP_MARGIN);
        });
      });
    }

    // --- ピッチラベル（左端） ---
    ctx.fillStyle = COLORS.pitchLabel;
    ctx.font = '9px Inter, sans-serif';
    ctx.textAlign = 'right';
    for (let p = pitchRange.min; p <= pitchRange.max; p++) {
      if (p % 12 === 0) {
        const y = pitchToY(p) + pitchHeight / 2 + 3;
        ctx.fillText(midiToNoteName(p), LEFT_MARGIN - 6, y);
      }
    }

    // --- ノートバー描画 ---
    const selectedSet = new Set(selectedNotes.map((n) => `${n.time}_${n.midi}`));
    notes.forEach((note) => {
      const x = timeToX(note.time);
      const w = Math.max(2, note.duration * PIXELS_PER_SECOND);
      const y = pitchToY(note.midi);
      const h = Math.max(3, pitchHeight - 1);
      if (x + w < LEFT_MARGIN || x > canvasSize.width) return;
      const isSelected = selectedSet.has(`${note.time}_${note.midi}`);
      ctx.fillStyle = isSelected ? COLORS.noteBarSelected : COLORS.noteBar;
      ctx.globalAlpha = isSelected ? 1.0 : 0.75;
      roundRect(ctx, x, y, w, h, 2);
      ctx.fill();
      ctx.globalAlpha = 1.0;
    });

    // --- ドラッグ選択矩形 ---
    if (isDragging && dragStartData && dragEndData) {
      const rx1 = timeToX(dragStartData.time);
      const rx2 = timeToX(dragEndData.time);
      const ry1 = pitchToY(dragStartData.pitch);
      const ry2 = pitchToY(dragEndData.pitch);
      const rx = Math.max(LEFT_MARGIN, Math.min(rx1, rx2));
      const rw = Math.min(Math.max(rx1, rx2) - rx, canvasSize.width - rx);
      const ry = Math.max(TOP_MARGIN, Math.min(ry1, ry2));
      const rh = Math.min(Math.max(ry1, ry2) - ry, canvasSize.height - BOTTOM_MARGIN - ry);
      if (rw > 0 && rh > 0) {
        ctx.fillStyle = COLORS.selectionFill;
        ctx.fillRect(rx, ry, rw, rh);
        ctx.strokeStyle = COLORS.selectionStroke;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(rx, ry, rw, rh);
      }
    }

    // --- 選択領域の持続描画 ---
    if (!isDragging && selectedRegion) {
      const startX = Math.max(LEFT_MARGIN, timeToX(selectedRegion.startTime));
      const endX = Math.min(canvasSize.width, timeToX(selectedRegion.endTime));
      const ry1 = pitchToY(selectedRegion.startPitch);
      const ry2 = pitchToY(selectedRegion.endPitch);
      const ry = Math.max(TOP_MARGIN, Math.min(ry1, ry2));
      const rh = Math.min(Math.max(ry1, ry2) - ry, canvasSize.height - BOTTOM_MARGIN - ry);
      if (endX > LEFT_MARGIN && startX < canvasSize.width && rh > 0) {
        ctx.fillStyle = 'rgba(35, 131, 226, 0.08)';
        ctx.fillRect(startX, ry, endX - startX, rh);
        ctx.strokeStyle = 'rgba(35, 131, 226, 0.4)';
        ctx.lineWidth = 1;
        ctx.strokeRect(startX, ry, endX - startX, rh);
      }
    }

    // --- 再生カーソル ---
    const cursorX = timeToX(playbackCursor);
    if (cursorX >= LEFT_MARGIN && cursorX <= canvasSize.width) {
      ctx.beginPath();
      ctx.strokeStyle = '#e03131';
      ctx.lineWidth = 2;
      ctx.moveTo(cursorX, TOP_MARGIN);
      ctx.lineTo(cursorX, canvasSize.height - BOTTOM_MARGIN);
      ctx.stroke();
      ctx.beginPath();
      ctx.fillStyle = '#e03131';
      ctx.moveTo(cursorX - 5, TOP_MARGIN - 5);
      ctx.lineTo(cursorX + 5, TOP_MARGIN - 5);
      ctx.lineTo(cursorX, TOP_MARGIN + 2);
      ctx.fill();
    }

    // --- ドロップオーバーレイ ---
    if (isDragOver) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);
    }
  }, [canvasSize, midiData, scrollX, selectedNotes, selectedRegion, isDragging, dragStartData, dragEndData, playbackCursor, isDragOver, parsedChords, timeToX, pitchToY]);

  // --- 座標変換（canvasSizeに依存するものをここで定義） ---
  const pxToPitch = useCallback((py) => {
    if (!midiData) return 60;
    const { pitchRange } = midiData;
    const drawableHeight = canvasSize.height - TOP_MARGIN - BOTTOM_MARGIN;
    const totalPitches = pitchRange.max - pitchRange.min + 1;
    const pitchFromTop = (py - TOP_MARGIN) / drawableHeight * totalPitches;
    return Math.round(pitchRange.max - pitchFromTop);
  }, [midiData, canvasSize.height]);

  const pitchToYFn = useCallback((midiPitch) => {
    if (!midiData) return 0;
    const { pitchRange } = midiData;
    const drawableHeight = canvasSize.height - TOP_MARGIN - BOTTOM_MARGIN;
    const totalPitches = pitchRange.max - pitchRange.min + 1;
    const pitchOffset = pitchRange.max - midiPitch;
    return TOP_MARGIN + (pitchOffset / totalPitches) * drawableHeight;
  }, [midiData, canvasSize.height]);

  return { canvasSize, pxToPitch, pitchToY: pitchToYFn };
}
