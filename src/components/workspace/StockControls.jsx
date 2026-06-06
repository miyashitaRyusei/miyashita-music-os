import useAppStore from '../../store/useAppStore';

const SECTIONS = [
  { id: 'Aメロ', label: 'Aメロ' },
  { id: 'Bメロ', label: 'Bメロ' },
  { id: 'Cメロ', label: 'Cメロ' },
  { id: 'Dメロ', label: 'Dメロ' },
  { id: 'イントロ', label: 'イントロ' },
  { id: 'アウトロ', label: 'アウトロ' },
  { id: '間奏', label: '間奏' },
];

export default function StockControls() {
  const { stockAttributes, setStockSource, setStockPreference, setStockSection } = useAppStore();

  return (
    <div className="stock-controls">
      <div className="stock-controls__attributes">
        <div className="workspace-attr-group">
          <span className="workspace-attr-label">ソース</span>
          <div className="radio-group">
            <div
              className={`radio-group__item${stockAttributes.source === '自作曲' ? ' radio-group__item--selected' : ''}`}
              onClick={() => setStockSource('自作曲')}
            >
              <span className="radio-group__dot" />
              <span>自作曲</span>
            </div>
            <div
              className={`radio-group__item${stockAttributes.source === 'リファレンス' ? ' radio-group__item--selected' : ''}`}
              onClick={() => setStockSource('リファレンス')}
            >
              <span className="radio-group__dot" />
              <span>リファレンス</span>
            </div>
          </div>
        </div>

        <div className="workspace-attr-group">
          <span className="workspace-attr-label">評価</span>
          <div className="radio-group">
            <div
              className={`radio-group__item${stockAttributes.preference === '好き' ? ' radio-group__item--selected' : ''}`}
              onClick={() => setStockPreference('好き')}
            >
              <span className="radio-group__dot" />
              <span>好き</span>
            </div>
            <div
              className={`radio-group__item${stockAttributes.preference === '嫌い' ? ' radio-group__item--selected' : ''}`}
              onClick={() => setStockPreference('嫌い')}
            >
              <span className="radio-group__dot" />
              <span>嫌い</span>
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
      </div>
    </div>
  );
}
