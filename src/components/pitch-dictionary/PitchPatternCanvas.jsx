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

export default function PitchPatternCanvas({ degrees = [], height = 80 }) {
  const values = degrees.map(degreeToValue);
  const minVal = values.length > 0 ? Math.min(...values) : 0;
  const maxVal = values.length > 0 ? Math.max(...values) : 0;
  const range = maxVal - minVal;
  
  const SVG_WIDTH = 400;
  const SVG_HEIGHT = height;
  const PADDING_X = 30;
  const PADDING_Y = 20;

  // X座標の計算（等間隔）
  const getX = (index) => {
    if (values.length <= 1) return SVG_WIDTH / 2;
    return PADDING_X + (index / (values.length - 1)) * (SVG_WIDTH - PADDING_X * 2);
  };

  // Y座標の計算（値の絶対的な上下関係を維持するため、最低14半音分のスケールを確保）
  const minRange = 14; 
  const effectiveRange = Math.max(range, minRange);
  
  const getY = (val) => {
    if (values.length === 0) return SVG_HEIGHT / 2;
    const centerVal = (minVal + maxVal) / 2;
    const normalized = (val - centerVal) / effectiveRange;
    // 上がマイナスなので引く
    return SVG_HEIGHT / 2 - normalized * (SVG_HEIGHT - PADDING_Y * 2);
  };

  const points = values.map((val, i) => `${getX(i)},${getY(val)}`).join(' ');

  return (
    <svg viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`} className="pitch-sparkline" style={{ width: '100%', height: `${height}px`, display: 'block' }}>
      {/* 背景のグリッド線（中央） */}
      <line x1="0" y1={SVG_HEIGHT/2} x2={SVG_WIDTH} y2={SVG_HEIGHT/2} className="pitch-sparkline__grid" stroke="var(--border-default)" strokeDasharray="4 4" />

      {/* 折れ線 */}
      <polyline points={points} className="pitch-sparkline__line" style={{ strokeWidth: 3, fill: 'none', stroke: 'var(--text-placeholder)' }} />
      
      {/* プロット点と音名ラベル */}
      {values.map((val, i) => {
        const degreeStr = degrees[i] || '';
        const isNonDiatonic = degreeStr.includes('#') || degreeStr.includes('b');
        const pointColor = isNonDiatonic ? 'var(--accent-orange)' : '#0ea5e9';
        const textColor = isNonDiatonic ? 'var(--accent-orange)' : 'var(--text-secondary)';
        
        return (
          <g key={i}>
            <circle cx={getX(i)} cy={getY(val)} r="4" 
              className="pitch-sparkline__point" 
              style={{ stroke: pointColor, fill: 'var(--bg-primary)', strokeWidth: 2 }}
            />
            <text 
              x={getX(i)} 
              y={getY(val) + (val >= (maxVal + minVal) / 2 ? 16 : -10)} // 上下位置の調整
              className={`pitch-sparkline__label ${isNonDiatonic ? 'pitch-sparkline__label--nondiatonic' : ''}`}
              textAnchor="middle"
              style={{ fill: textColor, fontWeight: isNonDiatonic ? 'bold' : 'normal', fontSize: '12px', userSelect: 'none' }}
            >
              {degreeStr}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
