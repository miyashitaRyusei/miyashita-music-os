import { SparklesIcon, FireIcon, HandRaisedIcon, ArrowsUpDownIcon, MusicalNoteIcon } from '@heroicons/react/24/outline';
import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = {
  original: '#facc15', // 自作曲
  like: '#ff4d4f',     // 好き
  dislike: '#3b82f6',  // 嫌い
};

// ユーティリティ：度数カウントをランキング化
const getRanking = (countsObj, limit = 3) => {
  const total = Object.values(countsObj).reduce((sum, c) => sum + c, 0);
  if (total === 0) return [];
  
  return Object.entries(countsObj)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([item, count]) => ({
      item,
      count,
      percentage: Math.round((count / total) * 100)
    }));
};

function RankingList({ title, icon: Icon, original, like, dislike }) {
  const origRank = getRanking(original);
  const likeRank = getRanking(like);
  const dislikeRank = getRanking(dislike);

  return (
    <div className="card" style={{ flex: 1, minWidth: '300px' }}>
      <div className="card__header">
        <h3 className="card__title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Icon style={{ width: '20px', height: '20px', color: 'var(--accent-blue)' }} />
          {title}
        </h3>
      </div>
      
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
        {/* 自作曲 */}
        <div style={{ flex: 1, minWidth: '80px' }}>
          <div style={{ fontSize: '12px', color: COLORS.original, fontWeight: 'bold', marginBottom: '8px' }}>自作曲</div>
          {origRank.length > 0 ? origRank.map((r, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
              <span>{i+1}. {r.item}</span>
              <span style={{ color: 'var(--text-secondary)' }}>{r.percentage}%</span>
            </div>
          )) : <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>データなし</div>}
        </div>
        
        {/* 好き */}
        <div style={{ flex: 1, minWidth: '80px' }}>
          <div style={{ fontSize: '12px', color: COLORS.like, fontWeight: 'bold', marginBottom: '8px' }}>好き</div>
          {likeRank.length > 0 ? likeRank.map((r, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
              <span>{i+1}. {r.item}</span>
              <span style={{ color: 'var(--text-secondary)' }}>{r.percentage}%</span>
            </div>
          )) : <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>データなし</div>}
        </div>
        
        {/* 嫌い */}
        <div style={{ flex: 1, minWidth: '80px' }}>
          <div style={{ fontSize: '12px', color: COLORS.dislike, fontWeight: 'bold', marginBottom: '8px' }}>嫌い</div>
          {dislikeRank.length > 0 ? dislikeRank.map((r, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
              <span>{i+1}. {r.item}</span>
              <span style={{ color: 'var(--text-secondary)' }}>{r.percentage}%</span>
            </div>
          )) : <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>データなし</div>}
        </div>
      </div>
    </div>
  );
}

const DiffTable = ({ items, type }) => {
  if (items.length === 0) {
    return <p style={{ fontSize: '13px', color: 'var(--text-secondary)', padding: '16px' }}>特筆すべき差分は見つかりませんでした。</p>;
  }
  return (
    <table style={{ width: '100%', fontSize: '13px', textAlign: 'left', borderCollapse: 'collapse', marginTop: '8px' }}>
      <thead>
        <tr style={{ borderBottom: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}>
          <th style={{ padding: '8px', fontWeight: 'normal' }}>カテゴリ</th>
          <th style={{ padding: '8px', fontWeight: 'normal' }}>要素</th>
          <th style={{ padding: '8px', fontWeight: 'normal' }}>自作曲</th>
          <th style={{ padding: '8px', fontWeight: 'normal' }}>好きな曲</th>
          <th style={{ padding: '8px', fontWeight: 'normal' }}>差分</th>
        </tr>
      </thead>
      <tbody>
        {items.map((h, i) => (
          <tr key={i} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
            <td style={{ padding: '8px' }}>{h.category}</td>
            <td style={{ padding: '8px', fontWeight: 'bold' }}>{h.item}</td>
            <td style={{ padding: '8px', color: COLORS.original }}>{h.original}%</td>
            <td style={{ padding: '8px', color: COLORS.like }}>{h.like}%</td>
            <td style={{ padding: '8px', color: type === 'habit' ? 'var(--accent-red)' : 'var(--accent-green)', fontWeight: 'bold' }}>
              {h.diff > 0 ? '+' : ''}{h.diff}%
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

function InsightsPanel({ original, like }) {
  const getPercentages = (countsObj) => {
    const total = Object.values(countsObj).reduce((sum, c) => sum + c, 0);
    if (total === 0) return {};
    const pct = {};
    for (const [k, v] of Object.entries(countsObj)) {
      pct[k] = (v / total) * 100;
    }
    return pct;
  };

  const calculateDiffs = (origCounts, likeCounts, categoryName) => {
    const origPct = getPercentages(origCounts);
    const likePct = getPercentages(likeCounts);
    const allKeys = new Set([...Object.keys(origPct), ...Object.keys(likePct)]);
    
    const diffs = [];
    allKeys.forEach(k => {
      const o = origPct[k] || 0;
      const l = likePct[k] || 0;
      diffs.push({ item: k, original: Math.round(o), like: Math.round(l), diff: Math.round(l - o), category: categoryName });
    });
    return diffs;
  };

  const climaxDiffs = calculateDiffs(original.climaxDegree, like.climaxDegree, '最高音');
  const cadenceDiffs = calculateDiffs(original.cadenceDegree, like.cadenceDegree, '終止音');
  const relDiffs = calculateDiffs(original.melodyChordDegrees, like.melodyChordDegrees, 'メロ×コード');
  const rhythmDiffs = calculateDiffs(original.rhythmPositions, like.rhythmPositions, 'リズム配置');

  const allDiffs = [...climaxDiffs, ...cadenceDiffs, ...relDiffs, ...rhythmDiffs];

  // 手癖: 自作曲の方が圧倒的に多いもの (Original > Like)
  const habits = allDiffs
    .filter(d => d.diff < -5)
    .sort((a, b) => a.diff - b.diff)
    .slice(0, 3);

  // 改善ポイント: 好きな曲の方が圧倒的に多いもの (Like > Original)
  const improvements = allDiffs
    .filter(d => d.diff > 5)
    .sort((a, b) => b.diff - a.diff)
    .slice(0, 3);

  if (habits.length === 0 && improvements.length === 0) return null;

  if (habits.length === 0 && improvements.length === 0) return null;

  return (
    <div className="card" style={{ borderLeft: '4px solid var(--accent-orange)' }}>
      <div className="card__header">
        <h3 className="card__title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <SparklesIcon style={{ width: '20px', height: '20px', color: 'var(--accent-orange)' }} />
          AI分析インサイト：あなたの「手癖」と「差分」
        </h3>
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>自作曲と好きな曲の構造を比較して、無意識の癖や取り入れるべき要素を抽出しました。</p>
      </div>

      <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', marginTop: '16px' }}>
        <div style={{ flex: 1, minWidth: '300px', background: 'var(--bg-secondary)', padding: '16px', borderRadius: '8px' }}>
          <h4 style={{ fontSize: '14px', fontWeight: 'bold', color: COLORS.original, marginBottom: '8px' }}>
            ⚠️ あなたの手癖（自作曲に多すぎる要素）
          </h4>
          <DiffTable items={habits} type="habit" />
        </div>

        <div style={{ flex: 1, minWidth: '300px', background: 'var(--bg-secondary)', padding: '16px', borderRadius: '8px' }}>
          <h4 style={{ fontSize: '14px', fontWeight: 'bold', color: COLORS.like, marginBottom: '8px' }}>
            💡 改善のヒント（好きな曲がよく使う要素）
          </h4>
          <DiffTable items={improvements} type="improvement" />
        </div>
      </div>
    </div>
  );
}

function EnergyCurvePanel({ original, like }) {
  const [activeTab, setActiveTab] = useState('pitch');

  const tabs = [
    { id: 'pitch', label: '音高 (Pitch)', dataKey: 'pitch', unit: '', domain: ['dataMin - 2', 'dataMax + 2'] },
    { id: 'density', label: '音数 (Density)', dataKey: 'density', unit: ' notes/beat', domain: [0, 'dataMax + 1'] },
    { id: 'syncopation', label: 'リズム (Syncopation)', dataKey: 'syncopation', unit: '%', domain: [0, 100] }
  ];

  const activeTabData = tabs.find(t => t.id === activeTab);

  // original と like のデータをマージして Recharts 用に整形
  const chartData = ['Aメロ', 'Bメロ', 'Cメロ'].map(sec => {
    const origData = original.energyCurve?.find(d => d.section === sec) || {};
    const likeData = like.energyCurve?.find(d => d.section === sec) || {};
    return {
      name: sec,
      original: origData[activeTab],
      like: likeData[activeTab],
    };
  });

  return (
    <div className="card" style={{ flex: 1, minWidth: '300px' }}>
      <h3 className="card__title" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <ArrowsUpDownIcon style={{ width: '18px', height: '18px', color: 'var(--accent-blue)' }} />
        エネルギー曲線 (Energy Curve)
      </h3>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '1px solid var(--border-default)', paddingBottom: '8px' }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '6px 12px',
              border: 'none',
              background: activeTab === tab.id ? 'var(--accent-blue)' : 'transparent',
              color: activeTab === tab.id ? '#fff' : 'var(--text-secondary)',
              borderRadius: '20px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>
      
      <div style={{ width: '100%', height: 250 }}>
        <ResponsiveContainer>
          <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-default)" />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} />
            <YAxis 
              domain={activeTabData.domain} 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} 
              width={40}
            />
            <Tooltip 
              formatter={(value) => [value ? value.toFixed(1) + activeTabData.unit : '-', '']}
              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
            />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
            <Line 
              name="自作曲" 
              type="monotone" 
              dataKey="original" 
              stroke={COLORS.original} 
              strokeWidth={3} 
              dot={{ r: 4, strokeWidth: 2 }} 
              activeDot={{ r: 6 }} 
              connectNulls
            />
            <Line 
              name="好きな曲" 
              type="monotone" 
              dataKey="like" 
              stroke={COLORS.like} 
              strokeWidth={3} 
              dot={{ r: 4, strokeWidth: 2 }} 
              activeDot={{ r: 6 }} 
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '16px' }}>
        ※Aメロ→Bメロ→Cメロ（サビ）にかけての推移を示します。自作曲と好きな曲の「盛り上げ方のクセ」を比較しましょう。
      </p>
    </div>
  );
}

export default function AdvancedMetricsPanel({ advancedMetrics, unfilteredAdvancedMetrics }) {
  if (!advancedMetrics) return null;

  const { original, like, dislike } = advancedMetrics;
  const unfilteredOrig = unfilteredAdvancedMetrics ? unfilteredAdvancedMetrics.original : original;
  const unfilteredLike = unfilteredAdvancedMetrics ? unfilteredAdvancedMetrics.like : like;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginTop: '24px' }}>
      <InsightsPanel original={original} like={like} />

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px' }}>
        <EnergyCurvePanel original={unfilteredOrig} like={unfilteredLike} />
        <RankingList 
          title="リズム配置・重心 (Syncopation)" 
          icon={MusicalNoteIcon} 
          original={original.rhythmPositions} 
          like={like.rhythmPositions} 
          dislike={dislike.rhythmPositions} 
        />
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px' }}>
        <RankingList 
          title="最高音 (Climax) ランキング" 
          icon={FireIcon} 
          original={original.climaxDegree} 
          like={like.climaxDegree} 
          dislike={dislike.climaxDegree} 
        />
        <RankingList 
          title="終止音 (Cadence) ランキング" 
          icon={HandRaisedIcon} 
          original={original.cadenceDegree} 
          like={like.cadenceDegree} 
          dislike={dislike.cadenceDegree} 
        />
        <RankingList 
          title="メロディ×コード相対度数" 
          icon={SparklesIcon} 
          original={original.melodyChordDegrees} 
          like={like.melodyChordDegrees} 
          dislike={dislike.melodyChordDegrees} 
        />
      </div>
    </div>
  );
}
