import { useState } from 'react';
import ChordProgressionList, { ChordSearchFilter } from '../components/chord-dictionary/ChordProgressionList';

export default function ChordDictionary() {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="page animate-fade-in">
      <div className="page__header">
        <h1 className="page__title">コード辞書</h1>
        <p className="page__subtitle">コード進行のまとまりをストック・検索・編集</p>
      </div>

      <ChordSearchFilter value={searchQuery} onChange={setSearchQuery} />

      <div style={{ marginTop: 'var(--spacing-xl)' }}>
        <ChordProgressionList searchQuery={searchQuery} />
      </div>
    </div>
  );
}
