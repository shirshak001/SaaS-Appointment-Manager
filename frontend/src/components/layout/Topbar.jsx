import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Search, Plus, Sun, Moon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import NotificationPanel from '../notifications/NotificationPanel';

const pageTitles = {
  '/dashboard':       'Dashboard',
  '/calendar':        'Calendar',
  '/appointments':    'Appointments',
  '/appointments/new':'New Appointment',
  '/customers':       'Customers',
  '/messages':        'Messages',
  '/reports':         'Reports',
  '/settings':        'Settings',
};

export default function Topbar({ liveNotifs = [] }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { toggle, isDark } = useTheme();
  const [search, setSearch] = useState('');

  const title = pageTitles[location.pathname] ||
    (location.pathname.startsWith('/appointments/') ? 'Appointment Details' :
     location.pathname.startsWith('/customers/') ? 'Customer Profile' :
     'ReminderFlow');

  const handleSearch = (e) => {
    e.preventDefault();
    if (search.trim()) navigate(`/appointments?search=${encodeURIComponent(search.trim())}`);
  };

  return (
    <header
      className="h-14 flex items-center gap-3 px-5 shrink-0"
      style={{
        backgroundColor: 'rgb(var(--clr-surface-raised))',
        borderBottom: '1px solid rgb(var(--clr-border))',
        transition: 'background-color 0.2s ease, border-color 0.2s ease',
      }}
    >
      <div className="flex-1">
        <h2 className="text-sm font-semibold" style={{ color: 'rgb(var(--clr-ink))' }}>
          {title}
        </h2>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="hidden md:flex">
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5"
            strokeWidth={2}
            style={{ color: 'rgb(var(--clr-ink-ghost))' }}
          />
          <input
            type="text"
            placeholder="Search appointments..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 pr-4 py-1.5 text-xs rounded-lg w-52 outline-none transition-all duration-150"
            style={{
              border: '1px solid rgb(var(--clr-border-strong))',
              backgroundColor: 'rgb(var(--clr-surface))',
              color: 'rgb(var(--clr-ink))',
            }}
            onFocus={e => {
              e.target.style.borderColor = 'rgb(var(--clr-primary))';
              e.target.style.boxShadow = '0 0 0 3px rgb(var(--clr-primary) / 0.12)';
              e.target.style.backgroundColor = 'rgb(var(--clr-surface-raised))';
            }}
            onBlur={e => {
              e.target.style.borderColor = 'rgb(var(--clr-border-strong))';
              e.target.style.boxShadow = 'none';
              e.target.style.backgroundColor = 'rgb(var(--clr-surface))';
            }}
          />
        </div>
      </form>

      {/* Notification panel */}
      <NotificationPanel liveNotifs={liveNotifs} />

      {/* Theme Toggle */}
      <button
        onClick={toggle}
        className="theme-toggle"
        title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        aria-label="Toggle theme"
      >
        {isDark
          ? <Sun className="w-4 h-4" strokeWidth={1.75} />
          : <Moon className="w-4 h-4" strokeWidth={1.75} />
        }
      </button>

      {/* New Appointment CTA */}
      <button
        onClick={() => navigate('/appointments/new')}
        className="btn-sm btn-primary hidden sm:flex"
      >
        <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
        New
      </button>
    </header>
  );
}
