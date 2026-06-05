import PitchList from '../components/pitch-dictionary/PitchList';

export default function PitchDictionary() {
  return (
    <div className="page animate-fade-in">
      <div className="page__header">
        <h1 className="page__title">ピッチ辞書</h1>
        <p className="page__subtitle">音高の推移（階名）パターンをストック・検索・再生</p>
      </div>
      <PitchList />
    </div>
  );
}
