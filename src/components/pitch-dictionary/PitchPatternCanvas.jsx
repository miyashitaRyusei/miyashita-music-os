// 階名から相対的なピッチ値を計算するヘルパー（Cメジャー基準）
function degreeToValue(degreeStr) {
  const baseMap = {
    'ド': 0, 'ド#': 1, 'レ': 2, 'レ#': 3, 'ミ': 4, 'ファ': 5, 'ファ#': 6,
    'ソ': 7, 'ソ#': 8, 'ラ': 9, 'ラ#': 10, 'シ': 11,
    // 既存データへのフォールバック対応
    'Do': 0, 'Do#': 1, 'Re': 2, 'Re#': 3, 'Mi': 4, 'Fa': 5, 'Fa#': 6,
    'Sol': 7, 'Sol#': 8, 'La': 9, 'La#': 10, 'Si': 11
  };
  
  let name = degreeStr.replace(/[↑↓]/g, '');
  let val = baseMap[name] !== undefined ? baseMap[name] : 0;
  
  // オクターブシフトの計算
  const upCount = (degreeStr.match(/↑/g) || []).length;
  const downCount = (degreeStr.match(/↓/g) || []).length;
  
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

  // Y座標の計算（値の範囲に応じてスケーリング）
  const getY = (val) => {
    if (range === 0) return SVG_HEIGHT / 2;
    // Y軸は上がマイナス（0）なので反転させる
    const normalized = (val - minVal) / range;
    return SVG_HEIGHT - PADDING_Y - normalized * (SVG_HEIGHT - PADDING_Y * 2);
  };

  const points = values.map((val, i) => `${getX(i)},${getY(val)}`).join(' ');

  return (
    <svg viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`} className="pitch-sparkline" style={{ width: '100%', height: `${height}px`, display: 'block' }}>
      {/* 背景のグリッド線（中央） */}
      <line x1="0" y1={SVG_HEIGHT/2} x2={SVG_WIDTH} y2={SVG_HEIGHT/2} className="pitch-sparkline__grid" stroke="var(--border-default)" strokeDasharray="4 4" />

      {/* 折れ線 */}
      <polyline points={points} className="pitch-sparkline__line" style={{ strokeWidth: 3, fill: 'none', stroke: 'var(--accent-primary)' }} />
      
      {/* プロット点と音名ラベル */}
      {values.map((val, i) => {
        const degreeStr = degrees[i] || '';
        const isNonDiatonic = degreeStr.includes('#') || degreeStr.includes('b');
        const color = isNonDiatonic ? 'var(--accent-orange)' : 'var(--accent-primary)';
        
        return (
          <g key={i}>
            <circle cx={getX(i)} cy={getY(val)} r="4" 
              className="pitch-sparkline__point" 
              style={{ stroke: color, fill: 'var(--bg-primary)', strokeWidth: 2 }}
            />
            <text 
              x={getX(i)} 
              y={getY(val) + (val >= (maxVal + minVal) / 2 ? 16 : -10)} // 上下位置の調整
              className={`pitch-sparkline__label ${isNonDiatonic ? 'pitch-sparkline__label--nondiatonic' : ''}`}
              textAnchor="middle"
              style={{ fill: color, fontWeight: isNonDiatonic ? 'bold' : 'normal', fontSize: '12px', userSelect: 'none' }}
            >
              {degreeStr}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
