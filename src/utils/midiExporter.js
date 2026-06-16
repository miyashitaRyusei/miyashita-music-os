import { Midi } from '@tonejs/midi';
import { degreeToValue } from './pitchUtils';

/**
 * ピッチの配列とリズムの配列からMIDIファイルを生成し、Blobとして返す
 * @param {Array<string>} degrees - 例: ['Root', '2nd', '3rd']
 * @param {Array<Object>} timings - 例: [{ normalizedTime: 0, normalizedDuration: 0.125 }]
 * @param {number} bpm - テンポ (デフォルト 120)
 * @returns {Blob} 生成されたMIDIファイルのBlob
 */
export function generateMidiBlob(degrees, timings, bpm = 120) {
  const midi = new Midi();
  
  // メロディ用トラックを追加
  const track = midi.addTrack();
  track.name = "Melody";

  // TODO: @tonejs/midi の Track.setTempo が効かない場合があるため、
  // midi.header.setTempo() を使用するのが安全
  if (midi.header && typeof midi.header.setTempo === 'function') {
    midi.header.setTempo(bpm);
  }

  // 1小節(4拍)の秒数
  const measureSeconds = (60 / bpm) * 4; 
  
  // アウフタクト対策（0以下なら全体をプラスにずらす）
  const minTime = Math.min(...timings.map(t => t.normalizedTime), 0);
  const offset = Math.abs(minTime);

  for (let i = 0; i < timings.length; i++) {
    const timing = timings[i];
    const degree = degrees[i];
    if (!degree) continue;
    
    // ピッチをMIDIノート番号に変換 (C4 = 60)
    const val = degreeToValue(degree);
    // メロディなので C5 (72) を基準にした方がDAWで聴きやすい場合もあるが、まずはC4(60)基準
    const midiNoteNumber = 60 + val;
    
    // normalizedTime (1小節=1.0) を秒数に変換
    const startTime = (timing.normalizedTime + offset) * measureSeconds;
    const duration = timing.normalizedDuration * measureSeconds;
    
    track.addNote({
      midi: midiNoteNumber,
      time: startTime,
      duration: duration,
      velocity: 0.8
    });
  }
  
  // Uint8Array を取得して Blob に変換
  const buffer = midi.toArray();
  const blob = new Blob([buffer], { type: 'audio/midi' });
  return blob;
}

/**
 * BlobからURLを生成し、aタグを使ってダウンロードを発火する
 */
export function downloadMidiBlob(blob, filename = 'melody.mid') {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
