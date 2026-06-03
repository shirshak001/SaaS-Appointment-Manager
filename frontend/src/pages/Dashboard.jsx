import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addMonths, subMonths, addDays, isSameDay, isSameMonth, isToday, parseISO
} from 'date-fns';
import {
  CalendarDays, Users, MessageSquare, Clock,
  ChevronLeft, ChevronRight, ArrowRight, TrendingUp
} from 'lucide-react';

/* ---- Stat Card ---- */
function StatCard({ label, value, sub, icon: Icon, iconBg, iconColor }) {
  return (
    <div className="stat-card group">
      <div className="flex items-start justify-between">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: iconBg }}
        >
          <Icon className="w-[18px] h-[18px]" strokeWidth={1.75} style={{ color: iconColor }} />
        </div>
        <TrendingUp
          className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity"
          strokeWidth={1.5}
          style={{ color: 'rgb(var(--clr-ink-ghost))' }}
        />
      </div>
      <div>
        <p className="text-2xl font-display font-semibold" style={{ color: 'rgb(var(--clr-ink))' }}>
          {value}
        </p>
        <p className="text-xs mt-0.5" style={{ color: 'rgb(var(--clr-ink-muted))' }}>{label}</p>
      </div>
      {sub && <p className="text-[11px]" style={{ color: 'rgb(var(--clr-ink-ghost))' }}>{sub}</p>}
    </div>
  );
}

function StatusBadge({ status }) {
  const map = { scheduled: 'badge-scheduled', confirmed: 'badge-confirmed', completed: 'badge-completed', cancelled: 'badge-cancelled' };
  return <span className={`badge ${map[status] || 'badge-scheduled'}`}>{status}</span>;
}

function ReminderBadge({ sent }) {
  return sent ? <span className="badge badge-sent">Sent</span> : <span className="badge badge-pending">Pending</span>;
}

/* ---- Calendar ---- */
function CalendarView({ appointments }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState('month');
  const navigate = useNavigate();

  const apptDates = appointments.map(a => parseISO(a.appointment_time));
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days = [];
  let day = startDate;
  while (day <= endDate) { days.push(day); day = addDays(day, 1); }

  const hasAppt = (d) => apptDates.some(a => isSameDay(a, d));
  const dayAppts = (d) => appointments.filter(a => isSameDay(parseISO(a.appointment_time), d));

  return (
    <div className="card p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold" style={{ color: 'rgb(var(--clr-ink))' }}>
          {view === 'month' ? format(currentDate, 'MMMM yyyy') : format(currentDate, 'EEEE, MMMM d')}
        </h2>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div
            className="flex rounded-lg overflow-hidden"
            style={{ border: '1px solid rgb(var(--clr-border))' }}
          >
            {['month', 'week', 'day'].map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                className="px-3 py-1.5 text-xs font-medium transition-all"
                style={{
                  backgroundColor: view === v ? 'rgb(var(--clr-primary))' : 'transparent',
                  color: view === v ? 'white' : 'rgb(var(--clr-ink-muted))',
                }}
              >
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>
          {/* Month nav */}
          {[subMonths, addMonths].map((fn, i) => (
            <button
              key={i}
              onClick={() => setCurrentDate(p => fn(p, 1))}
              className="p-1.5 rounded-lg transition-all"
              style={{ color: 'rgb(var(--clr-ink-ghost))' }}
            >
              {i === 0 ? <ChevronLeft className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </button>
          ))}
        </div>
      </div>

      {/* Month view */}
      {view === 'month' && (
        <>
          <div className="grid grid-cols-7 mb-1">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
              <div
                key={d}
                className="text-center text-[10px] font-semibold py-1"
                style={{ color: 'rgb(var(--clr-ink-ghost))' }}
              >
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-0.5">
            {days.map((d, i) => {
              const inMonth = isSameMonth(d, currentDate);
              const today = isToday(d);
              const hasA = hasAppt(d);
              const dAppts = dayAppts(d);
              return (
                <div
                  key={i}
                  onClick={() => { if (hasA && inMonth) navigate(`/appointments?date=${format(d, 'yyyy-MM-dd')}`); }}
                  className="relative aspect-square flex flex-col items-center justify-center rounded-lg text-xs transition-all"
                  style={{
                    backgroundColor: today
                      ? 'rgb(var(--clr-primary))'
                      : hasA && inMonth
                        ? 'rgb(var(--clr-primary) / 0.08)'
                        : 'transparent',
                    color: today
                      ? 'white'
                      : hasA && inMonth
                        ? 'rgb(var(--clr-primary-600))'
                        : inMonth
                          ? 'rgb(var(--clr-ink-secondary))'
                          : 'rgb(var(--clr-ink-ghost))',
                    fontWeight: today || (hasA && inMonth) ? 600 : 400,
                    cursor: hasA && inMonth ? 'pointer' : 'default',
                  }}
                >
                  <span>{format(d, 'd')}</span>
                  {hasA && !today && inMonth && (
                    <span
                      className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
                      style={{ backgroundColor: 'rgb(var(--clr-primary))' }}
                    />
                  )}
                  {dAppts.length > 1 && inMonth && !today && (
                    <span
                      className="absolute top-0.5 right-0.5 text-[8px] font-bold rounded px-0.5"
                      style={{
                        backgroundColor: 'rgb(var(--clr-primary) / 0.15)',
                        color: 'rgb(var(--clr-primary-600))',
                      }}
                    >
                      {dAppts.length}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Week view */}
      {view === 'week' && (
        <div className="space-y-1.5">
          {Array.from({ length: 7 }, (_, i) =>
            addDays(startOfWeek(currentDate, { weekStartsOn: 1 }), i)
          ).map(d => {
            const dAppts = dayAppts(d);
            const today = isToday(d);
            return (
              <div
                key={d.toISOString()}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                style={{
                  backgroundColor: today
                    ? 'rgb(var(--clr-primary) / 0.07)'
                    : 'rgb(var(--clr-surface-overlay))',
                }}
              >
                <div className="w-14 shrink-0">
                  <p
                    className="text-xs font-semibold"
                    style={{ color: today ? 'rgb(var(--clr-primary-600))' : 'rgb(var(--clr-ink-secondary))' }}
                  >
                    {format(d, 'EEE')}
                  </p>
                  <p
                    className="text-lg font-display font-semibold leading-tight"
                    style={{ color: today ? 'rgb(var(--clr-primary))' : 'rgb(var(--clr-ink-ghost))' }}
                  >
                    {format(d, 'd')}
                  </p>
                </div>
                <div className="flex-1 space-y-1">
                  {dAppts.length === 0 && (
                    <p className="text-xs" style={{ color: 'rgb(var(--clr-ink-ghost))' }}>No appointments</p>
                  )}
                  {dAppts.map(a => (
                    <div
                      key={a.id}
                      onClick={() => navigate(`/appointments/${a.id}`)}
                      className="flex items-center gap-2 cursor-pointer group"
                    >
                      <div className="w-1 h-5 rounded-full" style={{ backgroundColor: 'rgb(var(--clr-primary))' }} />
                      <span
                        className="text-xs transition-colors"
                        style={{ color: 'rgb(var(--clr-ink-secondary))' }}
                      >
                        {format(parseISO(a.appointment_time), 'h:mm a')} — {a.customer_name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Day view */}
      {view === 'day' && (
        <div className="space-y-2">
          {dayAppts(currentDate).length === 0 ? (
            <div className="text-center py-12 text-sm" style={{ color: 'rgb(var(--clr-ink-ghost))' }}>
              No appointments today
            </div>
          ) : dayAppts(currentDate).map(a => (
            <div
              key={a.id}
              onClick={() => navigate(`/appointments/${a.id}`)}
              className="flex items-center gap-4 p-3 rounded-xl cursor-pointer transition-all"
              style={{
                border: '1px solid rgb(var(--clr-border))',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'rgb(var(--clr-primary) / 0.4)';
                e.currentTarget.style.backgroundColor = 'rgb(var(--clr-primary) / 0.04)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'rgb(var(--clr-border))';
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <div className="text-center shrink-0">
                <p className="text-lg font-display font-semibold" style={{ color: 'rgb(var(--clr-ink))' }}>
                  {format(parseISO(a.appointment_time), 'h:mm')}
                </p>
                <p className="text-[10px]" style={{ color: 'rgb(var(--clr-ink-ghost))' }}>
                  {format(parseISO(a.appointment_time), 'a')}
                </p>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate" style={{ color: 'rgb(var(--clr-ink))' }}>
                  {a.customer_name}
                </p>
                <p className="text-xs" style={{ color: 'rgb(var(--clr-ink-ghost))' }}>{a.phone}</p>
              </div>
              <StatusBadge status={a.status} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---- Dashboard ---- */
export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ total: 0, today: 0, messages: 0, pendingReminders: 0 });
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [statsRes, apptRes] = await Promise.all([
        api.getStats(),
        api.getAppointments({ status: 'all' })
      ]);
      setStats(statsRes);
      setAppointments(apptRes.appointments);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div
          className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: 'rgb(var(--clr-primary))' }}
        />
      </div>
    );
  }

  const recent = appointments.slice(0, 6);

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Stat cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Total appointments" value={stats.total} sub="All time"
          icon={CalendarDays} iconBg="rgb(var(--clr-primary) / 0.1)" iconColor="rgb(var(--clr-primary-600))" />
        <StatCard label="Today" value={stats.today} sub="Scheduled for today"
          icon={Clock} iconBg="rgb(245 158 11 / 0.1)" iconColor="#F59E0B" />
        <StatCard label="Messages sent" value={stats.messages} sub="Confirmations + reminders"
          icon={MessageSquare} iconBg="rgb(34 197 94 / 0.1)" iconColor="#22C55E" />
        <StatCard label="Pending reminders" value={stats.pendingReminders} sub="Upcoming appointments"
          icon={Users} iconBg="rgb(var(--clr-surface-overlay))" iconColor="rgb(var(--clr-ink-muted))" />
      </div>

      {/* Calendar + Table */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
        <div className="xl:col-span-2">
          <CalendarView appointments={appointments} />
        </div>

        <div
          className="xl:col-span-3 card overflow-hidden"
        >
          <div
            className="flex items-center justify-between px-5 py-4"
            style={{ borderBottom: '1px solid rgb(var(--clr-border))' }}
          >
            <h2 className="text-sm font-semibold" style={{ color: 'rgb(var(--clr-ink))' }}>
              Recent appointments
            </h2>
            <button
              onClick={() => navigate('/appointments')}
              className="flex items-center gap-1 text-xs font-medium transition-colors"
              style={{ color: 'rgb(var(--clr-ink-muted))' }}
              onMouseEnter={e => e.currentTarget.style.color = 'rgb(var(--clr-primary-600))'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgb(var(--clr-ink-muted))'}
            >
              View all <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid rgb(var(--clr-border))' }}>
                  <th className="table-header text-left">Customer</th>
                  <th className="table-header text-left hidden sm:table-cell">Time</th>
                  <th className="table-header text-left">Status</th>
                  <th className="table-header text-left hidden md:table-cell">Reminder</th>
                </tr>
              </thead>
              <tbody>
                {recent.map(appt => (
                  <tr
                    key={appt.id}
                    className="table-row cursor-pointer"
                    onClick={() => navigate(`/appointments/${appt.id}`)}
                  >
                    <td className="table-cell">
                      <p className="font-medium text-sm" style={{ color: 'rgb(var(--clr-ink))' }}>
                        {appt.customer_name}
                      </p>
                      <p className="text-xs" style={{ color: 'rgb(var(--clr-ink-ghost))' }}>
                        {appt.phone}
                      </p>
                    </td>
                    <td className="table-cell hidden sm:table-cell" style={{ color: 'rgb(var(--clr-ink-muted))' }}>
                      {format(parseISO(appt.appointment_time), 'MMM d, h:mm a')}
                    </td>
                    <td className="table-cell"><StatusBadge status={appt.status} /></td>
                    <td className="table-cell hidden md:table-cell">
                      <ReminderBadge sent={appt.reminder_sent} />
                    </td>
                  </tr>
                ))}
                {recent.length === 0 && (
                  <tr>
                    <td colSpan={4} className="table-cell text-center py-12"
                      style={{ color: 'rgb(var(--clr-ink-ghost))' }}>
                      No appointments yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
