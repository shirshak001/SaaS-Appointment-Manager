import { useState, useEffect, useCallback } from 'react';
import { api } from '../utils/api';
import { format, parseISO } from 'date-fns';
import { Download, BarChart2, TrendingUp, Users, CheckCircle2, XCircle } from 'lucide-react';
import { SkeletonStat, SkeletonCard } from '../components/ui/Skeleton';

function MiniBar({ value, max, color }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-2 flex-1">
      <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'rgb(var(--clr-border))' }}>
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-xs w-6 text-right shrink-0" style={{ color: 'rgb(var(--clr-ink-muted))' }}>{value}</span>
    </div>
  );
}

function SummaryCard({ label, value, icon: Icon, color, sub }) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${color}18` }}>
          <Icon className="w-4 h-4" strokeWidth={1.75} style={{ color }} />
        </div>
      </div>
      <p className="text-2xl font-display font-semibold" style={{ color: 'rgb(var(--clr-ink))' }}>{value}</p>
      <p className="text-xs mt-0.5" style={{ color: 'rgb(var(--clr-ink-muted))' }}>{label}</p>
      {sub && <p className="text-[11px] mt-1" style={{ color: 'rgb(var(--clr-ink-ghost))' }}>{sub}</p>}
    </div>
  );
}

function exportCSV(appointments) {
  const headers = ['ID', 'Customer Name', 'Phone', 'Appointment Time', 'Status', 'Reminder Sent', 'Notes', 'Created At'];
  const rows = appointments.map(a => [
    a.id || a._id,
    a.customer_name,
    a.phone,
    format(parseISO(a.appointment_time), 'yyyy-MM-dd HH:mm'),
    a.status,
    a.reminder_sent ? 'Yes' : 'No',
    (a.notes || '').replace(/,/g, ';'),
    a.created_at ? format(parseISO(a.created_at), 'yyyy-MM-dd') : '',
  ]);
  const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `reminderflow-appointments-${format(new Date(), 'yyyy-MM-dd')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

const DATE_PRESETS = [
  { label: 'Last 7 days',  days: 7 },
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 90 days', days: 90 },
  { label: 'All time',     days: 0 },
];

export default function Reports() {
  const [summary, setSummary] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState(3);
  const [statusFilter, setStatusFilter] = useState('all');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { appointments: all } = await api.getAppointments({ status: 'all' });

      // Compute summary client-side
      const total = all.length;
      const completed = all.filter(a => a.status === 'completed').length;
      const cancelled = all.filter(a => a.status === 'cancelled').length;
      const reminderSent = all.filter(a => a.reminder_sent).length;

      // Top customers
      const custMap = {};
      for (const a of all) {
        if (!custMap[a.phone]) custMap[a.phone] = { name: a.customer_name, phone: a.phone, count: 0 };
        custMap[a.phone].count++;
      }
      const topCustomers = Object.values(custMap).sort((a, b) => b.count - a.count).slice(0, 5);

      setSummary({
        total,
        completed,
        cancelled,
        completionRate: total > 0 ? ((completed / total) * 100).toFixed(1) : 0,
        cancellationRate: total > 0 ? ((cancelled / total) * 100).toFixed(1) : 0,
        reminderSuccessRate: total > 0 ? ((reminderSent / total) * 100).toFixed(1) : 0,
        topCustomers,
      });
      setAppointments(all);
    } catch (err) {
      console.error(err);
    } finally {
      setTimeout(() => setLoading(false), 500);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filteredAppts = appointments.filter(a => {
    const matchStatus = statusFilter === 'all' || a.status === statusFilter;
    const preset = DATE_PRESETS[selectedPreset];
    let matchDate = true;
    if (preset.days > 0) {
      const cutoff = new Date(Date.now() - preset.days * 86400000);
      matchDate = new Date(a.appointment_time) >= cutoff;
    }
    return matchStatus && matchDate;
  });

  const handleExport = () => {
    setExporting(true);
    setTimeout(() => {
      exportCSV(filteredAppts);
      setExporting(false);
    }, 200);
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title">Reports</h1>
          <p className="page-subtitle">Analytics summary and data export.</p>
        </div>
        <button
          onClick={handleExport}
          disabled={exporting || loading}
          className="btn-md btn-primary"
        >
          <Download className="w-4 h-4" />
          {exporting ? 'Preparing...' : `Export CSV (${filteredAppts.length})`}
        </button>
      </div>

      {/* Summary cards */}
      {loading ? (
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonStat key={i} />)}
        </div>
      ) : summary && (
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <SummaryCard label="Total appointments" value={summary.total} icon={BarChart2} color="rgb(var(--clr-primary))" />
          <SummaryCard label="Completion rate" value={`${summary.completionRate}%`} sub={`${summary.completed} completed`} icon={CheckCircle2} color="#22C55E" />
          <SummaryCard label="Cancellation rate" value={`${summary.cancellationRate}%`} sub={`${summary.cancelled} cancelled`} icon={XCircle} color="#EF4444" />
          <SummaryCard label="Reminder rate" value={`${summary.reminderSuccessRate}%`} sub="Reminders sent" icon={TrendingUp} color="#F59E0B" />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Top customers */}
        {loading ? (
          <SkeletonCard lines={5} />
        ) : summary && (
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-4 h-4" strokeWidth={1.75} style={{ color: 'rgb(var(--clr-ink-ghost))' }} />
              <h2 className="text-sm font-semibold" style={{ color: 'rgb(var(--clr-ink))' }}>Most active customers</h2>
            </div>
            <div className="space-y-3">
              {summary.topCustomers.map((c, i) => (
                <div key={c.phone} className="flex items-center gap-3">
                  <span className="text-xs w-4 shrink-0" style={{ color: 'rgb(var(--clr-ink-ghost))' }}>
                    {i + 1}
                  </span>
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
                    style={{ backgroundColor: 'rgb(var(--clr-primary) / 0.1)', color: 'rgb(var(--clr-primary-600))' }}
                  >
                    {c.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate" style={{ color: 'rgb(var(--clr-ink))' }}>{c.name}</p>
                    <p className="text-[11px] font-mono" style={{ color: 'rgb(var(--clr-ink-ghost))' }}>{c.phone}</p>
                  </div>
                  <MiniBar value={c.count} max={summary.topCustomers[0].count} color="rgb(var(--clr-primary))" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Status breakdown */}
        {loading ? (
          <div className="lg:col-span-2"><SkeletonCard lines={6} /></div>
        ) : summary && (
          <div className="lg:col-span-2 card p-5">
            <h2 className="text-sm font-semibold mb-4" style={{ color: 'rgb(var(--clr-ink))' }}>Status breakdown</h2>

            {/* Visual bars */}
            <div className="space-y-3 mb-5">
              {[
                { label: 'Completed', key: 'completed', color: '#22C55E' },
                { label: 'Scheduled', key: 'scheduled', color: '#F59E0B' },
                { label: 'Confirmed', key: 'confirmed', color: '#3B82F6' },
                { label: 'Cancelled', key: 'cancelled', color: '#EF4444' },
              ].map(({ label, key, color }) => {
                const count = appointments.filter(a => a.status === key).length;
                return (
                  <div key={key} className="flex items-center gap-3">
                    <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: color }} />
                    <span className="text-xs w-20 shrink-0" style={{ color: 'rgb(var(--clr-ink-secondary))' }}>{label}</span>
                    <MiniBar value={count} max={summary.total} color={color} />
                    <span className="text-xs w-8 shrink-0 text-right" style={{ color: 'rgb(var(--clr-ink-ghost))' }}>
                      {summary.total > 0 ? Math.round((count / summary.total) * 100) : 0}%
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Filters for export */}
            <div className="pt-4" style={{ borderTop: '1px solid rgb(var(--clr-border))' }}>
              <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'rgb(var(--clr-ink-ghost))' }}>
                Export filters
              </p>
              <div className="flex flex-wrap gap-2">
                <div
                  className="flex rounded-xl overflow-hidden"
                  style={{ border: '1px solid rgb(var(--clr-border))' }}
                >
                  {DATE_PRESETS.map((p, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedPreset(i)}
                      className="px-3 py-1.5 text-xs font-medium transition-all"
                      style={
                        selectedPreset === i
                          ? { backgroundColor: 'rgb(var(--clr-ink))', color: 'white' }
                          : { color: 'rgb(var(--clr-ink-muted))' }
                      }
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                <select
                  className="input py-1.5 text-xs w-auto"
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                >
                  <option value="all">All statuses</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <p className="text-xs mt-2" style={{ color: 'rgb(var(--clr-ink-ghost))' }}>
                {filteredAppts.length} record{filteredAppts.length !== 1 ? 's' : ''} will be exported
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
