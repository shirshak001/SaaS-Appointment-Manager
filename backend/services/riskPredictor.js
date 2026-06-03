const { db } = require('../config/database');

/**
 * calculateRisk
 * Computes a 0-100 risk score for a customer based on their appointment history.
 *
 * Scoring:
 *   +35  per no-show appointment
 *   +25  per cancelled appointment
 *   +15  per unresponded reminder (reminder_sent=false AND appointment_time is in the past)
 *   -10  per completed appointment
 *
 * @param {string} phone - Customer phone number
 * @returns {Promise<{ score: number, level: 'low'|'medium'|'high', reasons: string[] }>}
 */
async function calculateRisk(phone) {
  const appointments = await db.appointments.find({ phone });

  if (appointments.length === 0) {
    return { score: 0, level: 'low', reasons: ['No appointment history found'] };
  }

  const now = new Date().toISOString();
  let rawScore = 0;
  const reasons = [];

  // Counters for reason messages
  let noShowCount       = 0;
  let cancelledCount    = 0;
  let unrespondedCount  = 0;
  let completedCount    = 0;

  for (const appt of appointments) {
    if (appt.status === 'no-show') {
      rawScore += 35;
      noShowCount++;
    } else if (appt.status === 'cancelled') {
      rawScore += 25;
      cancelledCount++;
    } else if (appt.status === 'completed') {
      rawScore -= 10;
      completedCount++;
    }

    // Unresponded reminder: reminder was never sent AND the appointment is already past
    if (appt.reminder_sent === false && appt.appointment_time < now) {
      rawScore += 15;
      unrespondedCount++;
    }
  }

  // Clamp to [0, 100]
  const score = Math.min(100, Math.max(0, rawScore));

  // Determine level
  let level;
  if (score >= 60) {
    level = 'high';
  } else if (score >= 25) {
    level = 'medium';
  } else {
    level = 'low';
  }

  // Build human-readable reasons
  if (noShowCount > 0) {
    reasons.push(`${noShowCount} no-show${noShowCount > 1 ? 's' : ''} on record (+${noShowCount * 35} pts)`);
  }
  if (cancelledCount > 0) {
    reasons.push(`${cancelledCount} cancelled appointment${cancelledCount > 1 ? 's' : ''} (+${cancelledCount * 25} pts)`);
  }
  if (unrespondedCount > 0) {
    reasons.push(`${unrespondedCount} past appointment${unrespondedCount > 1 ? 's' : ''} with no reminder sent (+${unrespondedCount * 15} pts)`);
  }
  if (completedCount > 0) {
    reasons.push(`${completedCount} completed appointment${completedCount > 1 ? 's' : ''} (-${completedCount * 10} pts)`);
  }
  if (reasons.length === 0) {
    reasons.push('No significant risk factors detected');
  }

  return { score, level, reasons };
}

module.exports = { calculateRisk };
