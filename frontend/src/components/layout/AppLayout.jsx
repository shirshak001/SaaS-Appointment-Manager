import { useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { useReminderSSE } from '../../hooks/useReminderSSE';

export default function AppLayout() {
  const { isAuthenticated, loading, user } = useAuth();
  const { liveNotifs } = useReminderSSE(isAuthenticated);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (loading) {
    return (
      <div
        className="h-screen flex items-center justify-center"
        style={{ backgroundColor: 'rgb(var(--clr-surface))' }}
      >
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: 'rgb(var(--clr-primary))' }}
          />
          <p style={{ color: 'rgb(var(--clr-ink-muted))', fontSize: '0.875rem' }}>
            Loading...
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user && user.verified === false) return <Navigate to="/verify-email" replace />;

  return (
    <div
      className="flex h-screen overflow-hidden relative"
      style={{ backgroundColor: 'rgb(var(--clr-surface))' }}
    >
      {/* Mobile Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden transition-opacity duration-200"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar Wrapper */}
      <div
        className={`
          fixed inset-y-0 left-0 z-50 md:relative md:translate-x-0 transition-transform duration-200 ease-in-out shrink-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Topbar liveNotifs={liveNotifs} onToggleSidebar={() => setSidebarOpen(p => !p)} />
        <main
          className="flex-1 overflow-y-auto p-4 md:p-6"
          style={{ backgroundColor: 'rgb(var(--clr-surface))' }}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}
