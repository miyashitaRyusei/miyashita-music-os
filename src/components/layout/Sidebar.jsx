import { NavLink } from 'react-router-dom';

const navItems = [
  { path: '/', label: 'ダッシュボード', icon: '⌂' },
  { path: '/workspace', label: '作業場', icon: '⊞' },
  { path: '/song-registry', label: '登録楽曲', icon: '💿' },
  { path: '/pitch-dictionary', label: 'ピッチ辞書', icon: '♫' },
  { path: '/rhythm-dictionary', label: 'リズム辞書', icon: '⏱' },
  { path: '/chord-dictionary', label: 'コード辞書', icon: '♬' },
  { path: '/melody-chord-dictionary', label: 'メロディ×コード', icon: '🎵' },
  { path: '/my-library', label: 'マイライブラリ', icon: '🎧' },
];

export default function Sidebar({ isOpen, setIsOpen }) {
  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      <div className="sidebar__logo">
        <span className="sidebar__logo-icon">◉</span>
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
            <span className="sidebar__nav-icon">{item.icon}</span>
            <span className="sidebar__nav-label">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
