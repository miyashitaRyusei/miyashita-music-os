import { MusicalNoteIcon, Bars3BottomLeftIcon, PlayIcon, MapPinIcon } from '@heroicons/react/24/outline';

const ALL_PITCHES = ['ド', 'ド#', 'レ', 'レ#', 'ミ', 'ファ', 'ファ#', 'ソ', 'ソ#', 'ラ', 'ラ#', 'シ'];

export default function PitchAdvancedFilter({ advancedFilters, setAdvancedFilters }) {
  const handleChange = (key, value) => {
    setAdvancedFilters(prev => ({ ...prev, [key]: value }));
  };

  const togglePitch = (p) => {
    setAdvancedFilters(prev => {
      const current = prev.includedPitches || [];
      if (current.includes(p)) {
        return { ...prev, includedPitches: current.filter(x => x !== p) };
      } else {
        return { ...prev, includedPitches: [...current, p] };
      }
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div className="form-group">
        <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <MusicalNoteIcon style={{ width: '16px', height: '16px' }} />
          含まれる音（複数選択可/AND）
        </label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {ALL_PITCHES.map(p => {
            const isSelected = (advancedFilters.includedPitches || []).includes(p);
            return (
              <button
                key={p}
                onClick={() => togglePitch(p)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '16px',
                  border: `1px solid ${isSelected ? 'var(--accent-blue)' : 'var(--border-color)'}`,
                  background: isSelected ? 'var(--accent-blue)' : 'var(--bg-secondary)',
                  color: isSelected ? '#fff' : 'var(--text-primary)',
                  cursor: 'pointer',
                  fontSize: '0.85rem'
                }}
              >
                {p}
              </button>
            );
          })}
        </div>
      </div>

      <div className="form-group">
        <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Bars3BottomLeftIcon style={{ width: '16px', height: '16px' }} />
          音数（フレーズの長さ）
        </label>
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
        <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <PlayIcon style={{ width: '16px', height: '16px' }} />
          開始音
        </label>
        <select
          className="input"
          value={advancedFilters.startNote || ''}
          onChange={(e) => handleChange('startNote', e.target.value)}
        >
          <option value="">指定なし</option>
          {ALL_PITCHES.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      <div className="form-group">
        <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <MapPinIcon style={{ width: '16px', height: '16px' }} />
          終了音（着地）
        </label>
        <select
          className="input"
          value={advancedFilters.endNote || ''}
          onChange={(e) => handleChange('endNote', e.target.value)}
        >
          <option value="">指定なし</option>
          {ALL_PITCHES.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      <div className="form-group">
        <button 
          className="btn btn--secondary" 
          style={{ width: '100%', marginTop: '16px' }}
          onClick={() => setAdvancedFilters(prev => ({
            ...prev,
            includedPitches: [],
            minNotes: '',
            maxNotes: '',
            startNote: '',
            endNote: '',
            maxInterval: ''
          }))}
        >
          クリア
        </button>
      </div>
    </div>
  );
}
