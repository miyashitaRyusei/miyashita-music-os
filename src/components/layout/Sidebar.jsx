import { NavLink } from 'react-router-dom';
import { 
  HomeIcon, 
  Square3Stack3DIcon, 
  MusicalNoteIcon, 
  ChartBarIcon, 
  ClockIcon, 
  CubeTransparentIcon, 
  SparklesIcon, 
  FolderIcon,
  PuzzlePieceIcon
} from '@heroicons/react/24/outline';

const navItems = [
  { path: '/', label: 'ダッシュボード', icon: <HomeIcon /> },
  { path: '/workspace', label: '作業場', icon: <Square3Stack3DIcon /> },
  { path: '/song-registry', label: '登録楽曲', icon: <MusicalNoteIcon /> },
  { path: '/pitch-dictionary', label: 'ピッチ辞書', icon: <ChartBarIcon /> },
  { path: '/rhythm-dictionary', label: 'リズム辞書', icon: <ClockIcon /> },
  { path: '/chord-dictionary', label: 'コード辞書', icon: <CubeTransparentIcon /> },
  { path: '/melody-chord-dictionary', label: 'メロディ×コード', icon: <SparklesIcon /> },
  { path: '/melody-maker', label: 'メロディメーカー', icon: <PuzzlePieceIcon /> },
  { path: '/my-library', label: 'マイライブラリ', icon: <FolderIcon /> },
];

export default function Sidebar({ isOpen, setIsOpen }) {
  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      <div className="sidebar__logo">
        <span className="sidebar__logo-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <MusicalNoteIcon style={{ width: '24px', height: '24px', color: 'var(--accent-blue)' }} />
        </span>
        <span className="sidebar__logo-text">みやした音楽OS</span>
      </div>

      <div className="sidebar__section-label">Menu</div>

      <nav className="sidebar__nav">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            onClick={() => setIsOpen(false)}
            className={({ isActive }) =>
              `sidebar__nav-item${isActive ? ' sidebar__nav-item--active' : ''}`
            }
          >
            <span className="sidebar__nav-icon" style={{ width: '20px', height: '20px' }}>{item.icon}</span>
            <span className="sidebar__nav-label">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
