import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext';
import { Zap, Sun, Moon } from 'lucide-react';

export default function Login() {
  const { login, register, isAuthenticated } = useAuth();
  const { addToast } = useToast();
  const { toggle, isDark } = useTheme();
  const navigate = useNavigate();

  const [isSignUp, setIsSignUp] = useState(false);
  const [form, setForm] = useState({ name: '', email: 'admin@reminderflow.com', password: 'admin123' });
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  const toggleMode = () => {
    setIsSignUp(p => !p);
    setError('');
    setForm({ name: '', email: '', password: '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isSignUp) {
        await register(form.name, form.email, form.password, remember);
        addToast({ type: 'success', title: 'Welcome', message: 'Account created successfully.' });
      } else {
        await login(form.email, form.password, remember);
        addToast({ type: 'success', title: 'Welcome back', message: 'Signed in successfully.' });
      }
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex"
      style={{ backgroundColor: 'rgb(var(--clr-surface))', transition: 'background-color 0.2s ease' }}
    >
      {/* Left — Form */}
      <div className="flex-1 flex flex-col justify-center px-8 sm:px-16 lg:px-24 py-12">
        <div className="max-w-sm w-full mx-auto">

          {/* Top bar: Logo + Theme toggle */}
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-2.5">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: 'rgb(var(--clr-primary))' }}
              >
                <Zap className="w-4 h-4 text-white" strokeWidth={2.5} />
              </div>
              <span
                className="font-display font-semibold text-lg tracking-tight"
                style={{ color: 'rgb(var(--clr-ink))' }}
              >
                ReminderFlow
              </span>
            </div>
            <button onClick={toggle} className="theme-toggle" title="Toggle theme">
              {isDark ? <Sun className="w-4 h-4" strokeWidth={1.75} /> : <Moon className="w-4 h-4" strokeWidth={1.75} />}
            </button>
          </div>

          <h1
            className="text-2xl font-display font-semibold mb-1"
            style={{ color: 'rgb(var(--clr-ink))' }}
          >
            {isSignUp ? 'Create your account' : 'Sign in'}
          </h1>
          <p className="text-sm mb-8" style={{ color: 'rgb(var(--clr-ink-muted))' }}>
            {isSignUp ? 'Get started with a new staff or admin account.' : 'Enter your credentials to access the dashboard.'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div>
                <label htmlFor="name" className="input-label">Full name</label>
                <input
                  id="name"
                  type="text"
                  value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="Enter your name"
                  className="input"
                  required
                />
              </div>
            )}

            <div>
              <label htmlFor="email" className="input-label">Email address</label>
              <input
                id="email"
                type="email"
                value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                placeholder="admin@reminderflow.com"
                className="input"
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label htmlFor="password" className="input-label">Password</label>
              <input
                id="password"
                type="password"
                value={form.password}
                onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                placeholder="Enter your password"
                className="input"
                required
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div
                className="px-3.5 py-2.5 rounded-xl"
                style={{
                  backgroundColor: 'rgb(var(--clr-danger-light))',
                  border: '1px solid rgb(239 68 68 / 0.2)',
                }}
              >
                <p className="text-xs font-medium" style={{ color: '#DC2626' }}>{error}</p>
              </div>
            )}

            {!isSignUp && (
              <div className="flex items-center gap-2">
                <input
                  id="remember"
                  type="checkbox"
                  checked={remember}
                  onChange={e => setRemember(e.target.checked)}
                  className="w-4 h-4 rounded cursor-pointer accent-blue-600"
                />
                <label
                  htmlFor="remember"
                  className="text-xs cursor-pointer select-none"
                  style={{ color: 'rgb(var(--clr-ink-secondary))' }}
                >
                  Remember me for 7 days
                </label>
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
                  {isSignUp ? 'Creating account...' : 'Signing in...'}
                </>
              ) : (isSignUp ? 'Create account' : 'Sign in')}
            </button>
          </form>

          <p className="text-xs text-center mt-6" style={{ color: 'rgb(var(--clr-ink-secondary))' }}>
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              type="button"
              onClick={toggleMode}
              className="font-semibold text-primary hover:underline focus:outline-none"
              style={{ color: 'rgb(var(--clr-primary))' }}
            >
              {isSignUp ? 'Sign in' : 'Sign up'}
            </button>
          </p>

          {!isSignUp && (
            <div
              className="mt-8 pt-6"
              style={{ borderTop: '1px solid rgb(var(--clr-border))' }}
            >
              <p
                className="text-xs text-center"
                style={{ color: 'rgb(var(--clr-ink-ghost))' }}
              >
                Demo credentials pre-filled above
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Right — Illustration panel */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden items-center justify-center"
        style={{ backgroundColor: 'rgb(var(--clr-surface-raised))' }}
      >
        {/* Subtle grid */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `linear-gradient(rgb(var(--clr-border) / 0.6) 1px, transparent 1px),
                              linear-gradient(90deg, rgb(var(--clr-border) / 0.6) 1px, transparent 1px)`,
            backgroundSize: '40px 40px',
          }}
        />

        {/* Glow */}
        <div
          className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full blur-3xl"
          style={{ backgroundColor: 'rgb(var(--clr-primary) / 0.08)' }}
        />

        <div className="relative z-10 px-16 text-center">
          {/* Illustration */}
          <div className="w-64 h-64 mx-auto mb-8">
            <svg viewBox="0 0 260 260" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="30" y="50" width="160" height="150" rx="16"
                fill={`rgb(var(--clr-surface-overlay) / 0.5)`}
                stroke={`rgb(var(--clr-border-strong) / 0.5)`} strokeWidth="1.5"/>
              <rect x="30" y="50" width="160" height="44" rx="16"
                fill={`rgb(var(--clr-primary) / 0.3)`}/>
              <rect x="30" y="78" width="160" height="16"
                fill={`rgb(var(--clr-primary) / 0.3)`}/>
              <circle cx="55" cy="72" r="5" fill={`rgb(var(--clr-primary) / 0.6)`}/>
              <circle cx="155" cy="72" r="5" fill={`rgb(var(--clr-primary) / 0.6)`}/>
              <rect x="90" y="65" width="40" height="14" rx="7"
                fill={`rgb(var(--clr-primary) / 0.15)`}/>
              {[0,1,2,3,4,5,6].map(i => (
                <rect key={i} x={40 + i*21} y="104" width="14" height="8" rx="3"
                  fill={`rgb(var(--clr-ink-ghost) / 0.3)`}/>
              ))}
              {[[0,1,2,3,4],[0,1,2,3,4,5,6],[0,1,2,3,4,5,6],[0,1]].map((row, r) =>
                row.map(i => (
                  <rect key={`${r}${i}`} x={40+i*21} y={120+r*22} width="14" height="14" rx="4"
                    fill={r===1&&i===2 ? `rgb(var(--clr-primary))` : `rgb(var(--clr-ink-ghost) / 0.08)`}
                    opacity={r===1&&i===2 ? 0.9 : 1}/>
                ))
              )}
              <circle cx="185" cy="130" r="28"
                fill="#22C55E" fillOpacity="0.1"
                stroke="#22C55E" strokeOpacity="0.3" strokeWidth="1.5"/>
              <path d="M185 116c-7.73 0-14 6.27-14 14 0 2.44.63 4.73 1.73 6.73L170 144l7.47-1.97C179.27 143 181.59 143.5 184 143.5c7.73 0 14-6.27 14-14s-6.27-13.5-14-13.5zm6.76 19.5c-.28.8-1.62 1.5-2.23 1.57-.6.07-1.16.28-3.92-.82-3.27-1.3-5.37-4.64-5.53-4.85-.16-.22-1.3-1.73-1.3-3.3s.82-2.34 1.12-2.66c.28-.3.62-.38.82-.38h.6c.19 0 .46-.07.72.55.28.65 1 2.44 1.08 2.62.08.18.13.4.03.62-.1.22-.16.36-.31.54-.16.19-.33.42-.47.56-.16.16-.33.33-.14.65.19.3.85 1.4 1.82 2.27 1.25 1.11 2.3 1.45 2.62 1.62.3.16.48.13.66-.08.19-.22.8-.93 1.01-1.25.22-.3.44-.25.74-.15.3.1 1.9.9 2.22 1.06.32.16.54.24.62.38.09.14.09.8-.19 1.6z"
                fill="#22C55E" fillOpacity="0.9"/>
            </svg>
          </div>

          <h2
            className="text-2xl font-display font-semibold mb-3 text-balance"
            style={{ color: 'rgb(var(--clr-ink))' }}
          >
            Never miss an appointment
          </h2>
          <p
            className="text-sm max-w-xs mx-auto leading-relaxed text-balance"
            style={{ color: 'rgb(var(--clr-ink-muted))' }}
          >
            Automated reminders keep your customers informed and your schedule full.
          </p>

          <div className="flex flex-wrap justify-center gap-2 mt-8">
            {['Appointment Scheduling', 'Auto Reminders', 'Message Logs'].map(f => (
              <span
                key={f}
                className="px-3 py-1 rounded-full text-xs"
                style={{
                  backgroundColor: 'rgb(var(--clr-surface-overlay))',
                  border: '1px solid rgb(var(--clr-border))',
                  color: 'rgb(var(--clr-ink-muted))',
                }}
              >
                {f}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
