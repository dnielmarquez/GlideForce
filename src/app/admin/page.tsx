'use client';

import { useState } from 'react';
import { useAdmin } from '@/lib/admin/AdminContext';
import StatsBar from '@/components/admin/StatsBar';
import CalendarHeader from '@/components/admin/CalendarHeader';
import WeeklyCalendar from '@/components/admin/WeeklyCalendar';
import MonthlyCalendar from '@/components/admin/MonthlyCalendar';
import CreateClassModal from '@/components/admin/CreateClassModal';
import ViewClassModal from '@/components/admin/ViewClassModal';
import EventPopup from '@/components/admin/EventPopup';
import Toast from '@/components/admin/Toast';
import type { GFClass, EventPopupData } from '@/lib/admin/types';
import { weekLabel, monthLabel, getWeekStart } from '@/lib/admin/utils';
import { adminCancelClass } from '@/app/actions/booking';

const TODAY = new Date();

export default function AdminDashboard() {
  const { classes, refreshClasses, toast, showToast } = useAdmin();

  const [calView, setCalView] = useState<'week' | 'month'>('week');
  const [weekStart, setWeekStart] = useState<Date>(() => getWeekStart(TODAY));
  const [monthView, setMonthView] = useState({ year: TODAY.getFullYear(), month: TODAY.getMonth() });
  const [createModalData, setCreateModalData] = useState<{ date?: string; time?: string } | null>(null);
  const [popup, setPopup] = useState<EventPopupData | null>(null);
  const [viewingClassId, setViewingClassId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshClasses();
    setIsRefreshing(false);
    showToast('✓ Calendario actualizado');
  };

  // ── Navigation ──────────────────────────────────────────────────────────
  const navWeek = (dir: number) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + dir * 7);
    setWeekStart(d);
  };
  const navMonth = (dir: number) => {
    setMonthView((prev) => {
      let m = prev.month + dir;
      let y = prev.year;
      if (m > 11) { m = 0; y++; }
      if (m < 0)  { m = 11; y--; }
      return { year: y, month: m };
    });
  };
  const goToday = () => {
    setWeekStart(getWeekStart(TODAY));
    setMonthView({ year: TODAY.getFullYear(), month: TODAY.getMonth() });
  };

  // ── Stats ────────────────────────────────────────────────────────────────
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const weekClasses = classes.filter((c) => {
    const d = new Date(c.date + 'T00:00:00');
    return d >= weekStart && d <= weekEnd;
  });
  const totalEnrolled  = classes.reduce((a, c) => a + c.enrolled, 0);
  const totalCapacity  = classes.reduce((a, c) => a + c.capacity, 0);

  // ── Event handlers ───────────────────────────────────────────────────────
  const handleSave = async (count: number) => {
    setCreateModalData(null);
    await refreshClasses();
    showToast(`✓ ${count} clase${count !== 1 ? 's' : ''} creada${count !== 1 ? 's' : ''} en el calendario`);
  };

  const handleCancel = async (id: string) => {
    const res = await adminCancelClass(id);
    if (res.success) {
      setPopup(null);
      await refreshClasses();
      showToast('Clase cancelada y sesiones reembolsadas');
    } else {
      showToast('Error: ' + res.error);
    }
  };

  const handleView = (id: string) => {
    setPopup(null);
    setViewingClassId(id);
  };

  const handleEventClick = (cls: GFClass, e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    let x = rect.right + 8;
    let y = rect.top;
    if (x + 250 > window.innerWidth) x = rect.left - 258;
    if (y + 280 > window.innerHeight) y = window.innerHeight - 290;
    setPopup({ event: cls, pos: { x, y } });
  };

  const label = calView === 'week'
    ? weekLabel(weekStart)
    : monthLabel(monthView.year, monthView.month);

  return (
    <>
      <StatsBar
        weekClasses={weekClasses.length}
        totalClasses={classes.length}
        totalEnrolled={totalEnrolled}
        totalCapacity={totalCapacity}
      />

      <CalendarHeader
        label={label}
        calView={calView}
        onChangeView={setCalView}
        onPrev={() => calView === 'week' ? navWeek(-1) : navMonth(-1)}
        onNext={() => calView === 'week' ? navWeek(1)  : navMonth(1)}
        onToday={goToday}
        onNewClass={() => setCreateModalData({})}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
      />

      {calView === 'week'
        ? <WeeklyCalendar weekStart={weekStart} classes={classes} onCellClick={(d, h) => {
            const dateStr = d.toISOString().split('T')[0];
            const timeStr = h.toString().padStart(2, '0') + ':00';
            setCreateModalData({ date: dateStr, time: timeStr });
          }} onEventClick={handleEventClick} />
        : <MonthlyCalendar year={monthView.year} month={monthView.month} classes={classes} onDayClick={(d) => {
            const dateStr = d.toISOString().split('T')[0];
            setCreateModalData({ date: dateStr, time: '10:00' });
          }} onEventClick={handleEventClick} />
      }

      {createModalData && <CreateClassModal 
        initialDate={createModalData.date} 
        initialTime={createModalData.time} 
        onClose={() => setCreateModalData(null)} 
        onSave={handleSave} 
      />}
      {popup && <EventPopup data={popup} onClose={() => setPopup(null)} onCancel={handleCancel} onView={handleView} />}
      {viewingClassId && <ViewClassModal classId={viewingClassId} onClose={() => setViewingClassId(null)} />}
      <Toast toast={toast} />
    </>
  );
}
