import type { GFClass, ClassFormData } from './types';
import { HOLIDAYS_2026, MONTH_NAMES } from './constants';

export function isHoliday(date: Date): boolean {
  return HOLIDAYS_2026.has(date.toISOString().split('T')[0]);
}

export function generateRecurringClasses(form: ClassFormData): GFClass[] {
  const classes: GFClass[] = [];
  const start = new Date(form.startDate + 'T00:00:00');
  const end   = new Date(form.endDate   + 'T00:00:00');
  const cur = new Date(start);

  while (cur <= end) {
    const dow = cur.getDay();
    if (form.selectedDays.includes(dow)) {
      if (form.excludeHolidays && isHoliday(cur)) {
        cur.setDate(cur.getDate() + 1);
        continue;
      }
      const dateStr = cur.toISOString().split('T')[0];
      classes.push({
        id: `${Date.now()}-${dateStr}-${dow}`,
        title: form.title,
        description: form.description,
        instructor: form.instructorId!,
        time: form.time,
        duration: parseInt(form.duration),
        date: dateStr,
        color: form.color,
        capacity: parseInt(form.capacity),
        enrolled: 0,
        recurring: true,
      });
    }
    cur.setDate(cur.getDate() + 1);
  }

  return classes;
}

export function countRecurringPreview(form: ClassFormData): number {
  if (!form.isRecurring || !form.startDate || !form.endDate || form.selectedDays.length === 0) return 0;
  const start = new Date(form.startDate + 'T00:00:00');
  const end   = new Date(form.endDate   + 'T00:00:00');
  let count = 0;
  const cur = new Date(start);
  while (cur <= end) {
    if (form.selectedDays.includes(cur.getDay())) {
      if (!form.excludeHolidays || !isHoliday(cur)) count++;
    }
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

export function weekLabel(weekStart: Date): string {
  const we = new Date(weekStart);
  we.setDate(we.getDate() + 6);
  const sameMonth = weekStart.getMonth() === we.getMonth();
  if (sameMonth) {
    return `${weekStart.getDate()}–${we.getDate()} ${MONTH_NAMES[weekStart.getMonth()]} ${weekStart.getFullYear()}`;
  }
  return `${weekStart.getDate()} ${MONTH_NAMES[weekStart.getMonth()].slice(0, 3)} – ${we.getDate()} ${MONTH_NAMES[we.getMonth()].slice(0, 3)} ${we.getFullYear()}`;
}

export function monthLabel(year: number, month: number): string {
  return `${MONTH_NAMES[month]} ${year}`;
}

export function getWeekStart(date: Date): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
}

export function formatHour(hour: number): string {
  if (hour > 12) return `${hour - 12}pm`;
  if (hour === 12) return '12pm';
  return `${hour}am`;
}

export function getClassesForDayHour(classes: GFClass[], date: Date, hour: number): GFClass[] {
  const ds = date.toISOString().split('T')[0];
  return classes.filter((c) => {
    if (c.date !== ds) return false;
    return parseInt(c.time.split(':')[0]) === hour;
  });
}

export function getClassesForDate(classes: GFClass[], date: Date): GFClass[] {
  const ds = date.toISOString().split('T')[0];
  return classes.filter((c) => c.date === ds);
}
