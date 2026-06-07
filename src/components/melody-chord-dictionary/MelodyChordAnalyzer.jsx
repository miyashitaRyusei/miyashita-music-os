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

  // 無効なデータ（度数表記になってしまっているバグデータ等）を除外する
  const validFilteredItems = useMemo(() => {
    return filteredItems.filter(r => {
      const degree = r.melody_degree || r.melodyDegree;
      return ALL_DEGREES.includes(degree);
    });
  }, [filteredItems]);

  // --- メロディから探す ---
  const degreeStats = useMemo(() => {
    const filtered = validFilteredItems.filter(r => r.melody_degree === selectedDegree || r.melodyDegree === selectedDegree);
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
  }, [validFilteredItems, selectedDegree]);

  // --- コードから探す ---
  const availableChords = useMemo(() => {
    const chords = new Set();
    validFilteredItems.forEach(r => {
      if (r.chord_name || r.chordName) chords.add(r.chord_name || r.chordName);
    });
    return Array.from(chords).sort();
  }, [validFilteredItems]);

  const chordStats = useMemo(() => {
    const filtered = validFilteredItems.filter(r => (r.chord_name === selectedChord) || (r.chordName === selectedChord));
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
  }, [validFilteredItems, selectedChord]);

  // 初回ロード時などに有効なコードをセットする
  if (availableChords.length > 0 && !availableChords.includes(selectedChord)) {
    setSelectedChord(availableChords[0]);
  }

  // --- 再生機能 ---
  const handlePlayCombo = async (melodyDegree, chordName) => {
    const { playMelodyAndChord } = await import('../../utils/audioPlayer');
    playMelodyAndChord(melodyDegree, chordName);
  };

  return (
    <div>
      <CommonFilter filters={filters} setFilters={setFilters} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
      
      {/* メロディから探す */}
      <div className="dict-card" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '1.2rem', marginBottom: '20px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          🎵 メロディ音からコードを探す
        </h3>
        
        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>メロディ音（Cメジャー基準）</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '8px' }}>
            {ALL_DEGREES.map(d => (
              <button 
                key={d} 
                onClick={() => setSelectedDegree(d)}
                style={{
                  padding: '8px 4px',
                  borderRadius: '6px',
                  border: selectedDegree === d ? '2px solid var(--accent-blue)' : '1px solid var(--border-strong)',
                  background: selectedDegree === d ? 'rgba(59, 130, 246, 0.1)' : 'var(--bg-secondary)',
                  color: selectedDegree === d ? 'var(--accent-blue)' : 'var(--text-primary)',
                  fontWeight: selectedDegree === d ? 'bold' : 'normal',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  fontSize: '0.9rem'
                }}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        <div style={{ minHeight: '300px' }}>
          <div style={{ marginBottom: '16px', fontSize: '0.9rem', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
            <span>分析結果</span>
            <span>総サンプル数: <strong>{degreeStats.total}</strong> 件</span>
          </div>
          {degreeStats.sorted.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {degreeStats.sorted.map((item, index) => {
                const isNonDiatonicChord = item.chord.includes('#') || item.chord.includes('b');
                return (
                  <div key={item.chord} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '24px', fontSize: '0.9rem', color: 'var(--text-tertiary)', textAlign: 'right' }}>
                      {index + 1}.
                    </div>
                    <div style={{ 
                      width: '60px', 
                      fontWeight: 'bold', 
                      color: isNonDiatonicChord ? 'var(--accent-orange)' : 'var(--text-primary)' 
                    }}>
                      {item.chord}
                    </div>
                    <button 
                      onClick={() => handlePlayCombo(selectedDegree, item.chord)}
                      style={{ 
                        background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--accent-blue)',
                        padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}
                      title={`メロディ「${selectedDegree}」とコード「${item.chord}」を同時に再生`}
                    >
                      ▶
                    </button>
                    <div style={{ flex: 1, background: 'var(--bg-secondary)', height: '16px', borderRadius: '8px', overflow: 'hidden', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.2)' }}>
                      <div style={{ 
                        width: `${item.percentage}%`, 
                        height: '100%', 
                        background: 'linear-gradient(90deg, var(--accent-blue), #60a5fa)', 
                        transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                        borderRadius: '8px'
                      }} />
                    </div>
                    <div style={{ width: '48px', textAlign: 'right', fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--text-secondary)' }}>
                      {Math.round(item.percentage)}%
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="empty-state">データがありません</div>
          )}
        </div>
      </div>

      {/* コードから探す */}
      <div className="dict-card" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '1.2rem', marginBottom: '20px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          🎹 コードからメロディ音を探す
        </h3>
        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>コード（Cメジャー基準）</div>
          <select 
            className="input" 
            value={selectedChord} 
            onChange={(e) => setSelectedChord(e.target.value)}
            disabled={availableChords.length === 0}
            style={{ width: '100%', maxWidth: '300px' }}
          >
            {availableChords.length > 0 ? (
              availableChords.map(c => <option key={c} value={c}>{c}</option>)
            ) : (
              <option value="C">C</option>
            )}
          </select>
        </div>

        <div style={{ minHeight: '300px' }}>
          <div style={{ marginBottom: '16px', fontSize: '0.9rem', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
            <span>分析結果</span>
            <span>総サンプル数: <strong>{chordStats.total}</strong> 件</span>
          </div>
          {chordStats.sorted.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {chordStats.sorted.map((item, index) => {
                const isNonDiatonic = item.degree.includes('#');
                return (
                  <div key={item.degree} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '24px', fontSize: '0.9rem', color: 'var(--text-tertiary)', textAlign: 'right' }}>
                      {index + 1}.
                    </div>
                    <div style={{ 
                      width: '60px', 
                      fontWeight: 'bold', 
                      color: isNonDiatonic ? 'var(--accent-orange)' : 'var(--text-primary)' 
                    }}>
                      {item.degree}
                    </div>
                    <button 
                      onClick={() => handlePlayCombo(item.degree, selectedChord)}
                      style={{ 
                        background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--accent-purple)',
                        padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}
                      title={`メロディ「${item.degree}」とコード「${selectedChord}」を同時に再生`}
                    >
                      ▶
                    </button>
                    <div style={{ flex: 1, background: 'var(--bg-secondary)', height: '16px', borderRadius: '8px', overflow: 'hidden', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.2)' }}>
                      <div style={{ 
                        width: `${item.percentage}%`, 
                        height: '100%', 
                        background: 'linear-gradient(90deg, var(--accent-purple), #d8b4fe)', 
                        transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                        borderRadius: '8px'
                      }} />
                    </div>
                    <div style={{ width: '48px', textAlign: 'right', fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--text-secondary)' }}>
                      {Math.round(item.percentage)}%
                    </div>
                  </div>
                );
              })}
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
