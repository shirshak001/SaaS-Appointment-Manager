import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import { format, parseISO } from 'date-fns';
import { ArrowLeft, Phone, Calendar, CheckCircle2, XCircle, Clock, Plus, Lock } from 'lucide-react';
import { SkeletonProfile } from '../components/ui/Skeleton';
import { useToast } from '../context/ToastContext';

function StatusDot({ status }) {
  const colors = {
    completed:  '#22C55E',
    confirmed:  '#3B82F6',
    scheduled:  '#F59E0B',
    cancelled:  '#EF4444',
    no_show:    '#6B7280',
    rescheduled: '#A855F7',
  };
  return <span className="w-2.5 h-2.5 rounded-full shrink-0 mt-1" style={{ backgroundColor: colors[status] || '#6B7280' }} />;
}

function computeRisk(appointments) {
  const bad = appointments.filter(a => ['cancelled', 'no_show'].includes(a.status)).length;
  const completed = appointments.filter(a => a.status === 'completed').length;
  let score = bad * 30 - completed * 10;
  score = Math.max(0, Math.min(100, score));
  const level = score >= 60 ? 'high' : score >= 30 ? 'medium' : 'low';
  const reasons = [];
  const cancellations = appointments.filter(a => a.status === 'cancelled').length;
  const noShows = appointments.filter(a => a.status === 'no_show').length;
  if (noShows > 0) reasons.push(`${noShows} no-show${noShows > 1 ? 's' : ''}`);
  if (cancellations > 0) reasons.push(`${cancellations} cancellation${cancellations > 1 ? 's' : ''}`);
  if (completed >= 5) reasons.push(`${completed} completed visits`);
  return { score, level, reasons };
}

export default function CustomerProfile() {
  const { phone } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [customerName, setCustomerName] = useState('');
  const [note, setNote] = useState('');
  const [notes, setNotes] = useState([]);
  const [addingNote, setAddingNote] = useState(false);

  const decodedPhone = decodeURIComponent(phone);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { appointments: all } = await api.getAppointments({ status: 'all' });
      const filtered = all.filter(a => a.phone === decodedPhone);
      const sorted = [...filtered].sort((a, b) => new Date(a.appointment_time) - new Date(b.appointment_time));
      setAppointments(sorted);
      if (sorted.length > 0) setCustomerName(sorted[0].customer_name);
    } catch (err) {
      console.error(err);
    } finally {
      setTimeout(() => setLoading(false), 500);
    }
  }, [decodedPhone]);

  useEffect(() => { load(); }, [load]);

  const stats = {
    total: appointments.length,
    completed: appointments.filter(a => a.status === 'completed').length,
    cancelled: appointments.filter(a => a.status === 'cancelled').length,
    upcoming: appointments.filter(a => new Date(a.appointment_time) > new Date() && a.status !== 'cancelled').length,
  };

  const risk = computeRisk(appointments);
  const since = appointments[0]?.created_at;
  const next = [...appointments].reverse().find(a => new Date(a.appointment_time) > new Date() && a.status !== 'cancelled');

  const riskStyle = {
    low:    { bg: 'rgb(34 197 94 / 0.1)',  color: '#15803D', label: 'Low Risk' },
    medium: { bg: 'rgb(245 158 11 / 0.1)', color: '#92400E', label: 'Medium Risk' },
    high:   { bg: 'rgb(239 68 68 / 0.1)',  color: '#B91C1C', label: 'High Risk' },
  }[risk.level];

  const handleAddNote = () => {
    if (!note.trim()) return;
    const newNote = {
      id: Date.now(),
      text: note.trim(),
      created_at: new Date().toISOString(),
      staff: 'Admin',
    };
    setNotes(prev => [newNote, ...prev]);
    setNote('');
    setAddingNote(false);
    addToast({ type: 'success', title: 'Note added' });
  };

  if (loading) return (
    <div className="max-w-4xl">
      <SkeletonProfile />
    </div>
  );

  if (appointments.length === 0) return (
    <div className="flex flex-col items-center justify-center py-24">
      <p style={{ color: 'rgb(var(--clr-ink-muted))' }}>No customer found for {decodedPhone}</p>
    </div>
  );

  return (
    <div className="max-w-4xl animate-fade-in space-y-5">
      {/* Back + header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/customers')} className="btn-sm btn-ghost p-2">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1">
          <h1 className="page-title">{customerName}</h1>
          <p className="page-subtitle font-mono">{decodedPhone}</p>
        </div>
        <span className="badge" style={{ backgroundColor: riskStyle.bg, color: riskStyle.color }}>
          {riskStyle.label}
        </span>
        {stats.completed >= 5 && <span className="badge badge-confirmed">VIP</span>}
        {stats.completed >= 3 && stats.completed < 5 && <span className="badge badge-sent">Frequent</span>}
        {risk.level === 'high' && <span className="badge badge-cancelled">High Cancellation Risk</span>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left col */}
        <div className="lg:col-span-2 space-y-5">
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Total', value: stats.total, icon: Calendar, color: 'rgb(var(--clr-primary) / 0.1)', iconColor: 'rgb(var(--clr-primary-600))' },
              { label: 'Completed', value: stats.completed, icon: CheckCircle2, color: 'rgb(34 197 94 / 0.1)', iconColor: '#15803D' },
              { label: 'Cancelled', value: stats.cancelled, icon: XCircle, color: 'rgb(239 68 68 / 0.1)', iconColor: '#B91C1C' },
              { label: 'Upcoming', value: stats.upcoming, icon: Clock, color: 'rgb(245 158 11 / 0.1)', iconColor: '#92400E' },
            ].map(({ label, value, icon: Icon, color, iconColor }) => (
              <div key={label} className="card p-4 text-center">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center mx-auto mb-2" style={{ backgroundColor: color }}>
                  <Icon className="w-4 h-4" strokeWidth={1.75} style={{ color: iconColor }} />
                </div>
                <p className="text-xl font-display font-semibold" style={{ color: 'rgb(var(--clr-ink))' }}>{value}</p>
                <p className="text-xs mt-0.5" style={{ color: 'rgb(var(--clr-ink-muted))' }}>{label}</p>
              </div>
            ))}
          </div>

          {/* Appointment timeline */}
          <div className="card overflow-hidden">
            <div className="px-5 py-4" style={{ borderBottom: '1px solid rgb(var(--clr-border))' }}>
              <h2 className="text-sm font-semibold" style={{ color: 'rgb(var(--clr-ink))' }}>Appointment timeline</h2>
            </div>
            <div className="px-5 py-4">
              {appointments.length === 0 ? (
                <p style={{ color: 'rgb(var(--clr-ink-ghost))' }} className="text-sm text-center py-8">No appointments</p>
              ) : (
                <div className="relative">
                  {/* Vertical line */}
                  <div
                    className="absolute left-2.5 top-0 bottom-0 w-px"
                    style={{ backgroundColor: 'rgb(var(--clr-border))' }}
                  />
                  <div className="space-y-4 pl-8">
                    {appointments.map((appt, i) => {
                      const isPast = new Date(appt.appointment_time) < new Date();
                      return (
                        <div
                          key={appt.id}
                          className="relative cursor-pointer"
                          onClick={() => navigate(`/appointments/${appt.id}`)}
                        >
                          {/* Dot */}
                          <div className="absolute -left-8 top-0.5">
                            <StatusDot status={appt.status} />
                          </div>
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-xs" style={{ color: 'rgb(var(--clr-ink-ghost))' }}>
                                {format(parseISO(appt.appointment_time), 'MMM d, yyyy · h:mm a')}
                              </p>
                              <p className="text-sm font-medium mt-0.5 capitalize" style={{ color: 'rgb(var(--clr-ink-secondary))' }}>
                                {appt.status}{appt.notes ? ` — ${appt.notes}` : ''}
                              </p>
                            </div>
                            {!isPast && (
                              <span className="badge badge-confirmed text-[10px]">Upcoming</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right col */}
        <div className="space-y-4">
          {/* Info card */}
          <div className="card p-5 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'rgb(var(--clr-ink-ghost))' }}>
              Customer info
            </p>
            <div className="space-y-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'rgb(var(--clr-ink-ghost))' }}>Phone</p>
                <p className="text-sm font-mono mt-0.5" style={{ color: 'rgb(var(--clr-ink))' }}>{decodedPhone}</p>
              </div>
              {since && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'rgb(var(--clr-ink-ghost))' }}>Customer since</p>
                  <p className="text-sm mt-0.5" style={{ color: 'rgb(var(--clr-ink))' }}>{format(parseISO(since), 'MMMM yyyy')}</p>
                </div>
              )}
              {next && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'rgb(var(--clr-ink-ghost))' }}>Next appointment</p>
                  <p className="text-sm mt-0.5" style={{ color: 'rgb(var(--clr-ink))' }}>
                    {format(parseISO(next.appointment_time), 'MMM d, h:mm a')}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Risk card */}
          <div className="card p-5">
            <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'rgb(var(--clr-ink-ghost))' }}>
              No-show risk
            </p>
            <div className="flex items-center gap-3 mb-3">
              <div
                className="text-2xl font-display font-semibold"
                style={{ color: riskStyle.color }}
              >
                {risk.score}%
              </div>
              <span className="badge" style={{ backgroundColor: riskStyle.bg, color: riskStyle.color }}>
                {riskStyle.label}
              </span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'rgb(var(--clr-border))' }}>
              <div
                className="h-full rounded-full"
                style={{
                  width: `${risk.score}%`,
                  backgroundColor: risk.level === 'high' ? '#EF4444' : risk.level === 'medium' ? '#F59E0B' : '#22C55E',
                }}
              />
            </div>
            {risk.reasons.length > 0 && (
              <ul className="mt-3 space-y-1">
                {risk.reasons.map((r, i) => (
                  <li key={i} className="text-xs" style={{ color: 'rgb(var(--clr-ink-muted))' }}>• {r}</li>
                ))}
              </ul>
            )}
          </div>

          {/* Notes */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Lock className="w-3.5 h-3.5" style={{ color: 'rgb(var(--clr-ink-ghost))' }} strokeWidth={1.75} />
                <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'rgb(var(--clr-ink-ghost))' }}>
                  Private notes
                </p>
              </div>
              <button onClick={() => setAddingNote(v => !v)} className="btn-sm btn-ghost py-1">
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
            {addingNote && (
              <div className="mb-3 space-y-2">
                <textarea
                  className="input resize-none text-xs"
                  rows={2}
                  placeholder="Add a private note..."
                  value={note}
                  onChange={e => setNote(e.target.value)}
                />
                <div className="flex gap-2">
                  <button onClick={handleAddNote} className="btn-sm btn-primary flex-1">Save</button>
                  <button onClick={() => setAddingNote(false)} className="btn-sm btn-secondary">Cancel</button>
                </div>
              </div>
            )}
            {notes.length === 0 && !addingNote && (
              <p className="text-xs text-center py-4" style={{ color: 'rgb(var(--clr-ink-ghost))' }}>No notes yet</p>
            )}
            <div className="space-y-2">
              {notes.map(n => (
                <div key={n.id} className="px-3 py-2 rounded-xl" style={{ backgroundColor: 'rgb(var(--clr-surface-overlay))' }}>
                  <p className="text-xs" style={{ color: 'rgb(var(--clr-ink-secondary))' }}>{n.text}</p>
                  <p className="text-[10px] mt-1" style={{ color: 'rgb(var(--clr-ink-ghost))' }}>
                    {format(parseISO(n.created_at), 'MMM d, h:mm a')} · {n.staff}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={() => navigate(`/appointments/new`)}
            className="btn-md btn-primary w-full"
          >
            <Plus className="w-4 h-4" /> Book new appointment
          </button>
        </div>
      </div>
    </div>
  );
}
