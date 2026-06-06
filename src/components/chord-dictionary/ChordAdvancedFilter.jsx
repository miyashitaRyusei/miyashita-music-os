

export default function ChordAdvancedFilter({ advancedFilters, setAdvancedFilters }) {
  const handleChange = (key, value) => {
    setAdvancedFilters(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      <div className="form-group">
        <label className="form-label">🎹 特定コードの含有</label>
        <input
          type="text"
          className="input"
          placeholder="例: E7, Fmaj7 （カンマ区切りで複数指定/AND）"
          value={advancedFilters.includedChords || ''}
          onChange={(e) => handleChange('includedChords', e.target.value)}
        />
        <small style={{ color: 'var(--text-tertiary)', marginTop: '4px', display: 'block' }}>
          入力したコードがすべて含まれる進行を抽出します。
        </small>
      </div>

      <div className="form-group">
        <label className="form-label">🔗 進行の長さ（コード数）</label>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input
            type="number"
            className="input"
            style={{ width: '80px' }}
            placeholder="最小"
            value={advancedFilters.minChords || ''}
            onChange={(e) => handleChange('minChords', e.target.value)}
          />
          <span>〜</span>
          <input
            type="number"
            className="input"
            style={{ width: '80px' }}
            placeholder="最大"
            value={advancedFilters.maxChords || ''}
            onChange={(e) => handleChange('maxChords', e.target.value)}
          />
          <span>コード</span>
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">🏁 開始コード</label>
        <input
          type="text"
          className="input"
          placeholder="例: F"
          value={advancedFilters.startChord || ''}
          onChange={(e) => handleChange('startChord', e.target.value)}
        />
      </div>

      <div className="form-group">
        <label className="form-label">🎯 終了コード</label>
        <input
          type="text"
          className="input"
          placeholder="例: C"
          value={advancedFilters.endChord || ''}
          onChange={(e) => handleChange('endChord', e.target.value)}
        />
      </div>

      <div className="form-group">
        <label className="form-label">👽 ノンダイアトニックコード（エモさ）</label>
        <select
          className="input"
          value={advancedFilters.hasNonDiatonic || ''}
          onChange={(e) => handleChange('hasNonDiatonic', e.target.value)}
        >
          <option value="">すべて</option>
          <option value="yes">含む（お洒落・エモい進行）</option>
          <option value="no">含まない（王道・素直な進行）</option>
        </select>
        <small style={{ color: 'var(--text-tertiary)', marginTop: '4px', display: 'block' }}>
          ※ キーCにおいて、Cmaj7等の四和音はダイアトニックとして扱います。
        </small>
      </div>

      <div className="form-group">
        <button 
          className="btn btn--secondary" 
          style={{ width: '100%', marginTop: '16px' }}
          onClick={() => setAdvancedFilters(prev => ({
            ...prev,
            includedChords: '',
            minChords: '',
            maxChords: '',
            startChord: '',
            endChord: '',
            hasNonDiatonic: ''
          }))}
        >
          クリア
        </button>
      </div>
    </div>
  );
}
