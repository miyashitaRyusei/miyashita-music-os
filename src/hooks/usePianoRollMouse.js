import { useState, useCallback } from 'react';
import { PIXELS_PER_SECOND, LEFT_MARGIN, TOP_MARGIN, BOTTOM_MARGIN } from './usePianoRollDraw';

/**
 * マウス操作（範囲選択ドラッグ）をまとめたカスタムフック。
 */
export function usePianoRollMouse({
  canvasRef,
  midiData,
  canvasSize,
  scrollX,
  setScrollX,
  pxToPitch,
  timeToX,
  pitchToY,
  setPlaybackCursor,
  setSelectedRegion,
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartData, setDragStartData] = useState(null);
  const [dragEndData, setDragEndData] = useState(null);

  const pxToTime = useCallback((px) => {
    return (px - LEFT_MARGIN + scrollX) / PIXELS_PER_SECOND;
  }, [scrollX]);

  const handleMouseDown = useCallback((e) => {
    if (!midiData) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const time = pxToTime(x);
    const pitch = pxToPitch(y);
    setDragStartData({ time, pitch });
    setDragEndData({ time, pitch });
    setIsDragging(true);
  }, [midiData, canvasRef, pxToTime, pxToPitch]);

  const handleMouseMove = useCallback((e) => {
    if (!isDragging || !midiData) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const x = Math.max(LEFT_MARGIN, Math.min(clientX, canvasSize.width));
    const y = Math.max(TOP_MARGIN, Math.min(e.clientY - rect.top, canvasSize.height - BOTTOM_MARGIN));
    setDragEndData({ time: pxToTime(x), pitch: pxToPitch(y) });

    // エッジスクロール
    const edgeThreshold = 40;
    const scrollSpeed = 12;
    if (clientX > canvasSize.width - edgeThreshold) {
      const maxScroll = Math.max(0, midiData.totalDuration * PIXELS_PER_SECOND - (canvasSize.width - LEFT_MARGIN));
      setScrollX((prev) => Math.min(maxScroll, prev + scrollSpeed));
    } else if (clientX < LEFT_MARGIN + edgeThreshold) {
      setScrollX((prev) => Math.max(0, prev - scrollSpeed));
    }
  }, [isDragging, midiData, canvasRef, canvasSize, pxToTime, pxToPitch, setScrollX]);

  const handleMouseUp = useCallback((e) => {
    if (!isDragging || !dragStartData || !dragEndData || !midiData) {
      setIsDragging(false);
      return;
    }
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // クリック（ドラッグなし）なら再生カーソルを移動
    const startX = timeToX(dragStartData.time);
    const startY = pitchToY(dragStartData.pitch);
    if (Math.abs(x - startX) < 5 && Math.abs(y - startY) < 5) {
      const clickedTime = pxToTime(x);
      setPlaybackCursor(Math.max(0, clickedTime));
      setSelectedRegion(null);
      setIsDragging(false);
      return;
    }

    // 範囲選択
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
  }, [isDragging, dragStartData, dragEndData, midiData, canvasRef, timeToX, pitchToY, pxToTime, setPlaybackCursor, setSelectedRegion]);

  const handleGlobalMouseUp = useCallback(() => setIsDragging(false), []);

  return {
    isDragging,
    dragStartData,
    dragEndData,
    pxToTime,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleGlobalMouseUp,
  };
}
