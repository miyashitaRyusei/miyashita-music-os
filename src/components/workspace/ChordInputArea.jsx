import useAppStore from '../../store/useAppStore';

/**
 * ChordInputArea — コード進行の入力＆リアルタイムプレビュー
 *
 * 【上段】テキスト入力エリア（textarea）
 * 【下段】parsedChords をもとにしたブロックプレビュー
 */
export default function ChordInputArea() {
  const chordInputText = useAppStore((s) => s.chordInputText);
  const setChordInput = useAppStore((s) => s.setChordInput);
  const clearChordInput = useAppStore((s) => s.clearChordInput);

  return (
    <div className="chord-editor">
      <div className="chord-editor__input-section" style={{ borderRight: 'none', paddingRight: 0 }}>
        {chordInputText && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '4px' }}>
            <button className="btn btn--sm btn--ghost" onClick={clearChordInput}>
              クリア
            </button>
          </div>
        )}
        <textarea
          id="chord-input"
          className="chord-editor__textarea"
          placeholder="例: | C | F G < | [Key:+1] Db |"
          value={chordInputText}
          onChange={(e) => setChordInput(e.target.value)}
          rows={3}
          spellCheck={false}
          style={{ width: '100%', marginBottom: '8px' }}
        />
        <div className="chord-editor__hint" style={{ display: 'flex', gap: '12px', fontSize: '11px', color: 'var(--text-tertiary)', flexWrap: 'wrap' }}>
          <span><code style={{ background: '#f4f4f5', padding: '2px 4px', borderRadius: '4px' }}>|</code> 小節区切り</span>
          <span><code style={{ background: '#f4f4f5', padding: '2px 4px', borderRadius: '4px' }}>&lt;</code> シンコペーション（前倒し）</span>
          <span><code style={{ background: '#f4f4f5', padding: '2px 4px', borderRadius: '4px' }}>[Key:+1]</code> 転調</span>
        </div>
      </div>
    </div>
  );
}
