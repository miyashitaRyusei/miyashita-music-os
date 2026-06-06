import { useState } from 'react';
import useAppStore from '../store/useAppStore';
import { parseMidiFile, readFileAsArrayBuffer } from '../utils/midiParser';
import { midiToNoteName, transposeToC } from '../utils/noteUtils';

/**
 * MIDIファイルのドロップ受け入れとメタデータモーダルをまとめたカスタムフック。
 */
export function usePianoRollDrop({ setMidiData, setScrollX }) {
  const [pendingMidiData, setPendingMidiData] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const setIsAnalyzing = useAppStore((s) => s.setIsAnalyzing);

  const handleDrop = async (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (!file || (!file.name.toLowerCase().endsWith('.mid') && !file.name.toLowerCase().endsWith('.midi'))) {
      return;
    }
    try {
      const arrayBuffer = await readFileAsArrayBuffer(file);
      const data = parseMidiFile(arrayBuffer);
      setPendingMidiData(data);
    } catch (err) {
      console.error('MIDI parse error:', err);
    }
  };

  const handleMetadataConfirm = async ({ rootNote, bpm, title, artist }) => {
    if (!pendingMidiData) return;
    const dataToProcess = pendingMidiData;
    setPendingMidiData(null);
    setIsAnalyzing(true);
    try {
      const originalTempo = dataToProcess.originalTempo || 120;
      const scaleRatio = originalTempo / bpm;
      const scaledNotes = dataToProcess.notes.map(n => ({
        ...n,
        time: n.time * scaleRatio,
        duration: n.duration * scaleRatio,
      }));
      const dataWithTempo = {
        ...dataToProcess,
        tempo: bpm,
        notes: scaledNotes,
        measureDuration: dataToProcess.measureDuration * scaleRatio,
        totalDuration: dataToProcess.totalDuration * scaleRatio,
      };
      const minNote = midiToNoteName(dataToProcess.pitchRange.min);
      const maxNote = midiToNoteName(dataToProcess.pitchRange.max);
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
      const transposedData = transposeToC(dataWithTempo, rootNote);
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

  return {
    pendingMidiData,
    isDragOver,
    handleDrop,
    handleDragOver,
    handleDragLeave,
    handleMetadataConfirm,
    handleMetadataCancel,
  };
}
