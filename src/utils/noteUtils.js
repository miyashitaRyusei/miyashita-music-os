// ============================================
// Note Utilities — 階名変換・ダウンビート算出・ピッチ/リズム抽出
// ============================================
// PianoRollで選択されたノートからピッチ辞書・リズム辞書用の
// データを抽出するための純粋関数群。
// ============================================

/**
 * MIDIノート番号を階名に変換する（Cメジャー基準）。
 * 
 * @param {number} midiNumber - MIDIノート番号 (0-127)
 * @returns {string} 階名（Do, Re, Mi, ...）＋オクターブ情報
 */
export function midiToDegreeName(midiNumber) {
  const degreeNames = ['ド', 'ド#', 'レ', 'レ#', 'ミ', 'ファ', 'ファ#', 'ソ', 'ソ#', 'ラ', 'ラ#', 'シ'];
  const pitchClass = midiNumber % 12;
  const octave = Math.floor(midiNumber / 12) - 1;

  const name = degreeNames[pitchClass];

  // C4(=MIDI 60)を基準とした相対オクターブ表記
  const baseOctave = 4;
  const relativeOctave = octave - baseOctave;

  if (relativeOctave > 0) {
    return name + '↑'.repeat(relativeOctave);
  } else if (relativeOctave < 0) {
    return name + '↓'.repeat(Math.abs(relativeOctave));
  }
  return name;
}

/**
 * MIDIノート番号をオクターブ情報なしのカタカナ階名に変換する（Cメジャー基準）。
 * メロディとコードの関係性分析用（どのオクターブでも同じ音高として扱うため）。
 */
export function midiToPitchClassKatakana(midiNumber) {
  const degreeNames = ['ド', 'ド#', 'レ', 'レ#', 'ミ', 'ファ', 'ファ#', 'ソ', 'ソ#', 'ラ', 'ラ#', 'シ'];
  const pitchClass = midiNumber % 12;
  return degreeNames[pitchClass];
}

/**
 * MIDIノート番号を英語ノート名に変換する。
 * 
 * @param {number} midiNumber - MIDIノート番号 (0-127)
 * @returns {string} ノート名（C4, D#5 等）
 */
export function midiToNoteName(midiNumber) {
  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const pitchClass = midiNumber % 12;
  const octave = Math.floor(midiNumber / 12) - 1;
  return noteNames[pitchClass] + octave;
}

/**
 * あるノートの開始時間が属する小節の「頭（ダウンビート）」の絶対時間を算出する。
 *
 * @param {number} noteTime - ノートの開始時間（秒）
 * @param {number} measureDuration - 1小節の長さ（秒）
 * @returns {number} ダウンビートの絶対時間（秒）
 */
export function findDownbeat(noteTime, measureDuration) {
  if (measureDuration <= 0) return 0;
  return Math.floor(noteTime / measureDuration) * measureDuration;
}

/**
 * 選択されたノートの最初のノートが属する小節の頭を基準に、
 * 各ノートの開始時間を相対時間に変換する。
 * アウフタクトの場合はマイナス値になる。
 *
 * @param {number} noteTime - ノートの開始時間（秒）
 * @param {number} baseDownbeat - 基準ダウンビートの絶対時間（秒）
 * @returns {number} 基準からの相対時間（秒）
 */
export function toRelativeTime(noteTime, baseDownbeat) {
  return noteTime - baseDownbeat;
}

/**
 * 選択されたノート群からピッチ（階名）配列を抽出する。
 * ノートは時間の早い順にソートされている前提。
 *
 * @param {Array<Object>} notes - 選択されたノート配列 [{ midi, time, duration, ... }]
 * @returns {Array<string>} 階名の配列 ['Do', 'Re', 'Mi', ...]
 */
export function extractPitchArray(notes) {
  if (!notes || notes.length === 0) return [];

  // 時間順にソートし、階名に変換
  const sorted = [...notes].sort((a, b) => a.time - b.time || a.midi - b.midi);
  return sorted.map((note) => midiToDegreeName(note.midi));
}

/**
 * 選択されたノート群からリズム配列を抽出する。
 * 最初のノートが属する小節の頭をt=0として、相対時間で表現。
 *
 * @param {Array<Object>} notes - 選択されたノート配列 [{ midi, time, duration, ... }]
 * @param {number} measureDuration - 1小節の長さ（秒）
 * @returns {Array<Object>} リズム配列
 */
export function extractRhythmArray(notes, measureDuration) {
  if (!notes || notes.length === 0) return [];

  // 時間順にソート
  const sorted = [...notes].sort((a, b) => a.time - b.time || a.midi - b.midi);

  // 最初のノートが属する小節の頭をt=0とする
  const firstNoteTime = sorted[0].time;
  const baseDownbeat = findDownbeat(firstNoteTime, measureDuration);

  return sorted.map((note) => {
    const relTime = toRelativeTime(note.time, baseDownbeat);
    return {
      relativeTime: relTime,
      duration: note.duration,
      degreeName: midiToDegreeName(note.midi),
      // UIのパーセント配置用に、1小節を1.0とした割合も保持
      normalizedTime: measureDuration > 0 ? relTime / measureDuration : 0,
      normalizedDuration: measureDuration > 0 ? note.duration / measureDuration : 0,
    };
  });
}

/**
 * ノートが選択矩形と交差（重なり）しているかを判定する。
 * 
 * @param {Object} note - ノート { time, duration, midi }
 * @param {Object} rect - 選択矩形 { startTime, endTime, startPitch, endPitch }
 * @returns {boolean}
 */
export function isNoteInSelection(note, rect) {
  const noteEnd = note.time + note.duration;
  const noteStart = note.time;

  // 時間軸の重なり
  const timeOverlap = noteStart < rect.endTime && noteEnd > rect.startTime;
  // ピッチ軸の重なり
  const pitchOverlap = note.midi >= rect.startPitch && note.midi <= rect.endPitch;

  return timeOverlap && pitchOverlap;
}

/**
 * MIDIデータを指定されたRootキーからCメジャー基準に自動移調（平行移動）する。
 * 最短距離（-6〜+5半音）でシフトを行う。
 * 
 * @param {Object} midiData - パース済みのMIDIデータ
 * @param {string} rootNote - 元のキーのルート音（C, Db, D...）
 * @returns {Object} 移調済みのMIDIデータ
 */
export function transposeToC(midiData, rootNote) {
  if (!midiData) return null;

  const ROOT_TO_INDEX = {
    'C': 0, 'Db': 1, 'C#': 1, 'D': 2, 'Eb': 3, 'D#': 3, 'E': 4,
    'F': 5, 'Gb': 6, 'F#': 6, 'G': 7, 'Ab': 8, 'G#': 8, 'A': 9,
    'Bb': 10, 'A#': 10, 'B': 11
  };

  const rootIndex = ROOT_TO_INDEX[rootNote] || 0;
  
  // -6 から +5 の範囲でC（0）へシフトするオフセットを計算
  let offset = -rootIndex;
  if (offset < -6) offset += 12;

  if (offset === 0) return midiData; // 移調不要

  const transposedNotes = midiData.notes.map(note => ({
    ...note,
    midi: Math.max(0, Math.min(127, note.midi + offset))
  }));

  const transposedRange = {
    min: Math.max(0, Math.min(127, midiData.pitchRange.min + offset)),
    max: Math.max(0, Math.min(127, midiData.pitchRange.max + offset)),
  };

  return {
    ...midiData,
    notes: transposedNotes,
    pitchRange: transposedRange
  };
}
