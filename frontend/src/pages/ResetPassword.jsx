import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext';
import { Zap, Sun, Moon, ArrowLeft, KeyRound } from 'lucide-react';

export default function ResetPassword() {
  const { resetPassword, tempResetCode } = useAuth();
  const { addToast } = useToast();
  const { toggle, isDark } = useTheme();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [form, setForm] = useState({
    email: '',
    token: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const emailParam = searchParams.get('email') || '';
    setForm(p => ({ ...p, email: emailParam }));
  }, [searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (form.token.length < 6) {
      setError('Please enter a valid 6-digit code');
      return;
    }

    setLoading(true);
    try {
      await resetPassword(form.email, form.token, form.password);
      addToast({
        type: 'success',
        title: 'Password updated',
        message: 'You can now sign in with your new password.',
        duration: 5000
      });
      navigate('/login');
    } catch (err) {
      setError(err.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex"
      style={{ backgroundColor: 'rgb(var(--clr-surface))', transition: 'background-color 0.2s ease' }}
    >
      <div className="flex-1 flex flex-col justify-center px-8 sm:px-16 lg:px-24 py-12">
        <div className="max-w-sm w-full mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-10">
            <button 
              onClick={() => navigate('/forgot-password')} 
              className="flex items-center gap-1.5 text-xs font-semibold focus:outline-none hover:underline"
              style={{ color: 'rgb(var(--clr-ink-ghost))' }}
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back
            </button>
            <button onClick={toggle} className="theme-toggle" title="Toggle theme">
              {isDark ? <Sun className="w-4 h-4" strokeWidth={1.75} /> : <Moon className="w-4 h-4" strokeWidth={1.75} />}
            </button>
          </div>

          <div className="flex items-center gap-2 mb-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: 'rgb(var(--clr-primary) / 0.1)' }}
            >
              <KeyRound className="w-4 h-4 text-primary" strokeWidth={2} />
            </div>
            <h1 className="text-xl font-display font-semibold" style={{ color: 'rgb(var(--clr-ink))' }}>
              Create New Password
            </h1>
          </div>
          <p className="text-xs mb-6 leading-relaxed" style={{ color: 'rgb(var(--clr-ink-muted))' }}>
            Enter your email, reset code, and your secure new password.
          </p>

          {tempResetCode && (
            <div
              className="mb-6 p-4 rounded-2xl border text-xs leading-relaxed animate-fade-in"
              style={{
                backgroundColor: 'rgb(var(--clr-primary) / 0.05)',
                borderColor: 'rgb(var(--clr-primary) / 0.15)',
                color: 'rgb(var(--clr-primary-600))'
              }}
            >
              <p className="font-semibold mb-1">Demo/Test Mode Reset Code:</p>
              <p className="font-mono text-base font-bold tracking-wider mb-1">{tempResetCode}</p>
              <p className="opacity-80">Enter this code below to verify your password reset. (Displayed here for easy testing without SMTP configuration).</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="input-label">Email address</label>
              <input
                id="email"
                type="email"
                value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                placeholder="admin@reminderflow.com"
                className="input font-sans"
                required
              />
            </div>

            <div>
              <label htmlFor="token" className="input-label">Reset code (6 digits)</label>
              <input
                id="token"
                type="text"
                maxLength={6}
                value={form.token}
                onChange={e => setForm(p => ({ ...p, token: e.target.value.replace(/\D/g, '') }))}
                placeholder="Enter 6-digit code"
                className="input font-mono text-center tracking-widest font-semibold"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="input-label">New password</label>
              <input
                id="password"
                type="password"
                value={form.password}
                onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                placeholder="••••••••"
                className="input"
                required
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="input-label">Confirm password</label>
              <input
                id="confirmPassword"
                type="password"
                value={form.confirmPassword}
                onChange={e => setForm(p => ({ ...p, confirmPassword: e.target.value }))}
                placeholder="••••••••"
                className="input"
                required
              />
            </div>

            {error && (
              <div
                className="px-3.5 py-2.5 rounded-xl animate-fade-in"
                style={{
                  backgroundColor: 'rgb(var(--clr-danger-light))',
                  border: '1px solid rgb(239 68 68 / 0.2)',
                }}
              >
                <p className="text-xs font-medium" style={{ color: '#DC2626' }}>{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-lg btn-primary w-full mt-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  Updating password...
                </>
              ) : 'Reset password'}
            </button>
          </form>
        </div>
      </div>

      {/* Right illustration panel */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden items-center justify-center"
        style={{ backgroundColor: 'rgb(var(--clr-surface-raised))' }}
      >
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `linear-gradient(rgb(var(--clr-border) / 0.6) 1px, transparent 1px),
                              linear-gradient(90deg, rgb(var(--clr-border) / 0.6) 1px, transparent 1px)`,
            backgroundSize: '40px 40px',
          }}
        />
        <div
          className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full blur-3xl"
          style={{ backgroundColor: 'rgb(var(--clr-primary) / 0.05)' }}
        />
        <div className="relative z-10 px-16 text-center">
          <div className="w-48 h-48 mx-auto mb-6 flex items-center justify-center rounded-full" style={{ backgroundColor: 'rgb(var(--clr-surface-overlay))' }}>
            <KeyRound className="w-20 h-20 text-primary opacity-20" />
          </div>
          <h2 className="text-xl font-display font-semibold mb-2" style={{ color: 'rgb(var(--clr-ink))' }}>
            Double Encrypted
          </h2>
          <p className="text-xs max-w-xs mx-auto leading-relaxed" style={{ color: 'rgb(var(--clr-ink-muted))' }}>
            Your security is our absolute priority. Passwords are salted and hashed natively.
          </p>
        </div>
      </div>
    </div>
  );
}
