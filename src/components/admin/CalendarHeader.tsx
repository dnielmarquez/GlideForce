'use client';

import AdminIcon from './AdminIcon';

interface CalendarHeaderProps {
  label: string;
  calView: 'week' | 'month';
  onChangeView: (v: 'week' | 'month') => void;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onNewClass: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export default function CalendarHeader({
  label, calView, onChangeView, onPrev, onNext, onToday, onNewClass, onRefresh, isRefreshing,
}: CalendarHeaderProps) {
  return (
    <div className="cal-header">
      <div className="cal-title">{label}</div>
      <button className="cal-nav-btn" onClick={onPrev} aria-label="Anterior">
        <AdminIcon name="chevLeft" size={14} />
      </button>
      <button className="cal-nav-btn" onClick={onNext} aria-label="Siguiente">
        <AdminIcon name="chevRight" size={14} />
      </button>
      <button className="cal-nav-btn" onClick={onRefresh} disabled={isRefreshing} aria-label="Actualizar" title="Actualizar calendario">
        <span className={isRefreshing ? 'adm-spinner' : ''} style={{ display: 'inline-flex' }}>
          <AdminIcon name="repeat" size={14} />
        </span>
      </button>
      <button className="today-btn" onClick={onToday}>Hoy</button>
      <div className="cal-view-tabs">
        {(['week', 'month'] as const).map((v) => (
          <div
            key={v}
            className={`cal-view-tab${calView === v ? ' active' : ''}`}
            onClick={() => onChangeView(v)}
          >
            {v === 'week' ? 'Semana' : 'Mes'}
          </div>
        ))}
      </div>
      <button className="btn-primary" onClick={onNewClass}>
        <AdminIcon name="plus" size={15} /> Nueva Clase
      </button>
    </div>
  );
}
