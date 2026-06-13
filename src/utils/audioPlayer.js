import * as Tone from 'tone';
import { normalizeChordNotation } from './chordUtils';

// シングルトンとしてシンセサイザーとタイマーを保持
let synth = null;
let melodySynth = null;
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
    synth.volume.value = -8; // 伴奏コード用
  }
  if (!melodySynth) {
    // メロディ用は耳に優しいサイン波や三角波をベースにする
    melodySynth = new Tone.PolySynth(Tone.Synth, {
      oscillator: {
        type: "triangle"
      },
      envelope: {
        attack: 0.05,
        decay: 0.2,
        sustain: 0.2,
        release: 1.5
      }
    }).toDestination();
    melodySynth.volume.value = -8; // メロディが大きすぎないように調整
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
  if (melodySynth) {
    melodySynth.releaseAll();
    melodySynth.dispose();
    melodySynth = null;
  }
  Tone.Transport.stop();
  Tone.Transport.cancel(0);
  
  if (currentTimeoutId) {
    clearTimeout(currentTimeoutId);
    currentTimeoutId = null;
  }
}

// 階名から相対的なピッチ値を計算するヘルパー（Cメジャー基準）
function degreeToValue(degreeStr) {
  if (!degreeStr) return 0;
  
  const baseMap = {
    'ド': 0, 'ド#': 1, 'レ': 2, 'レ#': 3, 'ミ': 4, 'ファ': 5, 'ファ#': 6,
    'ソ': 7, 'ソ#': 8, 'ラ': 9, 'ラ#': 10, 'シ': 11,
    'Do': 0, 'Do#': 1, 'Re': 2, 'Re#': 3, 'Mi': 4, 'Fa': 5, 'Fa#': 6,
    'Sol': 7, 'Sol#': 8, 'La': 9, 'La#': 10, 'Si': 11
  };
  
  // 空白の除去と全角/半角の正規化
  let normalizedStr = degreeStr.trim().replace(/♯/g, '#').replace(/♭/g, 'b');
  
  // 階名部分の抽出（矢印などを除外）
  let name = normalizedStr.replace(/[↑↓⬆⬇⇧⇩]/g, '');
  let val = baseMap[name] !== undefined ? baseMap[name] : 0;
  
  // オクターブシフトの計算
  const upCount = (normalizedStr.match(/[↑⬆⇧]/g) || []).length;
  const downCount = (normalizedStr.match(/[↓⬇⇩]/g) || []).length;
  
  return val + (upCount * 12) - (downCount * 12);
}

function degreeToNoteName(degreeStr) {
  const val = degreeToValue(degreeStr);
  // C4 を基準(0)とする。C4は MIDI ノート番号 60
  const midiNote = 60 + val;
  return Tone.Frequency(midiNote, "midi").toNote();
}

/**
 * ピッチパターンの再生（リズムを持たず、全て8分音符で再生）
 */
export async function playPitchSequence(degrees, onEnd) {
  stopAudio();
  await initTone();
  
  const now = Tone.now();
  const stepTime = 0.25; // 8分音符相当（120BPM）
  
  degrees.forEach((degree, i) => {
    const note = degreeToNoteName(degree);
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
 * ピッチとリズムを組み合わせたパターンの再生
 * degrees: ['ド', 'レ', ...]
 * timings: [{ start: 0, duration: 0.5 }, ...]
 */
export async function playCombinedSequence(degrees, timings, bpm = 120, onEnd) {
  stopAudio();
  await initTone();
  
  const now = Tone.now();
  // BPMから1小節(4拍)の秒数を計算
  const measureSeconds = (60 / bpm) * 4; 
  
  // アウフタクト対策
  const minTime = Math.min(...timings.map(t => t.normalizedTime), 0);
  const offset = Math.abs(minTime);
  const maxTimeNormalized = Math.max(1.0, ...timings.map(t => t.normalizedTime + t.normalizedDuration));

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

  for (let i = 0; i < timings.length; i++) {
    const timing = timings[i];
    const degree = degrees[i];
    if (!degree) continue; // 音数が足りない場合は無視

    const note = degreeToNoteName(degree);
    
    const startTime = now + (timing.normalizedTime + offset) * measureSeconds;
    const durationTime = timing.normalizedDuration * measureSeconds;
    
    melodySynth.triggerAttackRelease(note, durationTime, startTime);
    
    if (startTime + durationTime > maxEndTime) {
      maxEndTime = startTime + durationTime;
    }
  }

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
 * メロディとコードを同時に再生する（メロディ×コード辞書用）
 */
export async function playMelodyAndChord(melodyDegree, chordName, onEnd) {
  stopAudio();
  await initTone();
  
  const { Chord, Note } = await import('@tonaljs/tonal');
  const now = Tone.now();
  
  // メロディの再生（1オクターブ上で鳴らすと抜けが良い）
  const melodyNote = degreeToNoteName(melodyDegree + '↑');
  melodySynth.triggerAttackRelease(melodyNote, "2n", now);
  
  // コードの再生
  const chordNotes = parseChordToNotes(chordName, 4, Chord, Note);
  if (chordNotes.length > 0) {
    synth.triggerAttackRelease(chordNotes, "2n", now);
  }
  
  if (onEnd) {
    currentTimeoutId = setTimeout(() => {
      onEnd();
      currentTimeoutId = null;
    }, 1000 + 200);
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
  let normalizedName = normalizeChordNotation(chordName);

  const chordData = Chord.get(normalizedName);
  let currentOctave = initialOctave;
  let prevChroma = -1;
  let chordNotes = [];

  let fallbackMatch = null;
  if (chordData.empty) {
    // パースできない場合、最初のルート音（A-G）だけ抽出してみる
    fallbackMatch = chordName.match(/^[A-G][#b]?/i);
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

  // ベース音の決定（スラッシュコードなら指定された音、そうでないならルート音）
  let effectiveBassNote = bassNote;
  if (!effectiveBassNote && !chordData.empty) {
    effectiveBassNote = chordData.tonic;
  } else if (!effectiveBassNote && chordData.empty && fallbackMatch) {
    // パース失敗時でもフォールバックからルートを拾えるなら拾う
    effectiveBassNote = fallbackMatch[0];
  }

  // ベース音があればオクターブ低くして追加
  if (effectiveBassNote && chordNotes.length > 0) {
    // スラッシュコード指定のベース音もルート音も、和音の最低音よりオクターブ下で鳴らす
    chordNotes.unshift(effectiveBassNote + (initialOctave - 1));
  }

  return chordNotes;
}
