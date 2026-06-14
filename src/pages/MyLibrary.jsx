import { useState, useRef, useEffect } from 'react';
import { encodeAudioToMp3 } from '../utils/audioEncoder';
import { uploadSongToLibrary, fetchLibrarySongs, deleteLibrarySong, updateLibrarySongTitle } from '../utils/libraryApi';
import { PlayIcon, PauseIcon, TrashIcon, CloudArrowUpIcon, FolderIcon, MagnifyingGlassIcon, MusicalNoteIcon, PencilIcon, ForwardIcon, BackwardIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

export default function MyLibrary() {
  const [songs, setSongs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // 検索・フィルター関連
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  
  // 編集関連
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');

  // アップロード関連
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadTags, setUploadTags] = useState(''); // カンマ区切りの文字列
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState(''); // 'エンコード中...', 'アップロード中...'

  // 再生関連
  const [currentPlayingId, setCurrentPlayingId] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isAutoPlay, setIsAutoPlay] = useState(true); // 連続再生
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

  // --- 再生機能 ---
  const currentSongIndex = filteredSongs.findIndex(s => s.id === currentPlayingId);
  const currentSong = currentPlayingId ? filteredSongs[currentSongIndex] : null;

  useEffect(() => {
    setTimeout(() => {
      loadSongs();
    }, 0);
    
    const audio = audioRef.current;
    
    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      setDuration(audio.duration || 0);
    };
    
    const handleEnded = () => {
      if (isAutoPlay) {
        // 次の曲へ
        playNext();
      } else {
        setIsPlaying(false);
        setCurrentPlayingId(null);
      }
    };
    
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    
    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
    };
  }, [isAutoPlay, filteredSongs, currentPlayingId]); // 依存配列に必要なものを追加

  const playSong = (song) => {
    const audio = audioRef.current;
    if (currentPlayingId !== song.id) {
      audio.src = song.mp3_url;
      setCurrentPlayingId(song.id);
    }
    audio.play();
  };

  const togglePlay = (song) => {
    const audio = audioRef.current;
    if (currentPlayingId === song.id) {
      if (audio.paused) {
        audio.play();
      } else {
        audio.pause();
      }
    } else {
      playSong(song);
    }
  };

  const playNext = () => {
    if (currentSongIndex >= 0 && currentSongIndex < filteredSongs.length - 1) {
      playSong(filteredSongs[currentSongIndex + 1]);
    } else {
      // リストの最後なら停止
      setIsPlaying(false);
      setCurrentPlayingId(null);
    }
  };

  const playPrev = () => {
    const audio = audioRef.current;
    // 3秒以上再生していたら曲の頭に戻るだけ
    if (audio.currentTime > 3) {
      audio.currentTime = 0;
      return;
    }
    if (currentSongIndex > 0) {
      playSong(filteredSongs[currentSongIndex - 1]);
    }
  };

  const handleSeek = (e) => {
    const time = parseFloat(e.target.value);
    audioRef.current.currentTime = time;
    setCurrentTime(time);
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
    
    // フォルダも考慮してすべてのファイルをフラットに取得（簡易版：DataTransferItemListを再帰的に読むのは複雑なため、
    // まずは通常のファイルリストから取得。実はwebkitdirectory属性があればドラッグ＆ドロップでもフォルダ内のファイルが展開されるブラウザもある）
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('audio/') || f.name.endsWith('.wav') || f.name.endsWith('.mp3'));
    
    if (files.length > 0) {
      setSelectedFiles(files);
      setUploadTitle(files.length === 1 ? files[0].name.replace(/\.[^/.]+$/, "") : `${files.length}個のファイル`);
    } else {
      alert('音声ファイルをドロップしてください！');
    }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files).filter(f => f.type.startsWith('audio/') || f.name.endsWith('.wav') || f.name.endsWith('.mp3'));
    if (files.length > 0) {
      setSelectedFiles(files);
      setUploadTitle(files.length === 1 ? files[0].name.replace(/\.[^/.]+$/, "") : `${files.length}個のファイル`);
    }
  };

  const cancelUpload = () => {
    setSelectedFiles(null);
    setUploadTitle('');
    setUploadTags('');
    setUploadProgress(0);
    setUploadStatus('');
  };

  // --- アップロード処理 ---
  const handleUpload = async () => {
    if (!selectedFiles || selectedFiles.length === 0 || !uploadTitle) return;
    
    setIsUploading(true);
    setUploadProgress(0);
    
    let successCount = 0;
    
    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        
        // 1. MP3エンコード
        setUploadStatus(`[${i+1}/${selectedFiles.length}] ${file.name} をMP3エンコード中...`);
        setUploadProgress(0); // 1ファイルごとの進捗リセット（全体進捗を見せる場合は計算を変える）
        
        const { blob: mp3Blob, duration } = await encodeAudioToMp3(file, (progress) => {
          // 個別ファイルの進捗 (0~0.5) ＋ 全体進捗
          const overallProgress = (i + progress * 0.5) / selectedFiles.length;
          setUploadProgress(overallProgress);
        });
        
        // 2. クラウドアップロード
        setUploadStatus(`[${i+1}/${selectedFiles.length}] ${file.name} をアップロード中...`);
        const overallProgressAfterEncode = (i + 0.8) / selectedFiles.length;
        setUploadProgress(overallProgressAfterEncode);
        
        const tagsArray = uploadTags.split(',').map(t => t.trim()).filter(t => t.length > 0);
        // 複数ファイルの場合は連番か元のファイル名を使うのが理想だが、ここではシンプルに元のファイル名を使う
        const titleToUse = selectedFiles.length === 1 ? uploadTitle : file.name.replace(/\.[^/.]+$/, "");
        
        await uploadSongToLibrary(mp3Blob, titleToUse, tagsArray, duration);
        
        successCount++;
        setUploadProgress((i + 1) / selectedFiles.length);
      }
      
      setUploadStatus('すべて完了しました！');
      
      // リセットして一覧更新
      setTimeout(() => {
        cancelUpload();
        setIsUploading(false);
        loadSongs();
      }, 1500);
      
    } catch (err) {
      console.error(err);
      alert('エラーが発生しました: ' + err.message);
      setIsUploading(false);
      setUploadStatus('');
      if (successCount > 0) {
        loadSongs(); // 成功した分だけ再読み込み
      }
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

  const handleRenameSubmit = async (songId) => {
    if (!editTitle.trim()) {
      setEditingId(null);
      return;
    }
    try {
      const updated = await updateLibrarySongTitle(songId, editTitle);
      setSongs(songs.map(s => s.id === songId ? updated : s));
      setEditingId(null);
    } catch (err) {
      alert('タイトルの更新に失敗しました: ' + err.message);
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

  return (
    <div style={{ paddingBottom: currentSong ? '90px' : '0' }}>
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
            <FolderIcon className="icon" style={{ width: '32px', height: '32px', color: 'var(--accent-blue)' }} />
            マイライブラリ
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            自作曲（WavやMP3）をアップロードしてストック。どの端末からでも視聴できます。
          </p>
        </div>
        
        {!selectedFiles && (
          <div style={{ display: 'flex', gap: '12px' }}>
            <label className="btn btn-outline" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', borderRadius: '30px', background: 'var(--bg-primary)' }}>
              <MusicalNoteIcon style={{ width: '20px', height: '20px' }} />
              <span style={{ fontWeight: 'bold' }}>ファイル選択</span>
              <input type="file" multiple accept="audio/*" onChange={handleFileSelect} style={{ display: 'none' }} />
            </label>
            <label className="btn btn-primary" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', borderRadius: '30px' }}>
              <FolderIcon style={{ width: '20px', height: '20px' }} />
              <span style={{ fontWeight: 'bold' }}>フォルダごと</span>
              <input type="file" webkitdirectory="true" directory="true" multiple onChange={handleFileSelect} style={{ display: 'none' }} />
            </label>
          </div>
        )}
      </div>

      {/* --- アップロード準備フォーム（ファイル選択時のみ表示） --- */}
      {selectedFiles && (
        <div className="glass-panel" style={{ padding: '32px', marginBottom: '32px', borderLeft: '4px solid var(--accent-blue)', animation: 'slideIn 0.3s ease-out' }}>

          <div style={{ maxWidth: '500px', margin: '0 auto' }}>
            <h3 style={{ marginBottom: '16px', color: 'var(--accent-blue)' }}>アップロード準備</h3>
            
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>曲名 {selectedFiles.length > 1 && '(※複数ファイルの場合は元のファイル名が使用されます)'}</label>
              <input 
                type="text" 
                className="select-input" 
                style={{ width: '100%', padding: '12px' }}
                value={uploadTitle}
                onChange={(e) => setUploadTitle(e.target.value)}
                disabled={isUploading || selectedFiles.length > 1}
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
                placeholder="曲名で検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ padding: '12px 16px 12px 40px', width: '100%', borderRadius: '24px' }}
              />
              <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center' }}>
                <MagnifyingGlassIcon style={{ width: '18px', height: '18px', color: 'var(--text-secondary)' }} />
              </span>
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
                  className={`btn ${currentPlayingId === song.id && isPlaying ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ width: '44px', height: '44px', padding: '0', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', flexShrink: 0, boxShadow: currentPlayingId === song.id && isPlaying ? '0 4px 12px rgba(59,130,246,0.3)' : 'none' }}
                >
                  {currentPlayingId === song.id && isPlaying ? 
                    <PauseIcon style={{ width: '20px', height: '20px' }} /> : 
                    <PlayIcon style={{ width: '20px', height: '20px', marginLeft: '4px' }} />
                  }
                </button>
                
                <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
                  
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {editingId === song.id ? (
                      <input
                        type="text"
                        className="select-input"
                        autoFocus
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onBlur={() => handleRenameSubmit(song.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleRenameSubmit(song.id);
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                        style={{ width: '100%', marginBottom: '4px', padding: '4px 8px' }}
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <h3 style={{ fontSize: '1.05rem', margin: '0 0 4px 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: currentPlayingId === song.id ? 'var(--accent-blue)' : 'var(--text-primary)' }}>
                        {song.title}
                      </h3>
                    )}
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
                      style={{ padding: '8px', color: 'var(--text-secondary)', background: 'transparent', border: 'none' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingId(song.id);
                        setEditTitle(song.title);
                      }}
                      title="タイトル編集"
                    >
                      <PencilIcon style={{ width: '18px', height: '18px' }} />
                    </button>
                    <button 
                      className="btn btn-secondary delete-btn" 
                      style={{ padding: '8px', color: 'var(--accent-orange)', background: 'transparent', border: 'none' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(song);
                      }}
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

      {/* --- グローバルプレイヤー（追従型） --- */}
      {currentSong && (
        <div style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          background: 'rgba(15, 23, 42, 0.95)',
          backdropFilter: 'blur(10px)',
          borderTop: '1px solid var(--border-light)',
          padding: '12px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          zIndex: 100,
          boxShadow: '0 -4px 20px rgba(0,0,0,0.2)',
          animation: 'slideUp 0.3s ease-out'
        }}>
          {/* シークバー */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.8rem', color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
            <span>{formatDuration(currentTime)}</span>
            <input 
              type="range" 
              min={0} 
              max={duration || 100} 
              value={currentTime} 
              onChange={handleSeek}
              style={{ flex: 1, cursor: 'pointer', height: '4px', accentColor: 'var(--accent-blue)' }}
            />
            <span>{formatDuration(duration)}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            {/* 曲情報 */}
            <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div>
                <h4 style={{ margin: '0 0 2px 0', fontSize: '1rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {currentSong.title}
                </h4>
                {currentSong.tags && currentSong.tags.length > 0 && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    {currentSong.tags.join(', ')}
                  </div>
                )}
              </div>
            </div>

            {/* コントロール */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <button 
                className="btn"
                style={{ background: 'transparent', padding: '8px', color: 'var(--text-primary)', border: 'none' }}
                onClick={playPrev}
                title="前の曲へ"
              >
                <BackwardIcon style={{ width: '24px', height: '24px' }} />
              </button>
              
              <button 
                className="btn btn-primary"
                style={{ width: '48px', height: '48px', padding: '0', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%' }}
                onClick={() => togglePlay(currentSong)}
              >
                {isPlaying ? 
                  <PauseIcon style={{ width: '24px', height: '24px' }} /> : 
                  <PlayIcon style={{ width: '24px', height: '24px', marginLeft: '4px' }} />
                }
              </button>
              
              <button 
                className="btn"
                style={{ background: 'transparent', padding: '8px', color: 'var(--text-primary)', border: 'none' }}
                onClick={playNext}
                title="次の曲へ"
              >
                <ForwardIcon style={{ width: '24px', height: '24px' }} />
              </button>
            </div>

            {/* 右側オプション */}
            <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
              <button
                className="btn"
                style={{
                  background: 'transparent',
                  border: 'none',
                  padding: '8px',
                  color: isAutoPlay ? 'var(--accent-blue)' : 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.85rem'
                }}
                onClick={() => setIsAutoPlay(!isAutoPlay)}
                title="連続再生"
              >
                <ArrowPathIcon style={{ width: '20px', height: '20px' }} />
                <span className="hide-on-mobile">連続再生</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
