import { Check, Clock, Send } from 'lucide-react';
import { api } from '../../utils/api';
import { useToast } from '../../context/ToastContext';
import { useState } from 'react';

const STAGES = [
  { key: 'reminder_24h', label: '24-hour reminder',  description: 'Sent 24 hours before appointment',    stage: '24h' },
  { key: 'reminder_1h',  label: '1-hour reminder',   description: 'Sent 1 hour before appointment',      stage: '1h'  },
  { key: 'reminder_15m', label: '15-minute reminder', description: 'Sent 15 minutes before appointment',  stage: '15m' },
];

export default function ReminderTimeline({ appointment, reminderStages = [], onReminderSent }) {
  const { addToast } = useToast();
  const [sending, setSending] = useState(false);

  const handleManualSend = async () => {
    setSending(true);
    try {
      const res = await api.sendReminder(appointment.id);
      const isDelivered = res.deliveryStatus === 'delivered';
      addToast({
        type: 'success',
        title: isDelivered ? 'Reminder sent' : 'Reminder triggered',
        message: isDelivered
          ? 'Reminder sent automatically.'
          : 'WhatsApp message queued.',
        action: isDelivered
          ? undefined
          : (res.whatsappLink ? { href: res.whatsappLink, label: 'Open WhatsApp' } : undefined),
        duration: 8000,
      });
      onReminderSent?.();
    } catch (err) {
      addToast({ type: 'error', title: 'Failed to send reminder', message: err.message });
    } finally {
      setSending(false);
    }
  };

  // Use reminderStages from API if available, otherwise fall back to appointment fields
  const stages = reminderStages.length > 0 ? reminderStages : STAGES.map(s => ({
    ...s,
    sent: !!appointment?.[s.key],
  }));

  const sentCount = stages.filter(s => s.sent).length;

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold" style={{ color: 'rgb(var(--clr-ink))' }}>
            Reminder timeline
          </h3>
          <p className="text-xs mt-0.5" style={{ color: 'rgb(var(--clr-ink-ghost))' }}>
            {sentCount}/{stages.length} stages sent
          </p>
        </div>
        <button
          onClick={handleManualSend}
          disabled={sending}
          className="btn-sm btn-secondary gap-1.5"
        >
          <Send className="w-3 h-3" strokeWidth={2} />
          {sending ? 'Sending...' : 'Send now'}
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-1 rounded-full mb-5 overflow-hidden" style={{ backgroundColor: 'rgb(var(--clr-border))' }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${(sentCount / stages.length) * 100}%`,
            backgroundColor: sentCount === stages.length ? '#22C55E' : 'rgb(var(--clr-primary))',
          }}
        />
      </div>

      <div className="relative">
        {/* Vertical connector */}
        <div
          className="absolute left-3.5 top-4 bottom-4 w-px"
          style={{ backgroundColor: 'rgb(var(--clr-border))' }}
        />
        <div className="space-y-4">
          {stages.map((stage, i) => (
            <div key={stage.key || i} className="flex items-start gap-4 relative">
              {/* Stage icon */}
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 z-10"
                style={{
                  backgroundColor: stage.sent ? '#22C55E' : 'rgb(var(--clr-surface-overlay))',
                  border: `2px solid ${stage.sent ? '#22C55E' : 'rgb(var(--clr-border-strong))'}`,
                }}
              >
                {stage.sent
                  ? <Check className="w-3 h-3 text-white" strokeWidth={3} />
                  : <Clock className="w-3 h-3" strokeWidth={1.75} style={{ color: 'rgb(var(--clr-ink-ghost))' }} />
                }
              </div>

              <div className="flex-1 pb-1">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-medium" style={{ color: 'rgb(var(--clr-ink))' }}>
                    {stage.label}
                  </p>
                  {stage.sent ? (
                    <span className="badge badge-sent text-[10px]">Sent</span>
                  ) : (
                    <span className="badge badge-pending text-[10px]">Pending</span>
                  )}
                </div>
                <p className="text-[11px] mt-0.5" style={{ color: 'rgb(var(--clr-ink-ghost))' }}>
                  {stage.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
