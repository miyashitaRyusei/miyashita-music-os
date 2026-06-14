import { useState, useMemo } from 'react';
import { hasNonDiatonic } from '../utils/chordUtils';
import { degreeToValue } from '../utils/pitchUtils';

export function useDictionaryFilter(items, dictionaryType = 'generic') {
  const [filters, setFilters] = useState({
    keyword: '',
    source: '',
    preference: '',
    section: '',
    songId: '',
    sortBy: 'newest', // 'newest', 'oldest', 'most_used'
    favoritesOnly: false, // お気に入りのみ
  });

  const [advancedFilters, setAdvancedFilters] = useState({
    // ピッチ用
    includedPitches: [],
    minNotes: '',
    maxNotes: '',
    maxInterval: '',
    startNote: '',
    endNote: '',
    
    // リズム用
    hasRests: '',
    isAnacrusis: '',
    // minNotes, maxNotes は共通で使用
    
    // コード用
    includedChords: '',
    minChords: '',
    maxChords: '',
    startChord: '',
    endChord: '',
    hasNonDiatonic: '', // 'yes', 'no', ''
    minLeap: '', // ピッチ用跳躍幅
  });

  const filteredItems = useMemo(() => {
    let result = [...items];

    // お気に入りのみ表示
    if (filters.favoritesOnly) {
      result = result.filter(item => item.is_favorite === true);
    }

    // AND条件でのフィルタリング
    if (filters.source) {
      result = result.filter(item => item.source === filters.source);
    }
    
    if (filters.preference) {
      result = result.filter(item => item.preference === filters.preference);
    }
    
    if (filters.section) {
      result = result.filter(item => {
        // ChordProgressionsは配列(sections)の可能性がある
        if (Array.isArray(item.sections)) {
          return item.sections.includes(filters.section);
        }
        return item.section === filters.section;
      });
    }
    
    if (filters.songId) {
      result = result.filter(item => item.song_id === filters.songId || item.songId === filters.songId);
    }
    
    if (filters.keyword) {
      const q = filters.keyword.toLowerCase();
      result = result.filter(item => {
        // IDに含まれるか
        const idMatch = item.id?.toLowerCase().includes(q);
        
        // Pitchのdegree
        const degreeMatch = item.degrees && item.degrees.join(' ').toLowerCase().includes(q);
        
        // Chordのchords
        const chordMatch = item.chords && item.chords.join(' ').toLowerCase().includes(q);
        
        // Rhythmのdescription
        const descMatch = item.description && item.description.toLowerCase().includes(q);

        return idMatch || degreeMatch || chordMatch || descMatch;
      });
    }

    // 高度なフィルター (辞書別)
    if (dictionaryType === 'pitch') {
      if (advancedFilters.includedPitches.length > 0) {
        result = result.filter(item => {
          if (!item.degrees) return false;
          return advancedFilters.includedPitches.every(p => item.degrees.includes(p));
        });
      }
      if (advancedFilters.minNotes) {
        result = result.filter(item => item.degrees && item.degrees.length >= parseInt(advancedFilters.minNotes, 10));
      }
      if (advancedFilters.maxNotes) {
        result = result.filter(item => item.degrees && item.degrees.length <= parseInt(advancedFilters.maxNotes, 10));
      }
      if (advancedFilters.startNote) {
        result = result.filter(item => item.degrees && item.degrees[0] === advancedFilters.startNote);
      }
      if (advancedFilters.endNote) {
        result = result.filter(item => item.degrees && item.degrees[item.degrees.length - 1] === advancedFilters.endNote);
      }
      if (advancedFilters.hasNonDiatonic === 'yes') {
        result = result.filter(item => item.degrees && item.degrees.some(d => d.includes('#') || d.includes('b') || d.includes('♯') || d.includes('♭')));
      } else if (advancedFilters.hasNonDiatonic === 'no') {
        result = result.filter(item => item.degrees && !item.degrees.some(d => d.includes('#') || d.includes('b') || d.includes('♯') || d.includes('♭')));
      }
      if (advancedFilters.minLeap) {
        const leapTarget = parseInt(advancedFilters.minLeap, 10);
        result = result.filter(item => {
          if (!item.degrees || item.degrees.length < 2) return false;
          let hasLeap = false;
          for (let i = 0; i < item.degrees.length - 1; i++) {
            const val1 = degreeToValue(item.degrees[i]);
            const val2 = degreeToValue(item.degrees[i+1]);
            if (Math.abs(val1 - val2) >= leapTarget) {
              hasLeap = true;
              break;
            }
          }
          return hasLeap;
        });
      }
    } else if (dictionaryType === 'rhythm') {
      if (advancedFilters.minNotes) {
        result = result.filter(item => item.timings && item.timings.length >= parseInt(advancedFilters.minNotes, 10));
      }
      if (advancedFilters.maxNotes) {
        result = result.filter(item => item.timings && item.timings.length <= parseInt(advancedFilters.maxNotes, 10));
      }
      if (advancedFilters.hasRests === 'yes') {
        result = result.filter(item => {
          if (!item.timings || item.timings.length < 2) return false;
          for (let i = 0; i < item.timings.length - 1; i++) {
            const currentEnd = item.timings[i].normalizedTime + item.timings[i].normalizedDuration;
            const nextStart = item.timings[i+1].normalizedTime;
            if (nextStart - currentEnd > 0.01) return true; // 隙間があれば休符あり
          }
          return false;
        });
      } else if (advancedFilters.hasRests === 'no') {
        result = result.filter(item => {
          if (!item.timings || item.timings.length < 2) return true;
          for (let i = 0; i < item.timings.length - 1; i++) {
            const currentEnd = item.timings[i].normalizedTime + item.timings[i].normalizedDuration;
            const nextStart = item.timings[i+1].normalizedTime;
            if (nextStart - currentEnd > 0.01) return false;
          }
          return true;
        });
      }
      if (advancedFilters.isAnacrusis === 'yes') {
        result = result.filter(item => item.timings && item.timings[0] && item.timings[0].normalizedTime < 0);
      } else if (advancedFilters.isAnacrusis === 'no') {
        result = result.filter(item => item.timings && item.timings[0] && item.timings[0].normalizedTime >= 0);
      }
    } else if (dictionaryType === 'chord') {
      if (advancedFilters.includedChords) {
        const queryChords = advancedFilters.includedChords.split(',').map(c => c.trim()).filter(c => c);
        result = result.filter(item => {
          if (!item.chords) return false;
          return queryChords.every(qc => item.chords.some(c => {
            const chordName = typeof c === 'object' ? c.name : c;
            return chordName.includes(qc);
          }));
        });
      }
      if (advancedFilters.minChords) {
        result = result.filter(item => item.chords && item.chords.length >= parseInt(advancedFilters.minChords, 10));
      }
      if (advancedFilters.maxChords) {
        result = result.filter(item => item.chords && item.chords.length <= parseInt(advancedFilters.maxChords, 10));
      }
      if (advancedFilters.startChord) {
        result = result.filter(item => {
          if (!item.chords || item.chords.length === 0) return false;
          const firstChord = typeof item.chords[0] === 'object' ? item.chords[0].name : item.chords[0];
          return firstChord === advancedFilters.startChord;
        });
      }
      if (advancedFilters.endChord) {
        result = result.filter(item => {
          if (!item.chords || item.chords.length === 0) return false;
          const lastChord = typeof item.chords[item.chords.length - 1] === 'object' ? item.chords[item.chords.length - 1].name : item.chords[item.chords.length - 1];
          return lastChord === advancedFilters.endChord;
        });
      }
      if (advancedFilters.hasNonDiatonic === 'yes') {
        result = result.filter(item => item.chords && hasNonDiatonic(item.chords));
      } else if (advancedFilters.hasNonDiatonic === 'no') {
        result = result.filter(item => item.chords && !hasNonDiatonic(item.chords));
      }
    }

    // 並び替え
    result.sort((a, b) => {
      if (filters.sortBy === 'newest') {
        // created_at が無いものは最新扱いとする（追加直後）
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 9999999999999;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 9999999999999;
        return dateB - dateA;
      } else if (filters.sortBy === 'oldest') {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 9999999999999;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 9999999999999;
        return dateA - dateB;
      } else if (filters.sortBy === 'most_used') {
        return (b.count || 1) - (a.count || 1);
      }
      return 0;
    });

    return result;
  }, [items, filters, advancedFilters, dictionaryType]);

  return { filters, setFilters, advancedFilters, setAdvancedFilters, filteredItems };
}
