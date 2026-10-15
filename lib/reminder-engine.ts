import type { ReminderFrequency } from '@/models/Task';

const SCHEDULE_HOURS: Record<Exclude<ReminderFrequency, 'NONE'>, number[]> = {
  TWICE_DAILY: [9, 18],
  THRICE_DAILY: [9, 14, 19],
  HOURLY: [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
};

export function getZonedHourSlot(date: Date, timeZone = 'America/New_York') {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hour12: false,
  });

  const parts = Object.fromEntries(
    formatter.formatToParts(date).map((p) => [p.type, p.value])
  );
  const hour = Number(parts.hour) % 24;
  const slotKey = `${parts.year}-${parts.month}-${parts.day}-${String(hour).padStart(2, '0')}`;

  return { hour, slotKey };
}

export function shouldTriggerReminder(params: {
  baseDueDate: Date | string;
  isCompleted: boolean;
  reminderFrequency: ReminderFrequency;
  lastNotifiedAt: Date | string | null;
  now?: Date;
  timeZone?: string;
}): boolean {
  const {
    baseDueDate,
    isCompleted,
    reminderFrequency,
    lastNotifiedAt,
    now = new Date(),
    timeZone = process.env.REMINDER_TIMEZONE || 'America/New_York',
  } = params;

  if (isCompleted || reminderFrequency === 'NONE') return false;

  const dueTime = new Date(baseDueDate).getTime();
  if (now.getTime() <= dueTime) return false;

  if (!lastNotifiedAt) return true;

  const lastDate = new Date(lastNotifiedAt);
  const currentSlot = getZonedHourSlot(now, timeZone);
  const lastSlot = getZonedHourSlot(lastDate, timeZone);

  if (currentSlot.slotKey === lastSlot.slotKey) {
    return false;
  }

  const allowedHours = SCHEDULE_HOURS[reminderFrequency];
  if (allowedHours.includes(currentSlot.hour)) {
    return true;
  }

  const elapsedHours = (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60);
  if (currentSlot.hour >= 8 && currentSlot.hour <= 20) {
    if (reminderFrequency === 'HOURLY' && elapsedHours >= 1) return true;
    if (reminderFrequency === 'THRICE_DAILY' && elapsedHours >= 5) return true;
    if (reminderFrequency === 'TWICE_DAILY' && elapsedHours >= 9) return true;
  }

  return false;
}

export function advanceToNextCalendarMonth(
  baseDueDate: Date | string,
  now = new Date()
): Date {
  const original = new Date(baseDueDate);
  const anchor = new Date(Math.max(original.getTime(), now.getTime()));

  const targetYear = anchor.getFullYear();
  const targetMonth = anchor.getMonth() + 1;
  const originalDay = original.getDate();

  const maxDaysInTargetMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
  const clampedDay = Math.min(originalDay, maxDaysInTargetMonth);

  const nextDate = new Date(original);
  nextDate.setFullYear(targetYear, targetMonth, clampedDay);
  return nextDate;
}
