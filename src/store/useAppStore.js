import { create } from 'zustand';
import { parseChordInput } from '../utils/chordParser';
import { extractPitchArray, extractRhythmArray, isNoteInSelection } from '../utils/noteUtils';
import { supabase } from '../lib/supabase';

const useAppStore = create((set, get) => ({
  // ============================================
  // System State (Loading etc.)
  // ============================================
  isAnalyzing: false,
  setIsAnalyzing: (status) => set({ isAnalyzing: status }),
  isLoadingData: false,

  // ============================================
  // Data Fetching (Supabase)
  // ============================================
  fetchData: async () => {
    set({ isLoadingData: true });
    try {
      const [
        { data: songs },
        { data: pitches },
        { data: rhythms },
        { data: chords },
        { data: melodyChords }
      ] = await Promise.all([
        supabase.from('songs').select('*').order('imported_at', { ascending: false }),
        supabase.from('pitch_patterns').select('*').order('created_at', { ascending: false }),
        supabase.from('rhythm_patterns').select('*').order('created_at', { ascending: false }),
        supabase.from('chord_progressions').select('*').order('created_at', { ascending: false }),
        supabase.from('melody_chord_relations').select('*').order('created_at', { ascending: false }),
      ]);

      set({
        registeredSongs: songs || [],
        pitchPatterns: (pitches || []).map(p => ({ ...p, songId: p.song_id })),
        rhythmPatterns: (rhythms || []).map(r => ({ ...r, songId: r.song_id })),
        chordProgressions: (chords || []).map(c => ({ ...c, songId: c.song_id })),
        melodyChordRelations: (melodyChords || []).map(m => ({ ...m, songId: m.song_id, melodyDegree: m.melody_degree, chordName: m.chord_name })),
      });
    } catch (err) {
      console.error('Error fetching data from Supabase:', err);
    } finally {
      set({ isLoadingData: false });
    }
  },

  // ============================================
  // Registered Songs State
  // ============================================
  registeredSongs: [],
  activeSongId: null,
  registerSong: async (song) => {
    const { error } = await supabase.from('songs').insert([
      {
        id: song.id,
        title: song.title,
        artist: song.artist,
        original_key: song.originalKey,
        bpm: song.bpm,
        min_note: song.minNote,
        max_note: song.maxNote,
        imported_at: song.importedAt || new Date().toISOString()
      }
    ]);

    if (!error) {
      set((state) => ({
        registeredSongs: [{ ...song, originalKey: song.originalKey, minNote: song.minNote, maxNote: song.maxNote, importedAt: song.importedAt }, ...state.registeredSongs],
        activeSongId: song.id,
        stockAttributes: {
          ...state.stockAttributes,
          originalKey: song.originalKey || state.stockAttributes.originalKey
        }
      }));
    } else {
      console.error('Failed to register song:', error);
    }
  },
  removeSong: async (id) => {
    const { error } = await supabase.from('songs').delete().eq('id', id);
    if (!error) {
      set((state) => ({
        registeredSongs: state.registeredSongs.filter(s => s.id !== id),
        pitchPatterns: state.pitchPatterns.filter(p => p.song_id !== id && p.songId !== id),
        rhythmPatterns: state.rhythmPatterns.filter(p => p.song_id !== id && p.songId !== id),
        chordProgressions: state.chordProgressions.filter(c => c.song_id !== id && c.songId !== id),
        melodyChordRelations: state.melodyChordRelations.filter(m => m.song_id !== id && m.songId !== id),
        activeSongId: state.activeSongId === id ? null : state.activeSongId
      }));
    }
  },
  setActiveSongId: (id) => set((state) => {
    const song = state.registeredSongs.find(s => s.id === id);
    return {
      activeSongId: id,
      ...(song ? {
        stockAttributes: {
          ...state.stockAttributes,
          originalKey: song.originalKey || state.stockAttributes.originalKey
        }
      } : {})
    };
  }),

  // ============================================
  // PianoRoll State
  // ============================================
  midiData: null,
  setMidiData: (data) => set({ midiData: data, selectedNotes: [], extractedPitch: [], extractedRhythm: [] }),
  clearMidiData: () => set({ midiData: null, selectedNotes: [], extractedPitch: [], extractedRhythm: [] }),

  selectedNotes: [],
  setSelectedNotes: (notes) => set({ selectedNotes: notes }),

  selectedRegion: null,
  setSelectedRegion: (region) => {
    const { midiData } = get();
    if (!region || !midiData) {
      set({ selectedRegion: region, selectedNotes: [], extractedPitch: [], extractedRhythm: [] });
      return;
    }

    const selected = midiData.notes.filter((note) => isNoteInSelection(note, region));
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

  extractedPitch: [],
  extractedRhythm: [],

  // ============================================
  // Chord Input State
  // ============================================
  chordInputText: '',
  parsedChords: [],
  selectedChordIndices: [], // フラットインデックスの配列
  lastClickedChordIndex: null, // Shift+Click 用

  setChordInput: (text) => {
    set({
      chordInputText: text,
      parsedChords: parseChordInput(text),
      selectedChordIndices: [],
      lastClickedChordIndex: null,
    });
  },
  clearChordInput: () => set({ 
    chordInputText: '', 
    parsedChords: [], 
    selectedChordIndices: [],
    lastClickedChordIndex: null
  }),

  // コード選択のトグル処理
  toggleChordSelection: (index, isShiftKey) => {
    set((state) => {
      let newSelection = [...state.selectedChordIndices];
      
      if (isShiftKey && state.lastClickedChordIndex !== null) {
        // 範囲選択
        const start = Math.min(index, state.lastClickedChordIndex);
        const end = Math.max(index, state.lastClickedChordIndex);
        
        // startからendまでをnewSelectionに追加（重複は後で排除）
        for (let i = start; i <= end; i++) {
          newSelection.push(i);
        }
        // 重複排除してソート
        newSelection = [...new Set(newSelection)].sort((a, b) => a - b);
      } else {
        // 単一選択（トグル）
        if (newSelection.includes(index)) {
          newSelection = newSelection.filter((i) => i !== index);
        } else {
          newSelection.push(index);
          newSelection.sort((a, b) => a - b);
        }
      }
      
      return {
        selectedChordIndices: newSelection,
        lastClickedChordIndex: index,
      };
    });
  },
  
  clearChordSelection: () => set({ selectedChordIndices: [], lastClickedChordIndex: null }),

  // ============================================
  // Stock Attributes
  // ============================================
  stockAttributes: {
    source: '自作曲',
    preference: '好き',
    section: 'Aメロ',
    originalKey: 'C',
  },
  setStockSource: (source) => set((state) => ({ stockAttributes: { ...state.stockAttributes, source } })),
  setStockPreference: (preference) => set((state) => ({ stockAttributes: { ...state.stockAttributes, preference } })),
  setStockSection: (section) => set((state) => ({ stockAttributes: { ...state.stockAttributes, section } })),
  setStockOriginalKey: (originalKey) => set((state) => ({ stockAttributes: { ...state.stockAttributes, originalKey } })),

  // ============================================
  // Pitch Dictionary
  // ============================================
  pitchPatterns: [],
  addPitchPattern: async (pattern) => {
    const state = get();
    const key = pattern.degrees.join(',');
    const existing = state.pitchPatterns.find((p) => (p.degrees || []).join(',') === key);

    if (existing) {
      const newCount = (existing.count || 1) + 1;
      const { error } = await supabase.from('pitch_patterns').update({ count: newCount }).eq('id', existing.id);
      if (!error) {
        set((state) => ({
          pitchPatterns: state.pitchPatterns.map((p) => p.id === existing.id ? { ...p, count: newCount } : p),
        }));
      }
    } else {
      const dbPattern = {
        id: pattern.id,
        song_id: pattern.songId,
        degrees: pattern.degrees,
        count: 1,
        source: pattern.source,
        preference: pattern.preference,
        section: pattern.section
      };
      const { error } = await supabase.from('pitch_patterns').insert([dbPattern]);
      if (!error) {
        set((state) => ({ pitchPatterns: [{ ...dbPattern, songId: pattern.songId }, ...state.pitchPatterns] }));
      }
    }
  },
  removePitchPattern: async (id) => {
    const { error } = await supabase.from('pitch_patterns').delete().eq('id', id);
    if (!error) {
      set((state) => ({ pitchPatterns: state.pitchPatterns.filter((p) => p.id !== id) }));
    }
  },

  // ============================================
  // Rhythm Dictionary
  // ============================================
  rhythmPatterns: [],
  addRhythmPattern: async (pattern) => {
    const state = get();
    const key = pattern.timings.map((t) => `${(t.normalizedTime || 0).toFixed(3)}:${(t.normalizedDuration || 0).toFixed(3)}`).join(',');
    const existing = state.rhythmPatterns.find((p) => {
      const existingKey = (p.timings || []).map((t) => `${(t.normalizedTime || 0).toFixed(3)}:${(t.normalizedDuration || 0).toFixed(3)}`).join(',');
      return existingKey === key;
    });

    if (existing) {
      const newCount = (existing.count || 1) + 1;
      const { error } = await supabase.from('rhythm_patterns').update({ count: newCount }).eq('id', existing.id);
      if (!error) {
        set((state) => ({
          rhythmPatterns: state.rhythmPatterns.map((p) => p.id === existing.id ? { ...p, count: newCount } : p),
        }));
      }
    } else {
      const dbPattern = {
        id: pattern.id,
        song_id: pattern.songId,
        timings: pattern.timings,
        description: pattern.description,
        count: 1,
        source: pattern.source,
        preference: pattern.preference,
        section: pattern.section
      };
      const { error } = await supabase.from('rhythm_patterns').insert([dbPattern]);
      if (!error) {
        set((state) => ({ rhythmPatterns: [{ ...dbPattern, songId: pattern.songId }, ...state.rhythmPatterns] }));
      }
    }
  },
  removeRhythmPattern: async (id) => {
    const { error } = await supabase.from('rhythm_patterns').delete().eq('id', id);
    if (!error) {
      set((state) => ({ rhythmPatterns: state.rhythmPatterns.filter((p) => p.id !== id) }));
    }
  },

  // ============================================
  // Chord Dictionary
  // ============================================
  chordProgressions: [],
  addChordProgression: async (progression) => {
    const state = get();
    const newKey = progression.chords.join('|');
    const existing = state.chordProgressions.find((p) => (p.chords || []).join('|') === newKey);

    if (existing) {
      const mergedSections = [...new Set([...(existing.sections || []), ...(progression.sections || [])])];
      const newCount = (existing.count || 1) + 1;
      const { error } = await supabase.from('chord_progressions').update({ count: newCount, sections: mergedSections }).eq('id', existing.id);
      if (!error) {
        set((state) => ({
          chordProgressions: state.chordProgressions.map((p) => p.id === existing.id ? { ...p, count: newCount, sections: mergedSections } : p),
        }));
      }
    } else {
      const dbProgression = {
        id: progression.id,
        song_id: progression.songId,
        chords: progression.chords,
        label: progression.label,
        key: progression.key,
        count: 1,
        source: progression.source,
        preference: progression.preference,
        sections: progression.sections || []
      };
      const { error } = await supabase.from('chord_progressions').insert([dbProgression]);
      if (!error) {
        set((state) => ({ chordProgressions: [{ ...dbProgression, songId: progression.songId }, ...state.chordProgressions] }));
      }
    }
  },
  removeChordProgression: async (id) => {
    const { error } = await supabase.from('chord_progressions').delete().eq('id', id);
    if (!error) {
      set((state) => ({ chordProgressions: state.chordProgressions.filter((p) => p.id !== id) }));
    }
  },

  // ============================================
  // Melody x Chord Relations
  // ============================================
  melodyChordRelations: [],
  addMelodyChordRelation: async (relation) => {
    const state = get();
    // 完全に同じ組み合わせを探す
    const existing = state.melodyChordRelations.find((r) => 
      r.songId === relation.songId &&
      r.melodyDegree === relation.melodyDegree &&
      r.chordName === relation.chordName &&
      r.source === relation.source &&
      r.preference === relation.preference &&
      r.section === relation.section
    );

    if (existing) {
      const newCount = (existing.count || 1) + 1;
      const { error } = await supabase.from('melody_chord_relations').update({ count: newCount }).eq('id', existing.id);
      if (!error) {
        set((state) => ({
          melodyChordRelations: state.melodyChordRelations.map((r) => r.id === existing.id ? { ...r, count: newCount } : r),
        }));
      }
    } else {
      const dbRelation = {
        id: relation.id,
        song_id: relation.songId,
        melody_degree: relation.melodyDegree,
        chord_name: relation.chordName,
        count: 1,
        source: relation.source,
        preference: relation.preference,
        section: relation.section
      };
      const { error } = await supabase.from('melody_chord_relations').insert([dbRelation]);
      if (!error) {
        set((state) => ({ 
          melodyChordRelations: [{ ...dbRelation, songId: relation.songId, melodyDegree: relation.melodyDegree, chordName: relation.chordName }, ...state.melodyChordRelations] 
        }));
      }
    }
  },
  removeMelodyChordRelation: async (id) => {
    const { error } = await supabase.from('melody_chord_relations').delete().eq('id', id);
    if (!error) {
      set((state) => ({ melodyChordRelations: state.melodyChordRelations.filter((r) => r.id !== id) }));
    }
  },

  // ============================================
  // Dashboard State
  // ============================================
  statistics: null,
  setStatistics: (stats) => set({ statistics: stats }),

  aiPrescription: '',
  setAiPrescription: (text) => set({ aiPrescription: text }),
}));

export default useAppStore;
