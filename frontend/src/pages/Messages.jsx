import { useState, useEffect, useCallback } from 'react';
import { api } from '../utils/api';
import { format, parseISO } from 'date-fns';
import { ExternalLink } from 'lucide-react';

function DeliveryBadge({ status }) {
  const map = { sent: 'badge-sent', delivered: 'badge-sent', pending: 'badge-pending', failed: 'badge-failed' };
  return <span className={`badge ${map[status] || 'badge-pending'}`}>{status}</span>;
}

function TypeBadge({ type }) {
  return (
    <span className={`badge ${type === 'reminder' ? 'badge-confirmed' : 'badge-scheduled'}`}>{type}</span>
  );
}

const FILTERS = [
  { key: '', label: 'All messages' },
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'This week' },
];

const TYPE_FILTERS = [
  { key: '', label: 'All types' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'failed', label: 'Failed' },
];

export default function Messages() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [hoveredFilterKey, setHoveredFilterKey] = useState(null);
  const [hoveredTypeFilterKey, setHoveredTypeFilterKey] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filter) params.filter = filter;
      if (typeFilter) params.type = typeFilter;
      const { messages } = await api.getMessages(params);
      setMessages(messages);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [filter, typeFilter]);

  useEffect(() => { load(); }, [load]);

  const generateWaLink = (phone, body) => {
    let cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      cleaned = '91' + cleaned;
    }
    return `https://wa.me/${cleaned}?text=${encodeURIComponent(body)}`;
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div
          className="flex items-center gap-1 rounded-xl p-1"
          style={{
            backgroundColor: 'rgb(var(--clr-surface-raised))',
            border: '1px solid rgb(var(--clr-border))',
          }}
        >
          {FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              onMouseEnter={() => setHoveredFilterKey(f.key)}
              onMouseLeave={() => setHoveredFilterKey(null)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={
                filter === f.key
                  ? { backgroundColor: 'rgb(var(--clr-ink))', color: 'rgb(var(--clr-surface))' }
                  : hoveredFilterKey === f.key
                  ? { color: 'rgb(var(--clr-ink))', backgroundColor: 'rgb(var(--clr-surface-overlay))' }
                  : { color: 'rgb(var(--clr-ink-muted))', backgroundColor: 'transparent' }
              }
            >
              {f.label}
            </button>
          ))}
        </div>

        <div
          className="flex items-center gap-1 rounded-xl p-1"
          style={{
            backgroundColor: 'rgb(var(--clr-surface-raised))',
            border: '1px solid rgb(var(--clr-border))',
          }}
        >
          {TYPE_FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setTypeFilter(f.key)}
              onMouseEnter={() => setHoveredTypeFilterKey(f.key)}
              onMouseLeave={() => setHoveredTypeFilterKey(null)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={
                typeFilter === f.key
                  ? { backgroundColor: 'rgb(var(--clr-ink))', color: 'rgb(var(--clr-surface))' }
                  : hoveredTypeFilterKey === f.key
                  ? { color: 'rgb(var(--clr-ink))', backgroundColor: 'rgb(var(--clr-surface-overlay))' }
                  : { color: 'rgb(var(--clr-ink-muted))', backgroundColor: 'transparent' }
              }
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid rgb(var(--clr-border))' }}>
                <th className="table-header text-left">Customer</th>
                <th className="table-header text-left hidden sm:table-cell">Phone</th>
                <th className="table-header text-left">Type</th>
                <th className="table-header text-left">Status</th>
                <th className="table-header text-left hidden md:table-cell">Sent at</th>
                <th className="table-header text-right"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="table-cell text-center py-16">
                    <div
                      className="flex items-center justify-center gap-2"
                      style={{ color: 'rgb(var(--clr-ink-ghost))' }}
                    >
                      <div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                      <span className="text-sm">Loading...</span>
                    </div>
                  </td>
                </tr>
              ) : messages.length === 0 ? (
                <tr>
                  <td colSpan={6} className="table-cell text-center py-16">
                    <p className="text-sm" style={{ color: 'rgb(var(--clr-ink-ghost))' }}>No messages found.</p>
                  </td>
                </tr>
              ) : messages.map(msg => (
                <>
                  <tr
                    key={msg.id}
                    className="table-row cursor-pointer"
                    onClick={() => setExpandedId(expandedId === msg.id ? null : msg.id)}
                  >
                    <td className="table-cell">
                      <p className="font-medium" style={{ color: 'rgb(var(--clr-ink))' }}>{msg.customer_name}</p>
                    </td>
                    <td
                      className="table-cell hidden sm:table-cell font-mono text-xs"
                      style={{ color: 'rgb(var(--clr-ink-muted))' }}
                    >
                      {msg.phone}
                    </td>
                    <td className="table-cell"><TypeBadge type={msg.message_type} /></td>
                    <td className="table-cell"><DeliveryBadge status={msg.delivery_status} /></td>
                    <td
                      className="table-cell hidden md:table-cell text-xs"
                      style={{ color: 'rgb(var(--clr-ink-muted))' }}
                    >
                      {format(parseISO(msg.sent_at), 'MMM d, h:mm a')}
                    </td>
                    <td className="table-cell text-right">
                      <a
                        href={generateWaLink(msg.phone, msg.message_body)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        title="Open in WhatsApp"
                        className="inline-flex items-center gap-1 text-xs font-medium"
                        style={{ color: 'rgb(var(--clr-primary))' }}
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">WhatsApp</span>
                      </a>
                    </td>
                  </tr>
                  {expandedId === msg.id && (
                    <tr key={`${msg.id}-expand`} style={{ backgroundColor: 'rgb(var(--clr-surface-overlay))' }}>
                      <td colSpan={6} className="px-5 py-3">
                        <p
                          className="text-xs font-semibold uppercase tracking-wide mb-1.5"
                          style={{ color: 'rgb(var(--clr-ink-ghost))' }}
                        >
                          Message content
                        </p>
                        <p
                          className="text-xs whitespace-pre-line leading-relaxed"
                          style={{ color: 'rgb(var(--clr-ink-secondary))' }}
                        >
                          {msg.message_body}
                        </p>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>

        {messages.length > 0 && (
          <div
            className="px-5 py-3"
            style={{ borderTop: '1px solid rgb(var(--clr-border))' }}
          >
            <p className="text-xs" style={{ color: 'rgb(var(--clr-ink-ghost))' }}>
              {messages.length} message{messages.length !== 1 ? 's' : ''}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
