'use client';

import type { GFClass } from '@/lib/admin/types';
import { CLASS_COLORS, DAYS_OF_WEEK, INSTRUCTORS } from '@/lib/admin/constants';
import { getClassesForDayHour, formatHour } from '@/lib/admin/utils';


const HOURS = Array.from({ length: 15 }, (_, i) => i + 6); // 6am–8pm

interface WeeklyCalendarProps {
  weekStart: Date;
  classes: GFClass[];
  onCellClick: (date: Date, hour: number) => void;
  onEventClick: (cls: GFClass, e: React.MouseEvent) => void;
}

export default function WeeklyCalendar({ weekStart, classes, onCellClick, onEventClick }: WeeklyCalendarProps) {
  const today = new Date('2026-04-20');
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  return (
    <div className="cal-grid-wrap">
      {/* Day headers */}
      <div className="cal-day-headers">
        <div className="cal-day-header" />
        {days.map((d, i) => {
          const isToday = d.toDateString() === today.toDateString();
          return (
            <div key={i} className={`cal-day-header${isToday ? ' today' : ''}`}>
              {DAYS_OF_WEEK[d.getDay()]}
              <span className="day-num" style={isToday ? { display: 'flex', alignItems: 'center', justifyContent: 'center' } : {}}>
                {d.getDate()}
              </span>
            </div>
          );
        })}
      </div>

      {/* Time grid */}
      <div className="cal-body">
        {HOURS.map((hour) => (
          <>
            <div key={`time-${hour}`} className="cal-time-slot">{formatHour(hour)}</div>
            {days.map((d, di) => {
              const dayClasses = getClassesForDayHour(classes, d, hour);
              return (
                <div key={`${hour}-${di}`} className="cal-cell" onClick={() => onCellClick(d, hour)}>
                  {dayClasses.map((cls) => {
                    const colorObj = CLASS_COLORS.find((c) => c.key === cls.color) ?? CLASS_COLORS[0];
                    const heightPx = Math.max(56, (cls.duration / 60) * 64 - 6);
                    const instr = INSTRUCTORS.find((i) => i.id === cls.instructor);
                    return (
                      <div
                        key={cls.id}
                        className="class-event"
                        style={{
                          background: colorObj.bg,
                          color: colorObj.text,
                          borderLeft: `3px solid ${colorObj.hex}`,
                          height: heightPx,
                        }}
                        onClick={(e) => { e.stopPropagation(); onEventClick(cls, e); }}
                      >
                        <div className="class-event-title">{cls.title}</div>
                        <div className="class-event-time">{cls.time} · {cls.duration}m</div>
                        {instr && <div className="class-event-instr">{instr.name.split(' ')[0]}</div>}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </>
        ))}
      </div>
    </div>
  );
}
