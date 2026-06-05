import useAppStore from '../../store/useAppStore';

const SECTIONS = [
  { id: 'intro', label: 'Intro' },
  { id: 'verse_a', label: 'Verse A' },
  { id: 'verse_b', label: 'Verse B' },
  { id: 'chorus', label: 'Chorus' },
  { id: 'bridge', label: 'Bridge' },
  { id: 'outro', label: 'Outro' },
];

export default function StockControls({ onStockPitch, onStockRhythm, onStockChord }) {
  const { stockAttributes, setStockSource, setStockPreference, setStockSection } = useAppStore();

  return (
    <div className="stock-controls">
      <div className="stock-controls__attributes">
        <div className="workspace-attr-group">
          <span className="workspace-attr-label">ソース</span>
          <div className="radio-group">
            <div
              className={`radio-group__item${stockAttributes.source === 'original' ? ' radio-group__item--selected' : ''}`}
              onClick={() => setStockSource('original')}
            >
              <span className="radio-group__dot" />
              <span>Original（自作）</span>
            </div>
            <div
              className={`radio-group__item${stockAttributes.source === 'reference' ? ' radio-group__item--selected' : ''}`}
              onClick={() => setStockSource('reference')}
            >
              <span className="radio-group__dot" />
              <span>Reference（参考）</span>
            </div>
          </div>
        </div>

        <div className="workspace-attr-group">
          <span className="workspace-attr-label">評価</span>
          <div className="radio-group">
            <div
              className={`radio-group__item${stockAttributes.preference === 'like' ? ' radio-group__item--selected' : ''}`}
              onClick={() => setStockPreference('like')}
            >
              <span className="radio-group__dot" />
              <span>Like（好き）</span>
            </div>
            <div
              className={`radio-group__item${stockAttributes.preference === 'dislike' ? ' radio-group__item--selected' : ''}`}
              onClick={() => setStockPreference('dislike')}
            >
              <span className="radio-group__dot" />
              <span>Dislike（好きじゃない）</span>
            </div>
          </div>
        </div>

        <div className="workspace-attr-group">
          <span className="workspace-attr-label">セクション</span>
          <div className="section-chips">
            {SECTIONS.map((sec) => (
              <span
                key={sec.id}
                className={`section-chip${stockAttributes.section === sec.id ? ' section-chip--selected' : ''}`}
                onClick={() => setStockSection(sec.id)}
              >
                {sec.label}
              </span>
            ))}
          </div>
        </div>

        <div className="workspace-attr-group">
          <span className="workspace-attr-label">Original Key（原調）</span>
          <select 
            className="input" 
            style={{ width: '120px' }}
            value={stockAttributes.originalKey} 
            onChange={(e) => useAppStore.getState().setStockOriginalKey(e.target.value)}
          >
            {['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'].map(k => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
          <span className="form-hint" style={{ marginTop: '4px' }}>※コードをCメジャーに移調してストック</span>
        </div>
      </div>

      <div className="stock-controls__buttons">
        <button className="btn btn--primary btn--lg" onClick={onStockPitch}>
          ♫ ピッチ辞書へ
        </button>
        <button className="btn btn--primary btn--lg" onClick={onStockRhythm}>
          ⏱ リズム辞書へ
        </button>
        <button className="btn btn--primary btn--lg" onClick={onStockChord}>
          ♬ コード辞書へ
        </button>
      </div>
    </div>
  );
}
