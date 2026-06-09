import { useState } from 'react';

export default function EditTagsModal({ pattern, onSave, onClose }) {
  const [source, setSource] = useState(pattern.source || 'original');
  const [preference, setPreference] = useState(pattern.preference || 'like');
  const [section, setSection] = useState(pattern.section || 'Aメロ');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(pattern.id, {
      source,
      preference,
      section,
    });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div 
        className="modal-content" 
        onClick={(e) => e.stopPropagation()}
        style={{ background: 'var(--bg-secondary)', padding: '24px', borderRadius: '12px', width: '90%', maxWidth: '400px' }}
      >
        <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '1.2rem', margin: 0 }}>タグを編集</h2>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-secondary)' }}>×</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* 情報元 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>情報元</label>
            <select 
              value={source} 
              onChange={(e) => setSource(e.target.value)}
              style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--border-default)', background: 'var(--bg-color)', color: 'var(--text-primary)' }}
            >
              <option value="original">自作曲</option>
              <option value="reference">リファレンス曲</option>
            </select>
          </div>

          {/* セクション */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>セクション</label>
            <select 
              value={section} 
              onChange={(e) => setSection(e.target.value)}
              style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--border-default)', background: 'var(--bg-color)', color: 'var(--text-primary)' }}
            >
              <option value="イントロ">イントロ</option>
              <option value="Aメロ">Aメロ</option>
              <option value="Bメロ">Bメロ</option>
              <option value="サビ">サビ</option>
              <option value="Cメロ">Cメロ</option>
              <option value="Dメロ">Dメロ</option>
              <option value="間奏">間奏</option>
              <option value="アウトロ">アウトロ</option>
              <option value="その他">その他</option>
            </select>
          </div>

          {/* 好み */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>好み</label>
            <select 
              value={preference} 
              onChange={(e) => setPreference(e.target.value)}
              style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--border-default)', background: 'var(--bg-color)', color: 'var(--text-primary)' }}
            >
              <option value="like">好き</option>
              <option value="dislike">嫌い</option>
            </select>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
            <button type="button" className="btn btn--ghost" onClick={onClose}>キャンセル</button>
            <button type="submit" className="btn btn--primary">保存</button>
          </div>
        </form>
      </div>
    </div>
  );
}
