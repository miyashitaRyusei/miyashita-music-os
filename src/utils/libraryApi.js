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
 */
export async function uploadSongToLibrary(mp3Blob, title, tags, duration) {
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
          duration
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
