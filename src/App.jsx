import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Dashboard from './pages/Dashboard';
import Workspace from './pages/Workspace';
import PitchDictionary from './pages/PitchDictionary';
import RhythmDictionary from './pages/RhythmDictionary';
import ChordDictionary from './pages/ChordDictionary';
import SongRegistry from './pages/SongRegistry';
import LoadingOverlay from './components/ui/LoadingOverlay';

export default function App() {
  useEffect(() => {
    // Renderデプロイ時のコールドスタート対策 (Wake-up Ping)
    // ユーザーがアクションを起こす前に非同期でバックエンドを起こしておく
    fetch('https://your-render-app.onrender.com/ping')
      .catch(() => {
        // バックエンドが未実装/未デプロイでも画面はブロックしない
        console.log('Wake-up ping sent (backend might be asleep or not available yet)');
      });
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/workspace" element={<Workspace />} />
          <Route path="/song-registry" element={<SongRegistry />} />
          <Route path="/pitch-dictionary" element={<PitchDictionary />} />
          <Route path="/rhythm-dictionary" element={<RhythmDictionary />} />
          <Route path="/chord-dictionary" element={<ChordDictionary />} />
        </Route>
      </Routes>
      <LoadingOverlay />
    </BrowserRouter>
  );
}
