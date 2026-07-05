import { useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import { useProfile } from '../hooks/useProfile';
import './Sidebar.css';

const Sidebar = () => {
  const { t, i18n } = useTranslation();
  const { signOut } = useAuth();
  const { profile } = useProfile();
  
  const [isDark, setIsDark] = useState(() => {
    return document.documentElement.classList.contains('dark');
  });
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    if (!document.documentElement.classList.contains('dark') && !document.documentElement.classList.contains('light')) {
      document.documentElement.classList.add('light');
      setIsDark(false);
    }
  }, []);

  const toggleTheme = () => {
    if (isDark) {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
      document.documentElement.classList.add('dark');
    }
    setIsDark(!isDark);
  };

  const changeLanguage = (e: React.ChangeEvent<HTMLSelectElement>) => {
    i18n.changeLanguage(e.target.value);
  };

  const navLinks = [
    { to: '/dictionaries', label: t('sidebar.dictionaries'), icon: '📚' },
    { to: '/practice', label: t('sidebar.practice'), icon: '🎯' },
    { to: '/library', label: t('sidebar.library'), icon: '🌍' },
    { to: '/statistics', label: 'Statistics', icon: '📊' },
    { to: '/achievements', label: 'Achievements', icon: '🏆' },
    { to: '/profile', label: t('sidebar.profile'), icon: '👤' },
    { to: '/pricing', label: 'Premium', icon: '⭐' },
  ];

  return (
    <>
      <button 
        className="mobile-menu-toggle" 
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        aria-label="Toggle Menu"
      >
        {isMobileOpen ? '✖' : '☰'}
      </button>

      <aside className={`sidebar ${isMobileOpen ? 'mobile-open' : ''}`}>
        <Link to="/" className="sidebar-header" onClick={() => setIsMobileOpen(false)} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', width: '100%' }}>
          <div className="sidebar-logo">🐼</div>
          <h1 className="sidebar-title" style={{ flexGrow: 1 }}>
            Lingora
            {profile?.is_premium && <span className="pro-badge">PRO</span>}
          </h1>
          {profile && profile.current_streak > 0 && (
            <div className="sidebar-streak" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#f59e0b', fontWeight: 'bold', fontSize: '0.9rem' }} title={`${profile.current_streak} Day Streak!`}>
              🔥 {profile.current_streak}
            </div>
          )}
        </Link>

        <nav className="sidebar-nav">
          {navLinks.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            onClick={() => setIsMobileOpen(false)}
            className={({ isActive }) =>
              `nav-link ${isActive ? 'active' : ''}`
            }
          >
            <span className="nav-icon">{link.icon}</span>
            <span className="nav-text">{link.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="lang-switcher">
          <label>Language</label>
          <select onChange={changeLanguage} value={i18n.language}>
            <option value="en">English</option>
            <option value="es">Español</option>
            <option value="fr">Français</option>
            <option value="cs">Čeština</option>
            <option value="uk">Українська</option>
            <option value="ru">Русский</option>
          </select>
        </div>

        <button onClick={toggleTheme} className="theme-toggle">
          {isDark ? '☀️ Light Mode' : '🌙 Dark Mode'}
        </button>

        <button onClick={signOut} className="sign-out-btn">
          🚪 Sign Out
        </button>
      </div>
    </aside>
    </>
  );
};

export default Sidebar;
