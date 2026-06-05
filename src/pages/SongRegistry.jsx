import { useState, useMemo } from 'react';
import useAppStore from '../store/useAppStore';

export default function SongRegistry() {
  const { 
    registeredSongs, 
    pitchPatterns, 
    rhythmPatterns, 
    chordProgressions, 
    activeSongId,
    removeSong
  } = useAppStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [artistFilter, setArtistFilter] = useState('all');

  // 登録されているユニークなアーティスト名を取得
  const uniqueArtists = useMemo(() => {
    const artists = registeredSongs.map(song => song.artist);
    return [...new Set(artists)].filter(Boolean).sort();
  }, [registeredSongs]);

  // フィルタリング処理
  const filteredSongs = useMemo(() => {
    return registeredSongs.filter(song => {
      const matchArtist = artistFilter === 'all' || song.artist === artistFilter;
      const matchQuery = !searchQuery || 
        (song.title && song.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (song.artist && song.artist.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchArtist && matchQuery;
    });
  }, [registeredSongs, artistFilter, searchQuery]);

  return (
    <div className="page animate-fade-in">
      <div className="page__header">
        <h1 className="page__title">登録楽曲リスト</h1>
        <p className="page__subtitle">これまでにインポートした楽曲と、そこから抽出したパターンの集計</p>
      </div>

      {/* フィルター・検索コントロール */}
      <div className="toolbar" style={{ marginTop: '24px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
        <input 
          type="text" 
          className="input" 
          placeholder="曲名・アーティスト名で検索..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ flex: 1, minWidth: '240px' }}
        />
        <select 
          className="input" 
          value={artistFilter}
          onChange={(e) => setArtistFilter(e.target.value)}
          style={{ width: '200px' }}
        >
          <option value="all">すべてのアーティスト</option>
          {uniqueArtists.map(artist => (
            <option key={artist} value={artist}>{artist}</option>
          ))}
        </select>
      </div>

      <div className="song-registry-list" style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
        {filteredSongs.length === 0 ? (
          <div className="empty-state">
            <span className="empty-state__icon">💿</span>
            <span className="empty-state__text">条件に一致する楽曲がありません</span>
          </div>
        ) : (
          filteredSongs.map((song) => {
            const pitchCount = pitchPatterns.filter((p) => p.songId === song.id).length;
            const rhythmCount = rhythmPatterns.filter((p) => p.songId === song.id).length;
            const chordCount = chordProgressions.filter((p) => p.songId === song.id).length;
            const totalCount = pitchCount + rhythmCount + chordCount;

            return (
              <div key={song.id} className="dict-card" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
                
                {/* 1. タイトル＆アーティスト領域 */}
                <div style={{ flex: '2 1 200px', minWidth: '200px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>
                        {song.title}
                      </h3>
                      {activeSongId === song.id && (
                        <span className="badge badge--orange">作業中</span>
                      )}
                    </div>
                    <button 
                      onClick={() => {
                        if (window.confirm(`「${song.title}」を削除しますか？\n※関連するピッチ・リズム・コードの辞書データも全て削除されます。`)) {
                          removeSong(song.id);
                        }
                      }}
                      style={{ background: 'transparent', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: '4px', fontSize: '1rem' }}
                      title="この曲と抽出データを削除"
                    >
                      🗑️
                    </button>
                  </div>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    <span>{song.artist}</span>
                    <span>•</span>
                    <span style={{ color: 'var(--text-tertiary)' }}>{new Date(song.imported_at || song.importedAt).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* 2. 楽曲メタデータ領域（コンパクト化） */}
                <div style={{ flex: '1 1 180px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    <span style={{ display: 'inline-block', width: '40px', color: 'var(--text-tertiary)' }}>Key:</span> 
                    <strong style={{ color: 'var(--text-primary)' }}>{song.original_key || song.originalKey}</strong>
                    <span style={{ margin: '0 8px', color: 'var(--border-default)' }}>|</span>
                    <span style={{ display: 'inline-block', width: '40px', color: 'var(--text-tertiary)' }}>BPM:</span> 
                    <strong style={{ color: 'var(--text-primary)' }}>{song.bpm}</strong>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    <span style={{ display: 'inline-block', width: '40px', color: 'var(--text-tertiary)' }}>Range:</span> 
                    <strong style={{ color: 'var(--text-primary)' }}>{song.min_note || song.minNote} 〜 {song.max_note || song.maxNote}</strong>
                  </div>
                </div>

                {/* 3. カウント領域 */}
                <div style={{ flex: '1 1 240px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '16px' }}>
                  <div style={{ display: 'flex', gap: '12px', background: 'var(--bg-secondary)', padding: '6px 12px', borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ textAlign: 'center', minWidth: '40px' }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>PITCH</div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 600 }}>{pitchCount}</div>
                    </div>
                    <div style={{ textAlign: 'center', minWidth: '40px' }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>RHYTHM</div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 600 }}>{rhythmCount}</div>
                    </div>
                    <div style={{ textAlign: 'center', minWidth: '40px' }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>CHORD</div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 600 }}>{chordCount}</div>
                    </div>
                  </div>
                  
                  <div style={{ textAlign: 'right', minWidth: '60px' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--accent-orange)' }}>TOTAL</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--accent-orange)' }}>{totalCount}</div>
                  </div>
                </div>
                
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
