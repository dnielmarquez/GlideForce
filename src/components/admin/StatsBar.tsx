'use client';

interface StatsBarProps {
  weekClasses: number;
  totalClasses: number;
  totalEnrolled: number;
  totalCapacity: number;
}

export default function StatsBar({ weekClasses, totalClasses, totalEnrolled, totalCapacity }: StatsBarProps) {
  const occupancy = totalCapacity > 0 ? Math.round((totalEnrolled / totalCapacity) * 100) : 0;

  return (
    <div className="stats-bar">
      <div className="stat-card">
        <div className="stat-label">Clases esta semana</div>
        <div className="stat-value">{weekClasses}</div>
        <div className="stat-sub">en el calendario</div>
      </div>
      <div className="stat-card">
        <div className="stat-label">Total de clases</div>
        <div className="stat-value">{totalClasses}</div>
        <div className="stat-sub">programadas</div>
      </div>
      <div className="stat-card">
        <div className="stat-label">Inscritas</div>
        <div className="stat-value stat-orange">{totalEnrolled}</div>
        <div className="stat-sub">de {totalCapacity} cupos</div>
      </div>
      <div className="stat-card">
        <div className="stat-label">Ocupación</div>
        <div className="stat-value">
          {occupancy}<span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-muted)' }}>%</span>
        </div>
        <div className="stat-sub">promedio</div>
      </div>
    </div>
  );
}
