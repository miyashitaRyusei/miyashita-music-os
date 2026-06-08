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

  const handleReflow = (chordsPerMeasure) => {
    if (!chordInputText) return;
    const tokens = chordInputText.split(/\s+/).filter(t => t !== '|' && t.trim() !== '');
    if (tokens.length === 0) return;

    let newText = '';
    let chordCount = 0;
    
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      
      if (chordCount === 0 && token !== '<') {
        newText += '| ';
      }

      newText += token + ' ';
      
      if (!token.startsWith('[') && token !== '<') {
        chordCount++;
      }

      if (chordCount >= chordsPerMeasure) {
        if (i + 1 < tokens.length && tokens[i+1] === '<') {
           // シンコペーションマーカーは直前のコードに付随するため、小節を閉じない
        } else {
           chordCount = 0;
        }
      }
    }

    if (!newText.endsWith('| ')) {
      newText += '|';
    } else {
      newText = newText.slice(0, -2);
    }

    setChordInput(newText);
  };

  return (
    <div className="chord-editor">
      <div className="chord-editor__input-section" style={{ borderRight: 'none', paddingRight: 0 }}>
        {chordInputText && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '8px', fontSize: '0.8rem' }}>
              <span style={{ color: 'var(--text-secondary)' }}>自動整形:</span>
              <button className="btn btn--sm btn--ghost" style={{ padding: '0 4px', height: 'auto', minHeight: 'unset' }} onClick={() => handleReflow(1)}>1コード/小節</button>
              <button className="btn btn--sm btn--ghost" style={{ padding: '0 4px', height: 'auto', minHeight: 'unset' }} onClick={() => handleReflow(2)}>2コード/小節</button>
              <button className="btn btn--sm btn--ghost" style={{ padding: '0 4px', height: 'auto', minHeight: 'unset' }} onClick={() => handleReflow(4)}>4コード/小節</button>
            </div>
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
