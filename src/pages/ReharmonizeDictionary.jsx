import { useState } from 'react';
import { SparklesIcon } from '@heroicons/react/24/outline';
import { reharmRules } from '../lib/reharmonize/reharmRules';
import { generateReharmCandidates } from '../lib/reharmonize/generateReharmCandidates';

export default function ReharmonizeDictionary() {
  const [inputProgression, setInputProgression] = useState('');
  const [rules, setRules] = useState(reharmRules);
  const [candidates, setCandidates] = useState([]);
  const [errorMsg, setErrorMsg] = useState(null);

  const handleToggleRule = (ruleId) => {
    setRules(rules.map(r => r.id === ruleId ? { ...r, enabled: !r.enabled } : r));
  };

  const handleGenerate = () => {
    setErrorMsg(null);
    setCandidates([]);
    
    if (!inputProgression.trim()) {
      return;
    }

    const { candidates: newCandidates, error } = generateReharmCandidates(inputProgression, rules);
    
    if (error) {
      setErrorMsg(error);
      return;
    }

    setCandidates(newCandidates);
  };

  return (
    <div className="page animate-fade-in" style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
      <div className="page__header">
        <h1 className="page__title" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <SparklesIcon style={{ width: '32px', height: '32px', color: 'var(--accent-blue)' }} />
          リハーモナイズ辞書
        </h1>
        <p className="page__subtitle">
          コード進行を入力すると、登録済みのリハモルールに基づいて候補を生成します。<br />
          まずはKey Cを基準に、セカンダリードミナントなどの基本ルールから試せます。
        </p>
      </div>

      <div style={{ background: 'var(--bg-secondary)', padding: '24px', borderRadius: '12px', marginBottom: '24px', border: '1px solid var(--border-default)' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '16px' }}>コード進行入力</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '8px', display: 'block' }}>Key: C (固定)</label>
            <input 
              type="text" 
              className="input" 
              style={{ width: '100%', fontSize: '16px', padding: '12px', fontFamily: 'monospace' }}
              placeholder="例：C | Am | Dm | G7 | C"
              value={inputProgression}
              onChange={(e) => setInputProgression(e.target.value)}
            />
          </div>

          {errorMsg && (
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '12px', borderRadius: '8px', fontSize: '14px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
              ⚠️ {errorMsg}
            </div>
          )}

          <div>
            <h3 style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '8px' }}>適用するルール</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {rules.map(rule => (
                <label key={rule.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={rule.enabled} 
                    onChange={() => handleToggleRule(rule.id)}
                    style={{ marginTop: '4px' }}
                  />
                  <div>
                    <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{rule.name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{rule.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <button 
            className="btn btn--primary" 
            style={{ padding: '12px', fontSize: '16px', fontWeight: 'bold', justifyContent: 'center' }}
            onClick={handleGenerate}
          >
            ✨ リハモ候補を生成
          </button>
        </div>
      </div>

      <div>
        <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px' }}>候補一覧 ({candidates.length}件)</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {candidates.length === 0 && !errorMsg ? (
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>ここに生成された候補が表示されます。</p>
          ) : (
            candidates.map((cand) => (
              <div key={cand.id} style={{ background: 'var(--bg-secondary)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-default)' }}>
                <div style={{ fontSize: '20px', fontWeight: 'bold', fontFamily: 'monospace', marginBottom: '16px', color: 'var(--accent-orange)' }}>
                  {cand.reharmonizedProgression}
                </div>
                
                <div style={{ background: 'var(--bg-primary)', padding: '12px', borderRadius: '8px', fontSize: '14px' }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '4px', color: 'var(--accent-blue)' }}>Rule: {cand.ruleName}</div>
                  <div style={{ marginBottom: '12px' }}>{cand.description}</div>
                  
                  <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                    <div>💪 強さ: {cand.strength}</div>
                    <div>🏷️ タグ: {cand.tags.join(' / ')}</div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
