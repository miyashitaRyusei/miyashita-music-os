import { useState, useEffect } from 'react';
import useAppStore from '../../store/useAppStore';

const LOADING_TEXTS = [
  '🎼 MIDIデータをパース中...',
  '🧬 リファレンス曲のDNAとアライメントを計算中 (DTW)...',
  '✨ 手癖のN-gramを抽出中...',
  '🧠 音楽理論に基づく処方箋を生成中...',
  '🎶 データを可視化の準備をしています...',
];

export default function LoadingOverlay() {
  const isAnalyzing = useAppStore((s) => s.isAnalyzing);
  const [textIndex, setTextIndex] = useState(0);

  // テキストの切り替えロジック
  useEffect(() => {
    let intervalId;
    if (isAnalyzing) {
      intervalId = setInterval(() => {
        setTextIndex((prev) => (prev + 1) % LOADING_TEXTS.length);
      }, 2500); // 2.5秒間隔で切り替え
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isAnalyzing]);

  if (!isAnalyzing) return null;

  return (
    <div className="loading-overlay">
      <div className="loading-overlay__content">
        {/* オーディオ波形風のアニメーション */}
        <div className="audio-wave">
          <span className="audio-wave__bar"></span>
          <span className="audio-wave__bar"></span>
          <span className="audio-wave__bar"></span>
          <span className="audio-wave__bar"></span>
          <span className="audio-wave__bar"></span>
        </div>
        
        {/* 切り替わるテキスト */}
        <p className="loading-overlay__text animate-fade-in-up" key={textIndex}>
          {LOADING_TEXTS[textIndex]}
        </p>
      </div>
    </div>
  );
}
