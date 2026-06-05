import useAppStore from '../../store/useAppStore';

/**
 * ChordInputArea — コード進行の入力＆リアルタイムプレビュー
 *
 * 【上段】テキスト入力エリア（textarea）
 * 【下段】parsedChords をもとにしたブロックプレビュー
 */
export default function ChordInputArea() {
  const chordInputText = useAppStore((s) => s.chordInputText);
  const parsedChords = useAppStore((s) => s.parsedChords);
  const setChordInput = useAppStore((s) => s.setChordInput);
  const clearChordInput = useAppStore((s) => s.clearChordInput);

  return (
    <div className="chord-editor">
      {/* ===== 上段：テキスト入力エリア ===== */}
      <div className="chord-editor__input-section">
        <div className="chord-editor__input-header">
          <label className="chord-editor__label" htmlFor="chord-input">
            コード進行入力
          </label>
          {chordInputText && (
            <button className="btn btn--ghost" onClick={clearChordInput}>
              クリア
            </button>
          )}
        </div>
        <textarea
          id="chord-input"
          className="chord-editor__textarea"
          placeholder="例: | C | F G < | [Key:+1] Db |"
          value={chordInputText}
          onChange={(e) => setChordInput(e.target.value)}
          rows={3}
          spellCheck={false}
        />
        <div className="chord-editor__hint">
          <span>区切り: <code>|</code></span>
          <span>シンコペ: <code>&lt;</code></span>
          <span>転調: <code>[Key:+1]</code></span>
        </div>
      </div>

      {/* ===== 下段：リアルタイム・ブロックプレビュー ===== */}
      <div className="chord-editor__preview-section">
        <span className="chord-editor__label">プレビュー</span>
        {parsedChords.length > 0 ? (
          <div className="chord-preview">
            {parsedChords.map((measure) => (
              <MeasureBlock key={measure.measure} measure={measure} />
            ))}
          </div>
        ) : (
          <div className="chord-preview chord-preview--empty">
            <span className="chord-preview__placeholder">
              コード進行を入力するとここにプレビューが表示されます
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * MeasureBlock — 1小節分のビジュアルブロック
 */
function MeasureBlock({ measure }) {
  return (
    <div className="measure-block">
      {/* 小節番号 */}
      <span className="measure-block__number">{measure.measure}</span>

      {/* 転調マーカー */}
      {measure.keyChange && (
        <div className="measure-block__key-change">
          Key: {measure.keyChange}
        </div>
      )}

      {/* コードブロック群（Flexbox均等分割） */}
      <div className="measure-block__chords">
        {measure.chords.map((chord, i) => (
          <div
            key={i}
            className={`chord-block-item${chord.syncopated ? ' chord-block-item--syncopated' : ''}`}
            style={{ flex: 1 }}
          >
            {chord.syncopated && (
              <span className="chord-block-item__sync-badge" title="前倒し（シンコペーション）">
                &lt;
              </span>
            )}
            <span className="chord-block-item__name">{chord.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
