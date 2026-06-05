import { create } from 'zustand';
import { parseChordInput } from '../utils/chordParser';
import { extractPitchArray, extractRhythmArray, isNoteInSelection } from '../utils/noteUtils';
import { mockPitchPatterns, mockRhythmPatterns, mockChordProgressions } from '../data/mockData';

const useAppStore = create((set, get) => ({
  // ============================================
  // System State (Loading etc.)
  // ============================================
  isAnalyzing: false,
  setIsAnalyzing: (status) => set({ isAnalyzing: status }),

  // ============================================
  // Registered Songs State
  // ============================================
  registeredSongs: [],
  activeSongId: null,
  registerSong: (song) => set((state) => ({
    registeredSongs: [song, ...state.registeredSongs],
    activeSongId: song.id,
  })),
  setActiveSongId: (id) => set({ activeSongId: id }),

  // ============================================
  // PianoRoll State
  // ============================================
  midiData: null,           // パース済みMIDIデータ（midiParser.js の出力）
  setMidiData: (data) => set({ midiData: data, selectedNotes: [], extractedPitch: [], extractedRhythm: [] }),
  clearMidiData: () => set({ midiData: null, selectedNotes: [], extractedPitch: [], extractedRhythm: [] }),

  // ドラッグ選択されたノート配列
  selectedNotes: [],
  setSelectedNotes: (notes) => set({ selectedNotes: notes }),

  // 選択範囲（ピクセル座標ではなく時間/ピッチ座標）
  selectedRegion: null,     // { startTime, endTime, startPitch, endPitch }
  setSelectedRegion: (region) => {
    const { midiData } = get();
    if (!region || !midiData) {
      set({ selectedRegion: region, selectedNotes: [], extractedPitch: [], extractedRhythm: [] });
      return;
    }

    // 選択範囲と交差するノートを抽出
    const selected = midiData.notes.filter((note) => isNoteInSelection(note, region));

    // ピッチ・リズムデータを即時抽出
    const pitch = extractPitchArray(selected);
    const rhythm = extractRhythmArray(selected, midiData.measureDuration);

    set({
      selectedRegion: region,
      selectedNotes: selected,
      extractedPitch: pitch,
      extractedRhythm: rhythm,
    });
  },
  clearSelectedRegion: () => set({
    selectedRegion: null,
    selectedNotes: [],
    extractedPitch: [],
    extractedRhythm: [],
  }),

  // 抽出データ（ストックボタン押下前の一時データ）
  extractedPitch: [],       // 階名配列 ['Do', 'Re', 'Mi', ...]
  extractedRhythm: [],      // 相対時間配列 [{ relativeTime, duration, degreeName }]

  // ============================================
  // Chord Input State
  // ============================================
  chordInputText: '',
  parsedChords: [],
  setChordInput: (text) => {
    set({
      chordInputText: text,
      parsedChords: parseChordInput(text),
    });
  },
  clearChordInput: () => set({ chordInputText: '', parsedChords: [] }),

  // ============================================
  // Stock Attributes（ストック時の属性）
  // ============================================
  stockAttributes: {
    source: 'original',       // 'original' | 'reference'
    preference: 'like',       // 'like' | 'dislike'
    section: 'chorus',        // 'intro' | 'verse_a' | 'verse_b' | 'chorus' | 'bridge' | 'outro'
    originalKey: 'C',         // 'C' | 'Db' | 'D' ...
  },
  setStockSource: (source) => set((state) => ({
    stockAttributes: { ...state.stockAttributes, source },
  })),
  setStockPreference: (preference) => set((state) => ({
    stockAttributes: { ...state.stockAttributes, preference },
  })),
  setStockSection: (section) => set((state) => ({
    stockAttributes: { ...state.stockAttributes, section },
  })),
  setStockOriginalKey: (originalKey) => set((state) => ({
    stockAttributes: { ...state.stockAttributes, originalKey },
  })),

  // ============================================
  // Pitch Dictionary
  // ============================================
  pitchPatterns: [...mockPitchPatterns],
  addPitchPattern: (pattern) => set((state) => {
    // UPSERT: 同じ階名配列がある場合はカウントアップ
    const key = pattern.degrees.join(',');
    const existing = state.pitchPatterns.find((p) => p.degrees.join(',') === key);
    if (existing) {
      return {
        pitchPatterns: state.pitchPatterns.map((p) =>
          p.id === existing.id
            ? { ...p, count: (p.count || 1) + 1 }
            : p
        ),
      };
    }
    // 新規: 配列の先頭に追加（UIですぐ見えるように）
    return {
      pitchPatterns: [{ ...pattern, count: 1 }, ...state.pitchPatterns],
    };
  }),
  removePitchPattern: (id) => set((state) => ({
    pitchPatterns: state.pitchPatterns.filter((p) => p.id !== id),
  })),

  // ============================================
  // Rhythm Dictionary
  // ============================================
  rhythmPatterns: [...mockRhythmPatterns],
  addRhythmPattern: (pattern) => set((state) => {
    // UPSERT: 同じリズムキーがある場合はカウントアップ（テンポ非依存の正規化値を使用）
    const key = pattern.timings.map((t) => `${(t.normalizedTime || 0).toFixed(3)}:${(t.normalizedDuration || 0).toFixed(3)}`).join(',');
    const existing = state.rhythmPatterns.find((p) => {
      const existingKey = p.timings.map((t) => `${(t.normalizedTime || 0).toFixed(3)}:${(t.normalizedDuration || 0).toFixed(3)}`).join(',');
      return existingKey === key;
    });
    if (existing) {
      return {
        rhythmPatterns: state.rhythmPatterns.map((p) =>
          p.id === existing.id
            ? { ...p, count: (p.count || 1) + 1 }
            : p
        ),
      };
    }
    // 新規: 配列の先頭に追加
    return {
      rhythmPatterns: [{ ...pattern, count: 1 }, ...state.rhythmPatterns],
    };
  }),
  removeRhythmPattern: (id) => set((state) => ({
    rhythmPatterns: state.rhythmPatterns.filter((p) => p.id !== id),
  })),

  // ============================================
  // Chord Dictionary（UPSERT対応）
  // ============================================
  chordProgressions: [...mockChordProgressions],
  addChordProgression: (progression) => set((state) => {
    // コード配列の文字列化でキー比較
    const newKey = progression.chords.join('|');
    const existing = state.chordProgressions.find((p) => p.chords.join('|') === newKey);

    if (existing) {
      // 既存: count +1 & sections マージ（重複排除）
      const mergedSections = [...new Set([
        ...(existing.sections || []),
        ...(progression.sections || []),
      ])];
      return {
        chordProgressions: state.chordProgressions.map((p) =>
          p.id === existing.id
            ? { ...p, count: (p.count || 1) + 1, sections: mergedSections }
            : p
        ),
      };
    }

    // 新規: 配列の先頭に追加（UIですぐに見えるようにする）
    return {
      chordProgressions: [
        { ...progression, count: 1, sections: progression.sections || [] },
        ...state.chordProgressions,
      ],
    };
  }),
  removeChordProgression: (id) => set((state) => ({
    chordProgressions: state.chordProgressions.filter((p) => p.id !== id),
  })),

  // ============================================
  // Dashboard State
  // ============================================
  statistics: null,
  setStatistics: (stats) => set({ statistics: stats }),

  aiPrescription: '',
  setAiPrescription: (text) => set({ aiPrescription: text }),
}));

export default useAppStore;
