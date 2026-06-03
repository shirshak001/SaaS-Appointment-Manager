import { useState, useCallback, createContext, useContext } from 'react';

const ToastContext = createContext(null);
let toastId = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback(({ type = 'info', title, message, duration = 5000, action }) => {
    const id = ++toastId;
    setToasts(prev => [...prev, { id, type, title, message, action }]);
    if (duration > 0) setTimeout(() => removeToast(id), duration);
    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      {toasts.length > 0 && (
        <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
          {toasts.map(t => <Toast key={t.id} toast={t} onRemove={removeToast} />)}
        </div>
      )}
    </ToastContext.Provider>
  );
}

function Toast({ toast, onRemove }) {
  const { id, type, title, message, action } = toast;

  const accentColors = {
    info:     'rgb(var(--clr-primary))',
    success:  '#22C55E',
    warning:  '#F59E0B',
    error:    '#EF4444',
    reminder: 'rgb(var(--clr-primary))',
  };

  const accent = accentColors[type] || accentColors.info;

  return (
    <div
      className="pointer-events-auto rounded-2xl p-4 animate-slide-in"
      style={{
        backgroundColor: 'rgb(var(--clr-surface-raised))',
        border: '1px solid rgb(var(--clr-border))',
        borderLeft: `3px solid ${accent}`,
        boxShadow: '0 8px 30px rgb(0 0 0 / 0.12)',
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-2 h-2 rounded-full shrink-0 mt-1.5"
          style={{ backgroundColor: accent }}
        />
        <div className="flex-1 min-w-0">
          {title && (
            <p
              className="text-sm font-semibold"
              style={{ color: 'rgb(var(--clr-ink))' }}
            >
              {title}
            </p>
          )}
          {message && (
            <p
              className="text-xs mt-0.5 leading-relaxed"
              style={{ color: 'rgb(var(--clr-ink-muted))' }}
            >
              {message}
            </p>
          )}
          {action && (
            <a
              href={action.href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-2 text-xs font-medium underline underline-offset-2"
              style={{ color: 'rgb(var(--clr-primary-600))' }}
            >
              {action.label}
            </a>
          )}
        </div>
        <button
          onClick={() => onRemove(id)}
          className="shrink-0 transition-opacity hover:opacity-100 opacity-50"
          style={{ color: 'rgb(var(--clr-ink-muted))' }}
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 14 14" fill="none">
            <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>
      </div>
    </div>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
