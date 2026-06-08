import { useState } from 'react';
import { Chord } from '@tonaljs/tonal';
import { normalizeChordNotation } from '../../utils/chordUtils';
import useAppStore from '../../store/useAppStore';

function isLikelyChord(token) {
  if (!token) return false;
  // 漢字・ひらがな・カタカナが含まれていたら歌詞と判定して弾く
  if (/[一-龠ぁ-んァ-ヶ]/.test(token)) return false;

  const normalizedToken = normalizeChordNotation(token);

  // スラッシュコードの判定 (C/B, C/E, ConE など)
  const slashMatch = normalizedToken.match(/^([A-G][#b]?[a-zA-Z0-9()]*)(?:\/|on)([A-G][#b]?)$/i);
  if (slashMatch) {
    const baseChord = slashMatch[1];
    return !Chord.get(baseChord).empty;
  }

  // スラッシュがない通常のコード
  return !Chord.get(normalizedToken).empty;
}

export default function ExternalChordImportModal({ onClose }) {
  const [inputText, setInputText] = useState('');
  const [chordsPerMeasure, setChordsPerMeasure] = useState(2);
  const setChordInput = useAppStore((s) => s.setChordInput);

  const handleImport = () => {
    // 1. 全角スペースや改行を含めて空白文字で分割 (JSの \s は全角スペースも含む)
    const tokens = inputText.split(/\s+/);

    // 2. コードと思われるものだけを抽出し、表記を正規化
    const extractedChords = tokens
      .map(t => normalizeChordNotation(t))
      .filter(isLikelyChord);

    if (extractedChords.length === 0) {
      alert('コードが1つも見つかりませんでした。テキストを確認してください。');
      return;
    }

    // 3. 小節ごとに区切って文字列化
    let resultString = '';
    for (let i = 0; i < extractedChords.length; i++) {
      if (i % chordsPerMeasure === 0) {
        resultString += '| ';
      }
      resultString += extractedChords[i] + ' ';
    }
    resultString += '|';

    // 4. 上書きで適用
    setChordInput(resultString);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content" 
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '600px', width: '90%' }}
      >
        <div className="modal-header">
          <h2>外部テキストからコードを一括インポート</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            U-Fretなどのコード譜サイトから、歌詞ごとテキストをコピーして貼り付けてください。<br/>
            自動的にコードネームだけを抽出し、大まかな小節割り当てを行います。（誤検知は後から手動で修正できます）
          </p>

          <textarea
            className="input"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="ここにコード譜テキストをペースト..."
            style={{ minHeight: '200px', fontFamily: 'monospace', resize: 'vertical' }}
          />

          <div className="form-group">
            <label className="form-label">1小節あたりのコード数（目安）</label>
            <div style={{ display: 'flex', gap: '16px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input 
                  type="radio" 
                  name="chordsPerMeasure" 
                  value={1}
                  checked={chordsPerMeasure === 1}
                  onChange={() => setChordsPerMeasure(1)}
                />
                1コード（ゆったり）
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input 
                  type="radio" 
                  name="chordsPerMeasure" 
                  value={2}
                  checked={chordsPerMeasure === 2}
                  onChange={() => setChordsPerMeasure(2)}
                />
                2コード（基本）
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input 
                  type="radio" 
                  name="chordsPerMeasure" 
                  value={4}
                  checked={chordsPerMeasure === 4}
                  onChange={() => setChordsPerMeasure(4)}
                />
                4コード（忙しい）
              </label>
            </div>
          </div>

          <div style={{ 
            background: 'var(--bg-secondary)', 
            padding: '16px', 
            borderRadius: '8px', 
            border: '1px solid var(--border-color)',
            fontSize: '0.9rem'
          }}>
            <strong style={{ color: 'var(--text-primary)', marginBottom: '8px', display: 'block' }}>
              変換プレビュー：
            </strong>
            <div style={{ color: 'var(--accent-blue)', fontFamily: 'monospace', wordBreak: 'break-all' }}>
              {inputText ? (() => {
                const tokens = inputText.split(/\s+/);
                const chords = tokens.filter(isLikelyChord);
                if (chords.length === 0) return 'コードが見つかりません';
                let preview = '';
                for (let i = 0; i < Math.min(chords.length, 20); i++) {
                  if (i % chordsPerMeasure === 0) preview += '| ';
                  preview += chords[i] + ' ';
                }
                return preview + (chords.length > 20 ? '... (続く) |' : '|');
              })() : 'プレビューが表示されます'}
            </div>
          </div>
        </div>

        <div className="modal-footer" style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button className="btn btn--secondary" onClick={onClose}>
            キャンセル
          </button>
          <button 
            className="btn btn--primary" 
            onClick={handleImport}
            disabled={!inputText.trim()}
          >
            この内容で上書き入力
          </button>
        </div>
      </div>
    </div>
  );
}
