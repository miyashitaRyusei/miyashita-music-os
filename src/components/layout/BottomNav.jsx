import { NavLink } from 'react-router-dom';
import { 
  HomeIcon, 
  ChartBarIcon, 
  ClockIcon, 
  CubeTransparentIcon,
  Bars3Icon
} from '@heroicons/react/24/outline';

const bottomNavItems = [
  { path: '/', label: 'ホーム', icon: <HomeIcon /> },
  { path: '/pitch-dictionary', label: 'ピッチ', icon: <ChartBarIcon /> },
  { path: '/rhythm-dictionary', label: 'リズム', icon: <ClockIcon /> },
  { path: '/chord-dictionary', label: 'コード', icon: <CubeTransparentIcon /> },
];

export default function BottomNav({ setIsSidebarOpen }) {
  return (
    <nav className="bottom-nav">
      {bottomNavItems.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          end={item.path === '/'}
          className={({ isActive }) =>
            `bottom-nav__item${isActive ? ' bottom-nav__item--active' : ''}`
          }
        >
          <span className="bottom-nav__icon">{item.icon}</span>
          <span className="bottom-nav__label">{item.label}</span>
        </NavLink>
      ))}
      <button 
        className="bottom-nav__item bottom-nav__item--menu"
        onClick={() => setIsSidebarOpen(true)}
      >
        <span className="bottom-nav__icon"><Bars3Icon /></span>
        <span className="bottom-nav__label">メニュー</span>
      </button>
    </nav>
  );
}
