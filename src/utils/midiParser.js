// ============================================
// MIDI Parser — @tonejs/midi ラッパー
// ============================================
// MIDIファイルを読み込み、PianoRoll描画用のデータ構造に変換する。
// UIコンポーネントから独立したユーティリティとして設計。
// ============================================

import { Midi } from '@tonejs/midi';

/**
 * MIDIファイル（ArrayBuffer）をパースし、内部データ構造に変換する。
 *
 * @param {ArrayBuffer} arrayBuffer - MIDIファイルのバイナリデータ
 * @returns {Object} パース済みMIDIデータ
 */
export function parseMidiFile(arrayBuffer) {
  const midi = new Midi(arrayBuffer);

  // テンポ情報の取得（最初のテンポイベントを使用）
  const tempo = midi.header.tempos.length > 0
    ? midi.header.tempos[0].bpm
    : 120; // デフォルト 120 BPM

  // 拍子情報の取得
  const timeSig = midi.header.timeSignatures.length > 0
    ? {
        numerator: midi.header.timeSignatures[0].timeSignature[0],
        denominator: midi.header.timeSignatures[0].timeSignature[1],
      }
    : { numerator: 4, denominator: 4 }; // デフォルト 4/4

  // 1小節の長さ（秒）を計算
  const beatsPerMeasure = timeSig.numerator;
  const secondsPerBeat = 60 / tempo;
  const measureDuration = beatsPerMeasure * secondsPerBeat;

  // 全トラックからノートを収集（最初のメロディトラックを優先）
  const notes = [];

  midi.tracks.forEach((track) => {
    track.notes.forEach((note) => {
      notes.push({
        midi: note.midi,
        name: note.name,         // "C4", "D#5" 等
        time: note.time,          // 開始時間（秒）
        duration: note.duration,  // 長さ（秒）
        velocity: Math.round(note.velocity * 127),
      });
    });
  });

  // 時間順にソート
  notes.sort((a, b) => a.time - b.time || a.midi - b.midi);

  // 総演奏時間
  const totalDuration = notes.length > 0
    ? Math.max(...notes.map((n) => n.time + n.duration))
    : 0;

  // ピッチ範囲（描画スケール計算用）
  const pitchRange = notes.length > 0
    ? {
        min: Math.min(...notes.map((n) => n.midi)),
        max: Math.max(...notes.map((n) => n.midi)),
      }
    : { min: 48, max: 84 }; // デフォルト C3 〜 C6

  // 上下にマージン追加
  pitchRange.min = Math.max(0, pitchRange.min - 2);
  pitchRange.max = Math.min(127, pitchRange.max + 2);

  return {
    notes,
    tempo,
    originalTempo: tempo, // 元のMIDIが持っていたテンポ
    timeSignature: timeSig,
    measureDuration,
    totalDuration,
    pitchRange,
    trackCount: midi.tracks.length,
    name: midi.name || 'Untitled',
  };
}

/**
 * FileオブジェクトからArrayBufferを読み込む。
 *
 * @param {File} file - MIDIファイルオブジェクト
 * @returns {Promise<ArrayBuffer>}
 */
export function readFileAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}
