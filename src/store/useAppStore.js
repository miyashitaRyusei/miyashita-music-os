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
        { data: chords }
      ] = await Promise.all([
        supabase.from('songs').select('*').order('imported_at', { ascending: false }),
        supabase.from('pitch_patterns').select('*').order('created_at', { ascending: false }),
        supabase.from('rhythm_patterns').select('*').order('created_at', { ascending: false }),
        supabase.from('chord_progressions').select('*').order('created_at', { ascending: false }),
      ]);

      set({
        registeredSongs: songs || [],
        pitchPatterns: pitches || [],
        rhythmPatterns: rhythms || [],
        chordProgressions: chords || [],
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
        activeSongId: state.activeSongId === id ? null : state.activeSongId
      }));
    }
  },
  setActiveSongId: (id) => set({ activeSongId: id }),

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
  setChordInput: (text) => {
    set({
      chordInputText: text,
      parsedChords: parseChordInput(text),
    });
  },
  clearChordInput: () => set({ chordInputText: '', parsedChords: [] }),

  // ============================================
  // Stock Attributes
  // ============================================
  stockAttributes: {
    source: 'original',
    preference: 'like',
    section: 'chorus',
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
  // Dashboard State
  // ============================================
  statistics: null,
  setStatistics: (stats) => set({ statistics: stats }),

  aiPrescription: '',
  setAiPrescription: (text) => set({ aiPrescription: text }),
}));

export default useAppStore;
