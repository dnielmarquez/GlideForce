'use client';

import type { GFClass } from '@/lib/admin/types';
import { CLASS_COLORS, DAYS_OF_WEEK } from '@/lib/admin/constants';
import { getClassesForDate } from '@/lib/admin/utils';

interface MonthlyCalendarProps {
  year: number;
  month: number; // 0-indexed
  classes: GFClass[];
  onDayClick: (date: Date) => void;
  onEventClick: (cls: GFClass, e: React.MouseEvent) => void;
}

export default function MonthlyCalendar({ year, month, classes, onDayClick, onEventClick }: MonthlyCalendarProps) {
  const today = new Date('2026-04-20');
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startPad = firstDay.getDay();

  const cells: { date: Date; otherMonth: boolean }[] = [];
  for (let i = 0; i < startPad; i++) {
    cells.push({ date: new Date(year, month, -startPad + i + 1), otherMonth: true });
  }
  for (let d = 1; d <= lastDay.getDate(); d++) {
    cells.push({ date: new Date(year, month, d), otherMonth: false });
  }
  const remaining = 42 - cells.length;
  for (let d = 1; d <= remaining; d++) {
    cells.push({ date: new Date(year, month + 1, d), otherMonth: true });
  }

  return (
    <div className="month-grid">
      <div className="month-day-names">
        {DAYS_OF_WEEK.map((d) => (
          <div key={d} className="month-day-name">{d}</div>
        ))}
      </div>
      <div className="month-cells">
        {cells.map((cell, i) => {
          const isToday = cell.date.toDateString() === today.toDateString();
          const dayCls = getClassesForDate(classes, cell.date);
          return (
            <div
              key={i}
              className={`month-cell${cell.otherMonth ? ' other-month' : ''}${isToday ? ' today-cell' : ''}`}
              onClick={() => onDayClick(cell.date)}
            >
              <div className="month-cell-num">{cell.date.getDate()}</div>
              {dayCls.slice(0, 3).map((cls) => {
                const colorObj = CLASS_COLORS.find((c) => c.key === cls.color) ?? CLASS_COLORS[0];
                return (
                  <div
                    key={cls.id}
                    className="month-event"
                    style={{ background: colorObj.bg, color: colorObj.text }}
                    onClick={(e) => { e.stopPropagation(); onEventClick(cls, e); }}
                  >
                    {cls.time} {cls.title}
                  </div>
                );
              })}
              {dayCls.length > 3 && (
                <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>
                  +{dayCls.length - 3} más
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
