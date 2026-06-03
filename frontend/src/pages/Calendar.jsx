import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addMonths, subMonths, addDays, isSameDay, isSameMonth, isToday, parseISO,
  startOfDay, endOfDay, addWeeks, subWeeks, eachHourOfInterval
} from 'date-fns';
import { ChevronLeft, ChevronRight, Search, CalendarDays, Plus } from 'lucide-react';
import { SkeletonCalendar } from '../components/ui/Skeleton';

// Status → color mapping
const STATUS_COLORS = {
  confirmed:   { bg: '#22C55E1A', border: '#22C55E', text: '#15803D', dot: '#22C55E' },
  scheduled:   { bg: '#F59E0B1A', border: '#F59E0B', text: '#92400E', dot: '#F59E0B' },
  completed:   { bg: '#3B82F61A', border: '#3B82F6', text: '#1D4ED8', dot: '#3B82F6' },
  cancelled:   { bg: '#EF44441A', border: '#EF4444', text: '#B91C1C', dot: '#EF4444' },
  rescheduled: { bg: '#A855F71A', border: '#A855F7', text: '#7E22CE', dot: '#A855F7' },
  no_show:     { bg: '#6B72801A', border: '#6B7280', text: '#374151', dot: '#6B7280' },
};

function statusColor(status) {
  return STATUS_COLORS[status] || STATUS_COLORS.scheduled;
}

// Quick info popup on hover
function ApptTooltip({ appt, visible }) {
  if (!visible) return null;
  const c = statusColor(appt.status);
  return (
    <div
      className="absolute z-50 left-full top-0 ml-2 w-52 rounded-xl p-3 pointer-events-none"
      style={{
        backgroundColor: 'rgb(var(--clr-surface-raised))',
        border: '1px solid rgb(var(--clr-border-strong))',
        boxShadow: '0 8px 24px rgb(0 0 0 / 0.15)',
      }}
    >
      <p className="text-xs font-semibold mb-2" style={{ color: 'rgb(var(--clr-ink))' }}>
        {appt.customer_name}
      </p>
      <div className="space-y-1">
        <p className="text-[11px]" style={{ color: 'rgb(var(--clr-ink-muted))' }}>
          {format(parseISO(appt.appointment_time), 'h:mm a')}
        </p>
        <p className="text-[11px] font-mono" style={{ color: 'rgb(var(--clr-ink-muted))' }}>{appt.phone}</p>
        <div className="flex items-center gap-1.5 mt-1.5">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c.dot }} />
          <span className="text-[11px] font-medium capitalize" style={{ color: c.text }}>{appt.status}</span>
        </div>
      </div>
    </div>
  );
}

// Appointment event card
function ApptCard({ appt, onClick }) {
  const [hovered, setHovered] = useState(false);
  const c = statusColor(appt.status);
  return (
    <div
      className="relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        onClick={() => onClick(appt.id)}
        className="flex items-center gap-1.5 px-2 py-1 rounded-lg cursor-pointer text-xs font-medium truncate transition-all"
        style={{
          backgroundColor: c.bg,
          borderLeft: `2px solid ${c.border}`,
          color: c.text,
        }}
      >
        <span>{format(parseISO(appt.appointment_time), 'h:mm a')}</span>
        <span className="truncate">{appt.customer_name.split(' ')[0]}</span>
      </div>
      <ApptTooltip appt={appt} visible={hovered} />
    </div>
  );
}

// Month view
function MonthView({ currentDate, appointments, onNavigate }) {
  const navigate = useNavigate();
  const monthStart = startOfMonth(currentDate);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 });
  const days = [];
  let d = startDate;
  while (d <= endDate) { days.push(d); d = addDays(d, 1); }

  const dayAppts = (day) => appointments.filter(a => isSameDay(parseISO(a.appointment_time), day));

  return (
    <div>
      {/* Day headers */}
      <div className="grid grid-cols-7 border-b" style={{ borderColor: 'rgb(var(--clr-border))' }}>
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
          <div
            key={d}
            className="py-2 text-center text-[10px] font-semibold uppercase tracking-widest"
            style={{ color: 'rgb(var(--clr-ink-ghost))' }}
          >
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7">
        {days.map((day, i) => {
          const inMonth = isSameMonth(day, currentDate);
          const today = isToday(day);
          const appts = dayAppts(day);
          const isWeekend = day.getDay() === 0 || day.getDay() === 6;
          return (
            <div
              key={i}
              className="min-h-24 p-1.5 flex flex-col"
              style={{
                borderRight: '1px solid rgb(var(--clr-border))',
                borderBottom: '1px solid rgb(var(--clr-border))',
                backgroundColor: isWeekend && inMonth
                  ? 'rgb(var(--clr-surface-overlay))'
                  : !inMonth
                    ? 'rgb(var(--clr-surface) / 0.5)'
                    : 'transparent',
              }}
            >
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium mb-1 ml-auto"
                style={{
                  backgroundColor: today ? 'rgb(var(--clr-primary))' : 'transparent',
                  color: today ? 'white' : inMonth ? 'rgb(var(--clr-ink-secondary))' : 'rgb(var(--clr-ink-ghost))',
                  fontWeight: today ? 700 : 400,
                }}
              >
                {format(day, 'd')}
              </div>
              <div className="space-y-0.5 flex-1">
                {appts.slice(0, 2).map(a => (
                  <ApptCard key={a.id} appt={a} onClick={id => navigate(`/appointments/${id}`)} />
                ))}
                {appts.length > 2 && (
                  <p className="text-[10px] px-1" style={{ color: 'rgb(var(--clr-ink-ghost))' }}>
                    +{appts.length - 2} more
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Week view — time grid
function WeekView({ currentDate, appointments, onNavigate }) {
  const navigate = useNavigate();
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const hours = Array.from({ length: 13 }, (_, i) => i + 8); // 8am - 8pm

  const apptAt = (day, hour) => appointments.filter(a => {
    const t = parseISO(a.appointment_time);
    return isSameDay(t, day) && t.getHours() === hour;
  });

  return (
    <div className="overflow-x-auto">
      <div style={{ minWidth: '700px' }}>
        {/* Header */}
        <div className="grid grid-cols-8 border-b" style={{ borderColor: 'rgb(var(--clr-border))' }}>
          <div className="py-3" />
          {weekDays.map(d => {
            const today = isToday(d);
            const isWeekend = d.getDay() === 0 || d.getDay() === 6;
            return (
              <div
                key={d.toISOString()}
                className="py-3 text-center"
                style={{ opacity: isWeekend ? 0.6 : 1 }}
              >
                <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'rgb(var(--clr-ink-ghost))' }}>
                  {format(d, 'EEE')}
                </p>
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-semibold mx-auto mt-1"
                  style={{
                    backgroundColor: today ? 'rgb(var(--clr-primary))' : 'transparent',
                    color: today ? 'white' : 'rgb(var(--clr-ink))',
                  }}
                >
                  {format(d, 'd')}
                </div>
              </div>
            );
          })}
        </div>

        {/* Time grid */}
        {hours.map(hour => (
          <div key={hour} className="grid grid-cols-8" style={{ borderBottom: '1px solid rgb(var(--clr-border))' }}>
            <div
              className="py-3 px-3 text-[10px] text-right"
              style={{ color: 'rgb(var(--clr-ink-ghost))' }}
            >
              {hour === 12 ? '12pm' : hour > 12 ? `${hour - 12}pm` : `${hour}am`}
            </div>
            {weekDays.map(d => {
              const appts = apptAt(d, hour);
              return (
                <div
                  key={d.toISOString()}
                  className="py-1 px-1 min-h-10 space-y-0.5"
                  style={{
                    borderLeft: '1px solid rgb(var(--clr-border))',
                    backgroundColor: isToday(d) ? 'rgb(var(--clr-primary) / 0.02)' : 'transparent',
                  }}
                >
                  {appts.map(a => (
                    <ApptCard key={a.id} appt={a} onClick={id => navigate(`/appointments/${id}`)} />
                  ))}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// Day view
function DayView({ currentDate, appointments, onNavigate }) {
  const navigate = useNavigate();
  const hours = Array.from({ length: 13 }, (_, i) => i + 8);
  const dayAppts = (hour) => appointments.filter(a => {
    const t = parseISO(a.appointment_time);
    return isSameDay(t, currentDate) && t.getHours() === hour;
  });

  return (
    <div>
      <div
        className="text-center py-3 border-b"
        style={{ borderColor: 'rgb(var(--clr-border))' }}
      >
        <p className="text-sm font-semibold" style={{ color: 'rgb(var(--clr-ink))' }}>
          {format(currentDate, 'EEEE, MMMM d')}
        </p>
      </div>
      {hours.map(hour => {
        const appts = dayAppts(hour);
        return (
          <div
            key={hour}
            className="flex"
            style={{ borderBottom: '1px solid rgb(var(--clr-border))' }}
          >
            <div
              className="w-16 shrink-0 py-3 px-3 text-[10px] text-right"
              style={{ color: 'rgb(var(--clr-ink-ghost))' }}
            >
              {hour === 12 ? '12pm' : hour > 12 ? `${hour - 12}pm` : `${hour}am`}
            </div>
            <div
              className="flex-1 py-1 px-2 min-h-12 space-y-1"
              style={{ borderLeft: '1px solid rgb(var(--clr-border))' }}
            >
              {appts.map(a => (
                <div
                  key={a.id}
                  onClick={() => navigate(`/appointments/${a.id}`)}
                  className="flex items-center gap-3 p-2 rounded-xl cursor-pointer transition-all"
                  style={{
                    backgroundColor: statusColor(a.status).bg,
                    borderLeft: `3px solid ${statusColor(a.status).border}`,
                  }}
                >
                  <div>
                    <p className="text-sm font-semibold" style={{ color: statusColor(a.status).text }}>
                      {a.customer_name}
                    </p>
                    <p className="text-xs" style={{ color: 'rgb(var(--clr-ink-muted))' }}>
                      {format(parseISO(a.appointment_time), 'h:mm a')} · {a.phone}
                    </p>
                  </div>
                  <span
                    className="ml-auto badge capitalize"
                    style={{
                      backgroundColor: statusColor(a.status).bg,
                      color: statusColor(a.status).text,
                      border: `1px solid ${statusColor(a.status).border}`,
                    }}
                  >
                    {a.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Legend
function Legend() {
  const items = [
    { label: 'Confirmed', color: '#22C55E' },
    { label: 'Pending', color: '#F59E0B' },
    { label: 'Completed', color: '#3B82F6' },
    { label: 'Cancelled', color: '#EF4444' },
    { label: 'Rescheduled', color: '#A855F7' },
    { label: 'No-show', color: '#6B7280' },
  ];
  return (
    <div className="flex flex-wrap items-center gap-3">
      {items.map(({ label, color }) => (
        <div key={label} className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: color }} />
          <span className="text-xs" style={{ color: 'rgb(var(--clr-ink-muted))' }}>{label}</span>
        </div>
      ))}
    </div>
  );
}

export default function Calendar() {
  const navigate = useNavigate();
  const [view, setView] = useState('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { appointments } = await api.getAppointments({ status: 'all' });
      setAppointments(appointments);
    } catch (err) {
      console.error(err);
    } finally {
      // Delay to show skeleton briefly
      setTimeout(() => setLoading(false), 600);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const navigate_date = (dir) => {
    setCurrentDate(prev => {
      if (view === 'month') return dir === 'prev' ? subMonths(prev, 1) : addMonths(prev, 1);
      if (view === 'week') return dir === 'prev' ? subWeeks(prev, 1) : addWeeks(prev, 1);
      return dir === 'prev' ? addDays(prev, -1) : addDays(prev, 1);
    });
  };

  const filteredAppts = search
    ? appointments.filter(a =>
        a.customer_name.toLowerCase().includes(search.toLowerCase()) ||
        a.phone.includes(search)
      )
    : appointments;

  const headerLabel = () => {
    if (view === 'month') return format(currentDate, 'MMMM yyyy');
    if (view === 'week') {
      const ws = startOfWeek(currentDate, { weekStartsOn: 1 });
      const we = endOfWeek(currentDate, { weekStartsOn: 1 });
      return `${format(ws, 'MMM d')} – ${format(we, 'MMM d, yyyy')}`;
    }
    return format(currentDate, 'EEEE, MMMM d, yyyy');
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1">
          <h1 className="page-title">Calendar</h1>
          <p className="page-subtitle">Visual schedule view of all appointments.</p>
        </div>
        <button onClick={() => navigate('/appointments/new')} className="btn-md btn-primary">
          <Plus className="w-4 h-4" /> New appointment
        </button>
      </div>

      {/* Controls */}
      <div className="card overflow-hidden">
        <div
          className="flex flex-wrap items-center justify-between gap-3 px-5 py-3"
          style={{ borderBottom: '1px solid rgb(var(--clr-border))' }}
        >
          {/* Date nav */}
          <div className="flex items-center gap-2">
            <button onClick={() => navigate_date('prev')} className="btn-sm btn-ghost p-2">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <h2 className="text-sm font-semibold min-w-40 text-center" style={{ color: 'rgb(var(--clr-ink))' }}>
              {headerLabel()}
            </h2>
            <button onClick={() => navigate_date('next')} className="btn-sm btn-ghost p-2">
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentDate(new Date())}
              className="btn-sm btn-secondary ml-2"
            >
              Today
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'rgb(var(--clr-ink-ghost))' }} />
            <input
              type="text"
              placeholder="Search in calendar..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input pl-9 text-xs w-44 py-1.5"
            />
          </div>

          {/* View toggle */}
          <div
            className="flex rounded-xl overflow-hidden"
            style={{ border: '1px solid rgb(var(--clr-border))' }}
          >
            {['month', 'week', 'day'].map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                className="px-4 py-1.5 text-xs font-medium capitalize transition-all"
                style={{
                  backgroundColor: view === v ? 'rgb(var(--clr-primary))' : 'transparent',
                  color: view === v ? 'white' : 'rgb(var(--clr-ink-muted))',
                }}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        {/* Calendar body */}
        {loading ? (
          <div className="p-5"><SkeletonCalendar /></div>
        ) : (
          <>
            {view === 'month' && <MonthView currentDate={currentDate} appointments={filteredAppts} />}
            {view === 'week' && <WeekView currentDate={currentDate} appointments={filteredAppts} />}
            {view === 'day' && <DayView currentDate={currentDate} appointments={filteredAppts} />}
          </>
        )}

        {/* Legend */}
        <div
          className="px-5 py-3"
          style={{ borderTop: '1px solid rgb(var(--clr-border))' }}
        >
          <Legend />
        </div>
      </div>
    </div>
  );
}
