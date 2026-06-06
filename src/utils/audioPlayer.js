import * as Tone from 'tone';

// シングルトンとしてシンセサイザーとタイマーを保持
let synth = null;
let currentTimeoutId = null;

/**
 * Tone.js の初期化（ユーザー操作時に呼ぶ必要がある）
 */
async function initTone() {
  if (Tone.context.state !== 'running') {
    await Tone.start();
  }
  if (!synth) {
    synth = new Tone.PolySynth(Tone.Synth).toDestination();
    synth.volume.value = -6; // 音割れ防止のため少し下げる
  }
}

/**
 * 再生を強制停止する
 */
export function stopAudio() {
  if (synth) {
    synth.releaseAll();
    synth.dispose(); // スケジュールされたイベントをキャンセルするために破棄
    synth = null;
  }
  Tone.Transport.stop();
  Tone.Transport.cancel(0);
  
  if (currentTimeoutId) {
    clearTimeout(currentTimeoutId);
    currentTimeoutId = null;
  }
}

const DEGREE_TO_NOTE = {
  // 英語表記
  'Do↓': 'C3', 'Re↓': 'D3', 'Mi↓': 'E3', 'Fa↓': 'F3', 'Sol↓': 'G3', 'La↓': 'A3', 'Si↓': 'B3',
  'Do': 'C4', 'Re': 'D4', 'Mi': 'E4', 'Fa': 'F4', 'Sol': 'G4', 'La': 'A4', 'Si': 'B4',
  'Do↑': 'C5', 'Re↑': 'D5', 'Mi↑': 'E5', 'Fa↑': 'F5', 'Sol↑': 'G5', 'La↑': 'A5', 'Si↑': 'B5',
  // カタカナ表記
  'ド↓': 'C3', 'ド#↓': 'C#3', 'レ↓': 'D3', 'レ#↓': 'D#3', 'ミ↓': 'E3', 'ファ↓': 'F3', 'ファ#↓': 'F#3', 'ソ↓': 'G3', 'ソ#↓': 'G#3', 'ラ↓': 'A3', 'ラ#↓': 'A#3', 'シ↓': 'B3',
  'ド': 'C4', 'ド#': 'C#4', 'レ': 'D4', 'レ#': 'D#4', 'ミ': 'E4', 'ファ': 'F4', 'ファ#': 'F#4', 'ソ': 'G4', 'ソ#': 'G#4', 'ラ': 'A4', 'ラ#': 'A#4', 'シ': 'B4',
  'ド↑': 'C5', 'ド#↑': 'C#5', 'レ↑': 'D5', 'レ#↑': 'D#5', 'ミ↑': 'E5', 'ファ↑': 'F5', 'ファ#↑': 'F#5', 'ソ↑': 'G5', 'ソ#↑': 'G#5', 'ラ↑': 'A5', 'ラ#↑': 'A#5', 'シ↑': 'B5',
};

/**
 * ピッチパターンの再生（リズムを持たず、全て8分音符で再生）
 */
export async function playPitchSequence(degrees, onEnd) {
  await initTone();
  stopAudio();
  
  const now = Tone.now();
  const stepTime = 0.25; // 8分音符相当（120BPM）
  
  degrees.forEach((degree, i) => {
    const note = DEGREE_TO_NOTE[degree] || 'C4';
    // 発音タイミングをスケジュール
    synth.triggerAttackRelease(note, "8n", now + i * stepTime);
  });

  // 全て鳴り終わった後に状態をリセットするためのコールバック
  if (onEnd) {
    currentTimeoutId = setTimeout(() => {
      onEnd();
      currentTimeoutId = null;
    }, degrees.length * stepTime * 1000 + 200);
  }
}

/**
 * リズムパターンの再生（ピッチを持たず、全てC4で再生）
 */
export async function playRhythmSequence(timings, onEnd) {
  await initTone();
  stopAudio();

  const now = Tone.now();
  const measureSeconds = 2.0; // 120BPMの4/4拍子は1小節2秒
  
  // アウフタクト（マイナス時間）がある場合、0始まりになるようにオフセットを加算
  const minTime = Math.min(...timings.map(t => t.normalizedTime), 0);
  const offset = Math.abs(minTime);

  let maxEndTime = 0;

  timings.forEach(timing => {
    const note = 'C4';
    // normalizedTime (0.0~1.0) を秒数に変換
    const startTime = now + (timing.normalizedTime + offset) * measureSeconds;
    const duration = timing.normalizedDuration * measureSeconds;
    
    // durationの90%だけ発音し、音の区切り（スタッカート感）を出す
    synth.triggerAttackRelease(note, duration * 0.9, startTime);

    if (startTime + duration > maxEndTime) {
      maxEndTime = startTime + duration;
    }
  });

  if (onEnd) {
    currentTimeoutId = setTimeout(() => {
      onEnd();
      currentTimeoutId = null;
    }, (maxEndTime - now) * 1000 + 200);
  }
}

/**
 * 生のMIDIノート配列を再生する
 * @param {Array} notes - { name: 'C4', time: 0, duration: 1 } のような形式の配列
 * @param {number} startSeconds - 再生開始位置（秒）
 * @param {Function} onEnd - 再生完了時のコールバック
 */
export async function playMidiNotes(notes, startSeconds = 0, onEnd) {
  await initTone();
  stopAudio();

  const now = Tone.now();
  let maxEndTime = 0;

  notes.forEach((note) => {
    // 再生開始位置より前に終わっているノートは無視
    if (note.time + note.duration <= startSeconds) return;

    // ノートの開始位置がシーク位置より前なら、途中から再生するように計算
    const playOffset = note.time < startSeconds ? 0 : note.time - startSeconds;
    const playDuration = note.time < startSeconds ? note.duration - (startSeconds - note.time) : note.duration;
    const startTime = now + playOffset;

    synth.triggerAttackRelease(note.name, playDuration, startTime);

    if (startTime + playDuration > maxEndTime) {
      maxEndTime = startTime + playDuration;
    }
  });

  if (onEnd && maxEndTime > 0) {
    currentTimeoutId = setTimeout(() => {
      onEnd();
      currentTimeoutId = null;
    }, (maxEndTime - now) * 1000 + 200);
  }
}

/**
 * コード進行の再生（Tone.PolySynth と @tonaljs/tonal を使用）
 */
export async function playChordProgression(chords, onEnd) {
  await initTone();
  stopAudio();
  
  // @tonaljs/tonal の動的インポート（初回再生時にロード）
  const { Chord, Note } = await import('@tonaljs/tonal');

  const now = Tone.now();
  const stepTime = 1.0; // 1秒ごとに1コード
  
  chords.forEach((chordName, i) => {
    const chordData = Chord.get(chordName);
    let currentOctave = 4;
    let prevChroma = -1;
    
    // コードパースに成功した場合は構成音を取得、失敗した場合はルート音のみとする
    let notes = [];
    if (chordData.empty) {
      // プレーンな文字列（'C'など）だけでもパースは成功するが、
      // 万が一失敗した場合はそのまま4オクターブ目を付ける
      notes = [chordName + '4'];
    } else {
      // 転回形を防ぎ、ルートから上に向かって積み上げるためのオクターブ調整
      notes = chordData.notes.map((note) => {
        const chroma = Note.chroma(note);
        if (chroma < prevChroma) {
          currentOctave++;
        }
        prevChroma = chroma;
        return note + currentOctave;
      });
    }

    // ポリフォニックで和音を発音（90%の時間だけ鳴らしてスタッカート感を出す）
    synth.triggerAttackRelease(notes, stepTime * 0.9, now + i * stepTime);
  });

  if (onEnd) {
    currentTimeoutId = setTimeout(() => {
      onEnd();
      currentTimeoutId = null;
    }, chords.length * stepTime * 1000 + 200);
  }
}
