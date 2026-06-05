import { useState } from 'react';

const KEYS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

export default function MidiMetadataModal({ initialBpm, onConfirm, onCancel }) {
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [rootNote, setRootNote] = useState('C');
  const [bpm, setBpm] = useState(initialBpm || 120);

  const handleSubmit = (e) => {
    e.preventDefault();
    onConfirm({
      title: title.trim() || 'Untitled',
      artist: artist.trim() || 'Unknown Artist',
      rootNote,
      bpm: Number(bpm),
    });
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal__header">
          <h2 className="modal__title">MIDIメタデータ入力</h2>
          <p className="modal__subtitle">楽曲の基本情報と、比較のためのKey（原調）を指定してください。</p>
        </div>
        
        <form onSubmit={handleSubmit} className="modal__body">
          <div className="form-group">
            <label className="form-label">曲名 (Title)</label>
            <input 
              type="text" 
              className="input" 
              value={title} 
              onChange={(e) => setTitle(e.target.value)} 
              placeholder="例: 夜に駆ける"
            />
          </div>

          <div className="form-group">
            <label className="form-label">アーティスト名 (Artist)</label>
            <input 
              type="text" 
              className="input" 
              value={artist} 
              onChange={(e) => setArtist(e.target.value)} 
              placeholder="例: YOASOBI"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Key (Root Note)</label>
            <select 
              className="input" 
              value={rootNote} 
              onChange={(e) => setRootNote(e.target.value)}
            >
              {KEYS.map(k => <option key={k} value={k}>{k}</option>)}
            </select>
            <span className="form-hint">※指定されたKeyからCメジャー基準へ自動移調されます</span>
          </div>

          <div className="form-group">
            <label className="form-label">BPM (テンポ)</label>
            <input 
              type="number" 
              className="input" 
              value={bpm} 
              onChange={(e) => setBpm(e.target.value)} 
              min="20" 
              max="300" 
            />
          </div>

          <div className="modal__footer">
            <button type="button" className="btn btn--secondary" onClick={onCancel}>
              キャンセル
            </button>
            <button type="submit" className="btn btn--primary">
              解析・描画する
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
