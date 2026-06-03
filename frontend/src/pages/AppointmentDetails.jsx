import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import { useToast } from '../context/ToastContext';
import { format, parseISO } from 'date-fns';
import { ArrowLeft, Phone, Calendar, FileText, Send, Pencil, X, Check, Clock, MessageSquare, User, AlertTriangle, Zap } from 'lucide-react';
import ReminderTimeline from '../components/reminders/ReminderTimeline';
import { SkeletonCard } from '../components/ui/Skeleton';

function StatusBadge({ status }) {
  const map = { scheduled: 'badge-scheduled', confirmed: 'badge-confirmed', completed: 'badge-completed', cancelled: 'badge-cancelled' };
  return <span className={`badge ${map[status] || 'badge-scheduled'}`}>{status}</span>;
}

function DeliveryBadge({ status }) {
  const map = { sent: 'badge-sent', delivered: 'badge-sent', pending: 'badge-pending', failed: 'badge-failed' };
  return <span className={`badge ${map[status] || 'badge-pending'}`}>{status}</span>;
}

export default function AppointmentDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [appt, setAppt] = useState(null);
  const [messages, setMessages] = useState([]);
  const [reminderStages, setReminderStages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [savingEdit, setSavingEdit] = useState(false);
  const [sendingReminder, setSendingReminder] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [whatsappReply, setWhatsappReply] = useState(null);
  const [markingNoShow, setMarkingNoShow] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);

  const loadAppt = () => {
    api.getAppointment(id)
      .then(({ appointment, messages, reminderStages: stages }) => {
        setAppt(appointment);
        setMessages(messages);
        if (stages) setReminderStages(stages);
        
        const dateObj = new Date(appointment.appointment_time);
        const yyyy = dateObj.getFullYear();
        const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
        const dd = String(dateObj.getDate()).padStart(2, '0');
        const hh = String(dateObj.getHours()).padStart(2, '0');
        const min = String(dateObj.getMinutes()).padStart(2, '0');

        setEditForm({
          customer_name: appointment.customer_name,
          phone: appointment.phone,
          appointment_date: `${yyyy}-${mm}-${dd}`,
          appointment_time: `${hh}:${min}`,
          notes: appointment.notes || '',
          status: appointment.status,
        });
      })
      .catch(() => addToast({ type: 'error', title: 'Appointment not found' }))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadAppt(); }, [id]);

  const handleSaveEdit = async () => {
    setSavingEdit(true);
    try {
      const localDateTime = new Date(`${editForm.appointment_date}T${editForm.appointment_time}:00`);
      const appointment_time = localDateTime.toISOString();
      const { appointment } = await api.updateAppointment(id, {
        customer_name: editForm.customer_name,
        phone: editForm.phone,
        appointment_time,
        notes: editForm.notes,
        status: editForm.status,
      });
      setAppt(appointment);
      setEditing(false);
      addToast({ type: 'success', title: 'Appointment updated' });
    } catch (err) {
      addToast({ type: 'error', title: 'Update failed', message: err.message });
    } finally {
      setSavingEdit(false);
    }
  };

  const handleSendReminder = async () => {
    setSendingReminder(true);
    try {
      const res = await api.sendReminder(id);
      setAppt(p => ({ ...p, reminder_sent: 1 }));
      const refreshed = await api.getAppointment(id);
      setMessages(refreshed.messages);
      const isDelivered = res.deliveryStatus === 'delivered';
      addToast({
        type: 'success',
        title: isDelivered ? 'Reminder sent' : 'Reminder triggered',
        message: isDelivered
          ? `Reminder sent automatically via WhatsApp.`
          : `Message logged for ${appt.customer_name}.`,
        action: isDelivered
          ? undefined
          : (res.whatsappLink ? { href: res.whatsappLink, label: 'Open in WhatsApp' } : undefined),
        duration: 10000,
      });
    } catch (err) {
      addToast({ type: 'error', title: 'Failed to send reminder', message: err.message });
    } finally {
      setSendingReminder(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm('Cancel this appointment?')) return;
    setCancelling(true);
    try {
      await api.cancelAppointment(id);
      setAppt(p => ({ ...p, status: 'cancelled' }));
      addToast({ type: 'warning', title: 'Appointment cancelled' });
    } catch (err) {
      addToast({ type: 'error', title: 'Error', message: err.message });
    } finally {
      setCancelling(false);
    }
  };

  const handleMarkNoShow = async () => {
    if (!confirm('Mark this appointment as no-show?')) return;
    setMarkingNoShow(true);
    try {
      const { appointment } = await api.updateAppointment(id, { status: 'no_show' });
      setAppt(appointment);
      addToast({ type: 'warning', title: 'Marked as no-show' });
    } catch (err) {
      addToast({ type: 'error', title: 'Error', message: err.message });
    } finally {
      setMarkingNoShow(false);
    }
  };

  const handleWhatsAppReply = async (reply) => {
    const statusMap = { YES: 'confirmed', NO: 'cancelled', RESCHEDULE: 'rescheduled' };
    const newStatus = statusMap[reply];
    try {
      const { appointment } = await api.updateAppointment(id, { status: newStatus });
      setAppt(appointment);
      setWhatsappReply(reply);
      addToast({
        type: reply === 'YES' ? 'success' : reply === 'NO' ? 'warning' : 'info',
        title: `Customer replied: ${reply}`,
        message: `Appointment status → ${newStatus}`,
      });
    } catch (err) {
      addToast({ type: 'error', title: 'Failed to update', message: err.message });
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl space-y-5">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-9 h-9 rounded-lg" style={{ backgroundColor: 'rgb(var(--clr-surface-overlay))' }} />
          <div className="space-y-1.5">
            <div className="h-4 w-40 rounded" style={{ backgroundColor: 'rgb(var(--clr-border))' }} />
            <div className="h-3 w-24 rounded" style={{ backgroundColor: 'rgb(var(--clr-border))' }} />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-4">
            <SkeletonCard lines={4} />
            <SkeletonCard lines={3} />
          </div>
          <div className="space-y-4">
            <SkeletonCard lines={3} />
            <SkeletonCard lines={3} />
          </div>
        </div>
      </div>
    );
  }

  if (!appt) return null;

  const isCancelled = appt.status === 'cancelled';

  return (
    <div className="max-w-4xl animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="btn-sm btn-ghost p-2">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1">
          <h1 className="page-title">{appt.customer_name}</h1>
          <p className="page-subtitle">Appointment details and message history</p>
        </div>
        <StatusBadge status={appt.status} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Info card */}
        <div className="lg:col-span-2 space-y-4">
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <p
                className="text-xs font-semibold uppercase tracking-widest"
                style={{ color: 'rgb(var(--clr-ink-ghost))' }}
              >
                Customer information
              </p>
              {!isCancelled && (
                <button
                  onClick={() => editing ? setEditing(false) : setEditing(true)}
                  className="btn-sm btn-ghost py-1"
                  style={{ color: 'rgb(var(--clr-ink-muted))' }}
                >
                  <Pencil className="w-3.5 h-3.5" />
                  {editing ? 'Cancel edit' : 'Edit'}
                </button>
              )}
            </div>

            {editing ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="input-label">Name</label>
                    <input className="input" value={editForm.customer_name} onChange={e => setEditForm(p => ({...p, customer_name: e.target.value}))} />
                  </div>
                  <div>
                    <label className="input-label">Phone</label>
                    <input className="input font-mono" value={editForm.phone} onChange={e => setEditForm(p => ({...p, phone: e.target.value}))} />
                  </div>
                  <div>
                    <label className="input-label">Date</label>
                    <input type="date" className="input" value={editForm.appointment_date} onChange={e => setEditForm(p => ({...p, appointment_date: e.target.value}))} />
                  </div>
                  <div>
                    <label className="input-label">Time</label>
                    <input type="time" className="input" value={editForm.appointment_time} onChange={e => setEditForm(p => ({...p, appointment_time: e.target.value}))} />
                  </div>
                </div>
                <div>
                  <label className="input-label">Status</label>
                  <select className="input" value={editForm.status} onChange={e => setEditForm(p => ({...p, status: e.target.value}))}>
                    <option value="scheduled">Scheduled</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                <div>
                  <label className="input-label">Notes</label>
                  <textarea className="input resize-none" rows={2} value={editForm.notes} onChange={e => setEditForm(p => ({...p, notes: e.target.value}))} />
                </div>
                <div className="flex gap-3">
                  <button onClick={handleSaveEdit} disabled={savingEdit} className="btn-md btn-primary">
                    {savingEdit ? <><span className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />Saving...</> : <><Check className="w-4 h-4" />Save changes</>}
                  </button>
                  <button onClick={() => setEditing(false)} className="btn-md btn-secondary">Discard</button>
                </div>
              </div>
            ) : (
              <dl className="space-y-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: 'rgb(var(--clr-primary) / 0.1)' }}
                  >
                    <Phone className="w-4 h-4 text-primary" strokeWidth={1.75} />
                  </div>
                  <div>
                    <dt
                      className="text-[10px] font-semibold uppercase tracking-wide"
                      style={{ color: 'rgb(var(--clr-ink-ghost))' }}
                    >
                      Phone
                    </dt>
                    <dd
                      className="text-sm font-medium font-mono mt-0.5"
                      style={{ color: 'rgb(var(--clr-ink))' }}
                    >
                      {appt.phone}
                    </dd>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: 'rgb(var(--clr-surface-overlay))' }}
                  >
                    <Calendar className="w-4 h-4" strokeWidth={1.75} style={{ color: 'rgb(var(--clr-ink-muted))' }} />
                  </div>
                  <div>
                    <dt
                      className="text-[10px] font-semibold uppercase tracking-wide"
                      style={{ color: 'rgb(var(--clr-ink-ghost))' }}
                    >
                      Appointment
                    </dt>
                    <dd
                      className="text-sm font-medium mt-0.5"
                      style={{ color: 'rgb(var(--clr-ink))' }}
                    >
                      {format(parseISO(appt.appointment_time), 'MMMM d, yyyy')}
                    </dd>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: 'rgb(var(--clr-surface-overlay))' }}
                  >
                    <Clock className="w-4 h-4" strokeWidth={1.75} style={{ color: 'rgb(var(--clr-ink-muted))' }} />
                  </div>
                  <div>
                    <dt
                      className="text-[10px] font-semibold uppercase tracking-wide"
                      style={{ color: 'rgb(var(--clr-ink-ghost))' }}
                    >
                      Time
                    </dt>
                    <dd
                      className="text-sm font-medium mt-0.5"
                      style={{ color: 'rgb(var(--clr-ink))' }}
                    >
                      {format(parseISO(appt.appointment_time), 'h:mm a')}
                    </dd>
                  </div>
                </div>
                {appt.notes && (
                  <div className="flex items-start gap-3">
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                      style={{ backgroundColor: 'rgb(var(--clr-surface-overlay))' }}
                    >
                      <FileText className="w-4 h-4" strokeWidth={1.75} style={{ color: 'rgb(var(--clr-ink-muted))' }} />
                    </div>
                    <div>
                      <dt
                        className="text-[10px] font-semibold uppercase tracking-wide"
                        style={{ color: 'rgb(var(--clr-ink-ghost))' }}
                      >
                        Notes
                      </dt>
                      <dd
                        className="text-sm mt-0.5 leading-relaxed"
                        style={{ color: 'rgb(var(--clr-ink-secondary))' }}
                      >
                        {appt.notes}
                      </dd>
                    </div>
                  </div>
                )}
              </dl>
            )}
          </div>

          {/* Message history */}
          <div className="card overflow-hidden">
            <div
              className="flex items-center gap-2 px-5 py-4"
              style={{ borderBottom: '1px solid rgb(var(--clr-border))' }}
            >
              <MessageSquare className="w-4 h-4" strokeWidth={1.75} style={{ color: 'rgb(var(--clr-ink-ghost))' }} />
              <h2 className="text-sm font-semibold" style={{ color: 'rgb(var(--clr-ink))' }}>Message history</h2>
            </div>
            {messages.length === 0 ? (
              <p className="text-sm text-center py-8" style={{ color: 'rgb(var(--clr-ink-ghost))' }}>No messages sent yet</p>
            ) : (
              <div>
                {messages.map((msg, idx) => (
                  <div
                    key={msg.id}
                    className="px-5 py-3.5 flex items-center gap-4"
                    style={idx !== 0 ? { borderTop: '1px solid rgb(var(--clr-border))' } : undefined}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-semibold capitalize" style={{ color: 'rgb(var(--clr-ink-secondary))' }}>
                          {msg.message_type?.replace(/_/g, ' ')}
                        </p>
                        <DeliveryBadge status={msg.delivery_status} />
                      </div>
                      <p className="text-[11px] mt-0.5 truncate" style={{ color: 'rgb(var(--clr-ink-ghost))' }}>
                        {msg.message_body?.split('\n')[0]}
                      </p>
                    </div>
                    <p className="text-[11px] shrink-0" style={{ color: 'rgb(var(--clr-ink-ghost))' }}>
                      {format(parseISO(msg.sent_at), 'MMM d, h:mm a')}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right panel */}
        <div className="space-y-4">

          {/* WhatsApp simulation */}
          {!isCancelled && appt.status !== 'completed' && (
            <div className="card p-5">
              <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'rgb(var(--clr-ink-ghost))' }}>
                Simulate customer reply
              </p>
              <p className="text-xs mb-3 leading-relaxed" style={{ color: 'rgb(var(--clr-ink-muted))' }}>
                Simulate what happens when the customer replies to the WhatsApp confirmation message.
              </p>
              {whatsappReply ? (
                <div
                  className="px-3 py-2.5 rounded-xl text-center"
                  style={{ backgroundColor: 'rgb(var(--clr-surface-overlay))' }}
                >
                  <p className="text-xs font-medium" style={{ color: 'rgb(var(--clr-ink))' }}>
                    Customer replied: <span className="font-bold">{whatsappReply}</span>
                  </p>
                  <p className="text-[11px] mt-0.5" style={{ color: 'rgb(var(--clr-ink-ghost))' }}>
                    Status updated to: {appt.status}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {[{ r: 'YES', label: 'YES', cls: 'btn-secondary' }, { r: 'NO', label: 'NO', cls: 'btn-secondary' }, { r: 'RESCHEDULE', label: 'Reschedule', cls: 'btn-secondary' }].map(({ r, label, cls }) => (
                    <button
                      key={r}
                      onClick={() => handleWhatsAppReply(r)}
                      className={`btn-sm ${cls} text-center justify-center`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Reminder Timeline */}
          <ReminderTimeline
            appointment={appt}
            reminderStages={reminderStages}
            onReminderSent={loadAppt}
          />

          {/* Created at */}
          <div className="card p-5">
            <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'rgb(var(--clr-ink-ghost))' }}>
              Created
            </p>
            <p className="text-sm font-medium" style={{ color: 'rgb(var(--clr-ink))' }}>
              {format(parseISO(appt.created_at), 'MMM d, yyyy')}
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'rgb(var(--clr-ink-ghost))' }}>
              {format(parseISO(appt.created_at), 'h:mm a')}
            </p>
          </div>
        </div>
      </div>
      {/* Floating Collapsible Actions (Bottom Right) */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
        {actionsOpen && (
          <div 
            className="card p-3 shadow-2xl flex flex-col gap-1.5 w-56 mb-1 transition-all animate-fade-in"
            style={{ 
              backgroundColor: 'rgb(var(--clr-surface-overlay) / 0.95)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgb(var(--clr-border))',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 10px 10px -5px rgba(0, 0, 0, 0.2)'
            }}
          >
            <p className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 mb-0.5" style={{ color: 'rgb(var(--clr-ink-ghost))' }}>
              Actions
            </p>
            
            {!isCancelled && appt.status !== 'completed' && appt.status !== 'no_show' && (
              <>
                <button
                  onClick={() => { handleSendReminder(); setActionsOpen(false); }}
                  disabled={sendingReminder}
                  className="btn-sm btn-primary w-full justify-start py-2 px-3"
                >
                  <Send className="w-3.5 h-3.5" strokeWidth={1.75} />
                  {sendingReminder ? 'Sending...' : 'Send reminder now'}
                </button>
                <button
                  onClick={() => { handleMarkNoShow(); setActionsOpen(false); }}
                  disabled={markingNoShow}
                  className="btn-sm btn-secondary w-full justify-start py-2 px-3"
                >
                  <AlertTriangle className="w-3.5 h-3.5" strokeWidth={1.75} />
                  {markingNoShow ? 'Marking...' : 'Mark no-show'}
                </button>
                <button
                  onClick={() => { handleCancel(); setActionsOpen(false); }}
                  disabled={cancelling}
                  className="btn-sm btn-danger w-full justify-start py-2 px-3"
                >
                  <X className="w-3.5 h-3.5" strokeWidth={2} />
                  {cancelling ? 'Cancelling...' : 'Cancel appointment'}
                </button>
              </>
            )}
            
            {(isCancelled || appt.status === 'no_show') && (
              <div className="px-2.5 py-1.5 rounded-lg text-center mb-0.5" style={{ backgroundColor: 'rgb(var(--clr-danger-light))' }}>
                <p className="text-[10px] font-semibold text-danger capitalize">{appt.status.replace('_', '-')}</p>
              </div>
            )}

            <button
              onClick={() => { navigate(`/customers/${encodeURIComponent(appt.phone)}`); setActionsOpen(false); }}
              className="btn-sm btn-ghost w-full justify-start py-2 px-3"
            >
              <User className="w-3.5 h-3.5" strokeWidth={1.75} />
              View customer profile
            </button>
          </div>
        )}

        <button
          onClick={() => setActionsOpen(!actionsOpen)}
          className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all active:scale-95 focus:outline-none hover:scale-105"
          style={{
            backgroundColor: actionsOpen ? 'rgb(var(--clr-ink))' : 'rgb(var(--clr-primary))',
            color: actionsOpen ? 'rgb(var(--clr-surface))' : '#ffffff',
            boxShadow: '0 4px 15px -3px rgb(var(--clr-primary) / 0.4)'
          }}
          title="Appointment Actions"
        >
          <Zap 
            className={`w-5 h-5 transition-transform duration-300 ${actionsOpen ? 'rotate-45' : ''}`} 
            strokeWidth={2.25} 
          />
        </button>
      </div>
    </div>
  );
}
