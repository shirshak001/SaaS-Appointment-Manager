import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import { useToast } from '../context/ToastContext';
import { format } from 'date-fns';
import { User, Phone, Calendar, Clock, FileText, ArrowLeft } from 'lucide-react';

function PreviewCard({ form }) {
  const hasData = form.customer_name || form.phone;
  const apptTime = form.appointment_date && form.appointment_time
    ? new Date(`${form.appointment_date}T${form.appointment_time}`)
    : null;

  return (
    <div className="card p-5 sticky top-0">
      <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: 'rgb(var(--clr-ink-ghost))' }}>Live preview</p>

      <div className="space-y-4">
        <div className="h-px" style={{ backgroundColor: 'rgb(var(--clr-surface-overlay))' }} />

        <div className="flex items-start gap-3">
          <div className="w-8 h-8 bg-primary-50 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
            <User className="w-4 h-4 text-primary" strokeWidth={1.75} />
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'rgb(var(--clr-ink-ghost))' }}>Customer</p>
            <p className="text-sm font-medium mt-0.5" style={{ color: 'rgb(var(--clr-ink))' }}>
              {form.customer_name || <span className="font-normal" style={{ color: 'rgb(var(--clr-ink-muted))' }}>John Smith</span>}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: 'rgb(var(--clr-surface-overlay))' }}>
            <Phone className="w-4 h-4" strokeWidth={1.75} style={{ color: 'rgb(var(--clr-ink-muted))' }} />
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'rgb(var(--clr-ink-ghost))' }}>Phone</p>
            <p className="text-sm font-medium mt-0.5 font-mono" style={{ color: 'rgb(var(--clr-ink))' }}>
              {form.phone || <span className="font-normal font-sans" style={{ color: 'rgb(var(--clr-ink-muted))' }}>+91 9800000000</span>}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: 'rgb(var(--clr-surface-overlay))' }}>
            <Calendar className="w-4 h-4" strokeWidth={1.75} style={{ color: 'rgb(var(--clr-ink-muted))' }} />
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'rgb(var(--clr-ink-ghost))' }}>Appointment</p>
            <p className="text-sm font-medium mt-0.5" style={{ color: 'rgb(var(--clr-ink))' }}>
              {apptTime ? format(apptTime, 'MMMM d, h:mm a') : <span className="font-normal" style={{ color: 'rgb(var(--clr-ink-muted))' }}>June 5, 3:00 PM</span>}
            </p>
          </div>
        </div>

        {form.notes && (
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: 'rgb(var(--clr-surface-overlay))' }}>
              <FileText className="w-4 h-4" strokeWidth={1.75} style={{ color: 'rgb(var(--clr-ink-muted))' }} />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'rgb(var(--clr-ink-ghost))' }}>Notes</p>
              <p className="text-sm mt-0.5 leading-relaxed" style={{ color: 'rgb(var(--clr-ink-secondary))' }}>{form.notes}</p>
            </div>
          </div>
        )}

        <div className="h-px" style={{ backgroundColor: 'rgb(var(--clr-surface-overlay))' }} />

        {/* Message preview */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide mb-2" style={{ color: 'rgb(var(--clr-ink-ghost))' }}>Confirmation message preview</p>
          <div className="rounded-xl p-3 text-xs leading-relaxed" style={{ backgroundColor: 'rgb(var(--clr-surface-overlay))', color: 'rgb(var(--clr-ink-secondary))' }}>
            Hello{form.customer_name ? ` ${form.customer_name.split(' ')[0]}` : ''},<br /><br />
            Your appointment has been confirmed
            {apptTime ? ` for ${format(apptTime, 'h:mm a')} on ${format(apptTime, 'MMMM d')}` : ''}.
            <br /><br />
            Thank you.
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CreateAppointment() {
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [form, setForm] = useState({
    customer_name: '',
    phone: '',
    appointment_date: '',
    appointment_time: '09:00',
    notes: '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const [timeHour, setTimeHour] = useState('09');
  const [timeMinute, setTimeMinute] = useState('00');
  const [timePeriod, setTimePeriod] = useState('AM');

  useEffect(() => {
    let hh = parseInt(timeHour, 10);
    if (timePeriod === 'PM' && hh < 12) hh += 12;
    if (timePeriod === 'AM' && hh === 12) hh = 0;
    const hhStr = hh.toString().padStart(2, '0');
    setForm(p => ({ ...p, appointment_time: `${hhStr}:${timeMinute}` }));
  }, [timeHour, timeMinute, timePeriod]);

  const set = (field, value) => {
    setForm(p => ({ ...p, [field]: value }));
    if (errors[field]) setErrors(p => ({ ...p, [field]: '' }));
  };

  const validate = () => {
    const e = {};
    if (!form.customer_name.trim()) e.customer_name = 'Customer name is required';
    if (!form.phone.trim()) e.phone = 'Phone number is required';
    else if (!/^\+?[\d\s\-()]{7,15}$/.test(form.phone.trim())) e.phone = 'Enter a valid phone number';
    if (!form.appointment_date) e.appointment_date = 'Date is required';
    if (!form.appointment_time) e.appointment_time = 'Time is required';
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const e2 = validate();
    if (Object.keys(e2).length) { setErrors(e2); return; }
    setLoading(true);
    try {
      const appointment_time = `${form.appointment_date}T${form.appointment_time}:00`;
      const res = await api.createAppointment({
        customer_name: form.customer_name.trim(),
        phone: form.phone.trim(),
        appointment_time,
        notes: form.notes.trim(),
      });
      addToast({
        type: 'success',
        title: 'Appointment created',
        message: `Confirmation queued for ${form.customer_name.split(' ')[0]}.`,
        action: res.whatsappLink ? { href: res.whatsappLink, label: 'Send via WhatsApp' } : undefined,
        duration: 8000,
      });
      navigate(`/appointments/${res.appointment.id}`);
    } catch (err) {
      addToast({ type: 'error', title: 'Failed to create appointment', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setForm({ customer_name: '', phone: '', appointment_date: '', appointment_time: '', notes: '' });
    setErrors({});
  };

  return (
    <div className="max-w-5xl animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="btn-sm btn-ghost p-2">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="page-title">New appointment</h1>
          <p className="page-subtitle">Fill in the customer details to schedule an appointment.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Form */}
        <form onSubmit={handleSubmit} className="lg:col-span-3 card p-6 space-y-5">
          <div>
            <label htmlFor="customer_name" className="input-label">Customer name</label>
            <input
              id="customer_name"
              type="text"
              placeholder="John Smith"
              value={form.customer_name}
              onChange={e => set('customer_name', e.target.value)}
              className={`input ${errors.customer_name ? 'border-danger focus:border-danger focus:ring-danger/10' : ''}`}
            />
            {errors.customer_name && <p className="mt-1 text-xs text-danger">{errors.customer_name}</p>}
          </div>

          <div>
            <label htmlFor="phone" className="input-label">Phone number</label>
            <input
              id="phone"
              type="tel"
              placeholder="+91 9800000000"
              value={form.phone}
              onChange={e => set('phone', e.target.value)}
              className={`input font-mono ${errors.phone ? 'border-danger focus:border-danger focus:ring-danger/10' : ''}`}
            />
            {errors.phone && <p className="mt-1 text-xs text-danger">{errors.phone}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="appointment_date" className="input-label">Date</label>
              <input
                id="appointment_date"
                type="date"
                value={form.appointment_date}
                min={new Date().toISOString().split('T')[0]}
                onChange={e => set('appointment_date', e.target.value)}
                className={`input ${errors.appointment_date ? 'border-danger' : ''}`}
              />
              {errors.appointment_date && <p className="mt-1 text-xs text-danger">{errors.appointment_date}</p>}
            </div>
            <div>
              <label className="input-label">Time</label>
              <div className="flex items-center gap-1.5">
                {/* Hour Select */}
                <select
                  value={timeHour}
                  onChange={e => {
                    setTimeHour(e.target.value);
                    if (errors.appointment_time) setErrors(p => ({ ...p, appointment_time: '' }));
                  }}
                  className={`input text-center py-2 px-2 text-xs ${errors.appointment_time ? 'border-danger' : ''}`}
                  style={{ width: '68px', appearance: 'none', backgroundPosition: 'right 0.35rem center' }}
                >
                  {Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0')).map(h => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>

                <span style={{ color: 'rgb(var(--clr-ink-ghost))' }} className="font-semibold text-xs">:</span>

                {/* Minute Select */}
                <select
                  value={timeMinute}
                  onChange={e => {
                    setTimeMinute(e.target.value);
                    if (errors.appointment_time) setErrors(p => ({ ...p, appointment_time: '' }));
                  }}
                  className={`input text-center py-2 px-2 text-xs ${errors.appointment_time ? 'border-danger' : ''}`}
                  style={{ width: '68px', appearance: 'none', backgroundPosition: 'right 0.35rem center' }}
                >
                  {Array.from({ length: 12 }, (_, i) => (i * 5).toString().padStart(2, '0')).map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>

                {/* Period Select */}
                <select
                  value={timePeriod}
                  onChange={e => {
                    setTimePeriod(e.target.value);
                    if (errors.appointment_time) setErrors(p => ({ ...p, appointment_time: '' }));
                  }}
                  className={`input text-center py-2 px-2 text-xs ${errors.appointment_time ? 'border-danger' : ''}`}
                  style={{ width: '72px', appearance: 'none', backgroundPosition: 'right 0.35rem center' }}
                >
                  <option value="AM">AM</option>
                  <option value="PM">PM</option>
                </select>
              </div>
              {errors.appointment_time && <p className="mt-1 text-xs text-danger">{errors.appointment_time}</p>}
            </div>
          </div>

          <div>
            <label htmlFor="notes" className="input-label">
              Notes <span className="font-normal" style={{ color: 'rgb(var(--clr-ink-ghost))' }}>(optional)</span>
            </label>
            <textarea
              id="notes"
              placeholder="Water quality consultation, follow-up visit, etc."
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              rows={3}
              className="input resize-none"
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="btn-lg btn-primary flex-1 sm:flex-none"
            >
              {loading ? (
                <><span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" /> Creating...</>
              ) : 'Create appointment'}
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="btn-lg btn-secondary"
            >
              Reset
            </button>
          </div>
        </form>

        {/* Preview */}
        <div className="lg:col-span-2">
          <PreviewCard form={form} />
        </div>
      </div>
    </div>
  );
}
