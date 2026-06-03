import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../utils/api';
import { format, parseISO } from 'date-fns';
import { Plus, Search, Filter, ChevronRight } from 'lucide-react';

function StatusBadge({ status }) {
  const map = { scheduled: 'badge-scheduled', confirmed: 'badge-confirmed', completed: 'badge-completed', cancelled: 'badge-cancelled' };
  return <span className={`badge ${map[status] || 'badge-scheduled'}`}>{status}</span>;
}

function ReminderBadge({ sent }) {
  return sent
    ? <span className="badge badge-sent">Sent</span>
    : <span className="badge badge-pending">Pending</span>;
}

const STATUS_FILTERS = ['all', 'scheduled', 'confirmed', 'completed', 'cancelled'];

function StatusFilterButton({ f, status, setStatus }) {
  const isActive = status === f;
  const [hovered, setHovered] = useState(false);

  const activeStyle = {
    backgroundColor: 'rgb(var(--clr-ink))',
    color: '#ffffff',
  };
  const hoverStyle = {
    color: 'rgb(var(--clr-ink))',
    backgroundColor: 'rgb(var(--clr-surface-overlay))',
  };
  const defaultStyle = {
    color: 'rgb(var(--clr-ink-muted))',
    backgroundColor: 'transparent',
  };

  return (
    <button
      key={f}
      onClick={() => setStatus(f)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize"
      style={isActive ? activeStyle : hovered ? hoverStyle : defaultStyle}
    >
      {f}
    </button>
  );
}

export default function Appointments() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [status, setStatus] = useState(searchParams.get('status') || 'all');
  const dateFilter = searchParams.get('date') || '';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (status !== 'all') params.status = status;
      if (dateFilter) params.date = dateFilter;
      const { appointments } = await api.getAppointments(params);
      setAppointments(appointments);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [search, status, dateFilter]);

  useEffect(() => { load(); }, [load]);

  const handleSearch = (e) => {
    e.preventDefault();
    const p = new URLSearchParams(searchParams);
    if (search) p.set('search', search); else p.delete('search');
    setSearchParams(p);
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header actions */}
      <div className="flex items-center gap-3 flex-wrap">
        <form onSubmit={handleSearch} className="flex-1 min-w-48 max-w-xs">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5"
              style={{ color: 'rgb(var(--clr-ink-ghost))' }}
              strokeWidth={2}
            />
            <input
              type="text"
              placeholder="Search by name or phone..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input pl-9 text-xs py-2"
            />
          </div>
        </form>

        <div
          className="flex items-center gap-1 rounded-xl p-1 overflow-x-auto max-w-full"
          style={{
            backgroundColor: 'rgb(var(--clr-surface-raised))',
            border: '1px solid rgb(var(--clr-border))',
          }}
        >
          {STATUS_FILTERS.map(f => (
            <StatusFilterButton key={f} f={f} status={status} setStatus={setStatus} />
          ))}
        </div>

        {dateFilter && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-primary-50 text-primary-700 rounded-lg text-xs font-medium">
            <Filter className="w-3 h-3" />
            {format(new Date(dateFilter + 'T12:00:00'), 'MMM d, yyyy')}
            <button
              onClick={() => { const p = new URLSearchParams(searchParams); p.delete('date'); setSearchParams(p); }}
              className="text-primary-400 hover:text-primary ml-1"
            >x</button>
          </div>
        )}

        <button
          onClick={() => navigate('/appointments/new')}
          className="btn-md btn-primary ml-auto"
        >
          <Plus className="w-4 h-4" strokeWidth={2.5} />
          New appointment
        </button>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid rgb(var(--clr-border))' }}>
                <th className="table-header text-left">Customer</th>
                <th className="table-header text-left hidden sm:table-cell">Phone</th>
                <th className="table-header text-left">Date &amp; time</th>
                <th className="table-header text-left">Status</th>
                <th className="table-header text-left hidden md:table-cell">Reminder</th>
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
              ) : appointments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="table-cell text-center py-16">
                    <p
                      className="text-sm"
                      style={{ color: 'rgb(var(--clr-ink-ghost))' }}
                    >No appointments found.</p>
                    <button onClick={() => navigate('/appointments/new')}
                      className="mt-3 btn-sm btn-primary mx-auto">
                      <Plus className="w-3.5 h-3.5" /> Create one
                    </button>
                  </td>
                </tr>
              ) : appointments.map(appt => (
                <tr
                  key={appt.id}
                  className="table-row cursor-pointer"
                  onClick={() => navigate(`/appointments/${appt.id}`)}
                >
                  <td className="table-cell">
                    <p
                      className="font-medium"
                      style={{ color: 'rgb(var(--clr-ink))' }}
                    >{appt.customer_name}</p>
                    <p
                      className="text-xs sm:hidden"
                      style={{ color: 'rgb(var(--clr-ink-ghost))' }}
                    >{appt.phone}</p>
                  </td>
                  <td
                    className="table-cell hidden sm:table-cell font-mono text-xs"
                    style={{ color: 'rgb(var(--clr-ink-muted))' }}
                  >{appt.phone}</td>
                  <td
                    className="table-cell"
                    style={{ color: 'rgb(var(--clr-ink-secondary))' }}
                  >
                    {format(parseISO(appt.appointment_time), 'MMM d, yyyy')}
                    <span
                      className="block text-xs"
                      style={{ color: 'rgb(var(--clr-ink-ghost))' }}
                    >{format(parseISO(appt.appointment_time), 'h:mm a')}</span>
                  </td>
                  <td className="table-cell"><StatusBadge status={appt.status} /></td>
                  <td className="table-cell hidden md:table-cell"><ReminderBadge sent={appt.reminder_sent} /></td>
                  <td className="table-cell text-right">
                    <ChevronRight
                      className="w-4 h-4 ml-auto"
                      style={{ color: 'rgb(var(--clr-ink-ghost))' }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {appointments.length > 0 && (
          <div
            className="px-5 py-3"
            style={{ borderTop: '1px solid rgb(var(--clr-border))' }}
          >
            <p
              className="text-xs"
              style={{ color: 'rgb(var(--clr-ink-ghost))' }}
            >{appointments.length} appointment{appointments.length !== 1 ? 's' : ''}</p>
          </div>
        )}
      </div>
    </div>
  );
}
