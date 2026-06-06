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
  stopAudio();
  await initTone();
  
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
  stopAudio();
  await initTone();

  const now = Tone.now();
  const measureSeconds = 2.0; // 120BPMの4/4拍子は1小節2秒
  
  // アウフタクト（マイナス時間）がある場合、0始まりになるようにオフセットを加算
  const minTime = Math.min(...timings.map(t => t.normalizedTime), 0);
  const maxTimeNormalized = Math.max(1.0, ...timings.map(t => t.normalizedTime + t.normalizedDuration));
  const offset = Math.abs(minTime);

  let maxEndTime = 0;

  // メトロノームのクリック音を鳴らす
  const startBeat = Math.floor(minTime * 4);
  const endBeat = Math.ceil(maxTimeNormalized * 4);
  
  for (let i = startBeat; i <= endBeat; i++) {
    const isZero = i === 0;
    const isDownbeat = i % 4 === 0;
    // 0地点はC6(一番高い音)、その他の小節頭はG5、それ以外はC5
    const clickNote = isZero ? 'C6' : (isDownbeat ? 'G5' : 'C5');
    const clickTime = now + (i * 0.25 + offset) * measureSeconds;
    // 音量: 0地点(0.8) > 小節頭(0.5) > その他(0.3)
    const velocity = isZero ? 0.8 : (isDownbeat ? 0.5 : 0.3);
    
    synth.triggerAttackRelease(clickNote, 0.05, clickTime, velocity);
    
    if (clickTime + 0.05 > maxEndTime) {
      maxEndTime = clickTime + 0.05;
    }
  }

  timings.forEach(timing => {
    const note = 'C4';
    // normalizedTime (0.0~1.0) を秒数に変換
    const startTime = now + (timing.normalizedTime + offset) * measureSeconds;
    const duration = timing.normalizedDuration * measureSeconds;
    
    // リズム本体の音 (velocity=1.0)
    synth.triggerAttackRelease(note, duration * 0.9, startTime, 1.0);

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
 * @param {number} playbackRate - 再生速度の倍率（例: 1.5 なら1.5倍速）
 * @param {Array} chordsToPlay - { name: 'C', time: 0, duration: 2.0 } のような形式の配列
 */
export async function playMidiNotes(notes, startSeconds = 0, playbackRate = 1.0, onEnd, chordsToPlay = []) {
  stopAudio();
  await initTone();

  const now = Tone.now();
  let maxEndTime = 0;

  let Chord, Note;
  if (chordsToPlay && chordsToPlay.length > 0) {
    const tonal = await import('@tonaljs/tonal');
    Chord = tonal.Chord;
    Note = tonal.Note;
  }

  notes.forEach((note) => {
    // 再生開始位置より前に終わっているノートは無視
    if (note.time + note.duration <= startSeconds) return;

    // ノートの開始位置がシーク位置より前なら、途中から再生するように計算
    const playOffset = note.time < startSeconds ? 0 : note.time - startSeconds;
    const playDuration = note.time < startSeconds ? note.duration - (startSeconds - note.time) : note.duration;
    
    // playbackRate に応じて時間と長さをスケーリング
    const scaledOffset = playOffset / playbackRate;
    const scaledDuration = playDuration / playbackRate;
    const startTime = now + scaledOffset;

    synth.triggerAttackRelease(note.name, scaledDuration, startTime);

    if (startTime + scaledDuration > maxEndTime) {
      maxEndTime = startTime + scaledDuration;
    }
  });

  if (chordsToPlay && chordsToPlay.length > 0) {
    chordsToPlay.forEach((chord) => {
      if (chord.time + chord.duration <= startSeconds) return;

      const playOffset = chord.time < startSeconds ? 0 : chord.time - startSeconds;
      const playDuration = chord.time < startSeconds ? chord.duration - (startSeconds - chord.time) : chord.duration;
      
      const scaledOffset = playOffset / playbackRate;
      const scaledDuration = playDuration / playbackRate;
      const startTime = now + scaledOffset;

      const chordNotes = parseChordToNotes(chord.name, 3, Chord, Note);

      if (chordNotes.length > 0) {
        // コードは伴奏なのでベロシティ(音量)を0.4に下げてスタッカート気味に鳴らす
        synth.triggerAttackRelease(chordNotes, scaledDuration * 0.9, startTime, 0.4);
      }

      if (startTime + scaledDuration > maxEndTime) {
        maxEndTime = startTime + scaledDuration;
      }
    });
  }

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
  stopAudio();
  await initTone();
  
  // @tonaljs/tonal の動的インポート（初回再生時にロード）
  const { Chord, Note } = await import('@tonaljs/tonal');

  const now = Tone.now();
  let currentOffset = 0;
  
  chords.forEach((chordItem) => {
    // 互換性のため、文字列の配列もサポート
    const chordName = typeof chordItem === 'string' ? chordItem : chordItem.name;
    // 1拍 = 0.5秒 (120BPM) と仮定
    const beats = typeof chordItem === 'string' ? 4 : (chordItem.beats || 4);
    const stepDuration = beats * 0.5;

    const chordNotes = parseChordToNotes(chordName, 4, Chord, Note);

    if (chordNotes.length > 0) {
      // ポリフォニックで和音を発音（90%の時間だけ鳴らしてスタッカート感を出す）
      synth.triggerAttackRelease(chordNotes, stepDuration * 0.9, now + currentOffset);
    }
    
    currentOffset += stepDuration;
  });

  if (onEnd) {
    currentTimeoutId = setTimeout(() => {
      onEnd();
      currentTimeoutId = null;
    }, currentOffset * 1000 + 200);
  }
}

/**
 * コード名をノートの配列に変換するヘルパー関数
 * スラッシュコードや、Tonalでパースできない不正なコードへのフォールバックを含む
 */
function parseChordToNotes(chordString, initialOctave, Chord, Note) {
  let chordName = chordString;
  let bassNote = null;
  
  // スラッシュコードの判定 (例: C/B, ConE)
  const slashMatch = chordName.match(/^([A-G][#b]?[^/]*)(?:\/|on)([A-G][#b]?)$/i);
  if (slashMatch) {
    chordName = slashMatch[1];
    bassNote = slashMatch[2];
  }

  // Tonal.jsが解釈しやすいように和製コード表記を標準化
  let normalizedName = chordName;
  normalizedName = normalizedName.replace(/m7-5/gi, 'm7b5');
  normalizedName = normalizedName.replace(/m7\(b5\)/gi, 'm7b5');
  normalizedName = normalizedName.replace(/maj7/gi, 'M7');
  normalizedName = normalizedName.replace(/△7/gi, 'M7');
  normalizedName = normalizedName.replace(/dim7/gi, 'dim7');

  const chordData = Chord.get(normalizedName);
  let currentOctave = initialOctave;
  let prevChroma = -1;
  let chordNotes = [];

  if (chordData.empty) {
    // パースできない場合、最初のルート音（A-G）だけ抽出してみる
    const fallbackMatch = chordName.match(/^[A-G][#b]?/i);
    if (fallbackMatch) {
      chordNotes = [fallbackMatch[0] + initialOctave];
    }
  } else {
    // 構成音を抽出
    chordNotes = chordData.notes.map((n) => {
      const chroma = Note.chroma(n);
      if (chroma < prevChroma) {
        currentOctave++;
      }
      prevChroma = chroma;
      return n + currentOctave;
    });
  }

  // ベース音があればオクターブ低くして追加
  if (bassNote && chordNotes.length > 0) {
    chordNotes.unshift(bassNote + (initialOctave - 1));
  }

  return chordNotes;
}
