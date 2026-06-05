import { useState } from 'react';
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  Radar, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';
import useAppStore from '../store/useAppStore';
import { generateAIPrompt } from '../utils/exportPrompt';

const statsSummary = { totalPitchPatterns: 0, totalRhythmPatterns: 0, totalChordProgressions: 0, totalAnalyzed: 0 };
const radarChartData = [
  { axis: '跳躍進行率', original: 60, like: 80, dislike: 40 },
  { axis: 'シンコペーション率', original: 50, like: 90, dislike: 30 },
  { axis: '音符密度', original: 70, like: 60, dislike: 80 },
  { axis: '4小節後半上昇率', original: 80, like: 95, dislike: 20 },
  { axis: '音程の予測不能度', original: 40, like: 70, dislike: 50 },
  { axis: '音価の予測不能度', original: 50, like: 80, dislike: 40 },
  { axis: 'スケール制限度', original: 30, like: 85, dislike: 20 },
  { axis: 'アウフタクト発生率', original: 60, like: 90, dislike: 30 },
];
const histogramData = [
  { pitch: 'Do', original: 20, like: 25, dislike: 15 },
  { pitch: 'Do#', original: 2, like: 1, dislike: 5 },
  { pitch: 'Re', original: 15, like: 10, dislike: 20 },
  { pitch: 'Re#', original: 1, like: 0, dislike: 8 },
  { pitch: 'Mi', original: 18, like: 20, dislike: 10 },
  { pitch: 'Fa', original: 5, like: 15, dislike: 5 },
  { pitch: 'Fa#', original: 0, like: 5, dislike: 10 },
  { pitch: 'Sol', original: 25, like: 20, dislike: 15 },
  { pitch: 'Sol#', original: 1, like: 0, dislike: 2 },
  { pitch: 'La', original: 10, like: 5, dislike: 8 },
  { pitch: 'La#', original: 0, like: 1, dislike: 5 },
  { pitch: 'Si', original: 3, like: 0, dislike: 2 },
];
const aiPrescriptionText = "AIによる分析結果はまだありません。";

const COLORS = {
  original: '#d13bc7', // ネオンパープル
  like: '#00e5ff',     // シアン
  dislike: '#4d4d4d',  // ダークグレー
};

function StatsCards() {
  const items = [
    { label: 'ピッチパターン', value: statsSummary.totalPitchPatterns },
    { label: 'リズムパターン', value: statsSummary.totalRhythmPatterns },
    { label: 'コード進行', value: statsSummary.totalChordProgressions },
    { label: '総分析数', value: statsSummary.totalAnalyzed },
  ];

  return (
    <div className="grid-4-dashboard">
      {items.map((item) => (
        <div className="card stat-card" key={item.label}>
          <span className="stat-card__value">{item.value}</span>
          <span className="stat-card__label">{item.label}</span>
        </div>
      ))}
    </div>
  );
}

function RadarChartPanel() {
  return (
    <div className="card">
      <div className="card__header">
        <span className="card__title">メロディ特徴レーダー</span>
        <span className="card__subtitle">8軸比較: Original vs Like vs Dislike</span>
      </div>
      <ResponsiveContainer width="100%" height={400}>
        <RadarChart data={radarChartData} outerRadius="70%">
          <PolarGrid stroke="#e9e9e7" />
          <PolarAngleAxis
            dataKey="axis"
            tick={{ fontSize: 11, fill: '#787774' }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            tick={{ fontSize: 10, fill: '#b4b4b0' }}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#fff', 
              border: '1px solid #e9e9e7', 
              borderRadius: '8px',
              fontSize: '12px' 
            }} 
          />
          <Radar
            name="Original"
            dataKey="original"
            stroke={COLORS.original}
            fill={COLORS.original}
            fillOpacity={0.4}
            strokeWidth={2}
          />
          <Radar
            name="Like"
            dataKey="like"
            stroke={COLORS.like}
            fill={COLORS.like}
            fillOpacity={0.4}
            strokeWidth={2}
          />
          <Radar
            name="Dislike"
            dataKey="dislike"
            stroke={COLORS.dislike}
            fill={COLORS.dislike}
            fillOpacity={0.2}
            strokeWidth={1}
            strokeDasharray="4 4"
          />
          <Legend
            wrapperStyle={{ fontSize: '12px', color: '#787774', paddingTop: '10px' }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

function HistogramPanel() {
  return (
    <div className="card">
      <div className="card__header">
        <span className="card__title">ピッチクラス分布</span>
        <span className="card__subtitle">全体に占める各音程の割合（%）</span>
      </div>
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={histogramData} barGap={2} barSize={14}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e9e9e7" vertical={false} />
          <XAxis
            dataKey="pitch"
            tick={{ fontSize: 11, fill: '#787774' }}
            axisLine={{ stroke: '#e9e9e7' }}
            tickLine={false}
          />
          <YAxis
            tickFormatter={(tick) => `${tick}%`}
            tick={{ fontSize: 11, fill: '#b4b4b0' }}
            axisLine={false}
            tickLine={false}
            domain={[0, 50]}
          />
          <Tooltip
            formatter={(value) => `${value}%`}
            contentStyle={{
              fontSize: '12px',
              border: '1px solid #e9e9e7',
              borderRadius: '6px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            }}
          />
          <Bar dataKey="original" name="Original" fill={COLORS.original} radius={[3, 3, 0, 0]} />
          <Bar dataKey="like" name="Like" fill={COLORS.like} radius={[3, 3, 0, 0]} />
          <Bar dataKey="dislike" name="Dislike" fill={COLORS.dislike} radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function MetricsReferencePanel() {
  const { pitchPatterns, rhythmPatterns } = useAppStore();
  const [copied, setCopied] = useState(false);

  const handleCopyPrompt = () => {
    const promptText = generateAIPrompt({
      radarData: radarChartData,
      pitchPatterns,
      rhythmPatterns,
    });
    
    navigator.clipboard.writeText(promptText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const metrics = [
    { name: '跳躍進行率', desc: 'メロディが隣の音へ進まず、離れた音へジャンプする割合。感情の起伏やフックの強さを表す。' },
    { name: 'シンコペーション率', desc: '拍の頭ではなく、裏拍や食い気味で発音される割合。ノリや疾走感を表す。' },
    { name: '音符密度（早口度）', desc: '1小節あたりに詰め込まれている音符の数。言葉の詰まり具合や勢いを表す。' },
    { name: '4小節後半上昇率', desc: '4小節単位のフレーズで、後半に向けて音高が上がっていく割合。J-POP特有のサビの盛り上がり（カタルシス）の強さを表す。' },
    { name: '音程の予測不能度', desc: '情報エントロピーを用いた、使用される音高の乱雑さ。低いと単調、高いと予測不能なメロディになる。' },
    { name: '音価の予測不能度', desc: 'リズム（音の長さ）の乱雑さ。付点や3連符などが混ざるほど高くなり、変化に富む。' },
    { name: 'スケール制限度', desc: '特定の音（ファやシなど）をあえて使わない割合。「四六抜き」などの引き算の美学によるキャッチーさを表す。' },
    { name: 'アウフタクト発生率', desc: 'フレーズが小節の頭より前から食い気味に始まる（弱起）割合。メロディの推進力やドライブ感を表す。' },
  ];

  return (
    <div className="card grid-full">
      <div className="card__header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="card__title">指標リファレンス ＆ エクスポート</span>
          <span className="badge badge--blue">LLM連携</span>
        </div>
        <button 
          className="btn btn--lg btn--primary" 
          onClick={handleCopyPrompt}
          style={{
            background: copied ? 'var(--accent-blue)' : 'var(--bg-primary)',
            color: copied ? '#fff' : 'var(--text-primary)',
            border: '1px solid var(--border-default)',
            transition: 'all var(--transition-fast)'
          }}
        >
          {copied ? '✅ コピー完了！' : '🤖 AIプロンプトをコピー'}
        </button>
      </div>
      <div className="metrics-ref-list">
        {metrics.map((m) => (
          <div key={m.name} className="metrics-ref-item">
            <span className="metrics-ref-term">{m.name}</span>
            <span className="metrics-ref-desc">{m.desc}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Dashboard() {
  return (
    <div className="page animate-fade-in">
      <div className="page__header">
        <h1 className="page__title">ダッシュボード</h1>
        <p className="page__subtitle">ストックデータの統計比較とAIからの作曲処方箋</p>
      </div>

      <StatsCards />

      <div className="grid-2 dashboard-charts">
        <RadarChartPanel />
        <HistogramPanel />
      </div>

      <MetricsReferencePanel />
    </div>
  );
}
