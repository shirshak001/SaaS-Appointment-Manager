import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { useReminderSSE } from '../../hooks/useReminderSSE';

export default function AppLayout() {
  const { isAuthenticated, loading } = useAuth();
  const { liveNotifs } = useReminderSSE(isAuthenticated);

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

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ backgroundColor: 'rgb(var(--clr-surface))' }}
    >
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Topbar liveNotifs={liveNotifs} />
        <main
          className="flex-1 overflow-y-auto p-6"
          style={{ backgroundColor: 'rgb(var(--clr-surface))' }}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}
