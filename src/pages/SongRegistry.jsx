import { useState, useMemo } from 'react';
import useAppStore from '../store/useAppStore';

export default function SongRegistry() {
  const { 
    registeredSongs, 
    pitchPatterns, 
    rhythmPatterns, 
    chordProgressions, 
    chordProgressions, 
    activeSongId,
    setActiveSongId,
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
              <div key={song.id} className="dict-card" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                
                {/* 1. 上段：タイトル・アーティスト・アクション群 */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                        {song.title}
                      </h3>
                      {activeSongId === song.id && (
                        <span className="badge badge--orange">作業中</span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      <span style={{ fontWeight: 500 }}>{song.artist}</span>
                      <span>•</span>
                      <span style={{ color: 'var(--text-tertiary)' }}>{new Date(song.imported_at || song.importedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  
                  {/* アクションボタン群 */}
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {activeSongId !== song.id && (
                      <button 
                        className="btn btn--sm btn--primary"
                        onClick={() => setActiveSongId(song.id)}
                      >
                        作業場で開く
                      </button>
                    )}
                    <button 
                      onClick={() => {
                        if (window.confirm(`「${song.title}」を削除しますか？\n※関連するピッチ・リズム・コードの辞書データも全て削除されます。`)) {
                          removeSong(song.id);
                        }
                      }}
                      className="btn btn--sm btn--ghost"
                      style={{ color: '#ef4444' }}
                      title="この曲と抽出データを削除"
                    >
                      削除
                    </button>
                  </div>
                </div>

                <div style={{ height: '1px', background: 'var(--border-default)' }} />

                {/* 2. 下段：音楽情報 ＆ 抽出数 */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '24px' }}>
                  
                  {/* Key & BPM (強調表示) */}
                  <div style={{ display: 'flex', gap: '24px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: '2px', fontWeight: 600 }}>KEY</span>
                      <span style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {song.original_key || song.originalKey || '-'}
                      </span>
                    </div>
                    <div style={{ width: '1px', background: 'var(--border-default)' }} />
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: '2px', fontWeight: 600 }}>BPM</span>
                      <span style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {song.bpm || '-'}
                      </span>
                    </div>
                    <div style={{ width: '1px', background: 'var(--border-default)' }} />
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: '2px', fontWeight: 600 }}>RANGE</span>
                      <span style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {song.min_note || song.minNote || '-'} ~ {song.max_note || song.maxNote || '-'}
                      </span>
                    </div>
                  </div>

                  {/* 抽出カウント */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <div style={{ display: 'flex', gap: '16px', background: 'var(--bg-secondary)', padding: '10px 20px', borderRadius: 'var(--radius-md)' }}>
                      <div style={{ textAlign: 'center', minWidth: '40px' }}>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', fontWeight: 600, marginBottom: '2px' }}>PITCH</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{pitchCount}</div>
                      </div>
                      <div style={{ textAlign: 'center', minWidth: '40px' }}>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', fontWeight: 600, marginBottom: '2px' }}>RHYTHM</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{rhythmCount}</div>
                      </div>
                      <div style={{ textAlign: 'center', minWidth: '40px' }}>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', fontWeight: 600, marginBottom: '2px' }}>CHORD</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{chordCount}</div>
                      </div>
                    </div>
                    
                    <div style={{ textAlign: 'right', minWidth: '60px' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--accent-orange)', fontWeight: 700, marginBottom: '2px' }}>TOTAL</div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-orange)', lineHeight: 1 }}>{totalCount}</div>
                    </div>
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
