import lamejs from 'lamejs';

/**
 * 任意の音声ファイル（WAV等）を読み込み、ブラウザのAudioContextを利用してPCMにデコードし、
 * lamejsでMP3(Blob)にエンコードするユーティリティ関数。
 * 
 * @param {File} file - ユーザーがアップロードした音声ファイル
 * @param {Function} onProgress - 変換進捗を受け取るコールバック (0〜1)
 * @returns {Promise<Blob>} エンコードされたMP3のBlob
 */
export async function encodeAudioToMp3(file, onProgress) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const arrayBuffer = e.target.result;
        
        // AudioContextでデコード（WAV以外のフォーマットも自動で解析される）
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        
        // lamejsエンコーダの初期化
        // チャンネル数、サンプリングレート、ビットレート(kbps)
        const numChannels = audioBuffer.numberOfChannels;
        const sampleRate = audioBuffer.sampleRate;
        const kbps = 128; // 視聴用としては十分な品質
        
        const mp3encoder = new lamejs.Mp3Encoder(numChannels, sampleRate, kbps);
        const mp3Data = [];
        
        // チャンネルごとのデータをFloat32 (-1.0 ~ 1.0) から Int16 (-32768 ~ 32767) に変換
        const leftChannel = audioBuffer.getChannelData(0);
        const rightChannel = numChannels > 1 ? audioBuffer.getChannelData(1) : null;
        
        // サンプル数が巨大すぎるとブラウザがフリーズするため、チャンクに分けて処理
        const sampleBlockSize = 1152; 
        const samples = new Int16Array(sampleBlockSize);
        const samplesRight = new Int16Array(sampleBlockSize);
        
        for (let i = 0; i < leftChannel.length; i += sampleBlockSize) {
          // 進捗をレポート
          if (onProgress && i % (sampleBlockSize * 100) === 0) {
            onProgress(i / leftChannel.length);
          }

          // ブロックの実際の長さ
          const chunk = leftChannel.subarray(i, i + sampleBlockSize);
          const chunkR = rightChannel ? rightChannel.subarray(i, i + sampleBlockSize) : null;
          
          for (let j = 0; j < chunk.length; j++) {
            // クリップ処理しつつ変換
            let val = chunk[j] * 32767.5;
            samples[j] = Math.max(-32768, Math.min(32767, val));
            
            if (chunkR) {
              let valR = chunkR[j] * 32767.5;
              samplesRight[j] = Math.max(-32768, Math.min(32767, valR));
            }
          }
          
          let mp3buf;
          if (numChannels === 1) {
            mp3buf = mp3encoder.encodeBuffer(samples.subarray(0, chunk.length));
          } else {
            mp3buf = mp3encoder.encodeBuffer(samples.subarray(0, chunk.length), samplesRight.subarray(0, chunk.length));
          }
          
          if (mp3buf.length > 0) {
            mp3Data.push(new Int8Array(mp3buf));
          }
        }
        
        // エンコード完了
        const mp3buf = mp3encoder.flush();
        if (mp3buf.length > 0) {
          mp3Data.push(new Int8Array(mp3buf));
        }
        
        if (onProgress) {
          onProgress(1.0);
        }

        const blob = new Blob(mp3Data, { type: 'audio/mp3' });
        resolve({ blob, duration: audioBuffer.duration });
      } catch (err) {
        reject(err);
      }
    };
    
    reader.onerror = (e) => reject(e);
    reader.readAsArrayBuffer(file);
  });
}
