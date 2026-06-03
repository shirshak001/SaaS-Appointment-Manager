import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import { format, parseISO } from 'date-fns';
import { Search, User } from 'lucide-react';
import { SkeletonTable } from '../components/ui/Skeleton';

function RiskBadge({ level }) {
  const map = {
    low:    { label: 'Low risk',    bg: 'rgb(34 197 94 / 0.1)',   color: '#15803D' },
    medium: { label: 'Medium risk', bg: 'rgb(245 158 11 / 0.1)',  color: '#92400E' },
    high:   { label: 'High risk',   bg: 'rgb(239 68 68 / 0.1)',   color: '#B91C1C' },
  };
  const s = map[level] || map.low;
  return (
    <span
      className="badge"
      style={{ backgroundColor: s.bg, color: s.color }}
    >
      {s.label}
    </span>
  );
}

function VisitsBadge({ count }) {
  if (count >= 5) return <span className="badge badge-confirmed">VIP</span>;
  if (count >= 3) return <span className="badge badge-sent">Frequent</span>;
  return null;
}

function computeRiskLevel(customer) {
  const bad = (customer.cancelled || 0) + (customer.no_show || 0);
  if (bad >= 4) return 'high';
  if (bad >= 2) return 'medium';
  return 'low';
}

export default function Customers() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState('all');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { appointments } = await api.getAppointments({ status: 'all' });
      // Group by phone client-side
      const map = {};
      for (const appt of appointments) {
        const key = appt.phone;
        if (!map[key]) {
          map[key] = {
            phone: appt.phone,
            customer_name: appt.customer_name,
            total: 0,
            completed: 0,
            cancelled: 0,
            no_show: 0,
            appointments: [],
          };
        }
        map[key].total++;
        if (appt.status === 'completed') map[key].completed++;
        if (appt.status === 'cancelled') map[key].cancelled++;
        if (appt.status === 'no_show') map[key].no_show++;
        map[key].appointments.push(appt);
      }

      const list = Object.values(map).map(c => {
        const sorted = [...c.appointments].sort((a, b) =>
          new Date(b.appointment_time) - new Date(a.appointment_time)
        );
        const upcoming = sorted.find(a =>
          new Date(a.appointment_time) > new Date() && !['cancelled'].includes(a.status)
        );
        return {
          ...c,
          last_appointment: sorted[0]?.appointment_time,
          next_appointment: upcoming?.appointment_time,
          risk_level: computeRiskLevel(c),
        };
      });

      list.sort((a, b) => b.total - a.total);
      setCustomers(list);
    } catch (err) {
      console.error(err);
    } finally {
      setTimeout(() => setLoading(false), 500);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = customers.filter(c => {
    const matchSearch = !search ||
      c.customer_name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search);
    const matchRisk = riskFilter === 'all' || c.risk_level === riskFilter;
    return matchSearch && matchRisk;
  });

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title">Customers</h1>
          <p className="page-subtitle">Customer directory and appointment history.</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'rgb(var(--clr-ink-ghost))' }} strokeWidth={2} />
          <input
            type="text"
            placeholder="Search by name or phone..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input pl-9"
          />
        </div>

        <div
          className="flex items-center gap-1 rounded-xl p-1"
          style={{ backgroundColor: 'rgb(var(--clr-surface-raised))', border: '1px solid rgb(var(--clr-border))' }}
        >
          {['all', 'high', 'medium', 'low'].map(r => (
            <button
              key={r}
              onClick={() => setRiskFilter(r)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all"
              style={
                riskFilter === r
                  ? { backgroundColor: 'rgb(var(--clr-ink))', color: '#fff' }
                  : { color: 'rgb(var(--clr-ink-muted))' }
              }
            >
              {r === 'all' ? 'All customers' : `${r} risk`}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <SkeletonTable rows={6} cols={5} />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid rgb(var(--clr-border))' }}>
                <th className="table-header text-left">Customer</th>
                <th className="table-header text-left hidden sm:table-cell">Phone</th>
                <th className="table-header text-left hidden md:table-cell">Visits</th>
                <th className="table-header text-left hidden lg:table-cell">Last seen</th>
                <th className="table-header text-left">Risk</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="table-cell text-center py-16" style={{ color: 'rgb(var(--clr-ink-ghost))' }}>
                    No customers found.
                  </td>
                </tr>
              ) : filtered.map(c => (
                <tr
                  key={c.phone}
                  className="table-row cursor-pointer"
                  onClick={() => navigate(`/customers/${encodeURIComponent(c.phone)}`)}
                >
                  <td className="table-cell">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
                        style={{
                          backgroundColor: 'rgb(var(--clr-primary) / 0.1)',
                          color: 'rgb(var(--clr-primary-600))',
                        }}
                      >
                        {c.customer_name[0]}
                      </div>
                      <div>
                        <p className="font-medium text-sm" style={{ color: 'rgb(var(--clr-ink))' }}>
                          {c.customer_name}
                        </p>
                        <div className="flex gap-1 mt-0.5">
                          <VisitsBadge count={c.completed} />
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="table-cell hidden sm:table-cell font-mono text-xs" style={{ color: 'rgb(var(--clr-ink-muted))' }}>
                    {c.phone}
                  </td>
                  <td className="table-cell hidden md:table-cell">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 max-w-20">
                        <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'rgb(var(--clr-border))' }}>
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${Math.min(100, (c.completed / Math.max(c.total, 1)) * 100)}%`,
                              backgroundColor: '#22C55E',
                            }}
                          />
                        </div>
                      </div>
                      <span className="text-xs" style={{ color: 'rgb(var(--clr-ink-secondary))' }}>
                        {c.completed}/{c.total}
                      </span>
                    </div>
                  </td>
                  <td className="table-cell hidden lg:table-cell text-xs" style={{ color: 'rgb(var(--clr-ink-muted))' }}>
                    {c.last_appointment ? format(parseISO(c.last_appointment), 'MMM d, yyyy') : '—'}
                  </td>
                  <td className="table-cell">
                    <RiskBadge level={c.risk_level} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length > 0 && (
            <div className="px-5 py-3" style={{ borderTop: '1px solid rgb(var(--clr-border))' }}>
              <p className="text-xs" style={{ color: 'rgb(var(--clr-ink-ghost))' }}>
                {filtered.length} customer{filtered.length !== 1 ? 's' : ''}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
