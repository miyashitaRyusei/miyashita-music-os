import { useMemo, useState } from 'react';
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  Radar, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell
} from 'recharts';
import { HomeIcon, SparklesIcon, CheckCircleIcon, ChevronDownIcon, ChevronRightIcon, LightBulbIcon } from '@heroicons/react/24/outline';
import useAppStore from '../store/useAppStore';
import { generateAIPrompt } from '../utils/exportPrompt';
import { calculateMetrics } from '../utils/metricsCalculator';
import AdvancedMetricsPanel from '../components/dashboard/AdvancedMetricsPanel';

const COLORS = {
  original: '#facc15', // イエロー系 (自作曲) - 赤と青に重なっても埋もれない色
  like: '#ff4d4f',     // レッド系 (好き)
  dislike: '#3b82f6',  // ブルー系 (嫌い)
};

const PIE_COLORS = ['#facc15', '#ff4d4f', '#3b82f6', '#10b981', '#f5a623', '#8b5cf6'];

function StatsCards({ statsSummary }) {
  const items = [
    { label: 'ピッチパターン', value: statsSummary.totalPitchPatterns },
    { label: 'リズムパターン', value: statsSummary.totalRhythmPatterns },
    { label: 'コード進行', value: statsSummary.totalChordProgressions },
    { label: '総ストック数', value: statsSummary.totalAnalyzed },
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

function RadarChartPanel({ radarChartData }) {
  return (
    <div className="card">
      <div className="card__header">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span className="card__title">メロディ特徴レーダー</span>
          <span className="card__subtitle">8軸比較: 自作曲 vs 好き vs 嫌い</span>
        </div>
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
            name="自作曲"
            dataKey="自作曲"
            stroke={COLORS.original}
            fill={COLORS.original}
            fillOpacity={0.4}
            strokeWidth={2}
          />
          <Radar
            name="好き"
            dataKey="好き"
            stroke={COLORS.like}
            fill={COLORS.like}
            fillOpacity={0.4}
            strokeWidth={2}
          />
          <Radar
            name="嫌い"
            dataKey="嫌い"
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

function HistogramPanel({ histogramData }) {
  return (
    <div className="card">
      <div className="card__header">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span className="card__title">ピッチクラス分布</span>
          <span className="card__subtitle">全体に占める各音程の割合（%）</span>
        </div>
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
          <Bar dataKey="original" name="自作曲" fill={COLORS.original} radius={[3, 3, 0, 0]} />
          <Bar dataKey="like" name="好き" fill={COLORS.like} radius={[3, 3, 0, 0]} />
          <Bar dataKey="dislike" name="嫌い" fill={COLORS.dislike} radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function SectionDistributionPanel({ sectionData }) {
  return (
    <div className="card">
      <div className="card__header">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span className="card__title">セクション分布</span>
          <span className="card__subtitle">登録されているパターンの割合</span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Pie
            data={sectionData}
            innerRadius={60}
            outerRadius={80}
            paddingAngle={2}
            dataKey="value"
          >
            {sectionData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip 
            formatter={(value) => `${value}件`}
            contentStyle={{ borderRadius: '8px', border: '1px solid #e9e9e7', fontSize: '12px' }}
          />
          <Legend wrapperStyle={{ fontSize: '11px', color: '#787774' }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

function ChordStatsPanel({ topChords, nonDiatonicRate }) {
  return (
    <div className="card">
      <div className="card__header">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span className="card__title">コード進行の特徴</span>
          <span className="card__subtitle">よく使われるコードとノンダイアトニック率</span>
        </div>
      </div>
      <div style={{ marginTop: '16px' }}>
        <h4 style={{ fontSize: '12px', color: '#787774', marginBottom: '8px' }}>頻出コード トップ5</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {topChords.map((chord, i) => (
            <div key={chord.chord} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fafaf9', padding: '8px 12px', borderRadius: '6px' }}>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{i + 1}. {chord.chord}</span>
              <span style={{ color: 'var(--text-tertiary)', fontSize: '13px' }}>{chord.count}回</span>
            </div>
          ))}
          {topChords.length === 0 && <div style={{ color: 'var(--text-tertiary)', fontSize: '13px' }}>データがありません</div>}
        </div>
      </div>
      <div style={{ marginTop: '24px' }}>
        <h4 style={{ fontSize: '12px', color: '#787774', marginBottom: '8px' }}>ノンダイアトニック率 (目安)</h4>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ flex: 1, background: '#e9e9e7', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ width: `${nonDiatonicRate}%`, background: COLORS.like, height: '100%' }} />
          </div>
          <span style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>{nonDiatonicRate}%</span>
        </div>
      </div>
    </div>
  );
}

function SongTrendsPanel({ bpmData, topKeys }) {
  return (
    <div className="card">
      <div className="card__header">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span className="card__title">楽曲トレンド (BPM / Key)</span>
          <span className="card__subtitle">登録された楽曲データから分析</span>
        </div>
      </div>
      <div style={{ marginTop: '16px', display: 'flex', gap: '24px' }}>
        <div style={{ flex: 1 }}>
          <h4 style={{ fontSize: '12px', color: '#787774', marginBottom: '8px' }}>頻出キー トップ3</h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {topKeys.slice(0, 3).map((k) => (
              <span key={k.key} className="badge badge--orange">{k.key} ({k.count})</span>
            ))}
            {topKeys.length === 0 && <span style={{ color: 'var(--text-tertiary)', fontSize: '13px' }}>データなし</span>}
          </div>
        </div>
      </div>
      <div style={{ marginTop: '24px' }}>
        <h4 style={{ fontSize: '12px', color: '#787774', marginBottom: '8px' }}>BPM分布</h4>
        <ResponsiveContainer width="100%" height={150}>
          <BarChart data={bpmData}>
            <XAxis dataKey="range" tick={{ fontSize: 10, fill: '#b4b4b0' }} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={{ borderRadius: '6px', fontSize: '11px' }} />
            <Bar dataKey="count" fill={COLORS.original} radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function MelodyChordHeatmapPanel({ heatmapData, degreeOrder, totalRelations }) {
  const maxCount = Math.max(1, ...heatmapData.flatMap(row => degreeOrder.map(deg => row[deg] || 0)));
  
  return (
    <div className="card grid-full" style={{ overflowX: 'auto' }}>
      <div className="card__header">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span className="card__title">メロディ × コード ヒートマップ</span>
          <span className="card__subtitle">コード種別ごとに使われやすいメロディの度数 (総データ数: {totalRelations})</span>
        </div>
      </div>
      <div style={{ marginTop: '16px', minWidth: '800px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: `80px repeat(${degreeOrder.length}, 1fr)`, gap: '2px', marginBottom: '4px' }}>
          <div></div>
          {degreeOrder.map(deg => (
            <div key={deg} style={{ textAlign: 'center', fontSize: '10px', color: '#787774', fontWeight: 'bold' }}>{deg}</div>
          ))}
        </div>
        {heatmapData.map((row) => (
          <div key={row.chordType} style={{ display: 'grid', gridTemplateColumns: `80px repeat(${degreeOrder.length}, 1fr)`, gap: '2px', marginBottom: '2px' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: '8px' }}>
              {row.chordType}
            </div>
            {degreeOrder.map(deg => {
              const val = row[deg] || 0;
              const intensity = val === 0 ? 0 : 0.1 + (val / maxCount) * 0.9;
              return (
                <div 
                  key={deg} 
                  title={`${row.chordType} - ${deg}: ${val}回`}
                  style={{ 
                    height: '24px', 
                    background: `rgba(0, 229, 255, ${intensity})`,
                    borderRadius: '2px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '10px',
                    color: intensity > 0.5 ? '#000' : 'transparent',
                    transition: 'all 0.2s ease',
                    cursor: 'default'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = '#000'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = intensity > 0.5 ? '#000' : 'transparent'; }}
                >
                  {val > 0 ? val : ''}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function MetricsReferencePanel({ 
  pitchPatterns, rhythmPatterns, chordProgressions, melodyChordRelations, 
  radarChartData, sectionData, topChords, nonDiatonicRate, topKeys 
}) {
  const [copied, setCopied] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const handleCopyPrompt = () => {
    const promptText = generateAIPrompt({
      radarData: radarChartData,
      pitchPatterns,
      rhythmPatterns,
      chordProgressions,
      melodyChordRelations,
      sectionData,
      topChords,
      nonDiatonicRate,
      topKeys
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
    { name: 'フレーズ上昇率', desc: 'フレーズの最後に向けて音高が上がっていく割合。J-POP特有のサビの盛り上がり（カタルシス）の強さを表す。' },
    { name: '音程の予測不能度', desc: '情報エントロピーを用いた、使用される音高の乱雑さ。低いと単調、高いと予測不能なメロディになる。' },
    { name: '音価の予測不能度', desc: 'リズム（音の長さ）の乱雑さ。付点や3連符などが混ざるほど高くなり、変化に富む。' },
    { name: 'スケール制限度', desc: '特定の音（ファやシなど）をあえて使わない割合。「四六抜き」などの引き算の美学によるキャッチーさを表す。' },
    { name: 'アウフタクト発生率', desc: 'フレーズが小節の頭より前から食い気味に始まる（弱起）割合。メロディの推進力やドライブ感を表す。' },
  ];

  return (
    <div className="card grid-full">
      <div 
        className="card__header" 
        style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          cursor: 'pointer',
          marginBottom: isOpen ? 'var(--spacing-lg)' : '0'
        }} 
        onClick={() => setIsOpen(!isOpen)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="card__title" style={{ userSelect: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
            指標リファレンス ＆ エクスポート 
            {isOpen ? <ChevronDownIcon style={{ width: '16px', height: '16px' }} /> : <ChevronRightIcon style={{ width: '16px', height: '16px' }} />}
          </span>
          <span className="badge badge--blue">LLM連携</span>
        </div>
        <button 
          className="btn btn--sm btn--primary" 
          onClick={(e) => { e.stopPropagation(); handleCopyPrompt(); }}
          style={{
            background: copied ? 'var(--accent-blue)' : 'var(--bg-primary)',
            color: copied ? '#fff' : 'var(--text-primary)',
            border: '1px solid var(--border-default)',
            transition: 'all var(--transition-fast)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          {copied ? (
            <><CheckCircleIcon style={{ width: '16px', height: '16px' }} /> コピー完了！</>
          ) : (
            <><SparklesIcon style={{ width: '16px', height: '16px' }} /> AIプロンプトをコピー</>
          )}
        </button>
      </div>
      {isOpen && (
        <div className="metrics-ref-list" style={{ marginTop: '16px' }}>
          {metrics.map((m) => (
            <div key={m.name} className="metrics-ref-item">
              <span className="metrics-ref-term" style={{ display: 'flex', alignItems: 'center' }}>
                <LightBulbIcon style={{ width: '16px', height: '16px', color: 'var(--accent-blue)', marginRight: '6px', flexShrink: 0 }} />
                {m.name}
              </span>
              <span className="metrics-ref-desc">{m.desc}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const { pitchPatterns, rhythmPatterns, chordProgressions, melodyChordRelations, musicalPhrases, registeredSongs } = useAppStore();

  const [sectionFilter, setSectionFilter] = useState('all');

  const { 
    histogramData, radarChartData, sectionData, 
    topChords, nonDiatonicRate, bpmData, topKeys,
    heatmapData, degreeOrder, totalRelations, advancedMetrics
  } = useMemo(() => {
    // フィルタリング処理（musicalPhrasesのみ）
    const filteredPhrases = sectionFilter === 'all' 
      ? musicalPhrases 
      : musicalPhrases.filter(p => p.sections && p.sections.includes(sectionFilter));

    return calculateMetrics({ 
      pitchPatterns, rhythmPatterns, chordProgressions, 
      melodyChordRelations, musicalPhrases: filteredPhrases, registeredSongs 
    });
  }, [pitchPatterns, rhythmPatterns, chordProgressions, melodyChordRelations, musicalPhrases, registeredSongs, sectionFilter]);

  // コントラスト分析は「AメロとCメロの両方」が必要なため、常にフィルタリング前のデータを使用する
  const unfilteredAdvancedMetrics = useMemo(() => {
    if (sectionFilter === 'all') return advancedMetrics;
    const res = calculateMetrics({ 
      pitchPatterns: [], rhythmPatterns: [], chordProgressions: [], 
      melodyChordRelations: [], musicalPhrases, registeredSongs 
    });
    return res.advancedMetrics;
  }, [musicalPhrases, registeredSongs, sectionFilter, advancedMetrics]);

  const statsSummary = {
    totalPitchPatterns: pitchPatterns.length,
    totalRhythmPatterns: rhythmPatterns.length,
    totalChordProgressions: chordProgressions.length,
    totalAnalyzed: pitchPatterns.length + rhythmPatterns.length + chordProgressions.length,
    totalPhrases: musicalPhrases.length
  };

  return (
    <div className="page animate-fade-in">
      <div className="page__header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page__title" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <HomeIcon style={{ width: '32px', height: '32px', color: 'var(--accent-blue)' }} />
            ダッシュボード
          </h1>
          <p className="page__subtitle">ストックデータの統計比較とAIからの作曲処方箋</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>分析セクション:</span>
          <select 
            className="input" 
            style={{ padding: '6px 12px', fontSize: '14px', width: 'auto' }}
            value={sectionFilter}
            onChange={e => setSectionFilter(e.target.value)}
          >
            <option value="all">すべて</option>
            <option value="Aメロ">Aメロ</option>
            <option value="Bメロ">Bメロ</option>
            <option value="サビ">サビ</option>
            <option value="Cメロ">Cメロ</option>
          </select>
        </div>
      </div>

      <StatsCards statsSummary={statsSummary} />

      {/* 👑 統合フレーズの高度な分析パネル */}
      <AdvancedMetricsPanel advancedMetrics={advancedMetrics} unfilteredAdvancedMetrics={unfilteredAdvancedMetrics} />

      <div className="grid-2 dashboard-charts" style={{ marginTop: '24px' }}>
        <RadarChartPanel radarChartData={radarChartData} />
        <HistogramPanel histogramData={histogramData} />
      </div>

      <div className="grid-3" style={{ marginTop: '24px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
        <SectionDistributionPanel sectionData={sectionData} />
        <ChordStatsPanel topChords={topChords} nonDiatonicRate={nonDiatonicRate} />
        <SongTrendsPanel bpmData={bpmData} topKeys={topKeys} />
      </div>

      <div style={{ marginTop: '24px' }}>
        <MelodyChordHeatmapPanel heatmapData={heatmapData} degreeOrder={degreeOrder} totalRelations={totalRelations} />
      </div>

      <div style={{ marginTop: '24px' }}>
        <MetricsReferencePanel 
          pitchPatterns={pitchPatterns} 
          rhythmPatterns={rhythmPatterns} 
          chordProgressions={chordProgressions}
          melodyChordRelations={melodyChordRelations}
          radarChartData={radarChartData}
          sectionData={sectionData}
          topChords={topChords}
          nonDiatonicRate={nonDiatonicRate}
          topKeys={topKeys}
        />
      </div>
    </div>
  );
}
