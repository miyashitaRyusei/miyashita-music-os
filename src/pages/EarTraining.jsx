import React, { useState, useEffect, useRef } from 'react';
import * as Tone from 'tone';
import { progressionDataI, progressionDataIV, progressionDataMix } from '../data/chordTrainerData';
import { PlayIcon, StopIcon, EyeIcon, ForwardIcon } from '@heroicons/react/24/solid';
import { SparklesIcon, MusicalNoteIcon } from '@heroicons/react/24/outline';

export default function EarTraining() {
  const [category, setCategory] = useState('I'); // 'I', 'IV', 'Mix'
  const [currentPool, setCurrentPool] = useState([]);
  const [currentPoolIndex, setCurrentPoolIndex] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);
  
  // Tone.jsのSynthとTransport参照を保持
  const synthRef = useRef(null);

  // カテゴリ変更時にプールを初期化
  useEffect(() => {
    let sourceData = progressionDataI;
    if (category === 'IV') sourceData = progressionDataIV;
    if (category === 'Mix') sourceData = progressionDataMix;

    // フィッシャー・イェーツのシャッフル
    const shuffledIndices = Array.from({ length: sourceData.length }, (_, i) => i);
    for (let i = shuffledIndices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledIndices[i], shuffledIndices[j]] = [shuffledIndices[j], shuffledIndices[i]];
    }

    setCurrentPool(shuffledIndices);
    setCurrentPoolIndex(0);
    setQuestion(sourceData, shuffledIndices, 0);
    
    // カテゴリ変更時に再生停止
    if (isPlaying) {
      stopSequence();
    }
  }, [category]);

  // Tone.jsの初期化
  useEffect(() => {
    synthRef.current = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: "triangle" },
      envelope: { attack: 0.04, decay: 0.1, sustain: 0.8, release: 0.8 }
    }).toDestination();
    synthRef.current.volume.value = -8;

    return () => {
      stopSequence();
      if (synthRef.current) {
        synthRef.current.dispose();
      }
    };
  }, []);

  const getSourceData = () => {
    if (category === 'I') return progressionDataI;
    if (category === 'IV') return progressionDataIV;
    return progressionDataMix;
  };

  const setQuestion = (data, pool, index) => {
    stopSequence();
    setIsRevealed(false);

    if (pool.length === 0) return;

    let nextIndex = index;
    // プールを一周したら再シャッフル（簡易実装：ここでは最初の問題に戻るか、シャッフルし直す）
    if (nextIndex >= pool.length) {
      nextIndex = 0;
      // 厳密にはここで再シャッフルすべきだが、一旦プールをリセットする
      const shuffledIndices = [...pool];
      for (let i = shuffledIndices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledIndices[i], shuffledIndices[j]] = [shuffledIndices[j], shuffledIndices[i]];
      }
      setCurrentPool(shuffledIndices);
      setCurrentPoolIndex(0);
      setCurrentQuestion(data[shuffledIndices[0]]);
      return;
    }

    setCurrentQuestion(data[pool[nextIndex]]);
  };

  const handleNext = () => {
    const nextIndex = currentPoolIndex + 1;
    setCurrentPoolIndex(nextIndex);
    setQuestion(getSourceData(), currentPool, nextIndex);
  };

  const stopSequence = () => {
    Tone.Transport.stop();
    Tone.Transport.cancel();
    setIsPlaying(false);
  };

  const startSequence = async () => {
    await Tone.start(); // 自動再生制限の回避

    if (isPlaying) {
      stopSequence();
      return;
    }

    setIsPlaying(true);
    Tone.Transport.bpm.value = 85;

    if (!currentQuestion) return;
    
    const chords = currentQuestion.notes;
    let step = 0;

    Tone.Transport.scheduleRepeat((time) => {
      const currentChord = chords[step % chords.length];
      if (synthRef.current) {
        synthRef.current.triggerAttackRelease(currentChord, "1m - 0.15", time);
      }
      step++;
    }, "1m");

    Tone.Transport.start();
  };

  const toggleReveal = () => {
    setIsRevealed(true);
  };

  const degreeToChordC = (degree) => {
    const parts = degree.split('/');
    
    const mapRomanToNote = (roman) => {
      const map = {
        'bVII': 'Bb', 'bVI': 'Ab', 'bIII': 'Eb', 'bII': 'Db', 'bV': 'Gb',
        '#VII': 'B#', '#VI': 'A#', '#IV': 'F#', '#II': 'D#', '#I': 'C#',
        'VII': 'B', 'VI': 'A', 'IV': 'F', 'III': 'E', 'II': 'D', 'V': 'G', 'I': 'C'
      };
      for (const key of Object.keys(map)) {
        if (roman.startsWith(key)) {
          return { note: map[key], rest: roman.slice(key.length) };
        }
      }
      return { note: roman, rest: '' };
    };

    const parseChord = (romanChord) => {
      const { note, rest } = mapRomanToNote(romanChord);
      return note + rest;
    };

    const parsedChord = parseChord(parts[0]);
    if (parts.length > 1) {
      const { note: bassNote } = mapRomanToNote(parts[1]);
      return `${parsedChord}/${bassNote}`;
    }
    return parsedChord;
  };

  return (
    <div className="page animate-fade-in" style={{ paddingBottom: '100px' }}>
      <div className="page__header" style={{ textAlign: 'center', marginBottom: '24px' }}>
        <h1 className="page__title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: 'var(--accent-blue)' }}>
          <SparklesIcon style={{ width: '28px', height: '28px' }} />
          イヤートレーニング
        </h1>
        <p className="page__subtitle">耳を鍛えて、進行の「引力」を感じ取ろう</p>
      </div>

      <div style={{ maxWidth: '480px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* カテゴリ選択 */}
        <div className="card" style={{ padding: '16px', display: 'flex', justifyContent: 'center', gap: '8px' }}>
          {['I', 'IV', 'Mix'].map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`btn btn--sm ${category === cat ? 'btn--primary' : 'btn--outline'}`}
              style={{ flex: 1 }}
            >
              {cat === 'I' ? 'Ⅰ始まり' : cat === 'IV' ? 'Ⅳ始まり' : 'Mix'}
            </button>
          ))}
        </div>

        {/* 進行状況 */}
        <div style={{ textAlign: 'center', fontSize: '13px', color: 'var(--text-tertiary)' }}>
          問題 {currentPoolIndex + 1} / {currentPool.length} {currentQuestion && `(ID: ${currentQuestion.id})`}
        </div>

        {/* メイン再生エリア */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px', marginTop: '16px' }}>
          <button
            onClick={startSequence}
            style={{
              width: '120px', height: '120px', borderRadius: '50%',
              backgroundColor: isPlaying ? 'var(--accent-red)' : 'var(--accent-blue)',
              color: '#fff',
              border: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: `0 8px 24px ${isPlaying ? 'rgba(255,77,79,0.3)' : 'rgba(59,130,246,0.3)'}`,
              transition: 'all 0.2s ease',
              transform: isPlaying ? 'scale(0.95)' : 'scale(1)'
            }}
          >
            {isPlaying ? <StopIcon style={{ width: '48px', height: '48px' }} /> : <PlayIcon style={{ width: '48px', height: '48px', marginLeft: '6px' }} />}
          </button>

          {/* 出題・解答表示エリア */}
          <div className="card" style={{ width: '100%', minHeight: '160px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', position: 'relative', overflow: 'hidden' }}>
            {currentQuestion ? (
              <>
                <div style={{
                  fontSize: '24px', 
                  fontFamily: 'monospace', 
                  letterSpacing: '4px',
                  fontWeight: 'bold',
                  color: isRevealed ? 'var(--accent-blue)' : 'var(--text-secondary)',
                  marginBottom: '16px',
                  textAlign: 'center',
                  wordBreak: 'break-word'
                }}>
                  {isRevealed 
                    ? currentQuestion.degrees.map(degreeToChordC).join(' - ') 
                    : currentQuestion.degrees.map(() => '??').join(' - ')}
                </div>

                <div style={{
                  opacity: isRevealed ? 1 : 0,
                  transition: 'opacity 0.3s ease',
                  textAlign: 'center',
                  fontSize: '13px',
                  color: 'var(--text-primary)'
                }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>【{currentQuestion.title}】</div>
                  <div style={{ color: 'var(--text-tertiary)' }}>{currentQuestion.memo}</div>
                </div>
              </>
            ) : (
              <div style={{ color: 'var(--text-tertiary)' }}>Loading...</div>
            )}
          </div>
        </div>

        {/* コントロールボタン */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px' }}>
          <button 
            onClick={toggleReveal}
            disabled={isRevealed || !currentQuestion}
            className="btn btn--outline"
            style={{ padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '15px' }}
          >
            <EyeIcon style={{ width: '20px', height: '20px' }} />
            答えを見る
          </button>
          
          <button 
            onClick={handleNext}
            className="btn btn--primary"
            style={{ padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '15px' }}
          >
            <ForwardIcon style={{ width: '20px', height: '20px' }} />
            次の問題へ
          </button>
        </div>

      </div>
    </div>
  );
}
