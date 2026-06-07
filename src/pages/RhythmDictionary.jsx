import RhythmList from '../components/rhythm-dictionary/RhythmList';
import { ClockIcon } from '@heroicons/react/24/outline';

export default function RhythmDictionary() {
  return (
    <div className="page animate-fade-in">
      <div className="page__header">
        <h1 className="page__title" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <ClockIcon style={{ width: '32px', height: '32px', color: 'var(--accent-blue)' }} />
          リズム辞書
        </h1>
        <p className="page__subtitle">リズムパターン（符割り・休符・シンコペーション）をストック・検索・再生</p>
      </div>
      <RhythmList />
    </div>
  );
}
