'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import AdminIcon from '@/components/admin/AdminIcon';
import Toggle from '@/components/admin/Toggle';
import Toast from '@/components/admin/Toast';
import PackageModal from '@/components/admin/PackageModal';
import { getAdminPackages, toggleAdminPackageActive, deleteAdminPackage } from '@/app/actions/packages';
import type { ToastState } from '@/lib/admin/types';
import type { Package } from '@/types';

function formatCOP(amount: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(amount);
}

export default function AdminPackagesPage() {
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterActive, setFilterActive] = useState<'todos' | 'activos' | 'inactivos'>('todos');
  const [toast, setToast] = useState<ToastState>({ show: false, msg: '' });

  const [modalOpen, setModalOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<Package | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchPackages = useCallback(async () => {
    setLoading(true);
    const data = await getAdminPackages();
    setPackages(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPackages();
  }, [fetchPackages]);

  const showToast = (msg: string) => {
    setToast({ show: true, msg });
    setTimeout(() => setToast({ show: false, msg: '' }), 3200);
  };

  // ── Stats ───────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total = packages.length;
    const active = packages.filter((p) => p.is_active).length;
    const avgDiscount =
      packages.length > 0
        ? Math.round(
            packages.reduce((acc, p) => {
              const diff = Math.max(0, p.original_price_cop - p.price_cop);
              return acc + (p.original_price_cop > 0 ? (diff / p.original_price_cop) * 100 : 0);
            }, 0) / packages.length
          )
        : 0;
    const maxSessions = packages.reduce((max, p) => Math.max(max, p.stars_quantity), 0);

    return { total, active, avgDiscount, maxSessions };
  }, [packages]);

  // ── Table filtering ─────────────────────────────────────────────────────────
  const filteredPackages = useMemo(() => {
    return packages.filter((p) => {
      const q = search.toLowerCase();
      const matchSearch =
        p.title.toLowerCase().includes(q) ||
        (p.description || '').toLowerCase().includes(q) ||
        (p.badge || '').toLowerCase().includes(q);

      const matchActive =
        filterActive === 'todos' ||
        (filterActive === 'activos' && p.is_active) ||
        (filterActive === 'inactivos' && !p.is_active);

      return matchSearch && matchActive;
    });
  }, [packages, search, filterActive]);

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    const nextStatus = !currentStatus;
    // Optimistic UI update
    setPackages((prev) => prev.map((p) => (p.id === id ? { ...p, is_active: nextStatus } : p)));
    showToast('Actualizando estado del paquete...');

    const res = await toggleAdminPackageActive(id, nextStatus);
    if (!res.success) {
      setPackages((prev) => prev.map((p) => (p.id === id ? { ...p, is_active: currentStatus } : p)));
      showToast('Error al actualizar estado: ' + res.error);
    } else {
      showToast(`Paquete ${nextStatus ? 'activado' : 'desactivado'} con éxito`);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    setIsDeleting(true);
    const id = deletingId;

    const res = await deleteAdminPackage(id);
    setIsDeleting(false);
    setDeletingId(null);

    if (res.success) {
      setPackages((prev) => prev.filter((p) => p.id !== id));
      showToast('Paquete eliminado correctamente');
    } else {
      showToast('Error al eliminar: ' + res.error);
    }
  };

  const openCreateModal = () => {
    setEditingPackage(null);
    setModalOpen(true);
  };

  const openEditModal = (pkg: Package) => {
    setEditingPackage(pkg);
    setModalOpen(true);
  };

  if (loading && packages.length === 0) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '60vh',
          color: 'var(--text-muted)',
          gap: 10,
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 600 }}>Cargando paquetes de sesiones...</span>
      </div>
    );
  }

  return (
    <>
      {/* ── Stats Bar ────────────────────────────────────────────────────────── */}
      <div className="stats-bar" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-label">Total Paquetes</div>
          <div className="stat-value">{stats.total}</div>
          <div className="stat-sub">Configurados en catálogo</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Paquetes Activos</div>
          <div className="stat-value stat-orange">{stats.active}</div>
          <div className="stat-sub">Visibles para compra</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Descuento Promedio</div>
          <div className="stat-value">{stats.avgDiscount}%</div>
          <div className="stat-sub">Ahorro para el cliente</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Máx. Sesiones</div>
          <div className="stat-value">{stats.maxSessions}</div>
          <div className="stat-sub">En un solo paquete</div>
        </div>
      </div>

      {/* ── Header + Filter Bar ──────────────────────────────────────────────── */}
      <div className="packages-filter-bar">
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.5px' }}>
            Paquetes de Sesiones
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500, marginTop: 2 }}>
            {filteredPackages.length} de {packages.length} paquetes registrados
          </div>
        </div>

        <div className="packages-filter-group">
          {/* Search */}
          <div className="topbar-search" style={{ width: 240 }}>
            <AdminIcon name="search" size={14} />
            <input
              placeholder="Buscar paquete, título…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Active Status Filter Tabs */}
          <div className="cal-view-tabs">
            {(['todos', 'activos', 'inactivos'] as const).map((tab) => (
              <div
                key={tab}
                className={`cal-view-tab${filterActive === tab ? ' active' : ''}`}
                onClick={() => setFilterActive(tab)}
              >
                {tab === 'todos' ? 'Todos' : tab === 'activos' ? 'Activos' : 'Inactivos'}
              </div>
            ))}
          </div>

          {/* Create Button */}
          <button
            className="btn-primary"
            onClick={openCreateModal}
            style={{ margin: 0, padding: '9px 16px', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <AdminIcon name="plus" size={14} />
            Nuevo Paquete
          </button>
        </div>
      </div>

      {/* ── Packages Table ───────────────────────────────────────────────────── */}
      <div className="packages-table-wrap">
        {/* Table Head */}
        <div className="packages-thead">
          <div className="packages-th">Orden</div>
          <div className="packages-th">Paquete / Título</div>
          <div className="packages-th">Sesiones</div>
          <div className="packages-th">Precio Normal</div>
          <div className="packages-th">Precio Final</div>
          <div className="packages-th">Descuento</div>
          <div className="packages-th">Etiqueta</div>
          <div className="packages-th" style={{ textAlign: 'center' }}>Estado</div>
          <div className="packages-th" style={{ textAlign: 'right' }}>Acciones</div>
        </div>

        {/* Empty State */}
        {filteredPackages.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              padding: '56px 20px',
              color: 'var(--text-muted)',
              fontSize: 13.5,
              fontWeight: 500,
            }}
          >
            {packages.length === 0
              ? 'No hay paquetes de sesiones registrados aún.'
              : 'No se encontraron paquetes con los filtros actuales.'}
          </div>
        )}

        {/* Table Rows */}
        {filteredPackages.map((pkg) => {
          const discountDiff = Math.max(0, pkg.original_price_cop - pkg.price_cop);
          const discountPct =
            pkg.original_price_cop > 0
              ? Math.round((discountDiff / pkg.original_price_cop) * 100)
              : 0;

          return (
            <div
              key={pkg.id}
              className="packages-row"
              style={{ opacity: pkg.is_active ? 1 : 0.6 }}
            >
              {/* 1. Order */}
              <div>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    padding: '3px 8px',
                    borderRadius: 6,
                    background: 'var(--bg)',
                    color: 'var(--text-muted)',
                    border: '1.5px solid var(--border)',
                    fontFamily: 'monospace',
                    display: 'inline-block',
                  }}
                >
                  #{pkg.order_index}
                </span>
              </div>

              {/* 2. Title & Description */}
              <div>
                <div style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--text)' }}>
                  {pkg.title}
                </div>
                {pkg.description && (
                  <div
                    style={{
                      fontSize: 11,
                      color: 'var(--text-light)',
                      fontWeight: 500,
                      marginTop: 2,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      maxWidth: 240,
                    }}
                    title={pkg.description}
                  >
                    {pkg.description}
                  </div>
                )}
              </div>

              {/* 3. Sessions */}
              <div>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    fontSize: 13,
                    fontWeight: 800,
                    color: 'var(--text)',
                  }}
                >
                  <span>{pkg.stars_quantity}</span>
                  <span style={{ color: 'var(--orange)', fontSize: 13 }}>★</span>
                </span>
              </div>

              {/* 4. Normal Price (Struck through if discount) */}
              <div>
                <span
                  style={{
                    textDecoration: discountDiff > 0 ? 'line-through' : 'none',
                    color: discountDiff > 0 ? 'var(--text-light)' : 'var(--text)',
                    fontWeight: 600,
                    fontSize: 13,
                  }}
                >
                  {formatCOP(pkg.original_price_cop)}
                </span>
              </div>

              {/* 5. Final Discounted Price */}
              <div>
                <span
                  style={{
                    fontWeight: 800,
                    color: 'var(--orange)',
                    fontSize: 14,
                    letterSpacing: '-0.3px',
                  }}
                >
                  {formatCOP(pkg.price_cop)}
                </span>
              </div>

              {/* 6. Discount Tag */}
              <div>
                {discountPct > 0 ? (
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: 99,
                      background: '#FEF3C7',
                      color: '#92400E',
                      border: '1.5px solid #FDE68A',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {discountPct}% OFF
                  </span>
                ) : (
                  <span style={{ fontSize: 12, color: 'var(--text-light)' }}>—</span>
                )}
              </div>

              {/* 7. Badge */}
              <div>
                {pkg.badge ? (
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: 99,
                      background: 'var(--orange-light)',
                      color: 'var(--orange)',
                      border: '1.5px solid var(--orange-mid)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {pkg.badge}
                  </span>
                ) : (
                  <span style={{ fontSize: 12, color: 'var(--text-light)' }}>—</span>
                )}
              </div>

              {/* 8. Status Toggle */}
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <Toggle
                  checked={pkg.is_active}
                  onChange={() => handleToggleActive(pkg.id, pkg.is_active)}
                />
              </div>

              {/* 9. Actions */}
              <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                <button
                  className="topbar-btn"
                  style={{ width: 30, height: 30, borderRadius: 6 }}
                  title="Editar paquete"
                  onClick={() => openEditModal(pkg)}
                >
                  <AdminIcon name="edit" size={13} />
                </button>
                <button
                  className="topbar-btn"
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 6,
                    color: '#DC2626',
                    borderColor: '#FECACA',
                  }}
                  title="Eliminar paquete"
                  onClick={() => setDeletingId(pkg.id)}
                >
                  <AdminIcon name="trash" size={13} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Create / Edit Modal ─────────────────────────────────────────────── */}
      {modalOpen && (
        <PackageModal
          packageToEdit={editingPackage}
          onClose={() => setModalOpen(false)}
          onSave={() => {
            setModalOpen(false);
            fetchPackages();
            showToast(editingPackage ? 'Paquete actualizado con éxito' : 'Paquete creado con éxito');
          }}
        />
      )}

      {/* ── Delete Confirmation Modal ───────────────────────────────────────── */}
      {deletingId && (
        <div
          className="modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isDeleting) setDeletingId(null);
          }}
        >
          <div className="modal" style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <div>
                <div className="modal-title" style={{ fontSize: 17 }}>Eliminar Paquete</div>
                <div className="modal-subtitle">Esta acción no se puede deshacer</div>
              </div>
              <button
                className="modal-close"
                onClick={() => setDeletingId(null)}
                disabled={isDeleting}
              >
                <AdminIcon name="x" size={14} />
              </button>
            </div>
            <div className="modal-body" style={{ padding: '20px 28px', fontSize: 13.5, color: 'var(--text-muted)' }}>
              ¿Estás seguro de que deseas eliminar este paquete del catálogo de Glideforce?
            </div>
            <div className="modal-footer" style={{ padding: '16px 28px 24px', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                className="btn-secondary"
                onClick={() => setDeletingId(null)}
                disabled={isDeleting}
              >
                Cancelar
              </button>
              <button
                className="btn-danger"
                style={{
                  background: '#DC2626',
                  color: 'white',
                  border: 'none',
                  borderRadius: 10,
                  padding: '9px 18px',
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: 'pointer',
                }}
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? 'Eliminando...' : 'Eliminar Paquete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast Notification ──────────────────────────────────────────────── */}
      <Toast toast={toast} />
    </>
  );
}
