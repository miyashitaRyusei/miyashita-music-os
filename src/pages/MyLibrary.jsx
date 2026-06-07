import { useState, useRef, useEffect } from 'react';
import { encodeAudioToMp3 } from '../utils/audioEncoder';
import { uploadSongToLibrary, fetchLibrarySongs, deleteLibrarySong } from '../utils/libraryApi';
import { PlayIcon, PauseIcon, TrashIcon, CloudArrowUpIcon, MusicalNoteIcon } from '@heroicons/react/24/outline';

export default function MyLibrary() {
  const [songs, setSongs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // 検索・フィルター関連
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  
  // アップロード関連
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadTags, setUploadTags] = useState(''); // カンマ区切りの文字列
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState(''); // 'エンコード中...', 'アップロード中...'

  // 再生関連
  const [currentPlayingId, setCurrentPlayingId] = useState(null);
  const audioRef = useRef(new Audio());

  const loadSongs = async () => {
    setIsLoading(true);
    try {
      const data = await fetchLibrarySongs();
      setSongs(data);
    } catch (err) {
      console.error(err);
      alert('曲の読み込みに失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setTimeout(() => {
      loadSongs();
    }, 0);
    
    const audio = audioRef.current;
    const handleEnded = () => setCurrentPlayingId(null);
    audio.addEventListener('ended', handleEnded);
    return () => audio.removeEventListener('ended', handleEnded);
  }, []);

  // --- 再生機能 ---
  const togglePlay = (song) => {
    const audio = audioRef.current;
    if (currentPlayingId === song.id) {
      if (audio.paused) {
        audio.play();
      } else {
        audio.pause();
        setCurrentPlayingId(null);
      }
    } else {
      audio.src = song.mp3_url;
      audio.play();
      setCurrentPlayingId(song.id);
    }
  };

  // --- ドラッグ＆ドロップ ---
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const file = e.dataTransfer.files[0];
    if (file && (file.type.startsWith('audio/') || file.name.endsWith('.wav') || file.name.endsWith('.mp3'))) {
      setSelectedFile(file);
      // 拡張子を除いたファイル名を初期タイトルに
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
      setUploadTitle(nameWithoutExt);
    } else {
      alert('音声ファイルをドロップしてください！');
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
      setUploadTitle(nameWithoutExt);
    }
  };

  const cancelUpload = () => {
    setSelectedFile(null);
    setUploadTitle('');
    setUploadTags('');
    setUploadProgress(0);
    setUploadStatus('');
  };

  // --- アップロード処理 ---
  const handleUpload = async () => {
    if (!selectedFile || !uploadTitle) return;
    
    setIsUploading(true);
    setUploadProgress(0);
    
    try {
      // 1. MP3エンコード
      setUploadStatus('MP3に高音質エンコード中...');
      const { blob: mp3Blob, duration } = await encodeAudioToMp3(selectedFile, (progress) => {
        setUploadProgress(progress * 0.5); // エンコードは全体進捗の50%とする
      });
      
      // 2. クラウドアップロード
      setUploadStatus('クラウドにアップロード中...');
      // 雑に50%→100%に進める（実際は一瞬で終わるか、APIにプログレス機能がないため）
      setUploadProgress(0.8);
      
      const tagsArray = uploadTags.split(',').map(t => t.trim()).filter(t => t.length > 0);
      
      await uploadSongToLibrary(mp3Blob, uploadTitle, tagsArray, duration);
      
      setUploadProgress(1.0);
      setUploadStatus('完了！');
      
      // リセットして一覧更新
      setTimeout(() => {
        cancelUpload();
        setIsUploading(false);
        loadSongs();
      }, 1000);
      
    } catch (err) {
      console.error(err);
      alert('エラーが発生しました: ' + err.message);
      setIsUploading(false);
      setUploadStatus('');
    }
  };

  const handleDelete = async (song) => {
    if (!window.confirm(`「${song.title}」を削除してもよろしいですか？`)) return;
    
    try {
      if (currentPlayingId === song.id) {
        audioRef.current.pause();
        setCurrentPlayingId(null);
      }
      await deleteLibrarySong(song);
      setSongs(songs.filter(s => s.id !== song.id));
    } catch (err) {
      alert('削除に失敗しました: ' + err.message);
    }
  };

  // 分秒フォーマット
  const formatDuration = (seconds) => {
    if (!seconds) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // --- フィルタリング ---
  const allTags = Array.from(new Set(songs.flatMap(s => s.tags || []))).sort();

  const filteredSongs = songs.filter(song => {
    const matchSearch = song.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchTag = selectedTag ? (song.tags && song.tags.includes(selectedTag)) : true;
    return matchSearch && matchTag;
  });

    <div 
      className="container" 
      style={{ padding: '24px 0', maxWidth: '1000px', margin: '0 auto', position: 'relative', minHeight: '80vh' }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      
      {/* --- 全画面ドロップオーバーレイ --- */}
      {isDragOver && (
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(8px)',
          zIndex: 50,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          border: '4px dashed var(--accent-blue)',
          borderRadius: '16px',
          color: 'var(--text-primary)',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <CloudArrowUpIcon style={{ width: '80px', height: '80px', color: 'var(--accent-blue)', marginBottom: '24px', animation: 'bounce 2s infinite' }} />
          <h2 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '8px' }}>ここにファイルをドロップしてアップロード</h2>
          <p style={{ color: 'var(--text-secondary)' }}>WavまたはMP3ファイルに対応しています</p>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', padding: '0 16px' }}>
        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <MusicalNoteIcon className="icon" style={{ width: '32px', height: '32px', color: 'var(--accent-blue)' }} />
            マイライブラリ
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            自作曲（WavやMP3）をアップロードしてストック。どの端末からでも視聴できます。
          </p>
        </div>
        
        {!selectedFile && (
          <div>
            <label className="btn btn-primary" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', borderRadius: '30px' }}>
              <CloudArrowUpIcon style={{ width: '20px', height: '20px' }} />
              <span style={{ fontWeight: 'bold' }}>新規アップロード</span>
              <input id="file-upload-input" type="file" accept="audio/*" onChange={handleFileSelect} style={{ display: 'none' }} />
            </label>
          </div>
        )}
      </div>

      {/* --- アップロード準備フォーム（ファイル選択時のみ表示） --- */}
      {selectedFile && (
        <div className="glass-panel" style={{ padding: '32px', marginBottom: '32px', borderLeft: '4px solid var(--accent-blue)', animation: 'slideIn 0.3s ease-out' }}>

          <div style={{ maxWidth: '500px', margin: '0 auto' }}>
            <h3 style={{ marginBottom: '16px', color: 'var(--accent-blue)' }}>アップロード準備</h3>
            
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>曲名</label>
              <input 
                type="text" 
                className="select-input" 
                style={{ width: '100%', padding: '12px' }}
                value={uploadTitle}
                onChange={(e) => setUploadTitle(e.target.value)}
                disabled={isUploading}
              />
            </div>
            
            <div className="form-group" style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>タグ（カンマ区切り。例: 爽やか, ロック）</label>
              <input 
                type="text" 
                className="select-input" 
                style={{ width: '100%', padding: '12px' }}
                value={uploadTags}
                onChange={(e) => setUploadTags(e.target.value)}
                placeholder="ボーカロイド, BGM"
                disabled={isUploading}
              />
            </div>

            {isUploading ? (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.9rem' }}>
                  <span>{uploadStatus}</span>
                  <span>{Math.round(uploadProgress * 100)}%</span>
                </div>
                <div style={{ height: '8px', background: 'var(--bg-secondary)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${uploadProgress * 100}%`, height: '100%', background: 'var(--accent-blue)', transition: 'width 0.2s' }} />
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button className="btn btn-secondary" onClick={cancelUpload}>キャンセル</button>
                <button className="btn btn-primary" onClick={handleUpload} disabled={!uploadTitle}>
                  アップロードして保存
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- ライブラリ一覧 --- */}
      <div className="glass-panel" style={{ padding: '32px' }}>
        <h2 style={{ fontSize: '1.4rem', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          ストック済み <span style={{ fontSize: '1rem', color: 'var(--text-secondary)', fontWeight: 'normal' }}>({songs.length}曲)</span>
        </h2>
        
        {songs.length > 0 && (
          <div style={{ display: 'flex', gap: '16px', marginBottom: '32px', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
              <input 
                type="text" 
                className="select-input" 
                placeholder="🔍 曲名で検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ padding: '12px 16px 12px 40px', width: '100%', borderRadius: '24px' }}
              />
              <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }}>🔍</span>
            </div>
            {allTags.length > 0 && (
              <select 
                className="select-input"
                value={selectedTag}
                onChange={(e) => setSelectedTag(e.target.value)}
                style={{ padding: '12px 24px', minWidth: '150px', borderRadius: '24px' }}
              >
                <option value="">すべてのタグ</option>
                {allTags.map(tag => (
                  <option key={tag} value={tag}>{tag}</option>
                ))}
              </select>
            )}
          </div>
        )}

        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <div className="loader" style={{ width: '40px', height: '40px', margin: '0 auto 16px', borderTopColor: 'var(--accent-blue)' }}></div>
            <p style={{ color: 'var(--text-secondary)' }}>読み込み中...</p>
          </div>
        ) : songs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 0', border: '1px dashed var(--border-strong)', borderRadius: '16px' }}>
            <MusicalNoteIcon style={{ width: '48px', height: '48px', color: 'var(--text-secondary)', margin: '0 auto 16px' }} />
            <h3 style={{ marginBottom: '8px' }}>まだ曲がありません</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>画面に音声ファイルをドラッグ＆ドロップしてアップロードしてみましょう！</p>
          </div>
        ) : filteredSongs.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '32px 0' }}>条件に一致する曲が見つかりませんでした。</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {filteredSongs.map(song => (
              <div 
                key={song.id} 
                className="library-list-item"
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  padding: '12px 16px', 
                  background: currentPlayingId === song.id ? 'rgba(59, 130, 246, 0.05)' : 'transparent',
                  borderBottom: '1px solid var(--border-light)',
                  gap: '16px',
                  transition: 'all 0.2s',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = currentPlayingId === song.id ? 'rgba(59, 130, 246, 0.08)' : 'var(--bg-secondary)'}
                onMouseLeave={(e) => e.currentTarget.style.background = currentPlayingId === song.id ? 'rgba(59, 130, 246, 0.05)' : 'transparent'}
                onClick={(e) => {
                  // ゴミ箱ボタンクリック時は再生トグルしない
                  if (!e.target.closest('button.delete-btn')) {
                    togglePlay(song);
                  }
                }}
              >
                <button 
                  className={`btn ${currentPlayingId === song.id ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ width: '44px', height: '44px', padding: '0', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', flexShrink: 0, boxShadow: currentPlayingId === song.id ? '0 4px 12px rgba(59,130,246,0.3)' : 'none' }}
                >
                  {currentPlayingId === song.id ? 
                    <PauseIcon style={{ width: '20px', height: '20px' }} /> : 
                    <PlayIcon style={{ width: '20px', height: '20px', marginLeft: '4px' }} />
                  }
                </button>
                
                <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
                  
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{ fontSize: '1.05rem', margin: '0 0 4px 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: currentPlayingId === song.id ? 'var(--accent-blue)' : 'var(--text-primary)' }}>
                      {song.title}
                    </h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
                        {new Date(song.created_at).toLocaleDateString()}
                      </span>
                      
                      {song.tags && song.tags.length > 0 && (
                        <div style={{ display: 'flex', gap: '6px' }}>
                          {song.tags.map((tag, i) => (
                            <span key={i} style={{ 
                              fontSize: '0.7rem', 
                              padding: '2px 8px', 
                              background: 'var(--bg-primary)', 
                              border: '1px solid var(--border-default)',
                              borderRadius: '12px',
                              color: 'var(--text-secondary)'
                            }}>
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 波形風の装飾（再生中のみ青く光る） */}
                  {currentPlayingId === song.id && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '3px', height: '24px', marginRight: '16px' }}>
                      {[...Array(5)].map((_, i) => (
                        <div key={i} style={{
                          width: '4px',
                          background: 'var(--accent-blue)',
                          borderRadius: '2px',
                          animation: `bounce ${0.5 + Math.random() * 0.5}s infinite alternate`
                        }} />
                      ))}
                    </div>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexShrink: 0 }}>
                    <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
                      {formatDuration(song.duration)}
                    </span>
                    
                    <button 
                      className="btn btn-secondary delete-btn" 
                      style={{ padding: '8px', color: 'var(--accent-orange)', background: 'transparent', border: 'none' }}
                      onClick={() => handleDelete(song)}
                      title="削除"
                    >
                      <TrashIcon style={{ width: '20px', height: '20px' }} />
                    </button>
                  </div>
                </div>

              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
