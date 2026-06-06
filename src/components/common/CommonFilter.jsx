import { useState } from 'react';
import useAppStore from '../../store/useAppStore';
import Drawer from '../ui/Drawer';

export default function CommonFilter({ filters, setFilters, children }) {
  const registeredSongs = useAppStore((s) => s.registeredSongs);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const handleChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="workspace-section" style={{ marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
        
        {/* 検索バー */}
        <div className="form-group" style={{ flex: '1 1 200px' }}>
          <label className="form-label">🔍 キーワード検索</label>
          <input
            type="text"
            className="input"
            placeholder="タイトルや内容で検索..."
            value={filters.keyword}
            onChange={(e) => handleChange('keyword', e.target.value)}
          />
        </div>

        {/* 並び替え */}
        <div className="form-group" style={{ flex: '0 1 150px' }}>
          <label className="form-label">↕️ 並び替え</label>
          <select 
            className="input"
            value={filters.sortBy}
            onChange={(e) => handleChange('sortBy', e.target.value)}
          >
            <option value="newest">新しい順</option>
            <option value="oldest">古い順</option>
            <option value="most_used">よく使う順</option>
          </select>
        </div>

      </div>

      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
        
        {/* ソース */}
        <div className="form-group" style={{ flex: '1 1 120px' }}>
          <label className="form-label">💿 ソース</label>
          <select 
            className="input"
            value={filters.source}
            onChange={(e) => handleChange('source', e.target.value)}
          >
            <option value="">すべて</option>
            <option value="original">自作曲</option>
            <option value="reference">リファレンス</option>
          </select>
        </div>

        {/* 評価 */}
        <div className="form-group" style={{ flex: '1 1 120px' }}>
          <label className="form-label">❤️ 評価</label>
          <select 
            className="input"
            value={filters.preference}
            onChange={(e) => handleChange('preference', e.target.value)}
          >
            <option value="">すべて</option>
            <option value="like">好き</option>
            <option value="dislike">嫌い</option>
          </select>
        </div>

        {/* セクション */}
        <div className="form-group" style={{ flex: '1 1 120px' }}>
          <label className="form-label">🔖 セクション</label>
          <select 
            className="input"
            value={filters.section}
            onChange={(e) => handleChange('section', e.target.value)}
          >
            <option value="">すべて</option>
            <option value="イントロ">イントロ</option>
            <option value="Aメロ">Aメロ</option>
            <option value="Bメロ">Bメロ</option>
            <option value="Cメロ">Cメロ</option>
            <option value="Dメロ">Dメロ</option>
            <option value="間奏">間奏</option>
            <option value="アウトロ">アウトロ</option>
          </select>
        </div>

        {/* 楽曲 */}
        <div className="form-group" style={{ flex: '1 1 150px' }}>
          <label className="form-label">🎵 登録楽曲</label>
          <select 
            className="input"
            value={filters.songId}
            onChange={(e) => handleChange('songId', e.target.value)}
          >
            <option value="">すべての楽曲</option>
            {registeredSongs.map((song) => (
              <option key={song.id} value={song.id}>
                {song.title}
              </option>
            ))}
          </select>
        </div>

      </div>

      {children && (
        <div style={{ marginTop: '16px' }}>
          <button 
            className="btn btn--secondary" 
            onClick={() => setIsDrawerOpen(true)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            <span>⚙️</span> 高度な絞り込み
          </button>
        </div>
      )}

      {children && (
        <Drawer 
          isOpen={isDrawerOpen} 
          onClose={() => setIsDrawerOpen(false)} 
          title="高度な絞り込み"
        >
          {children}
        </Drawer>
      )}
    </div>
  );
}
