'use client';

import { useEffect, useState, useMemo } from 'react';
import AdminIcon from '@/components/admin/AdminIcon';
import Toggle from '@/components/admin/Toggle';
import Toast from '@/components/admin/Toast';
import CreateCouponModal from '@/components/admin/CreateCouponModal';
import { getAdminCoupons, toggleAdminCouponActive, deleteAdminCoupon, AdminCoupon } from '@/app/actions/coupons';
import type { ToastState } from '@/lib/admin/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TYPE_LABEL: Record<AdminCoupon['discount_type'], string> = {
  '2_for_1': '🎟️ 2 por 1',
  'percentage': '🏷️ Porcentaje',
  'fixed_amount': '💵 Monto Fijo',
};

function formatCOP(amount: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency', currency: 'COP', minimumFractionDigits: 0,
  }).format(amount);
}

function formatDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('es-CO', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<AdminCoupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterActive, setFilterActive] = useState<'todos' | 'activos' | 'inactivos'>('todos');
  const [toast, setToast] = useState<ToastState>({ show: false, msg: '' });
  const [showCreateModal, setShowCreateModal] = useState(false);

  const fetchCoupons = async () => {
    setLoading(true);
    const data = await getAdminCoupons();
    setCoupons(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  const showToast = (msg: string) => {
    setToast({ show: true, msg });
    setTimeout(() => setToast({ show: false, msg: '' }), 3200);
  };

  // ── Stats ───────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total = coupons.length;
    const active = coupons.filter(c => c.is_active).length;
    const usages = coupons.reduce((sum, c) => sum + (c.uses_count || 0), 0);
    const percentage = coupons.filter(c => c.discount_type === 'percentage').length;
    const fixed = coupons.filter(c => c.discount_type === 'fixed_amount').length;
    const promo2x1 = coupons.filter(c => c.discount_type === '2_for_1').length;
    
    return { total, active, usages, percentage, fixed, promo2x1 };
  }, [coupons]);

  // ── Table filtering ─────────────────────────────────────────────────────────
  const filteredCoupons = useMemo(() => {
    return coupons.filter(c => {
      const q = search.toLowerCase();
      const matchSearch =
        c.title.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        (c.description || '').toLowerCase().includes(q);

      const matchActive =
        filterActive === 'todos' ||
        (filterActive === 'activos' && c.is_active) ||
        (filterActive === 'inactivos' && !c.is_active);

      return matchSearch && matchActive;
    });
  }, [coupons, search, filterActive]);

  // ── Action Handlers ─────────────────────────────────────────────────────────
  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    const nextStatus = !currentStatus;
    
    // Optimistic UI update
    setCoupons(prev => prev.map(c => c.id === id ? { ...c, is_active: nextStatus } : c));
    showToast('Actualizando estado del cupón...');

    const res = await toggleAdminCouponActive(id, nextStatus);
    if (!res.success) {
      // Revert if error
      setCoupons(prev => prev.map(c => c.id === id ? { ...c, is_active: currentStatus } : c));
      showToast('Error al actualizar estado: ' + res.error);
    } else {
      showToast(`Cupón ${nextStatus ? 'activado' : 'desactivado'} con éxito`);
    }
  };

  const handleDelete = async (id: string, code: string) => {
    if (!window.confirm(`¿Estás seguro de que deseas eliminar el cupón "${code}"?\nEsta acción no se puede deshacer.`)) {
      return;
    }

    showToast('Eliminando cupón...');
    const res = await deleteAdminCoupon(id);
    if (res.success) {
      setCoupons(prev => prev.filter(c => c.id !== id));
      showToast(`Cupón "${code}" eliminado exitosamente`);
    } else {
      showToast('Error al eliminar cupón: ' + res.error);
    }
  };

  const handleSaveSuccess = () => {
    setShowCreateModal(false);
    showToast('Cupón creado exitosamente');
    fetchCoupons();
  };

  if (loading && coupons.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: 'var(--text-muted)', gap: 10 }}>
        <span style={{ fontSize: 13, fontWeight: 600 }}>Cargando cupones de descuento...</span>
      </div>
    );
  }

  return (
    <>
      {/* ── Stats cards ────────────────────────────────────────────────── */}
      <div className="stats-bar" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-label">Total Cupones</div>
          <div className="stat-value">{stats.total}</div>
          <div className="stat-sub">Registrados en el sistema</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Cupones Activos</div>
          <div className="stat-value stat-orange">{stats.active}</div>
          <div className="stat-sub">Disponibles para uso</div>
        </div>
        <div className="stat-card">
          <div className="stat-label font-teal">Usos Totales</div>
          <div className="stat-value" style={{ color: 'var(--orange)' }}>{stats.usages}</div>
          <div className="stat-sub">Redimidos por clientes</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Tipos Promo</div>
          <div className="stat-value" style={{ fontSize: 18, marginTop: 12, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
              <span>🎟️ 2x1:</span> <span style={{ fontWeight: 800, color: 'var(--text)' }}>{stats.promo2x1}</span>
            </div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
              <span>🏷️ %:</span> <span style={{ fontWeight: 800, color: 'var(--text)' }}>{stats.percentage}</span>
            </div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
              <span>💵 Fijo:</span> <span style={{ fontWeight: 800, color: 'var(--text)' }}>{stats.fixed}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Table header + filters ──────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.5px' }}>Gestión de Cupones</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500, marginTop: 2 }}>
            {filteredCoupons.length} de {coupons.length} cupones
          </div>
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Search */}
          <div className="topbar-search" style={{ width: 240 }}>
            <AdminIcon name="search" size={14} />
            <input
              placeholder="Buscar por código, título…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {/* Active filter */}
          <div className="cal-view-tabs">
            {(['todos', 'activos', 'inactivos'] as const).map(k => (
              <div
                key={k}
                className={`cal-view-tab${filterActive === k ? ' active' : ''}`}
                onClick={() => setFilterActive(k)}
              >
                {k === 'todos' ? 'Todos' : k === 'activos' ? 'Activos' : 'Inactivos'}
              </div>
            ))}
          </div>

          {/* Create Button */}
          <button className="btn-primary" onClick={() => setShowCreateModal(true)} style={{ margin: 0, padding: '9px 16px' }}>
            <AdminIcon name="plus" size={14} />
            Crear Cupón
          </button>
        </div>
      </div>

      {/* ── Table ──────────────────────────────────────────────────────── */}
      <div style={{
        background: 'white', borderRadius: 'var(--radius)',
        border: '1.5px solid var(--border)', overflow: 'hidden',
      }}>
        {/* Head */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1.3fr 1.3fr 1.3fr 1fr 1fr 0.8fr 0.5fr',
          padding: '11px 20px', background: 'var(--bg)',
          borderBottom: '1.5px solid var(--border)', gap: 12,
        }}>
          {[
            'Cupón',
            'Código',
            'Beneficio',
            'Vigencia',
            'Usos / Límite',
            'Límite Cuenta',
            'Estado',
            '',
          ].map((h, idx) => (
            <div key={idx} style={{
              fontSize: 11, fontWeight: 700, color: 'var(--text-muted)',
              textTransform: 'uppercase', letterSpacing: '0.07em',
              textAlign: h === 'Estado' ? 'center' : 'left',
            }}>{h}</div>
          ))}
        </div>

        {/* Empty */}
        {filteredCoupons.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)', fontSize: 13.5, fontWeight: 500 }}>
            {coupons.length === 0
              ? 'No hay cupones registrados aún.'
              : 'No se encontraron cupones con los filtros actuales.'}
          </div>
        )}

        {/* Rows */}
        {filteredCoupons.map(c => {
          const startStr = formatDate(c.start_date);
          const endStr = formatDate(c.end_date);
          let dateRange = 'Permanente';
          if (startStr && endStr) {
            dateRange = `${startStr} al ${endStr}`;
          } else if (startStr) {
            dateRange = `Desde ${startStr}`;
          } else if (endStr) {
            dateRange = `Hasta ${endStr}`;
          }

          return (
            <div
              key={c.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1.3fr 1.3fr 1.3fr 1fr 1fr 0.8fr 0.5fr',
                padding: '14px 20px', gap: 12, alignItems: 'center',
                borderBottom: '1px solid var(--border)',
                transition: 'background 0.1s', cursor: 'default',
              }}
              onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = 'var(--bg)'}
              onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'white'}
            >
              {/* Cupón title & description */}
              <div>
                <div style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--text)' }}>{c.title}</div>
                {c.description && (
                  <div style={{ fontSize: 11, color: 'var(--text-light)', fontWeight: 500, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }} title={c.description}>
                    {c.description}
                  </div>
                )}
              </div>

              {/* Code */}
              <div>
                <span style={{
                  fontSize: 12, fontWeight: 700, padding: '3px 8px', borderRadius: 6,
                  background: 'var(--bg)', color: 'var(--text)',
                  border: '1.5px solid var(--border)', fontFamily: 'monospace',
                  letterSpacing: '0.05em', display: 'inline-block',
                }}>
                  {c.code}
                </span>
              </div>

              {/* Beneficio type */}
              <div>
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 99,
                  background: c.discount_type === '2_for_1' ? '#FDF0E8' : c.discount_type === 'percentage' ? '#E6F7F4' : '#E8F1FD',
                  color: c.discount_type === '2_for_1' ? 'var(--orange)' : c.discount_type === 'percentage' ? '#0F8B76' : '#2563EB',
                  border: '1.5px solid',
                  borderColor: c.discount_type === '2_for_1' ? 'var(--orange-mid)' : c.discount_type === 'percentage' ? '#BFECDF' : '#BFDBFE',
                  whiteSpace: 'nowrap',
                }}>
                  {TYPE_LABEL[c.discount_type]}
                  {c.discount_type === 'percentage' && ` (${c.discount_value}%)`}
                  {c.discount_type === 'fixed_amount' && ` (${formatCOP(c.discount_value)})`}
                </span>
              </div>

              {/* Vigencia */}
              <div style={{ fontSize: 11.5, color: 'var(--text-muted)', fontWeight: 500 }}>
                {dateRange}
              </div>

              {/* Usos / Limite */}
              <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text)' }}>
                <span style={{ color: c.uses_count > 0 ? 'var(--orange)' : 'var(--text-muted)' }}>{c.uses_count}</span>
                <span style={{ color: 'var(--text-light)', fontWeight: 400 }}> / {c.max_uses === 0 ? '∞' : c.max_uses}</span>
              </div>

              {/* Límite por Cuenta */}
              <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>
                {c.max_uses_per_user === 0 ? (
                  <span style={{ color: 'var(--text-light)', fontWeight: 400 }}>Sin límite</span>
                ) : (
                  <span>{c.max_uses_per_user} {c.max_uses_per_user === 1 ? 'uso' : 'usos'} por cuenta</span>
                )}
              </div>

              {/* Estado Toggle */}
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <Toggle checked={c.is_active} onChange={() => handleToggleActive(c.id, c.is_active)} />
              </div>

              {/* Acciones */}
              <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                <button
                  onClick={() => handleDelete(c.id, c.code)}
                  style={{
                    border: 'none', background: 'transparent', cursor: 'pointer',
                    color: 'var(--text-light)', transition: 'color 0.15s',
                    padding: 4, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = '#dc2626'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--text-light)'}
                  title="Eliminar cupón"
                >
                  <AdminIcon name="trash" size={14} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {showCreateModal && (
        <CreateCouponModal
          onClose={() => setShowCreateModal(false)}
          onSave={handleSaveSuccess}
        />
      )}

      <Toast toast={toast} />
    </>
  );
}
