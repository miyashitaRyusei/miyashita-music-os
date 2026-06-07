import ChordProgressionList from '../components/chord-dictionary/ChordProgressionList';
import { CubeTransparentIcon } from '@heroicons/react/24/outline';

export default function ChordDictionary() {
  return (
    <div className="page animate-fade-in">
      <div className="page__header">
        <h1 className="page__title" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <CubeTransparentIcon style={{ width: '32px', height: '32px', color: 'var(--accent-blue)' }} />
          コード辞書
        </h1>
        <p className="page__subtitle">コード進行のまとまりをストック・検索・編集</p>
      </div>

      <div style={{ marginTop: 'var(--spacing-xl)' }}>
        <ChordProgressionList />
      </div>
    </div>
  );
}
