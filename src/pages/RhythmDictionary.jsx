import RhythmList from '../components/rhythm-dictionary/RhythmList';

export default function RhythmDictionary() {
  return (
    <div className="page animate-fade-in">
      <div className="page__header">
        <h1 className="page__title">リズム辞書</h1>
        <p className="page__subtitle">リズムパターン（符割り・休符・シンコペーション）をストック・検索・再生</p>
      </div>
      <RhythmList />
    </div>
  );
}
