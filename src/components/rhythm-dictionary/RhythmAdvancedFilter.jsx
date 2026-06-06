

export default function RhythmAdvancedFilter({ advancedFilters, setAdvancedFilters }) {
  const handleChange = (key, value) => {
    setAdvancedFilters(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      <div className="form-group">
        <label className="form-label">🥁 音数（手数の多さ）</label>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input
            type="number"
            className="input"
            style={{ width: '80px' }}
            placeholder="最小"
            value={advancedFilters.minNotes || ''}
            onChange={(e) => handleChange('minNotes', e.target.value)}
          />
          <span>〜</span>
          <input
            type="number"
            className="input"
            style={{ width: '80px' }}
            placeholder="最大"
            value={advancedFilters.maxNotes || ''}
            onChange={(e) => handleChange('maxNotes', e.target.value)}
          />
          <span>音</span>
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">⏸️ 休符の有無</label>
        <select
          className="input"
          value={advancedFilters.hasRests || ''}
          onChange={(e) => handleChange('hasRests', e.target.value)}
        >
          <option value="">すべて</option>
          <option value="yes">休符を含む（間が空く）</option>
          <option value="no">休符を含まない（音が詰まっている）</option>
        </select>
      </div>

      <div className="form-group">
        <label className="form-label">🏃 アウフタクト（弱起始まり）</label>
        <select
          className="input"
          value={advancedFilters.isAnacrusis || ''}
          onChange={(e) => handleChange('isAnacrusis', e.target.value)}
        >
          <option value="">すべて</option>
          <option value="yes">アウフタクトから始まる</option>
          <option value="no">ジャストまたは裏拍から始まる</option>
        </select>
      </div>

      <div className="form-group">
        <button 
          className="btn btn--secondary" 
          style={{ width: '100%', marginTop: '16px' }}
          onClick={() => setAdvancedFilters(prev => ({
            ...prev,
            minNotes: '',
            maxNotes: '',
            hasRests: '',
            isAnacrusis: ''
          }))}
        >
          クリア
        </button>
      </div>
    </div>
  );
}
