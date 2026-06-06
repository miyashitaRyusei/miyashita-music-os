import MelodyChordAnalyzer from '../components/melody-chord-dictionary/MelodyChordAnalyzer';

export default function MelodyChordDictionary() {
  return (
    <div className="page animate-fade-in">
      <div className="page__header">
        <h1 className="page__title">メロディ×コード辞書</h1>
        <p className="page__subtitle">メロディ音高とコード進行の相関関係を分析します</p>
      </div>

      <MelodyChordAnalyzer />
    </div>
  );
}
