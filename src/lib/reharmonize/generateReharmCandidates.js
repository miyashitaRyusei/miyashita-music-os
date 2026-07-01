import { parseProgression } from './parseProgression';

/**
 * 
 * @param {string} progressionStr 
 * @param {import('./types').ReharmRule[]} rules 
 * @returns {{ candidates: import('./types').ReharmCandidate[], error: string | null }}
 */
export function generateReharmCandidates(progressionStr, rules) {
  const { chords, error } = parseProgression(progressionStr);
  
  if (error) {
    return { candidates: [], error };
  }

  if (chords.length === 0) {
    return { candidates: [], error: null };
  }

  const enabledRules = rules.filter(r => r.enabled);
  const candidates = [];

  // 各コード位置に対して、有効なルールを適用する
  for (let i = 0; i < chords.length; i++) {
    for (const rule of enabledRules) {
      if (typeof rule.apply === 'function') {
        const generated = rule.apply(chords, i);
        candidates.push(...generated);
      }
    }
  }

  return { candidates, originalChords: chords, error: null };
}
