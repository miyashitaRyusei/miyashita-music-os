import { useState } from 'react';
import { playMidiNotes, stopAudio } from '../utils/audioPlayer';
import { transposeChord, getEffectiveKeyForMeasure } from '../utils/chordTransposer';

/**
 * ピアノロールの再生・停止ロジックをまとめたカスタムフック。
 */
export function usePianoRollPlayback({ midiData, parsedChords, stockAttributes }) {
  const [playbackCursor, setPlaybackCursor] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const togglePlayback = async () => {
    if (isPlaying) {
      stopAudio();
      setIsPlaying(false);
    } else {
      if (!midiData) return;
      setIsPlaying(true);
      const playbackRate = 1.0;

      // コード進行データを時刻付き配列に変換
      const chordsToPlay = [];
      if (parsedChords && parsedChords.length > 0 && midiData.measureDuration) {
        parsedChords.forEach(m => {
          const chordsInMeasure = m.chords.length;
          if (chordsInMeasure === 0) return;
          const timePerChord = midiData.measureDuration / chordsInMeasure;
          m.chords.forEach((chord, i) => {
            const time = (m.measure - 1) * midiData.measureDuration + i * timePerChord;
            const effectiveKey = getEffectiveKeyForMeasure(m.measure - 1, parsedChords, stockAttributes.originalKey);
            const transposedChordName = transposeChord(chord.name, effectiveKey);
            chordsToPlay.push({
              name: transposedChordName,
              time,
              duration: timePerChord,
            });
          });
        });
      }

      await playMidiNotes(midiData.notes, playbackCursor, playbackRate, () => {
        setIsPlaying(false);
      }, chordsToPlay);
    }
  };

  return { isPlaying, setIsPlaying, playbackCursor, setPlaybackCursor, togglePlayback };
}
