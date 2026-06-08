import { useRef, useEffect, useCallback, useState } from 'react';
import useAppStore from '../../store/useAppStore';
import { PlayIcon, StopIcon } from '@heroicons/react/24/outline';
import MidiMetadataModal from './MidiMetadataModal';

import { usePianoRollDraw, PIXELS_PER_SECOND, LEFT_MARGIN, TOP_MARGIN, BOTTOM_MARGIN } from '../../hooks/usePianoRollDraw';
import { usePianoRollMouse } from '../../hooks/usePianoRollMouse';
import { usePianoRollDrop } from '../../hooks/usePianoRollDrop';
import { usePianoRollPlayback } from '../../hooks/usePianoRollPlayback';

// ============================================
// PianoRollCanvas — Canvas ベースのピアノロール
// ============================================
// カスタムフックによって責務分離された組み立てコンポーネント。
// - usePianoRollDraw  : Canvas描画 & リサイズ監視
// - usePianoRollMouse : マウス操作（範囲選択ドラッグ）
// - usePianoRollDrop  : MIDIファイルのドロップ & モーダル
// - usePianoRollPlayback : 再生・停止
// ============================================

export default function PianoRollCanvas() {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const scrollbarRef = useRef(null);
  const isHoveredRef = useRef(false);
  const togglePlaybackRef = useRef(null);

  // --- ストアから状態を購読 ---
  const midiData = useAppStore((s) => s.midiData);
  const setMidiData = useAppStore((s) => s.setMidiData);
  const selectedNotes = useAppStore((s) => s.selectedNotes);
  const selectedRegion = useAppStore((s) => s.selectedRegion);
  const setSelectedRegion = useAppStore((s) => s.setSelectedRegion);
  const parsedChords = useAppStore((s) => s.parsedChords);
  const selectedChordIndices = useAppStore((s) => s.selectedChordIndices);
  const toggleChordSelection = useAppStore((s) => s.toggleChordSelection);

  // --- スクロール ---
  const [scrollX, setScrollX] = useState(0);

  // スクロールバーの同期
  useEffect(() => {
    if (scrollbarRef.current && scrollbarRef.current.scrollLeft !== scrollX) {
      scrollbarRef.current.scrollLeft = scrollX;
    }
  }, [scrollX]);

  // --- 座標変換（scrollXのみ依存） ---
  const timeToX = useCallback((time) => {
    return LEFT_MARGIN + time * PIXELS_PER_SECOND - scrollX;
  }, [scrollX]);

  // --- 再生フック ---
  const { isPlaying, playbackCursor, setPlaybackCursor, togglePlayback } =
    usePianoRollPlayback({ midiData, parsedChords });

  // --- ドロップフック ---
  const {
    pendingMidiData,
    isDragOver,
    handleDrop,
    handleDragOver,
    handleDragLeave,
    handleMetadataConfirm,
    handleMetadataCancel,
  } = usePianoRollDrop({ setMidiData, setScrollX });

  // --- コンテナサイズ監視 ---
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 400 });

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

  // --- 座標変換 ---
  const pxToPitch = useCallback((py) => {
    if (!midiData) return 60;
    const { pitchRange } = midiData;
    const drawableHeight = canvasSize.height - TOP_MARGIN - BOTTOM_MARGIN;
    const totalPitches = pitchRange.max - pitchRange.min + 1;
    const pitchFromTop = (py - TOP_MARGIN) / drawableHeight * totalPitches;
    return Math.round(pitchRange.max - pitchFromTop);
  }, [midiData, canvasSize.height]);

  const pitchToY = useCallback((midiPitch) => {
    if (!midiData) return 0;
    const { pitchRange } = midiData;
    const drawableHeight = canvasSize.height - TOP_MARGIN - BOTTOM_MARGIN;
    const totalPitches = pitchRange.max - pitchRange.min + 1;
    const pitchOffset = pitchRange.max - midiPitch;
    return TOP_MARGIN + (pitchOffset / totalPitches) * drawableHeight;
  }, [midiData, canvasSize.height]);

  // --- マウスフック ---
  const {
    isDragging,
    dragStartData,
    dragEndData,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleGlobalMouseUp,
  } = usePianoRollMouse({
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
  });

  // --- 描画フック ---
  usePianoRollDraw({
    canvasRef,
    canvasSize,
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
  });

  // --- グローバルイベント ---
  useEffect(() => {
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [handleGlobalMouseUp]);

  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if (e.code === 'Space' && isHoveredRef.current) {
        if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;
        e.preventDefault();
        if (togglePlaybackRef.current) togglePlaybackRef.current();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // togglePlaybackRefを最新に保つ
  useEffect(() => {
    togglePlaybackRef.current = togglePlayback;
  });

  // --- 横スクロール ---
  const handleWheel = (e) => {
    if (!midiData) return;
    e.preventDefault();
    const maxScroll = Math.max(0, midiData.totalDuration * PIXELS_PER_SECOND - (canvasSize.width - LEFT_MARGIN));
    setScrollX((prev) => Math.max(0, Math.min(maxScroll, prev + e.deltaX + e.deltaY)));
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
        onMouseLeave={(e) => {
          handleMouseUp(e);
          isHoveredRef.current = false;
        }}
        onMouseEnter={() => {
          isHoveredRef.current = true;
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{ position: 'relative' }}
      >
        <canvas ref={canvasRef} style={{ display: 'block' }} />

        {/* HTMLベースのコードトラック */}
        {parsedChords && parsedChords.length > 0 && (
          <div
            className="chord-track-overlay"
            style={{
              position: 'absolute',
              top: 0,
              left: LEFT_MARGIN,
              right: 0,
              height: TOP_MARGIN,
              overflow: 'hidden',
              pointerEvents: 'none',
            }}
          >
            <div style={{
              position: 'absolute',
              left: 0,
              top: 0,
              height: '100%',
              transform: `translateX(${-scrollX}px)`,
              display: 'flex',
              alignItems: 'center',
            }}>
              {parsedChords.map((m, mIndex) => {
                if (m.chords.length === 0) return null;
                const measureDuration = midiData?.measureDuration || 2.0;
                const timePerChord = measureDuration / m.chords.length;
                const measureStartSeconds = (m.measure - 1) * measureDuration;

                return m.chords.map((chord, cIndex) => {
                  let flatIndex = 0;
                  for (let i = 0; i < mIndex; i++) {
                    flatIndex += parsedChords[i].chords.length;
                  }
                  flatIndex += cIndex;

                  const chordTime = measureStartSeconds + cIndex * timePerChord;
                  const x = chordTime * PIXELS_PER_SECOND;
                  const w = timePerChord * PIXELS_PER_SECOND;
                  const isSelected = selectedChordIndices?.includes(flatIndex);

                  return (
                    <div
                      key={`${mIndex}-${cIndex}`}
                      style={{
                        position: 'absolute',
                        left: x,
                        width: w,
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        pointerEvents: 'auto',
                      }}
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleChordSelection(flatIndex, e.shiftKey);
                        }}
                        style={{
                          background: isSelected ? '#2383e2' : '#e03131',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '4px',
                          padding: '4px 12px',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                          minWidth: '32px',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                          transition: 'background 0.2s, transform 0.1s',
                          userSelect: 'none',
                        }}
                        onMouseDown={(e) => { e.stopPropagation(); }}
                      >
                        {chord.name}
                      </button>
                    </div>
                  );
                });
              })}
            </div>
          </div>
        )}

        {/* 再生コントロール */}
        <div style={{ position: 'absolute', top: '8px', left: '8px', display: 'flex', gap: '8px', zIndex: 10 }}>
          <button
            className="btn btn--sm"
            style={{
              background: isPlaying ? 'var(--accent-orange)' : 'var(--bg-elevated)',
              color: isPlaying ? '#fff' : 'var(--text-primary)',
              border: '1px solid var(--border-default)',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
            onClick={(e) => { e.stopPropagation(); togglePlayback(); }}
          >
            {isPlaying ? (
              <><StopIcon style={{ width: '16px', height: '16px' }} /> 停止</>
            ) : (
              <><PlayIcon style={{ width: '16px', height: '16px' }} /> 再生</>
            )}
          </button>
        </div>

        {/* カスタムスクロールバー */}
        {midiData && (
          <div
            ref={scrollbarRef}
            style={{
              position: 'absolute',
              bottom: 0,
              left: LEFT_MARGIN,
              right: 0,
              height: '16px',
              overflowX: 'auto',
              overflowY: 'hidden',
              zIndex: 20,
            }}
            onScroll={(e) => {
              setScrollX(e.target.scrollLeft);
            }}
          >
            <div style={{ width: midiData.totalDuration * PIXELS_PER_SECOND, height: '1px' }} />
          </div>
        )}
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
