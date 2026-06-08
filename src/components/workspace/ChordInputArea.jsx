import { useRef } from 'react';
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
  const textareaRef = useRef(null);

  const handleReflow = (chordsPerMeasure) => {
    if (!chordInputText || !textareaRef.current) return;

    // 現在のカーソル位置・選択範囲を取得
    const cursorStart = textareaRef.current.selectionStart;
    const cursorEnd = textareaRef.current.selectionEnd;

    // カーソル位置を境に前半・選択部分・後半に分ける
    const textBefore = chordInputText.slice(0, cursorStart);
    const textSelected = cursorStart === cursorEnd 
      ? chordInputText.slice(cursorStart) 
      : chordInputText.slice(cursorStart, cursorEnd);
    const textAfter = cursorStart === cursorEnd 
      ? '' 
      : chordInputText.slice(cursorEnd);

    // 選択部分からコードのトークンを抽出（| は無視）
    const tokens = textSelected.split(/\s+/).filter(t => t !== '|' && t.trim() !== '');
    if (tokens.length === 0) return;

    // 前半部分の「最後の小節」に含まれるコード数をカウントして継続する
    const lastMeasureText = textBefore.split('|').pop() || '';
    const lastMeasureTokens = lastMeasureText.split(/\s+/).filter(t => t.trim() !== '' && !t.startsWith('[') && t !== '<');
    const initialChordCount = lastMeasureTokens.length;

    let newTextSelected = '';
    let chordCount = initialChordCount;
    // 前のテキストが | で終わっている、または空なら小節は閉まっている。そうでないなら開いている。
    let isMeasureOpen = !textBefore.trim().endsWith('|') && textBefore.trim() !== '';

    // ただし、小節が開いていてもすでに定員オーバーなら一旦閉じる
    if (isMeasureOpen && chordCount >= chordsPerMeasure) {
      newTextSelected += '| ';
      chordCount = 0;
      isMeasureOpen = false;
    }

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      
      if (!isMeasureOpen && token !== '<') {
        newTextSelected += '| ';
        isMeasureOpen = true;
      }

      newTextSelected += token + ' ';
      
      if (!token.startsWith('[') && token !== '<') {
        chordCount++;
      }

      if (chordCount >= chordsPerMeasure) {
        if (i + 1 < tokens.length && tokens[i+1] === '<') {
          // 次がシンコペーションマーカーの場合は直前のコードに付随するため、小節を閉じない
        } else {
          newTextSelected += '| ';
          chordCount = 0;
          isMeasureOpen = false;
        }
      }
    }

    const rawNewText = textBefore + newTextSelected + textAfter;

    // --- 魔法のクリーンアップ処理（|の選択有無を吸収する） ---
    // 連続する | を1つにまとめる（例: | | -> |）
    let cleaned = rawNewText.replace(/\|(\s*\|)+/g, '|');
    // | の前後のスペースを綺麗に整える
    cleaned = cleaned.replace(/\s*\|\s*/g, ' | ');
    cleaned = cleaned.trim();
    // 先頭・末尾の | を保証
    if (!cleaned.startsWith('|')) cleaned = '| ' + cleaned;
    if (!cleaned.endsWith('|')) cleaned = cleaned + ' |';

    setChordInput(cleaned);

    // テキストエリアにフォーカスを戻す
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }, 0);
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
          ref={textareaRef}
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
