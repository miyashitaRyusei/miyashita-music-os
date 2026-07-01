import { useState, useMemo } from 'react';
import { SparklesIcon } from '@heroicons/react/24/outline';
import { reharmRules } from '../lib/reharmonize/reharmRules';
import { generateReharmCandidates } from '../lib/reharmonize/generateReharmCandidates';

export default function ReharmonizeDictionary() {
  const [inputProgression, setInputProgression] = useState('');
  const [rules, setRules] = useState(reharmRules);
  const [candidates, setCandidates] = useState([]);
  const [originalChords, setOriginalChords] = useState([]);
  const [errorMsg, setErrorMsg] = useState(null);
  
  // targetIndex をキーとして、選択された候補のID（または 'original'）を保持する
  const [selectedCandidates, setSelectedCandidates] = useState({});

  const handleToggleRule = (ruleId) => {
    setRules(rules.map(r => r.id === ruleId ? { ...r, enabled: !r.enabled } : r));
  };

  const handleGenerate = () => {
    setErrorMsg(null);
    setCandidates([]);
    setOriginalChords([]);
    setSelectedCandidates({});
    
    if (!inputProgression.trim()) {
      return;
    }

    const { candidates: newCandidates, originalChords: parsedChords, error } = generateReharmCandidates(inputProgression, rules);
    
    if (error) {
      setErrorMsg(error);
      return;
    }

    setCandidates(newCandidates);
    setOriginalChords(parsedChords);

    // デフォルトで全て 'original' を選択状態にする
    const initialSelections = {};
    parsedChords.forEach((_, i) => {
      initialSelections[i] = 'original';
    });
    setSelectedCandidates(initialSelections);
  };

  const handleSelectCandidate = (targetIndex, candidateId) => {
    setSelectedCandidates(prev => ({
      ...prev,
      [targetIndex]: candidateId
    }));
  };

  // 全体プレビューの組み立て
  const previewProgression = useMemo(() => {
    if (originalChords.length === 0) return '';
    
    const parts = [];
    for (let i = 0; i < originalChords.length; i++) {
      const selection = selectedCandidates[i];
      if (selection === 'original' || !selection) {
        parts.push(originalChords[i].original);
      } else {
        const cand = candidates.find(c => c.id === selection);
        if (cand) {
          parts.push(...cand.candidateChords);
        } else {
          parts.push(originalChords[i].original);
        }
      }
    }
    return parts.join(' | ');
  }, [originalChords, candidates, selectedCandidates]);

  // 各indexごとの候補をグループ化
  const groupedCandidates = useMemo(() => {
    const groups = {};
    originalChords.forEach((_, i) => {
      groups[i] = [];
    });
    candidates.forEach(cand => {
      if (groups[cand.targetIndex]) {
        groups[cand.targetIndex].push(cand);
      }
    });
    return groups;
  }, [candidates, originalChords]);

  return (
    <div className="page animate-fade-in" style={{ padding: '24px', maxWidth: '800px', margin: '0 auto', paddingBottom: '80px' }}>
      <div className="page__header">
        <h1 className="page__title" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <SparklesIcon style={{ width: '32px', height: '32px', color: 'var(--accent-blue)' }} />
          リハーモナイズ辞書
        </h1>
        <p className="page__subtitle">
          コード進行を入力すると、登録済みのリハモルールに基づいて候補を生成します。<br />
          各コードごとに候補を選んで、新しい進行を作ってみましょう！
        </p>
      </div>

      {/* プレビューエリア */}
      {originalChords.length > 0 && (
        <div style={{ background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(249, 115, 22, 0.1))', padding: '24px', borderRadius: '12px', marginBottom: '24px', border: '1px solid var(--accent-orange)' }}>
          <h2 style={{ fontSize: '14px', color: 'var(--accent-orange)', fontWeight: 'bold', marginBottom: '12px' }}>✨ 全体プレビュー</h2>
          <div style={{ fontSize: '24px', fontWeight: 'bold', fontFamily: 'monospace', color: 'var(--text-primary)', wordBreak: 'break-all' }}>
            {previewProgression}
          </div>
        </div>
      )}

      {/* 入力エリア */}
      <div style={{ background: 'var(--bg-secondary)', padding: '24px', borderRadius: '12px', marginBottom: '32px', border: '1px solid var(--border-default)' }}>
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

      {/* 候補選択エリア */}
      {originalChords.length > 0 && (
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px' }}>候補を選択してカスタマイズ</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {originalChords.map((chord, i) => {
              const cands = groupedCandidates[i] || [];
              const hasCandidates = cands.length > 0;

              return (
                <div key={i} style={{ background: 'var(--bg-secondary)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-default)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                    <span style={{ background: 'var(--bg-primary)', color: 'var(--text-secondary)', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>
                      Position {i + 1}
                    </span>
                    <span style={{ fontSize: '18px', fontWeight: 'bold', fontFamily: 'monospace' }}>
                      {chord.original}
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {/* オリジナル選択肢 */}
                    <label 
                      style={{ 
                        display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '12px', 
                        borderRadius: '8px', border: selectedCandidates[i] === 'original' ? '2px solid var(--accent-blue)' : '1px solid var(--border-default)',
                        background: selectedCandidates[i] === 'original' ? 'rgba(59, 130, 246, 0.05)' : 'transparent',
                        cursor: 'pointer'
                      }}
                    >
                      <input 
                        type="radio" 
                        name={`pos-${i}`} 
                        checked={selectedCandidates[i] === 'original'} 
                        onChange={() => handleSelectCandidate(i, 'original')}
                        style={{ marginTop: '4px' }}
                      />
                      <div>
                        <div style={{ fontWeight: 'bold', fontFamily: 'monospace', fontSize: '16px' }}>{chord.original}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>オリジナルのまま</div>
                      </div>
                    </label>

                    {/* リハモ候補選択肢 */}
                    {cands.map(cand => (
                      <label 
                        key={cand.id}
                        style={{ 
                          display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '12px', 
                          borderRadius: '8px', border: selectedCandidates[i] === cand.id ? '2px solid var(--accent-orange)' : '1px solid var(--border-default)',
                          background: selectedCandidates[i] === cand.id ? 'rgba(249, 115, 22, 0.05)' : 'transparent',
                          cursor: 'pointer'
                        }}
                      >
                        <input 
                          type="radio" 
                          name={`pos-${i}`} 
                          checked={selectedCandidates[i] === cand.id} 
                          onChange={() => handleSelectCandidate(i, cand.id)}
                          style={{ marginTop: '4px' }}
                        />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 'bold', fontFamily: 'monospace', fontSize: '16px', color: 'var(--accent-orange)' }}>
                            {cand.displayText}
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--accent-blue)', marginTop: '4px', fontWeight: 'bold' }}>
                            {cand.ruleName}
                          </div>
                          <div style={{ fontSize: '13px', color: 'var(--text-primary)', marginTop: '4px' }}>
                            {cand.description}
                          </div>
                          <div style={{ display: 'flex', gap: '12px', fontSize: '11px', color: 'var(--text-secondary)', marginTop: '8px' }}>
                            <span>💪 強さ: {cand.strength}</span>
                            <span>🏷️ {cand.tags.join(' / ')}</span>
                          </div>
                        </div>
                      </label>
                    ))}
                    
                    {!hasCandidates && (
                      <div style={{ padding: '8px 12px', fontSize: '13px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                        ※この位置に適用可能なリハモ候補はありません
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
