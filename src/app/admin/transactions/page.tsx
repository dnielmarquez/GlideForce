'use client';

import { useEffect, useState, useMemo } from 'react';
import AdminIcon from '@/components/admin/AdminIcon';
import Toast from '@/components/admin/Toast';
import { getAdminTransactions } from '@/app/actions/transactions';
import type { AdminTransaction } from '@/app/actions/transactions';
import type { ToastState } from '@/lib/admin/types';

// ─── Types ────────────────────────────────────────────────────────────────────

type PaymentStatus  = AdminTransaction['status'];
type PaymentPurpose = AdminTransaction['purpose'];
type FilterStatus   = 'todos' | PaymentStatus;
type FilterPurpose  = 'todos' | PaymentPurpose;
type StatsPeriod    = 'today' | 'week' | 'month' | 'all';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<PaymentStatus, string> = {
    pending:  'Pendiente',
    approved: 'Aprobado',
    declined: 'Rechazado',
    voided:   'Anulado',
    error:    'Error',
    expired:  'Expirado',
};

const STATUS_STYLE: Record<PaymentStatus, { bg: string; color: string; border: string }> = {
    pending:  { bg: '#FEF3C7', color: '#D97706', border: '#FCD34D' },
    approved: { bg: '#D1FAE5', color: '#065F46', border: '#6EE7B7' },
    declined: { bg: '#FEE2E2', color: '#DC2626', border: '#FCA5A5' },
    voided:   { bg: '#F3F4F6', color: '#6B7280', border: '#D1D5DB' },
    error:    { bg: '#FEE2E2', color: '#DC2626', border: '#FCA5A5' },
    expired:  { bg: '#F3F4F6', color: '#6B7280', border: '#D1D5DB' },
};

const PURPOSE_LABEL: Record<PaymentPurpose, string> = {
    star_purchase: '⭐ Compra de Sesiones',
    class_booking: '🏋️ Reserva de Clase',
};

const PERIOD_LABEL: Record<StatsPeriod, string> = {
    today: 'Hoy',
    week:  'Esta semana',
    month: 'Este mes',
    all:   'Siempre',
};

function formatCOP(cents: number) {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency', currency: 'COP', minimumFractionDigits: 0,
    }).format(cents / 100);
}

function formatDate(iso: string) {
    return new Date(iso).toLocaleString('es-CO', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true,
    });
}

function getPeriodStart(period: StatsPeriod): Date | null {
    const now = new Date();
    if (period === 'today') {
        return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    }
    if (period === 'week') {
        const d = new Date(now);
        d.setDate(d.getDate() - d.getDay());
        d.setHours(0, 0, 0, 0);
        return d;
    }
    if (period === 'month') {
        return new Date(now.getFullYear(), now.getMonth(), 1);
    }
    return null; // 'all'
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function TransactionsPage() {
    const [rows, setRows]               = useState<AdminTransaction[]>([]);
    const [loading, setLoading]         = useState(true);
    const [search, setSearch]           = useState('');
    const [filterStatus, setFilterStatus]   = useState<FilterStatus>('todos');
    const [filterPurpose, setFilterPurpose] = useState<FilterPurpose>('todos');
    const [statsPeriod, setStatsPeriod]     = useState<StatsPeriod>('month');
    const [toast, setToast]             = useState<ToastState>({ show: false, msg: '' });

    useEffect(() => {
        getAdminTransactions().then(data => {
            setRows(data);
            setLoading(false);
        });
    }, []);

    // ── Stats (filtered by period) ─────────────────────────────────────────────
    const statsRows = useMemo(() => {
        const since = getPeriodStart(statsPeriod);
        if (!since) return rows;
        return rows.filter(r => new Date(r.created_at) >= since);
    }, [rows, statsPeriod]);

    const statsApproved = statsRows.filter(r => r.status === 'approved');
    const totalRev      = statsApproved.reduce((s, r) => s + r.amount_in_cents, 0);
    const statsPending  = statsRows.filter(r => r.status === 'pending').length;

    // ── Table filtering ────────────────────────────────────────────────────────
    const filtered = useMemo(() => rows.filter(r => {
        const q = search.toLowerCase();
        const matchSearch =
            r.wompi_reference.toLowerCase().includes(q) ||
            r.member_name.toLowerCase().includes(q)     ||
            r.member_email.toLowerCase().includes(q)    ||
            (r.wompi_transaction_id ?? '').toLowerCase().includes(q);
        const matchStatus  = filterStatus  === 'todos' || r.status  === filterStatus;
        const matchPurpose = filterPurpose === 'todos' || r.purpose === filterPurpose;
        return matchSearch && matchStatus && matchPurpose;
    }), [rows, search, filterStatus, filterPurpose]);

    // ── Loading ────────────────────────────────────────────────────────────────
    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: 'var(--text-muted)', gap: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>Cargando transacciones...</span>
            </div>
        );
    }

    return (
        <>
            {/* ── Stats period selector ───────────────────────────────────────── */}
            <div className="transactions-stats-header" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Resumen:
                </span>
                <div className="cal-view-tabs">
                    {(['today', 'week', 'month', 'all'] as StatsPeriod[]).map(p => (
                        <div
                            key={p}
                            className={`cal-view-tab${statsPeriod === p ? ' active' : ''}`}
                            onClick={() => setStatsPeriod(p)}
                        >
                            {PERIOD_LABEL[p]}
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Stats cards ────────────────────────────────────────────────── */}
            <div className="stats-bar" style={{ marginBottom: 24 }}>
                <div className="stat-card">
                    <div className="stat-label">Transacciones</div>
                    <div className="stat-value">{statsRows.length}</div>
                    <div className="stat-sub">{PERIOD_LABEL[statsPeriod]}</div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">Aprobadas</div>
                    <div className="stat-value stat-orange">{statsApproved.length}</div>
                    <div className="stat-sub">Pagos exitosos</div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">Ingresos</div>
                    <div className="stat-value" style={{ fontSize: 22 }}>{formatCOP(totalRev)}</div>
                    <div className="stat-sub">Solo aprobados</div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">Pendientes</div>
                    <div className="stat-value" style={{ color: statsPending > 0 ? '#D97706' : 'var(--text)' }}>
                        {statsPending}
                    </div>
                    <div className="stat-sub">Sin confirmar</div>
                </div>
            </div>

            {/* ── Table header + filters ──────────────────────────────────────── */}
            <div className="transactions-filter-bar" style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
                <div>
                    <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.5px' }}>Transacciones</div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500, marginTop: 2 }}>
                        {filtered.length} de {rows.length} resultados
                    </div>
                </div>

                <div className="transactions-filter-group" style={{ marginLeft: 'auto', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                    {/* Search */}
                    <div className="topbar-search" style={{ width: 240 }}>
                        <AdminIcon name="search" size={14} />
                        <input
                            placeholder="Referencia, nombre, correo…"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>

                    {/* Status filter */}
                    <div className="cal-view-tabs">
                        {(['todos', 'approved', 'pending', 'declined', 'error'] as FilterStatus[]).map(k => (
                            <div
                                key={k}
                                className={`cal-view-tab${filterStatus === k ? ' active' : ''}`}
                                onClick={() => setFilterStatus(k)}
                            >
                                {k === 'todos' ? 'Todos' : STATUS_LABEL[k as PaymentStatus]}
                            </div>
                        ))}
                    </div>

                    {/* Purpose filter */}
                    <div className="cal-view-tabs">
                        {(['todos', 'star_purchase', 'class_booking'] as FilterPurpose[]).map(k => (
                            <div
                                key={k}
                                className={`cal-view-tab${filterPurpose === k ? ' active' : ''}`}
                                onClick={() => setFilterPurpose(k)}
                            >
                                {k === 'todos' ? 'Todos' : k === 'star_purchase' ? 'Sesiones' : 'Reservas'}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Table ──────────────────────────────────────────────────────── */}
            <div className="transactions-table-wrap" style={{
                background: 'white', borderRadius: 'var(--radius)',
                border: '1.5px solid var(--border)', overflow: 'hidden',
            }}>
                {/* Head */}
                <div className="transactions-thead">
                    {['Miembro', 'Referencia Wompi', 'Tipo', 'Monto', 'Estado', 'Fecha'].map(h => (
                        <div key={h} style={{
                            fontSize: 11, fontWeight: 700, color: 'var(--text-muted)',
                            textTransform: 'uppercase', letterSpacing: '0.07em',
                        }}>{h}</div>
                    ))}
                </div>

                {/* Empty */}
                {filtered.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)', fontSize: 13.5, fontWeight: 500 }}>
                        {rows.length === 0
                            ? 'No hay transacciones registradas aún.'
                            : 'No se encontraron transacciones con los filtros actuales.'}
                    </div>
                )}

                {/* Rows */}
                {filtered.map(r => {
                    const st = STATUS_STYLE[r.status];
                    return (
                        <div
                            key={r.id}
                            className="transactions-row"
                        >
                            {/* Member */}
                            <div>
                                <div style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--text)' }}>{r.member_name}</div>
                                <div style={{ fontSize: 11, color: 'var(--text-light)', fontWeight: 500, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {r.member_email}
                                </div>
                            </div>

                            {/* Reference */}
                            <div>
                                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)', fontFamily: 'monospace', letterSpacing: '0.01em', wordBreak: 'break-all' }}>
                                    {r.wompi_reference}
                                </div>
                                {r.wompi_transaction_id && (
                                    <div style={{ fontSize: 10, color: 'var(--text-light)', fontWeight: 500, marginTop: 1, fontFamily: 'monospace' }}>
                                        TX: {r.wompi_transaction_id}
                                    </div>
                                )}
                            </div>

                            {/* Purpose */}
                            <div>
                                <span style={{
                                    fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 99,
                                    background: r.purpose === 'star_purchase' ? '#FDF0E8' : '#E8F1FD',
                                    color: r.purpose === 'star_purchase' ? 'var(--orange)' : '#2563EB',
                                    border: '1.5px solid',
                                    borderColor: r.purpose === 'star_purchase' ? 'var(--orange-mid)' : '#BFDBFE',
                                    whiteSpace: 'nowrap',
                                }}>
                                    {PURPOSE_LABEL[r.purpose]}
                                    {r.purpose === 'star_purchase' && r.stars_to_credit ? ` ×${r.stars_to_credit}` : ''}
                                </span>
                            </div>

                            {/* Amount */}
                            <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.3px' }}>
                                {formatCOP(r.amount_in_cents)}
                            </div>

                            {/* Status */}
                            <div>
                                <span style={{
                                    fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 99,
                                    background: st.bg, color: st.color,
                                    border: `1.5px solid ${st.border}`,
                                    whiteSpace: 'nowrap',
                                }}>
                                    {STATUS_LABEL[r.status]}
                                </span>
                            </div>

                            {/* Date */}
                            <div className="transactions-date" style={{ fontSize: 11.5, color: 'var(--text-muted)', fontWeight: 500 }}>
                                {formatDate(r.created_at)}
                                {r.fulfilled_at && (
                                    <div style={{ fontSize: 10, color: '#065F46', fontWeight: 600, marginTop: 2 }}>
                                        ✓ {formatDate(r.fulfilled_at)}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            <Toast toast={toast} />
        </>
    );
}
