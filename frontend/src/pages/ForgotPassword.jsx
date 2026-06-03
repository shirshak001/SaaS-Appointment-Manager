import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext';
import { Zap, Sun, Moon, ArrowLeft, Mail } from 'lucide-react';

export default function ForgotPassword() {
  const { forgotPassword } = useAuth();
  const { addToast } = useToast();
  const { toggle, isDark } = useTheme();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await forgotPassword(email);
      addToast({
        type: 'success',
        title: 'Reset code sent',
        message: 'A 6-digit code has been logged to your backend console/messages.',
        duration: 8000
      });
      navigate(`/reset-password?email=${encodeURIComponent(email)}`);
    } catch (err) {
      setError(err.message || 'Failed to send reset code');
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
              onClick={() => navigate('/login')} 
              className="flex items-center gap-1.5 text-xs font-semibold focus:outline-none hover:underline"
              style={{ color: 'rgb(var(--clr-ink-ghost))' }}
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Login
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
              <Mail className="w-4 h-4 text-primary" strokeWidth={2} />
            </div>
            <h1 className="text-xl font-display font-semibold" style={{ color: 'rgb(var(--clr-ink))' }}>
              Reset Password
            </h1>
          </div>
          <p className="text-xs mb-8 leading-relaxed" style={{ color: 'rgb(var(--clr-ink-muted))' }}>
            Enter your account email. We will log a 6-digit password reset code to verify your identity.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="input-label">Email address</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@reminderflow.com"
                className="input font-sans"
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
                  Sending code...
                </>
              ) : 'Send reset code'}
            </button>
          </form>
        </div>
      </div>

      {/* Right panel illustration */}
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
            <Zap className="w-20 h-20 text-primary opacity-20 animate-pulse" />
          </div>
          <h2 className="text-xl font-display font-semibold mb-2" style={{ color: 'rgb(var(--clr-ink))' }}>
            Secure Recovery
          </h2>
          <p className="text-xs max-w-xs mx-auto leading-relaxed" style={{ color: 'rgb(var(--clr-ink-muted))' }}>
            Codes expire after 15 minutes to guarantee session safety.
          </p>
        </div>
      </div>
    </div>
  );
}
