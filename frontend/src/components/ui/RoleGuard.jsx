import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function RoleGuard({ children, requiredRole = 'admin' }) {
  const { user, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center" style={{ backgroundColor: 'rgb(var(--clr-surface))' }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'rgb(var(--clr-primary))' }} />
          <p style={{ color: 'rgb(var(--clr-ink-muted))', fontSize: '0.875rem' }}>Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role !== requiredRole) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center animate-fade-in">
        <div 
          className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6" 
          style={{ backgroundColor: 'rgb(var(--clr-danger-light))' }}
        >
          <ShieldAlert className="w-8 h-8 text-danger" strokeWidth={1.75} />
        </div>
        <h1 className="text-xl font-display font-semibold mb-2" style={{ color: 'rgb(var(--clr-ink))' }}>
          Access Denied
        </h1>
        <p className="text-sm max-w-sm mb-8 leading-relaxed" style={{ color: 'rgb(var(--clr-ink-muted))' }}>
          You do not have the required permissions to view this section. This page is restricted to administrators.
        </p>
        <button 
          onClick={() => navigate('/dashboard')} 
          className="btn-md btn-secondary gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </button>
      </div>
    );
  }

  return children;
}
