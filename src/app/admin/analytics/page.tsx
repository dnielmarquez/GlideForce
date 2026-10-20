'use client';

import { useEffect, useState, useTransition } from 'react';
import AdminIcon from '@/components/admin/AdminIcon';
import Toast from '@/components/admin/Toast';
import { getAdminAnalytics } from '@/app/actions/analytics';
import type { 
  AdminAnalyticsData, 
  AnalyticsPeriod, 
  DayMetricPoint 
} from '@/app/actions/analytics';
import type { ToastState } from '@/lib/admin/types';

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatCOP(amount: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDateDisplay(isoDate: string) {
  if (!isoDate) return '';
  const [y, m, d] = isoDate.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function getTodayString(): string {
  // Bogota UTC-5
  const d = new Date(Date.now() - 5 * 60 * 60 * 1000);
  return d.toISOString().split('T')[0];
}

const PERIOD_LABELS: Record<AnalyticsPeriod, string> = {
  today: 'Hoy',
  week: 'Última semana (7d)',
  month: 'Último mes (30d)',
  custom: 'Personalizado',
};

// ── SVG Interactive Chart Component ──────────────────────────────────────────

interface ChartProps {
  timeline: DayMetricPoint[];
  metric: 'revenue' | 'bookings';
  onMetricChange: (m: 'revenue' | 'bookings') => void;
}

function AnalyticsTimelineChart({ timeline, metric, onMetricChange }: ChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (!timeline || timeline.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-muted)', fontSize: 13 }}>
        Sin datos temporales en este rango.
      </div>
    );
  }

  const values = timeline.map(p => metric === 'revenue' ? p.revenueCOP : p.bookingsCount);
  const maxValue = Math.max(...values, metric === 'revenue' ? 100000 : 5);
  
  // Compact executive dimensions for SVG
  const width = 800;
  const height = 135;
  const padLeft = 55;
  const padRight = 20;
  const padTop = 15;
  const padBottom = 26;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const points = timeline.map((p, i) => {
    const x = padLeft + (i / Math.max(timeline.length - 1, 1)) * plotW;
    const val = metric === 'revenue' ? p.revenueCOP : p.bookingsCount;
    const y = padTop + plotH - (val / maxValue) * plotH;
    return { x, y, point: p, val };
  });

  // SVG Path for Area & Line
  const lineD = points.length === 1 
    ? `M ${padLeft} ${points[0].y} L ${padLeft + plotW} ${points[0].y}`
    : points.reduce((acc, pt, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`, '');

  const areaD = points.length === 1
    ? `M ${padLeft} ${points[0].y} L ${padLeft + plotW} ${points[0].y} L ${padLeft + plotW} ${padTop + plotH} L ${padLeft} ${padTop + plotH} Z`
    : `${lineD} L ${points[points.length - 1].x.toFixed(1)} ${(padTop + plotH).toFixed(1)} L ${points[0].x.toFixed(1)} ${(padTop + plotH).toFixed(1)} Z`;

  // Grid steps (3 horizontal guide lines)
  const gridSteps = [0, 0.5, 1];

  const totalPeriodRev = timeline.reduce((acc, p) => acc + p.revenueCOP, 0);
  const totalPeriodBookings = timeline.reduce((acc, p) => acc + p.bookingsCount, 0);

  // Robust pointer move over entire SVG: finds nearest point instantly without flickering
  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (!rect.width) return;
    const xRel = ((e.clientX - rect.left) / rect.width) * width;
    let nearest = 0;
    let minD = Infinity;
    points.forEach((pt, idx) => {
      const d = Math.abs(pt.x - xRel);
      if (d < minD) {
        minD = d;
        nearest = idx;
      }
    });
    setHoveredIndex(nearest);
  };

  const activePoint = hoveredIndex !== null ? points[hoveredIndex] : null;

  return (
    <div>
      {/* Title & Metric Switcher */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
            {metric === 'revenue' ? 'Evolución de Ingresos Facturados' : 'Evolución de Clases Reservadas'}
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--text-muted)', fontWeight: 500 }}>
            {metric === 'revenue' ? 'Pesos colombianos (pagos aprobados)' : 'Cantidad de cupos reservados por día'}
          </div>
        </div>

        <div className="cal-view-tabs">
          <div
            className={`cal-view-tab${metric === 'revenue' ? ' active' : ''}`}
            onClick={() => onMetricChange('revenue')}
          >
            💰 Ingresos (COP)
          </div>
          <div
            className={`cal-view-tab${metric === 'bookings' ? ' active' : ''}`}
            onClick={() => onMetricChange('bookings')}
          >
            🏋️ Reservas
          </div>
        </div>
      </div>

      {/* Permanently Rendered Info Ribbon: Zero Layout Shift */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'var(--bg)',
        border: '1.5px solid var(--border)',
        borderRadius: 10,
        padding: '7px 14px',
        minHeight: 38,
        marginBottom: 10,
        fontSize: 12,
        fontWeight: 600,
        flexWrap: 'wrap',
        gap: 8,
      }}>
        {activePoint ? (
          <>
            <span style={{ color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 }}>
              📅 <strong>{formatDateDisplay(activePoint.point.date)}</strong> ({activePoint.point.label})
            </span>
            <div style={{ display: 'flex', gap: 14 }}>
              <span>
                Ingresos: <strong style={{ color: '#047857' }}>{formatCOP(activePoint.point.revenueCOP)}</strong>
              </span>
              <span>
                Reservas: <strong style={{ color: 'var(--orange)' }}>{activePoint.point.bookingsCount}</strong>
              </span>
            </div>
          </>
        ) : (
          <>
            <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
              📊 <span>Resumen del periodo ({timeline.length} {timeline.length === 1 ? 'día' : 'días'}) · Pasa el cursor para ver cada día</span>
            </span>
            <div style={{ display: 'flex', gap: 14 }}>
              <span>
                Total: <strong style={{ color: '#047857' }}>{formatCOP(totalPeriodRev)}</strong>
              </span>
              <span>
                Reservas: <strong style={{ color: 'var(--orange)' }}>{totalPeriodBookings}</strong>
              </span>
            </div>
          </>
        )}
      </div>

      {/* Interactive Compact SVG Chart */}
      <div style={{ width: '100%', overflowX: 'auto' }}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          style={{ width: '100%', height: 'auto', display: 'block', minWidth: 460, cursor: 'crosshair', userSelect: 'none' }}
          onPointerMove={handlePointerMove}
          onPointerLeave={() => setHoveredIndex(null)}
        >
          <defs>
            <linearGradient id="analyticsGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ea7034" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#ea7034" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {gridSteps.map(step => {
            const y = padTop + plotH - step * plotH;
            const stepVal = Math.round(step * maxValue);
            return (
              <g key={step}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={width - padRight}
                  y2={y}
                  stroke="var(--border)"
                  strokeDasharray="3 3"
                  strokeWidth="1"
                />
                <text
                  x={padLeft - 8}
                  y={y + 3.5}
                  textAnchor="end"
                  fontSize="9.5"
                  fill="var(--text-muted)"
                  fontWeight="600"
                >
                  {metric === 'revenue' ? (stepVal >= 1000000 ? `${(stepVal / 1000000).toFixed(1)}M` : `${Math.round(stepVal / 1000)}k`) : stepVal}
                </text>
              </g>
            );
          })}

          {/* Area fill */}
          <path d={areaD} fill="url(#analyticsGradient)" />

          {/* Main Line */}
          <path
            d={lineD}
            fill="none"
            stroke="#ea7034"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Hover guideline */}
          {activePoint && (
            <line
              x1={activePoint.x}
              y1={padTop}
              x2={activePoint.x}
              y2={padTop + plotH}
              stroke="#ea7034"
              strokeWidth="1.5"
              strokeDasharray="2 2"
            />
          )}

          {/* Points */}
          {points.map((pt, i) => {
            const isHovered = hoveredIndex === i;
            const stepInterval = Math.ceil(points.length / 8);
            const showLabel = i % stepInterval === 0 || i === points.length - 1;

            return (
              <g key={pt.point.date}>
                {/* Point circle */}
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isHovered ? 5.5 : 3}
                  fill={isHovered ? '#ea7034' : 'white'}
                  stroke="#ea7034"
                  strokeWidth={isHovered ? 2.5 : 1.75}
                  style={{ pointerEvents: 'none', transition: 'r 0.15s ease' }}
                />

                {/* X-axis date label */}
                {showLabel && (
                  <text
                    x={pt.x}
                    y={height - 7}
                    textAnchor="middle"
                    fontSize="9.5"
                    fill="var(--text-muted)"
                    fontWeight="600"
                    style={{ pointerEvents: 'none' }}
                  >
                    {pt.point.label}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

// ── Main Page Component ──────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<AnalyticsPeriod>('week');
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000 - 5 * 60 * 60 * 1000);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState<string>(getTodayString);
  const [chartMetric, setChartMetric] = useState<'revenue' | 'bookings'>('revenue');

  const [data, setData] = useState<AdminAnalyticsData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isPending, startTransition] = useTransition();

  const [toast, setToast] = useState<ToastState>({
    show: false,
    msg: '',
  });

  const showToast = (msg: string) => {
    setToast({ show: true, msg });
    setTimeout(() => setToast({ show: false, msg: '' }), 3000);
  };

  const loadAnalytics = (selectedPeriod = period, sDate = startDate, eDate = endDate) => {
    setLoading(true);
    startTransition(async () => {
      try {
        const res = await getAdminAnalytics({
          period: selectedPeriod,
          startDate: sDate,
          endDate: eDate,
        });
        setData(res);
      } catch (err: any) {
        console.error('Error loading analytics:', err);
        showToast('Error al cargar analíticas.');
      } finally {
        setLoading(false);
      }
    });
  };

  useEffect(() => {
    loadAnalytics();
  }, [period]);

  const handlePeriodChange = (newPeriod: AnalyticsPeriod) => {
    setPeriod(newPeriod);
    if (newPeriod !== 'custom') {
      loadAnalytics(newPeriod);
    }
  };

  const handleCustomApply = () => {
    if (!startDate || !endDate) {
      showToast('Por favor selecciona fecha de inicio y fin.');
      return;
    }
    if (startDate > endDate) {
      showToast('La fecha de inicio no puede ser posterior a la de fin.');
      return;
    }
    loadAnalytics('custom', startDate, endDate);
  };

  return (
    <>
      <Toast toast={toast} />

      {/* ── Page Header ──────────────────────────────────────────────────────── */}
      <div className="transactions-stats-header" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 16,
        marginBottom: 20
      }}>
        <div>
          <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: '-0.6px', color: 'var(--text)' }}>
            Analíticas del Estudio
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500, marginTop: 2 }}>
            Rendimiento comercial, reservas de clases, paquetes y promociones redimidas
          </div>
        </div>

        {/* Refresh & Period Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div className="cal-view-tabs">
            {(['today', 'week', 'month', 'custom'] as AnalyticsPeriod[]).map(p => (
              <div
                key={p}
                className={`cal-view-tab${period === p ? ' active' : ''}`}
                onClick={() => handlePeriodChange(p)}
              >
                {PERIOD_LABELS[p]}
              </div>
            ))}
          </div>

          <button
            className="btn-cancel"
            style={{ padding: '7px 12px', fontSize: 12, height: 36, display: 'flex', alignItems: 'center', gap: 6 }}
            onClick={() => loadAnalytics()}
            disabled={loading || isPending}
            title="Actualizar datos"
          >
            <AdminIcon name="repeat" size={13} />
            <span style={{ fontWeight: 600 }}>Refrescar</span>
          </button>
        </div>
      </div>

      {/* ── Custom Date Pickers (visible if 'custom') ────────────────────────── */}
      {period === 'custom' && (
        <div style={{
          background: 'white',
          border: '1.5px solid var(--border)',
          borderRadius: 12,
          padding: '12px 18px',
          marginBottom: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          flexWrap: 'wrap',
        }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
            Rango de fechas:
          </div>

          <div className="analytics-date-picker">
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Desde:</span>
            <input
              type="date"
              className="analytics-date-input"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
            />
          </div>

          <div className="analytics-date-picker">
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Hasta:</span>
            <input
              type="date"
              className="analytics-date-input"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
            />
          </div>

          <button
            className="btn-primary"
            style={{ padding: '6px 14px', fontSize: 12, height: 34, margin: 0 }}
            onClick={handleCustomApply}
            disabled={loading}
          >
            <AdminIcon name="check" size={13} />
            <span>Aplicar Rango</span>
          </button>

          {data && (
            <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 'auto', fontWeight: 500 }}>
              Mostrando: <strong>{formatDateDisplay(data.dateRange.startStr)}</strong> al <strong>{formatDateDisplay(data.dateRange.endStr)}</strong>
            </span>
          )}
        </div>
      )}

      {/* ── Loading Spinner State ────────────────────────────────────────────── */}
      {loading && !data ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh', color: 'var(--text-muted)', gap: 10 }}>
          <span style={{ fontSize: 14, fontWeight: 600 }}>Cargando métricas del estudio...</span>
        </div>
      ) : data ? (
        <>
          {/* ── 1. Top KPI Summary Cards ───────────────────────────────────────── */}
          <div className="stats-bar" style={{ marginBottom: 24 }}>
            {/* KPI 1: Ingresos */}
            <div className="stat-card">
              <div className="stat-label">Ingresos Netos</div>
              <div className="stat-value" style={{ fontSize: 22, color: '#047857' }}>
                {formatCOP(data.kpis.totalRevenueCOP)}
              </div>
              <div className="stat-sub">
                {data.kpis.approvedPaymentsCount} pagos exitosos · Ticket: {formatCOP(data.kpis.averageTicketCOP)}
              </div>
            </div>

            {/* KPI 2: Clases */}
            <div className="stat-card">
              <div className="stat-label">Clases Reservadas</div>
              <div className="stat-value stat-orange">
                {data.kpis.totalBookingsCount}
              </div>
              <div className="stat-sub">
                {data.kpis.confirmedBookingsCount} activas · {data.kpis.cancelledBookingsCount} canc. ({data.kpis.cancellationRate}%)
              </div>
            </div>

            {/* KPI 3: Paquetes */}
            <div className="stat-card">
              <div className="stat-label">Paquetes Vendidos</div>
              <div className="stat-value">
                {data.kpis.totalPackagesSold}
              </div>
              <div className="stat-sub">
                ⭐ {data.kpis.totalStarsDelivered} sesiones otorgadas
              </div>
            </div>

            {/* KPI 4: Cupones & Miembros */}
            <div className="stat-card">
              <div className="stat-label">Promociones Usadas</div>
              <div className="stat-value" style={{ color: '#854D0E' }}>
                🎟️ {data.kpis.totalCouponsUsed}
              </div>
              <div className="stat-sub">
                {data.kpis.allTimeCouponsUsed} canjes históricos · +{data.kpis.newMembersCount} miembros
              </div>
            </div>
          </div>

          {/* ── 2. Interactive Timeline Chart Card ────────────────────────────── */}
          <div className="analytics-card" style={{ marginBottom: 24 }}>
            <AnalyticsTimelineChart
              timeline={data.timeline}
              metric={chartMetric}
              onMetricChange={setChartMetric}
            />
          </div>

          {/* ── 3. Two-Column Grid: Paquetes & Cupones ─────────────────────────── */}
          <div className="analytics-grid-2">
            {/* Box A: Paquetes más comprados */}
            <div className="analytics-card">
              <div className="analytics-card-header">
                <div className="analytics-card-title">
                  <AdminIcon name="package" size={17} />
                  <span>Paquetes Más Vendidos</span>
                </div>
                <span className="analytics-card-sub">
                  Total: {data.kpis.totalPackagesSold} ventas
                </span>
              </div>

              {data.topPackages.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-muted)', fontSize: 13 }}>
                  No se registraron compras de paquetes en este periodo.
                </div>
              ) : (
                <div>
                  {data.topPackages.map((pkg, idx) => (
                    <div key={pkg.id} className="ranking-row">
                      <div className={`ranking-rank top-${idx + 1}`}>
                        {idx + 1}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                          <span style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {pkg.title}
                          </span>
                          <span style={{ fontWeight: 800, fontSize: 13, color: '#047857' }}>
                            {formatCOP(pkg.revenueCOP)}
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>
                          <span>{pkg.starsQuantity} sesiones · {pkg.salesCount} {pkg.salesCount === 1 ? 'venta' : 'ventas'}</span>
                          <span style={{ fontWeight: 600 }}>{pkg.percentOfTotal}% del total</span>
                        </div>

                        <div className="analytics-bar-bg">
                          <div
                            className="analytics-bar-fill"
                            style={{ width: `${Math.max(pkg.percentOfTotal, 4)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Box B: Promociones y Cupones más usados */}
            <div className="analytics-card">
              <div className="analytics-card-header">
                <div className="analytics-card-title">
                  <AdminIcon name="ticket" size={17} />
                  <span>Promociones Más Usadas</span>
                </div>
                <span className="analytics-card-sub">
                  {data.kpis.totalCouponsUsed} en periodo · {data.kpis.allTimeCouponsUsed} en total
                </span>
              </div>

              {data.topCoupons.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-muted)', fontSize: 13 }}>
                  No hay registro de cupones usados.
                </div>
              ) : (
                <div>
                  {data.topCoupons.map((c, idx) => {
                    const discountText = c.discountType === '2_for_1'
                      ? '2x1'
                      : c.discountType === 'percentage'
                        ? `${c.discountValue}% OFF`
                        : `${formatCOP(c.discountValue)} OFF`;

                    return (
                      <div key={c.id} className="ranking-row">
                        <div className={`ranking-rank top-${idx + 1}`}>
                          {idx + 1}
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                              <span style={{
                                fontFamily: 'monospace',
                                fontWeight: 800,
                                fontSize: 12.5,
                                background: 'var(--bg)',
                                border: '1px solid var(--border)',
                                padding: '2px 6px',
                                borderRadius: 6,
                                color: 'var(--text)',
                                flexShrink: 0,
                              }}>
                                {c.code}
                              </span>
                              <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {c.title}
                              </span>
                            </div>

                            <span style={{
                              fontSize: 11,
                              fontWeight: 800,
                              background: '#FEF0E6',
                              color: 'var(--orange)',
                              padding: '2px 7px',
                              borderRadius: 99,
                              flexShrink: 0,
                            }}>
                              {discountText}
                            </span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11.5, color: 'var(--text-muted)', marginTop: 4 }}>
                            <span>
                              <strong style={{ color: c.usageCount > 0 ? 'var(--orange)' : 'var(--text)' }}>
                                {c.usageCount} {c.usageCount === 1 ? 'uso' : 'usos'} en el período
                              </strong>
                              {c.allTimeUsageCount > 0 && (
                                <span style={{ opacity: 0.85 }}> · {c.allTimeUsageCount} históricos</span>
                              )}
                            </span>
                            {c.lastUsedAt && (
                              <span>Último: {formatDateDisplay(c.lastUsedAt.split('T')[0])}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ── 4. Two-Column Grid: Clases Más Agendadas & Embudo de Pagos ─────── */}
          <div className="analytics-grid-2">
            {/* Box C: Clases más populares */}
            <div className="analytics-card">
              <div className="analytics-card-header">
                <div className="analytics-card-title">
                  <AdminIcon name="dumbbell" size={17} />
                  <span>Clases Más Agendadas</span>
                </div>
                <span className="analytics-card-sub">
                  Inscripciones activas
                </span>
              </div>

              {data.topClasses.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-muted)', fontSize: 13 }}>
                  No hay reservas registradas en este periodo.
                </div>
              ) : (
                <div>
                  {data.topClasses.map((cls, idx) => (
                    <div key={cls.title} className="ranking-row">
                      <div className={`ranking-rank top-${idx + 1}`}>
                        {idx + 1}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--text)' }}>
                            {cls.title}
                          </span>
                          <span style={{ fontWeight: 800, fontSize: 13, color: 'var(--orange)' }}>
                            {cls.bookingsCount} reservas
                          </span>
                        </div>

                        <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>
                          Entrenadora: {cls.instructorName}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Box D: Embudo de Conversión de Pagos */}
            <div className="analytics-card">
              <div className="analytics-card-header">
                <div className="analytics-card-title">
                  <AdminIcon name="receipt" size={17} />
                  <span>Embudo y Estado de Pagos</span>
                </div>
                <span className="analytics-card-sub">
                  Tasa de éxito: <strong>{data.kpis.paymentsConversionRate}%</strong>
                </span>
              </div>

              <div>
                {/* Aprobados */}
                <div className="funnel-item">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 99, background: '#10B981' }} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>Aprobados</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 13, fontWeight: 800, color: '#047857' }}>{data.paymentStatusBreakdown.approved}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>
                      {data.kpis.totalPaymentsCount > 0 ? Math.round((data.paymentStatusBreakdown.approved / data.kpis.totalPaymentsCount) * 100) : 0}%
                    </span>
                  </div>
                </div>

                {/* Pendientes */}
                <div className="funnel-item">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 99, background: '#F59E0B' }} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>Pendientes</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 13, fontWeight: 800, color: '#B45309' }}>{data.paymentStatusBreakdown.pending}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>
                      {data.kpis.totalPaymentsCount > 0 ? Math.round((data.paymentStatusBreakdown.pending / data.kpis.totalPaymentsCount) * 100) : 0}%
                    </span>
                  </div>
                </div>

                {/* Rechazados */}
                <div className="funnel-item">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 99, background: '#EF4444' }} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>Rechazados</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 13, fontWeight: 800, color: '#DC2626' }}>{data.paymentStatusBreakdown.declined}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>
                      {data.kpis.totalPaymentsCount > 0 ? Math.round((data.paymentStatusBreakdown.declined / data.kpis.totalPaymentsCount) * 100) : 0}%
                    </span>
                  </div>
                </div>

                {/* Otros (Error/Anulados) */}
                <div className="funnel-item">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 99, background: '#9CA3AF' }} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>Error / Expirados</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 13, fontWeight: 800, color: '#4B5563' }}>{data.paymentStatusBreakdown.error + data.paymentStatusBreakdown.voidedOrExpired}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>
                      {data.kpis.totalPaymentsCount > 0 ? Math.round(((data.paymentStatusBreakdown.error + data.paymentStatusBreakdown.voidedOrExpired) / data.kpis.totalPaymentsCount) * 100) : 0}%
                    </span>
                  </div>
                </div>

                {/* Sub-breakdown: Por propósito */}
                <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px dashed var(--border)' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.05em' }}>
                    Facturación por Propósito:
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 4 }}>
                    <span style={{ color: 'var(--text)' }}>⭐ Compra de Sesiones:</span>
                    <strong style={{ color: '#047857' }}>{formatCOP(data.purposeBreakdown.starPurchaseRevenue)}</strong>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12.5 }}>
                    <span style={{ color: 'var(--text)' }}>🏋️ Reservas Directas:</span>
                    <strong style={{ color: '#047857' }}>{formatCOP(data.purposeBreakdown.classBookingRevenue)}</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </>
  );
}
