import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Dashboard from './pages/Dashboard';
import Workspace from './pages/Workspace';
import PitchDictionary from './pages/PitchDictionary';
import RhythmDictionary from './pages/RhythmDictionary';
import ChordDictionary from './pages/ChordDictionary';
import MelodyMaker from './pages/MelodyMaker';
import MelodyChordDictionary from './pages/MelodyChordDictionary';
import SongRegistry from './pages/SongRegistry';
import MyLibrary from './pages/MyLibrary';
import LoadingOverlay from './components/ui/LoadingOverlay';
import useAppStore from './store/useAppStore';

export default function App() {
  const { fetchData, isLoadingData } = useAppStore();

  useEffect(() => {
    // Supabaseから初期データを取得
    fetchData();

    // Renderデプロイ時のコールドスタート対策 (Wake-up Ping)
    fetch('https://your-render-app.onrender.com/ping')
      .catch(() => {
        console.log('Wake-up ping sent (backend might be asleep or not available yet)');
      });
  }, [fetchData]);

  if (isLoadingData) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--bg-primary)' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Loading data from Supabase...</p>
      </div>
    );
  }

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
          <Route path="/melody-maker" element={<MelodyMaker />} />
          <Route path="/melody-chord-dictionary" element={<MelodyChordDictionary />} />
          <Route path="/my-library" element={<MyLibrary />} />
        </Route>
      </Routes>
      <LoadingOverlay />
    </BrowserRouter>
  );
}
