import { useState, useMemo } from 'react';
import useAppStore from '../../store/useAppStore';
import { useDictionaryFilter } from '../../hooks/useDictionaryFilter';
import CommonFilter from '../common/CommonFilter';

const ALL_DEGREES = ['ド', 'ド#', 'レ', 'レ#', 'ミ', 'ファ', 'ファ#', 'ソ', 'ソ#', 'ラ', 'ラ#', 'シ'];

export default function MelodyChordAnalyzer() {
  const relations = useAppStore((s) => s.melodyChordRelations) || [];
  const { filters, setFilters, filteredItems } = useDictionaryFilter(relations);

  const [selectedDegree, setSelectedDegree] = useState('ド');
  const [selectedChord, setSelectedChord] = useState('C');

  // --- メロディから探す ---
  const degreeStats = useMemo(() => {
    const filtered = filteredItems.filter(r => r.melody_degree === selectedDegree || r.melodyDegree === selectedDegree);
    const total = filtered.reduce((sum, r) => sum + (r.count || 1), 0);
    
    const groups = {};
    filtered.forEach(r => {
      const chord = r.chord_name || r.chordName;
      groups[chord] = (groups[chord] || 0) + (r.count || 1);
    });

    const sorted = Object.entries(groups)
      .map(([chord, count]) => ({ chord, count, percentage: total > 0 ? (count / total) * 100 : 0 }))
      .sort((a, b) => b.count - a.count);

    return { total, sorted };
  }, [filteredItems, selectedDegree]);

  // --- コードから探す ---
  // 存在するすべてのコードを抽出して選択肢にする
  const availableChords = useMemo(() => {
    const chords = new Set();
    filteredItems.forEach(r => {
      if (r.chord_name || r.chordName) chords.add(r.chord_name || r.chordName);
    });
    return Array.from(chords).sort();
  }, [filteredItems]);

  const chordStats = useMemo(() => {
    const filtered = filteredItems.filter(r => (r.chord_name === selectedChord) || (r.chordName === selectedChord));
    const total = filtered.reduce((sum, r) => sum + (r.count || 1), 0);
    
    const groups = {};
    filtered.forEach(r => {
      const degree = r.melody_degree || r.melodyDegree;
      groups[degree] = (groups[degree] || 0) + (r.count || 1);
    });

    const sorted = Object.entries(groups)
      .map(([degree, count]) => ({ degree, count, percentage: total > 0 ? (count / total) * 100 : 0 }))
      .sort((a, b) => b.count - a.count);

    return { total, sorted };
  }, [filteredItems, selectedChord]);

  // 初回ロード時などに有効なコードをセットする
  useMemo(() => {
    if (availableChords.length > 0 && !availableChords.includes(selectedChord)) {
      setSelectedChord(availableChords[0]);
    }
  }, [availableChords, selectedChord]);


  return (
    <div>
      <CommonFilter filters={filters} setFilters={setFilters} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
      
      {/* メロディから探す */}
      <div className="workspace-section">
        <h3 style={{ fontSize: '1.1rem', marginBottom: '16px', color: 'var(--text-primary)' }}>
          🎵 メロディ音からコードを探す
        </h3>
        <div className="form-group" style={{ marginBottom: '24px' }}>
          <label className="form-label">メロディ音（Cメジャー基準）</label>
          <select 
            className="input" 
            value={selectedDegree} 
            onChange={(e) => setSelectedDegree(e.target.value)}
          >
            {ALL_DEGREES.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>

        <div style={{ minHeight: '300px', padding: '0 8px' }}>
          <div style={{ marginBottom: '16px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            総サンプル数: <strong>{degreeStats.total}</strong> 件
          </div>
          {degreeStats.sorted.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {degreeStats.sorted.map((item, i) => (
                <div key={item.chord} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '60px', fontWeight: 'bold', color: 'var(--text-primary)' }}>{item.chord}</div>
                  <div style={{ flex: 1, background: 'var(--bg-secondary)', height: '12px', borderRadius: '6px', overflow: 'hidden' }}>
                    <div style={{ 
                      width: `${item.percentage}%`, 
                      height: '100%', 
                      background: 'var(--accent-blue)', 
                      transition: 'width 0.3s ease' 
                    }} />
                  </div>
                  <div style={{ width: '40px', textAlign: 'right', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    {Math.round(item.percentage)}%
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">データがありません</div>
          )}
        </div>
      </div>

      {/* コードから探す */}
      <div className="workspace-section" style={{ marginTop: 0 }}>
        <h3 style={{ fontSize: '1.1rem', marginBottom: '16px', color: 'var(--text-primary)' }}>
          🎹 コードからメロディ音を探す
        </h3>
        <div className="form-group" style={{ marginBottom: '24px' }}>
          <label className="form-label">コード（Cメジャー基準）</label>
          <select 
            className="input" 
            value={selectedChord} 
            onChange={(e) => setSelectedChord(e.target.value)}
            disabled={availableChords.length === 0}
          >
            {availableChords.length > 0 ? (
              availableChords.map(c => <option key={c} value={c}>{c}</option>)
            ) : (
              <option value="C">C</option>
            )}
          </select>
        </div>

        <div style={{ minHeight: '300px', padding: '0 8px' }}>
          <div style={{ marginBottom: '16px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            総サンプル数: <strong>{chordStats.total}</strong> 件
          </div>
          {chordStats.sorted.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {chordStats.sorted.map((item, i) => (
                <div key={item.degree} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '60px', fontWeight: 'bold', color: 'var(--text-primary)' }}>{item.degree}</div>
                  <div style={{ flex: 1, background: 'var(--bg-secondary)', height: '12px', borderRadius: '6px', overflow: 'hidden' }}>
                    <div style={{ 
                      width: `${item.percentage}%`, 
                      height: '100%', 
                      background: 'var(--accent-purple)', 
                      transition: 'width 0.3s ease' 
                    }} />
                  </div>
                  <div style={{ width: '40px', textAlign: 'right', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    {Math.round(item.percentage)}%
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">データがありません</div>
          )}
        </div>
      </div>

      </div>
    </div>
  );
}
