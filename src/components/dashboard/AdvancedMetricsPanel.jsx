import { SparklesIcon, FireIcon, HandRaisedIcon } from '@heroicons/react/24/outline';

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

export default function AdvancedMetricsPanel({ advancedMetrics }) {
  if (!advancedMetrics) return null;

  const { original, like, dislike } = advancedMetrics;

  return (
    <div style={{ marginTop: '24px', display: 'flex', flexWrap: 'wrap', gap: '24px' }}>
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
  );
}
