import { useState, useMemo } from 'react';

export function useDictionaryFilter(items) {
  const [filters, setFilters] = useState({
    keyword: '',
    source: '',
    preference: '',
    section: '',
    songId: '',
    sortBy: 'newest', // 'newest', 'oldest', 'most_used'
  });

  const filteredItems = useMemo(() => {
    let result = [...items];

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

    // 並び替え
    result.sort((a, b) => {
      if (filters.sortBy === 'newest') {
        // created_at が無いものは最新扱いとする（追加直後）
        const dateA = a.created_at ? new Date(a.created_at).getTime() : Date.now();
        const dateB = b.created_at ? new Date(b.created_at).getTime() : Date.now();
        return dateB - dateA;
      } else if (filters.sortBy === 'oldest') {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : Date.now();
        const dateB = b.created_at ? new Date(b.created_at).getTime() : Date.now();
        return dateA - dateB;
      } else if (filters.sortBy === 'most_used') {
        return (b.count || 1) - (a.count || 1);
      }
      return 0;
    });

    return result;
  }, [items, filters]);

  return { filters, setFilters, filteredItems };
}
