const { db } = require('../config/database');

/**
 * Check if a proposed appointment time conflicts with existing ones.
 * @param {string} appointment_time - ISO datetime string
 * @param {number} duration_minutes - default 60
 * @param {string|null} exclude_id - appointment to exclude (for edits)
 * @returns {{ hasConflict: boolean, conflicts: object[], suggestions: string[] }}
 */
async function checkConflict(appointment_time, duration_minutes = 60, exclude_id = null) {
  const proposedStart = new Date(appointment_time);
  const proposedEnd = new Date(proposedStart.getTime() + duration_minutes * 60 * 1000);

  const active = await db.appointments.find({ status: { $in: ['scheduled', 'confirmed'] } });

  const conflicts = [];
  for (const appt of active) {
    if (exclude_id && (appt._id === exclude_id || appt.id === exclude_id)) continue;
    const existStart = new Date(appt.appointment_time);
    const existEnd = new Date(existStart.getTime() + (appt.duration_minutes || 60) * 60 * 1000);
    if (proposedStart < existEnd && proposedEnd > existStart) {
      conflicts.push({ id: appt._id, customer_name: appt.customer_name, appointment_time: appt.appointment_time, status: appt.status });
    }
  }

  const suggestions = [];
  if (conflicts.length > 0) {
    const busySlots = active
      .filter(a => !exclude_id || (a._id !== exclude_id && a.id !== exclude_id))
      .map(a => ({
        start: new Date(a.appointment_time),
        end: new Date(new Date(a.appointment_time).getTime() + (a.duration_minutes || 60) * 60 * 1000),
      }));

    const slotMs = duration_minutes * 60 * 1000;
    const bufferMs = 15 * 60 * 1000;
    let candidate = new Date(proposedStart);
    const remainder = candidate.getMinutes() % 15;
    if (remainder > 0) candidate.setMinutes(candidate.getMinutes() + (15 - remainder), 0, 0);

    let attempts = 0;
    while (suggestions.length < 3 && attempts < 96) {
      const candEnd = new Date(candidate.getTime() + slotMs);
      const busy = busySlots.some(s =>
        candidate < new Date(s.end.getTime() + bufferMs) && candEnd > new Date(s.start.getTime() - bufferMs)
      );
      if (!busy && candidate > new Date()) suggestions.push(candidate.toISOString());
      candidate = new Date(candidate.getTime() + 15 * 60 * 1000);
      attempts++;
    }
  }

  return { hasConflict: conflicts.length > 0, conflicts, suggestions };
}

module.exports = { checkConflict };
