import { useState, useEffect, useRef } from 'react';
import { Bell, X, CheckCheck, Trash2, ExternalLink, CalendarDays, MessageSquare, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { api } from '../../utils/api';

const TYPE_CONFIG = {
  reminder:           { icon: Clock,          color: 'rgb(var(--clr-primary))' },
  appointment:        { icon: CalendarDays,   color: '#22C55E' },
  confirmed:          { icon: CheckCircle2,   color: '#22C55E' },
  cancelled:          { icon: X,              color: '#EF4444' },
  failed:             { icon: AlertTriangle,  color: '#F59E0B' },
  message:            { icon: MessageSquare,  color: 'rgb(var(--clr-primary))' },
  reschedule:         { icon: CalendarDays,   color: '#A855F7' },
  no_show:            { icon: AlertTriangle,  color: '#6B7280' },
};

function NotifItem({ notif, onRead }) {
  const cfg = TYPE_CONFIG[notif.type] || TYPE_CONFIG.message;
  const Icon = cfg.icon;
  return (
    <div
      className="flex items-start gap-3 px-4 py-3 transition-all cursor-default"
      style={{
        backgroundColor: notif.read ? 'transparent' : 'rgb(var(--clr-primary) / 0.04)',
        borderBottom: '1px solid rgb(var(--clr-border))',
      }}
    >
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5"
        style={{ backgroundColor: `${cfg.color}18` }}
      >
        <Icon className="w-3.5 h-3.5" strokeWidth={1.75} style={{ color: cfg.color }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium leading-snug" style={{ color: 'rgb(var(--clr-ink))' }}>
          {notif.title}
        </p>
        {notif.message && (
          <p className="text-[11px] mt-0.5" style={{ color: 'rgb(var(--clr-ink-muted))' }}>
            {notif.message}
          </p>
        )}
        {notif.whatsappLink && (
          <a
            href={notif.whatsappLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 mt-1 text-[11px] font-medium"
            style={{ color: 'rgb(var(--clr-primary-600))' }}
          >
            <ExternalLink className="w-2.5 h-2.5" />
            Open WhatsApp
          </a>
        )}
        <p className="text-[10px] mt-1" style={{ color: 'rgb(var(--clr-ink-ghost))' }}>
          {notif.created_at ? format(parseISO(notif.created_at), 'h:mm a') : 'Just now'}
        </p>
      </div>
      {!notif.read && (
        <span
          className="w-1.5 h-1.5 rounded-full shrink-0 mt-1.5"
          style={{ backgroundColor: 'rgb(var(--clr-primary))' }}
        />
      )}
    </div>
  );
}

export default function NotificationPanel({ liveNotifs = [], onCountChange }) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState('all');
  const panelRef = useRef(null);

  // Load persisted notifications
  useEffect(() => {
    api.getNotifications()
      .then(({ notifications }) => setNotifications(notifications.map(n => ({ ...n, id: n._id || n.id }))))
      .catch(() => {});
  }, []);

  // Merge live SSE notifications
  useEffect(() => {
    if (liveNotifs.length === 0) return;
    const latest = liveNotifs[liveNotifs.length - 1];
    setNotifications(prev => {
      const exists = prev.some(n => n.id === latest.id);
      if (exists) return prev;
      return [{ ...latest, read: false }, ...prev];
    });
  }, [liveNotifs]);

  const unread = notifications.filter(n => !n.read).length;
  useEffect(() => { onCountChange?.(unread); }, [unread, onCountChange]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const filtered = notifications.filter(n => {
    if (filter === 'unread') return !n.read;
    if (filter === 'reminder') return n.type === 'reminder';
    return true;
  });

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    api.markNotificationsRead().catch(() => {});
  };

  const clearAll = () => setNotifications([]);

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen(v => !v)}
        className="relative w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-150"
        style={{
          border: '1px solid rgb(var(--clr-border))',
          backgroundColor: open ? 'rgb(var(--clr-surface-overlay))' : 'rgb(var(--clr-surface-raised))',
          color: 'rgb(var(--clr-ink-muted))',
        }}
        title="Notifications"
        aria-label="Open notifications"
      >
        <Bell className="w-4 h-4" strokeWidth={1.75} />
        {unread > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full text-[10px] font-semibold flex items-center justify-center text-white"
            style={{ backgroundColor: '#EF4444', fontSize: '9px' }}
          >
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-80 rounded-2xl overflow-hidden z-50 animate-slide-up"
          style={{
            backgroundColor: 'rgb(var(--clr-surface-raised))',
            border: '1px solid rgb(var(--clr-border-strong))',
            boxShadow: '0 16px 48px rgb(0 0 0 / 0.15)',
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ borderBottom: '1px solid rgb(var(--clr-border))' }}
          >
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold" style={{ color: 'rgb(var(--clr-ink))' }}>
                Notifications
              </h3>
              {unread > 0 && (
                <span
                  className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold"
                  style={{ backgroundColor: 'rgb(var(--clr-primary))', color: 'white' }}
                >
                  {unread}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={markAllRead}
                title="Mark all as read"
                className="p-1.5 rounded-lg transition-colors"
                style={{ color: 'rgb(var(--clr-ink-ghost))' }}
              >
                <CheckCheck className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={clearAll}
                title="Clear all"
                className="p-1.5 rounded-lg transition-colors"
                style={{ color: 'rgb(var(--clr-ink-ghost))' }}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Filter tabs */}
          <div
            className="flex gap-1 px-3 py-2"
            style={{ borderBottom: '1px solid rgb(var(--clr-border))' }}
          >
            {[
              { key: 'all', label: 'All' },
              { key: 'unread', label: 'Unread' },
              { key: 'reminder', label: 'Reminders' },
            ].map(f => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className="px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all"
                style={
                  filter === f.key
                    ? { backgroundColor: 'rgb(var(--clr-primary))', color: 'white' }
                    : { color: 'rgb(var(--clr-ink-muted))' }
                }
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* List */}
          <div className="overflow-y-auto" style={{ maxHeight: '340px' }}>
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10">
                <Bell className="w-8 h-8 mb-2 opacity-20" style={{ color: 'rgb(var(--clr-ink))' }} />
                <p className="text-xs" style={{ color: 'rgb(var(--clr-ink-ghost))' }}>
                  {filter === 'unread' ? 'All caught up' : 'No notifications yet'}
                </p>
              </div>
            ) : filtered.map(n => (
              <NotifItem key={n.id || n._id} notif={n} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
