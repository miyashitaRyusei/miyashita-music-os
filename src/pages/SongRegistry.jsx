import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MusicalNoteIcon, TrashIcon } from '@heroicons/react/24/outline';
import useAppStore from '../store/useAppStore';
import { noteNameToMidi } from '../utils/noteUtils';

export default function SongRegistry() {
  const { 
    registeredSongs, 
    pitchPatterns, 
    rhythmPatterns, 
    chordProgressions, 
    activeSongId,
    setActiveSongId,
    removeSong
  } = useAppStore();

  const navigate = useNavigate();

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
        <h1 className="page__title" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <MusicalNoteIcon style={{ width: '32px', height: '32px', color: 'var(--accent-blue)' }} />
          登録楽曲リスト
        </h1>
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
            <span className="empty-state__icon">
              <MusicalNoteIcon style={{ width: '48px', height: '48px', color: 'var(--text-tertiary)' }} />
            </span>
            <span className="empty-state__text">条件に一致する楽曲がありません</span>
          </div>
        ) : (
          filteredSongs.map((song) => {
            const pitchCount = pitchPatterns.filter((p) => p.songId === song.id).length;
            const rhythmCount = rhythmPatterns.filter((p) => p.songId === song.id).length;
            const chordCount = chordProgressions.filter((p) => p.songId === song.id).length;
            const totalCount = pitchCount + rhythmCount + chordCount;

            return (
              <div key={song.id} className="dict-card" style={{ padding: '12px 20px', display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '20px', flexWrap: 'nowrap', overflowX: 'auto' }}>
                
                {/* 1. タイトル＆アーティスト領域 */}
                <div style={{ flex: '1 1 200px', minWidth: '180px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {song.title}
                    </h3>
                    {activeSongId === song.id && (
                      <span className="badge badge--orange" style={{ whiteSpace: 'nowrap' }}>作業中</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    <span style={{ fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{song.artist}</span>
                    <span>•</span>
                    <span style={{ color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>{new Date(song.imported_at || song.importedAt).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* 2. Key & BPM & Range 領域 */}
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center', padding: '0 16px', borderLeft: '1px solid var(--border-default)', borderRight: '1px solid var(--border-default)', flexShrink: 0 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', minWidth: '40px' }}>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>KEY</span>
                    <span style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>{song.original_key || song.originalKey || '-'}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', minWidth: '40px' }}>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>BPM</span>
                    <span style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>{song.bpm || '-'}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', minWidth: '60px' }}>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>RANGE</span>
                    <span style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {song.min_note || song.minNote || '-'} ~ {song.max_note || song.maxNote || '-'}
                      {(() => {
                        const minStr = song.min_note || song.minNote;
                        const maxStr = song.max_note || song.maxNote;
                        if (minStr && maxStr && minStr !== '-' && maxStr !== '-') {
                          const minMidi = noteNameToMidi(minStr);
                          const maxMidi = noteNameToMidi(maxStr);
                          if (minMidi !== null && maxMidi !== null) {
                            return <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginLeft: '6px', fontWeight: 600 }}>({maxMidi - minMidi}半音)</span>;
                          }
                        }
                        return null;
                      })()}
                    </span>
                  </div>
                </div>

                {/* 3. 抽出カウント領域 */}
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexShrink: 0 }}>
                  <div style={{ display: 'flex', gap: '12px', background: 'var(--bg-secondary)', padding: '6px 12px', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ textAlign: 'center', minWidth: '36px' }}>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>PITCH</div>
                      <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{pitchCount}</div>
                    </div>
                    <div style={{ textAlign: 'center', minWidth: '36px' }}>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>RHYTHM</div>
                      <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{rhythmCount}</div>
                    </div>
                    <div style={{ textAlign: 'center', minWidth: '36px' }}>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>CHORD</div>
                      <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{chordCount}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', minWidth: '48px', marginRight: '8px' }}>
                    <div style={{ fontSize: '0.65rem', color: 'var(--accent-orange)', fontWeight: 700 }}>TOTAL</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent-orange)', lineHeight: 1 }}>{totalCount}</div>
                  </div>
                </div>

                {/* 4. アクションボタン群 */}
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
                  {activeSongId !== song.id && (
                    <button 
                      className="btn btn--sm btn--primary"
                      onClick={() => {
                        setActiveSongId(song.id);
                        navigate('/workspace');
                      }}
                      style={{ padding: '6px 12px', whiteSpace: 'nowrap' }}
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
                    style={{ color: '#ef4444', padding: '6px', minWidth: 'auto', background: 'transparent', border: 'none', cursor: 'pointer' }}
                    title="この曲と抽出データを削除"
                  >
                    <TrashIcon style={{ width: '20px', height: '20px' }} />
                  </button>
                </div>

              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
