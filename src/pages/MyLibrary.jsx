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

  return (
    <div className="container" style={{ padding: '24px 0', maxWidth: '1000px', margin: '0 auto' }}>
      
      <div className="glass-panel" style={{ padding: '32px', marginBottom: '32px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
          <MusicalNoteIcon className="icon" style={{ width: '32px', height: '32px', color: 'var(--accent-blue)' }} />
          マイライブラリ
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          自作曲（WavやMP3）をアップロードしてストック。どの端末からでも視聴できます。
        </p>
      </div>

      {/* --- アップロードエリア --- */}
      <div 
        className={`glass-panel ${isDragOver ? 'drag-over' : ''}`}
        style={{ 
          padding: '32px', 
          marginBottom: '32px',
          border: isDragOver ? '2px dashed var(--accent-blue)' : '2px dashed var(--border-color)',
          transition: 'all 0.3s ease',
          position: 'relative'
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {!selectedFile ? (
          <div style={{ textAlign: 'center' }}>
            <CloudArrowUpIcon style={{ width: '48px', height: '48px', color: 'var(--text-secondary)', margin: '0 auto 16px' }} />
            <h3 style={{ marginBottom: '8px' }}>ここに音声ファイル（Wav/MP3）をドロップ</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '16px' }}>
              アップロード時に自動で軽量なMP3に変換されます（通信量・容量節約）
            </p>
            <label className="btn btn-primary" style={{ cursor: 'pointer' }}>
              ファイルを選択
              <input type="file" accept="audio/*" onChange={handleFileSelect} style={{ display: 'none' }} />
            </label>
          </div>
        ) : (
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
        )}
      </div>

      {/* --- ライブラリ一覧 --- */}
      <div className="glass-panel" style={{ padding: '32px' }}>
        <h2 style={{ fontSize: '1.4rem', marginBottom: '24px' }}>ストック済み（{songs.length}曲）</h2>
        
        {songs.length > 0 && (
          <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
            <input 
              type="text" 
              className="select-input" 
              placeholder="🔍 曲名で検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ padding: '10px 16px', flex: 1, minWidth: '200px' }}
            />
            {allTags.length > 0 && (
              <select 
                className="select-input"
                value={selectedTag}
                onChange={(e) => setSelectedTag(e.target.value)}
                style={{ padding: '10px 16px', minWidth: '150px' }}
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
          <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>読み込み中...</p>
        ) : songs.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '32px 0' }}>まだ曲がありません。上のエリアからアップロードしてみましょう！</p>
        ) : filteredSongs.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '32px 0' }}>条件に一致する曲が見つかりませんでした。</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {filteredSongs.map(song => (
              <div key={song.id} style={{ 
                display: 'flex', 
                alignItems: 'center', 
                padding: '16px', 
                background: 'var(--bg-secondary)', 
                borderRadius: '12px',
                gap: '16px',
                transition: 'all 0.2s',
                boxShadow: currentPlayingId === song.id ? '0 0 0 2px var(--accent-blue)' : 'none'
              }}>
                <button 
                  className={`btn ${currentPlayingId === song.id ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ width: '48px', height: '48px', padding: '0', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', flexShrink: 0 }}
                  onClick={() => togglePlay(song)}
                >
                  {currentPlayingId === song.id ? 
                    <PauseIcon style={{ width: '24px', height: '24px' }} /> : 
                    <PlayIcon style={{ width: '24px', height: '24px', marginLeft: '4px' }} />
                  }
                </button>
                
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 style={{ fontSize: '1.1rem', margin: '0 0 4px 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {song.title}
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      {new Date(song.created_at).toLocaleDateString()}
                    </span>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>•</span>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      {formatDuration(song.duration)}
                    </span>
                    
                    {song.tags && song.tags.length > 0 && (
                      <>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>•</span>
                        {song.tags.map((tag, i) => (
                          <span key={i} style={{ 
                            fontSize: '0.75rem', 
                            padding: '2px 8px', 
                            background: 'rgba(255,255,255,0.1)', 
                            borderRadius: '12px',
                            color: 'var(--text-primary)'
                          }}>
                            {tag}
                          </span>
                        ))}
                      </>
                    )}
                  </div>
                </div>

                <button 
                  className="btn btn-secondary" 
                  style={{ padding: '8px', color: 'var(--accent-orange)' }}
                  onClick={() => handleDelete(song)}
                  title="削除"
                >
                  <TrashIcon style={{ width: '20px', height: '20px' }} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
