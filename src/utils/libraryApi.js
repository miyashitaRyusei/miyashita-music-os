import { supabase } from '../lib/supabase';

// ==========================================
// 音楽ライブラリ用 Supabase API
// ==========================================

const BUCKET_NAME = 'audio_files';
const TABLE_NAME = 'original_songs';

/**
 * MP3ファイルをSupabase Storageにアップロードし、メタデータをDBに保存する
 * @param {Blob} mp3Blob - エンコード済みのMP3データ
 * @param {string} title - 曲名
 * @param {Array<string>} tags - タグの配列
 * @param {number} duration - 曲の長さ（秒）
 * @param {string|null} folderId - フォルダのID
 */
export async function uploadSongToLibrary(mp3Blob, title, tags, duration, folderId = null) {
  try {
    // 1. ファイル名の生成 (一意にするためタイムスタンプを利用)
    const timestamp = Date.now();
    const safeTitle = title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const fileName = `${timestamp}_${safeTitle}.mp3`;

    // 2. Storageへアップロード
    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(fileName, mp3Blob, {
        contentType: 'audio/mp3',
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) throw new Error(`ストレージアップロード失敗: ${uploadError.message}`);

    // 3. 公開URLの取得
    const { data: publicUrlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(fileName);
      
    const publicUrl = publicUrlData.publicUrl;

    // 4. メタデータをDBに保存
    const { data: insertData, error: insertError } = await supabase
      .from(TABLE_NAME)
      .insert([
        { 
          title, 
          tags, 
          mp3_url: publicUrl,
          duration,
          folder_id: folderId
        }
      ])
      .select();

    if (insertError) {
      // DB保存に失敗したら、ゴミファイルにならないようストレージから削除を試みる
      await supabase.storage.from(BUCKET_NAME).remove([fileName]);
      throw new Error(`データベース保存失敗: ${insertError.message}`);
    }

    return insertData[0];
  } catch (error) {
    console.error('uploadSongToLibrary error:', error);
    throw error;
  }
}

/**
 * ライブラリにストックされている曲の一覧を取得する
 */
export async function fetchLibrarySongs() {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('fetchLibrarySongs error:', error);
    throw new Error(`曲の取得に失敗しました: ${error.message}`);
  }
  
  return data;
}

/**
 * 曲を削除する
 */
export async function deleteLibrarySong(song) {
  try {
    // URLからファイル名を抽出
    const urlParts = song.mp3_url.split('/');
    const fileName = urlParts[urlParts.length - 1];

    // Storageから削除
    const { error: storageError } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([fileName]);
      
    if (storageError) {
      console.warn('ストレージのファイル削除に失敗（あるいは既に存在しない）:', storageError.message);
    }

    // DBから削除
    const { error: dbError } = await supabase
      .from(TABLE_NAME)
      .delete()
      .eq('id', song.id);

    if (dbError) throw new Error(`データベースからの削除失敗: ${dbError.message}`);
    
    return true;
  } catch (error) {
    console.error('deleteLibrarySong error:', error);
    throw error;
  }
}

/**
 * 曲のタイトルを更新する
 */
export async function updateLibrarySongTitle(id, newTitle) {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .update({ title: newTitle })
    .eq('id', id)
    .select();

  if (error) {
    console.error('updateLibrarySongTitle error:', error);
    throw new Error(`タイトルの更新に失敗しました: ${error.message}`);
  }

  return data[0];
}

/**
 * 曲の所属フォルダを更新する（移動）
 */
export async function updateSongFolder(id, folderId) {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .update({ folder_id: folderId })
    .eq('id', id)
    .select();

  if (error) {
    console.error('updateSongFolder error:', error);
    throw new Error(`移動に失敗しました: ${error.message}`);
  }

  return data[0];
}

// ==========================================
// フォルダ管理 API
// ==========================================

const FOLDERS_TABLE = 'library_folders';

/**
 * すべてのフォルダを取得する
 */
export async function fetchLibraryFolders() {
  const { data, error } = await supabase
    .from(FOLDERS_TABLE)
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    console.error('fetchLibraryFolders error:', error);
    throw new Error(`フォルダの取得に失敗しました: ${error.message}`);
  }
  
  return data;
}

/**
 * 新しいフォルダを作成する
 */
export async function createLibraryFolder(name, parentId = null) {
  const { data, error } = await supabase
    .from(FOLDERS_TABLE)
    .insert([{ name, parent_id: parentId }])
    .select();

  if (error) {
    console.error('createLibraryFolder error:', error);
    throw new Error(`フォルダの作成に失敗しました: ${error.message}`);
  }

  return data[0];
}

/**
 * フォルダの名前を変更する
 */
export async function updateLibraryFolderName(id, newName) {
  const { data, error } = await supabase
    .from(FOLDERS_TABLE)
    .update({ name: newName })
    .eq('id', id)
    .select();

  if (error) {
    console.error('updateLibraryFolderName error:', error);
    throw new Error(`フォルダ名の更新に失敗しました: ${error.message}`);
  }

  return data[0];
}

/**
 * フォルダを削除する (中身の曲も CASCADE により削除される)
 */
export async function deleteLibraryFolder(id) {
  const { error } = await supabase
    .from(FOLDERS_TABLE)
    .delete()
    .eq('id', id);

  if (error) {
    console.error('deleteLibraryFolder error:', error);
    throw new Error(`フォルダの削除に失敗しました: ${error.message}`);
  }
  
  return true;
}

