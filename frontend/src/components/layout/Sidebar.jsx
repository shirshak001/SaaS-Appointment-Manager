import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard, CalendarDays, CalendarRange,
  MessageSquare, Settings, LogOut, Zap,
  Users, BarChart2
} from 'lucide-react';

const navGroups = [
  {
    label: 'Overview',
    items: [
      { to: '/dashboard',    icon: LayoutDashboard, label: 'Dashboard' },
      { to: '/calendar',     icon: CalendarRange,   label: 'Calendar' },
    ],
  },
  {
    label: 'Appointments',
    items: [
      { to: '/appointments', icon: CalendarDays,    label: 'Appointments' },
      { to: '/customers',    icon: Users,           label: 'Customers' },
    ],
  },
  {
    label: 'Analytics',
    items: [
      { to: '/messages',     icon: MessageSquare,   label: 'Messages' },
      { to: '/reports',      icon: BarChart2,       label: 'Reports' },
    ],
  },
  {
    label: 'System',
    items: [
      { to: '/settings',     icon: Settings,        label: 'Settings' },
    ],
  },
];

export default function Sidebar({ onClose }) {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  return (
    <aside
      className="flex flex-col h-full w-60 shrink-0"
      style={{
        backgroundColor: 'rgb(var(--sidebar-bg))',
        borderRight: '1px solid rgb(var(--sidebar-border))',
        transition: 'background-color 0.2s ease, border-color 0.2s ease',
      }}
    >
      {/* Logo */}
      <div className="px-5 py-5" style={{ borderBottom: '1px solid rgb(var(--clr-border))' }}>
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: 'rgb(var(--clr-primary))' }}
          >
            <Zap className="w-4 h-4 text-white" strokeWidth={2.5} />
          </div>
          <span className="font-display font-semibold text-base tracking-tight" style={{ color: 'rgb(var(--clr-ink))' }}>
            ReminderFlow
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-4">
        {navGroups.map(group => {
          const items = group.items.filter(item => {
            if (item.to === '/settings' || item.to === '/reports') {
              return user?.role === 'admin';
            }
            return true;
          });
          if (items.length === 0) return null;
          return { ...group, items };
        }).filter(Boolean).map(group => (
          <div key={group.label}>
            <p
              className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest"
              style={{ color: 'rgb(var(--clr-ink-ghost))' }}
            >
              {group.label}
            </p>
            <ul className="space-y-0.5">
              {group.items.map(({ to, icon: Icon, label }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
                    onClick={() => { if (onClose) onClose(); }}
                  >
                    <Icon className="w-4 h-4 shrink-0" strokeWidth={1.75} />
                    <span>{label}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* User & Logout */}
      <div className="px-3 py-4" style={{ borderTop: '1px solid rgb(var(--clr-border))' }}>
        <div className="flex items-center gap-3 px-3 py-2 mb-1 rounded-xl">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
            style={{ backgroundColor: 'rgb(var(--clr-primary) / 0.12)' }}
          >
            <span className="text-xs font-semibold" style={{ color: 'rgb(var(--clr-primary-600))' }}>
              {user?.name?.[0]?.toUpperCase() || 'A'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold truncate" style={{ color: 'rgb(var(--clr-ink))' }}>
              {user?.name || 'Admin'}
            </p>
            <p className="text-[11px] truncate" style={{ color: 'rgb(var(--clr-ink-ghost))' }}>
              {user?.email}
            </p>
          </div>
        </div>
        <button
          onClick={() => { logout(); navigate('/login'); if (onClose) onClose(); }}
          className="sidebar-item w-full"
          style={{ color: 'rgb(var(--clr-ink-ghost))' }}
        >
          <LogOut className="w-4 h-4 shrink-0" strokeWidth={1.75} />
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  );
}
