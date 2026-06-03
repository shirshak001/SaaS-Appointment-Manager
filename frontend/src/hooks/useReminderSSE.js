import { useEffect, useRef, useState, useCallback } from 'react';
import { useToast } from '../context/ToastContext';

export function useReminderSSE(isAuthenticated) {
  const { addToast } = useToast();
  const esRef = useRef(null);
  const [liveNotifs, setLiveNotifs] = useState([]);

  const handleEvent = useCallback((data) => {
    if (data.type === 'reminder') {
      addToast({
        type: 'reminder',
        title: data.title || `Reminder sent to ${data.customerName}`,
        message: data.message,
        duration: 10000,
        action: {
          href: data.whatsappLink,
          label: 'Open in WhatsApp',
        },
      });

      setLiveNotifs(prev => [...prev, {
        id: data.id || `live-${Date.now()}`,
        type: 'reminder',
        title: data.title || `Reminder sent to ${data.customerName}`,
        message: data.message,
        whatsappLink: data.whatsappLink,
        created_at: data.timestamp || new Date().toISOString(),
        read: false,
      }]);
    }
  }, [addToast]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const token = localStorage.getItem('rf_token');
    if (!token) return;

    const es = new EventSource(`/api/events?token=${token}`);
    esRef.current = es;

    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        handleEvent(data);
      } catch (_) {}
    };

    es.onerror = () => { es.close(); };

    return () => { es.close(); };
  }, [isAuthenticated, handleEvent]);

  return { liveNotifs };
}
