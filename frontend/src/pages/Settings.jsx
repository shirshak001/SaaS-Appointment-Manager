import { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { useToast } from '../context/ToastContext';
import { Building2, Phone, MapPin, Bell, MessageSquare } from 'lucide-react';

const REMINDER_OPTIONS = [
  { value: 15, label: '15 minutes before' },
  { value: 30, label: '30 minutes before' },
  { value: 60, label: '1 hour before' },
  { value: 120, label: '2 hours before' },
];

export default function Settings() {
  const { addToast } = useToast();
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    business_name: '',
    support_number: '',
    business_address: '',
    reminder_before_minutes: 60,
  });

  useEffect(() => {
    api.getSettings()
      .then(({ settings }) => {
        setSettings(settings);
        setForm({
          business_name: settings.business_name,
          support_number: settings.support_number,
          business_address: settings.business_address || '',
          reminder_before_minutes: settings.reminder_before_minutes,
        });
      })
      .catch(() => addToast({ type: 'error', title: 'Failed to load settings' }))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { settings: updated } = await api.updateSettings({
        ...form,
        reminder_before_minutes: Number(form.reminder_before_minutes),
      });
      setSettings(updated);
      addToast({ type: 'success', title: 'Settings saved' });
    } catch (err) {
      addToast({ type: 'error', title: 'Failed to save settings', message: err.message });
    } finally {
      setSaving(false);
    }
  };

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl animate-fade-in">
      <div className="mb-6">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Configure your business and notification preferences.</p>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        {/* Business info */}
        <div className="card p-5 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Building2 className="w-4 h-4" style={{ color: 'rgb(var(--clr-ink-ghost))' }} strokeWidth={1.75} />
            <h2 className="text-sm font-semibold" style={{ color: 'rgb(var(--clr-ink))' }}>Business information</h2>
          </div>
          <p className="text-xs -mt-2" style={{ color: 'rgb(var(--clr-ink-muted))' }}>Used in outgoing confirmation and reminder messages.</p>

          <div>
            <label className="input-label">Business name</label>
            <input
              type="text"
              className="input"
              placeholder="My Business"
              value={form.business_name}
              onChange={e => set('business_name', e.target.value)}
              required
            />
          </div>

          <div>
            <label className="input-label">
              <span className="flex items-center gap-1.5">
                <Phone className="w-3 h-3" />
                Support number
              </span>
            </label>
            <input
              type="tel"
              className="input font-mono"
              placeholder="+91 9800000000"
              value={form.support_number}
              onChange={e => set('support_number', e.target.value)}
              required
            />
          </div>

          <div>
            <label className="input-label">
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3 h-3" />
                Business address <span className="font-normal" style={{ color: 'rgb(var(--clr-ink-ghost))' }}>(optional)</span>
              </span>
            </label>
            <input
              type="text"
              className="input"
              placeholder="123 Business Street, City"
              value={form.business_address}
              onChange={e => set('business_address', e.target.value)}
            />
          </div>
        </div>

        {/* Reminder settings */}
        <div className="card p-5 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Bell className="w-4 h-4" style={{ color: 'rgb(var(--clr-ink-ghost))' }} strokeWidth={1.75} />
            <h2 className="text-sm font-semibold" style={{ color: 'rgb(var(--clr-ink))' }}>Reminder settings</h2>
          </div>
          <p className="text-xs -mt-2" style={{ color: 'rgb(var(--clr-ink-muted))' }}>The reminder engine runs every 60 seconds and checks for upcoming appointments.</p>

          <div>
            <label className="input-label">Send reminder</label>
            <div className="grid grid-cols-2 gap-2">
              {REMINDER_OPTIONS.map(opt => {
                const isSelected = Number(form.reminder_before_minutes) === opt.value;
                return (
                  <label
                    key={opt.value}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all"
                    style={
                      isSelected
                        ? {
                            borderColor: 'rgb(var(--clr-primary))',
                            backgroundColor: 'rgb(var(--clr-primary) / 0.1)',
                            color: 'rgb(var(--clr-primary-600))',
                          }
                        : {
                            borderColor: 'rgb(var(--clr-border))',
                            color: 'rgb(var(--clr-ink-secondary))',
                          }
                    }
                    onMouseEnter={e => {
                      if (!isSelected) {
                        e.currentTarget.style.borderColor = 'rgb(var(--clr-border-strong))';
                        e.currentTarget.style.backgroundColor = 'rgb(var(--clr-surface-overlay))';
                      }
                    }}
                    onMouseLeave={e => {
                      if (!isSelected) {
                        e.currentTarget.style.borderColor = 'rgb(var(--clr-border))';
                        e.currentTarget.style.backgroundColor = '';
                      }
                    }}
                  >
                    <input
                      type="radio"
                      name="reminder_minutes"
                      value={opt.value}
                      checked={isSelected}
                      onChange={() => set('reminder_before_minutes', opt.value)}
                      className="accent-primary"
                    />
                    <span className="text-xs font-medium">{opt.label}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>



        <div className="flex items-center gap-3">
          <button type="submit" disabled={saving} className="btn-lg btn-primary">
            {saving ? (
              <><span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />Saving...</>
            ) : 'Save settings'}
          </button>
        </div>
      </form>

      {/* Danger Zone */}
      <div className="mt-8 card p-5 space-y-4" style={{ borderColor: 'rgba(239, 68, 68, 0.25)' }}>
        <div>
          <h3 className="text-sm font-semibold text-red-600">Danger Zone</h3>
          <p className="text-xs mt-1" style={{ color: 'rgb(var(--clr-ink-muted))' }}>
            Actions here are permanent and cannot be undone.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3" style={{ borderTop: '1px solid rgb(var(--clr-border))' }}>
          <div>
            <p className="text-xs font-semibold" style={{ color: 'rgb(var(--clr-ink))' }}>Delete All System Data</p>
            <p className="text-[11px] mt-0.5" style={{ color: 'rgb(var(--clr-ink-ghost))' }}>
              Deletes all appointments, notes, messages, and notifications permanently.
            </p>
          </div>
          <button
            type="button"
            onClick={async () => {
              if (window.confirm('Are you absolutely sure you want to delete all appointments and messages? This action is permanent.')) {
                try {
                  await api.resetDatabase();
                  addToast({ type: 'success', title: 'Data cleared', message: 'All appointments and messages have been deleted.' });
                } catch (err) {
                  addToast({ type: 'error', title: 'Failed to reset database', message: err.message });
                }
              }
            }}
            className="px-4 py-2 text-xs font-medium text-white bg-red-600 rounded-xl hover:bg-red-700 transition-colors focus:outline-none"
          >
            Clear System Data
          </button>
        </div>
      </div>
    </div>
  );
}
