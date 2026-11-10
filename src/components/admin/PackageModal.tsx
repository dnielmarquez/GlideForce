'use client';

import { useState } from 'react';
import AdminIcon from './AdminIcon';
import Toggle from './Toggle';
import { createAdminPackage, updateAdminPackage } from '@/app/actions/packages';
import type { Package } from '@/types';

interface Props {
  packageToEdit?: Package | null;
  onClose: () => void;
  onSave: () => void;
}

function formatCOP(amount: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(amount);
}

export default function PackageModal({ packageToEdit, onClose, onSave }: Props) {
  const isEditing = !!packageToEdit;

  const [form, setForm] = useState({
    title: packageToEdit?.title || '',
    description: packageToEdit?.description || '',
    stars_quantity: packageToEdit?.stars_quantity ? String(packageToEdit.stars_quantity) : '4',
    original_price_cop: packageToEdit?.original_price_cop ? String(packageToEdit.original_price_cop) : '180000',
    price_cop: packageToEdit?.price_cop ? String(packageToEdit.price_cop) : '160000',
    badge: packageToEdit?.badge || '',
    order_index: packageToEdit?.order_index !== undefined ? String(packageToEdit.order_index) : '1',
    is_active: packageToEdit?.is_active ?? true,
  });

  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const set = <K extends keyof typeof form>(key: K, val: typeof form[K]) =>
    setForm((f) => ({ ...f, [key]: val }));

  const qty = parseInt(form.stars_quantity) || 0;
  const origPrice = parseInt(form.original_price_cop) || 0;
  const finalPrice = parseInt(form.price_cop) || 0;

  const discountAmount = Math.max(0, origPrice - finalPrice);
  const discountPercent = origPrice > 0 ? Math.round((discountAmount / origPrice) * 100) : 0;
  const pricePerSession = qty > 0 ? Math.round(finalPrice / qty) : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      setErrorMsg('El título del paquete es requerido.');
      return;
    }
    if (qty < 1) {
      setErrorMsg('La cantidad de sesiones debe ser al menos 1.');
      return;
    }
    if (origPrice < 0 || finalPrice < 0) {
      setErrorMsg('Los precios no pueden ser negativos.');
      return;
    }

    setIsSaving(true);
    setErrorMsg(null);

    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      stars_quantity: qty,
      original_price_cop: origPrice,
      price_cop: finalPrice,
      badge: form.badge.trim() || null,
      order_index: parseInt(form.order_index) || 0,
      is_active: form.is_active,
    };

    try {
      let res;
      if (isEditing && packageToEdit) {
        res = await updateAdminPackage(packageToEdit.id, payload);
      } else {
        res = await createAdminPackage(payload);
      }

      if (res.success) {
        onSave();
      } else {
        setErrorMsg(res.error || 'Ocurrió un error al guardar el paquete.');
        setIsSaving(false);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err?.message || 'Error de conexión.');
      setIsSaving(false);
    }
  };

  return (
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSaving) onClose();
      }}
    >
      <div className="modal modal-sm">
        {/* Header */}
        <div className="modal-header">
          <div>
            <div className="modal-title">{isEditing ? 'Editar Paquete' : 'Nuevo Paquete de Sesiones'}</div>
            <div className="modal-subtitle">
              Configura cantidad de sesiones, precio regular tachado y precio con descuento
            </div>
          </div>
          <button className="modal-close" onClick={onClose} disabled={isSaving}>
            <AdminIcon name="x" size={14} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {errorMsg && (
              <div
                style={{
                  padding: '12px 16px',
                  background: '#FEE2E2',
                  border: '1.5px solid #FCA5A5',
                  color: '#DC2626',
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                ⚠️ {errorMsg}
              </div>
            )}

            {/* General Section */}
            <div className="form-section">
              <div className="form-section-title">Información básica</div>

              <div className="form-group">
                <label className="form-label">
                  Título del paquete <span>*</span>
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ej. 4 Clases, Pack Inicial…"
                  value={form.title}
                  onChange={(e) => set('title', e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Descripción o subtítulo (opcional)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ej. Ideal para entrenar 1 vez por semana"
                  value={form.description}
                  onChange={(e) => set('description', e.target.value)}
                />
              </div>
            </div>

            {/* Config & Quantity Section */}
            <div className="form-section">
              <div className="form-section-title">Cantidad y posición</div>

              <div className="form-row cols-2">
                <div className="form-group">
                  <label className="form-label">
                    Cantidad de Sesiones <span>*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="number"
                      min="1"
                      className="form-input"
                      value={form.stars_quantity}
                      onChange={(e) => set('stars_quantity', e.target.value)}
                      required
                    />
                    <span
                      style={{
                        position: 'absolute',
                        right: 12,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: 'var(--orange)',
                        fontWeight: 800,
                        fontSize: 13,
                      }}
                    >
                      ★
                    </span>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Orden en catálogo</label>
                  <input
                    type="number"
                    min="0"
                    className="form-input"
                    placeholder="1, 2, 3…"
                    value={form.order_index}
                    onChange={(e) => set('order_index', e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Etiqueta destacada / Badge (opcional)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ej. Más Popular, Ahorra 11%, Mejor Precio…"
                  value={form.badge}
                  onChange={(e) => set('badge', e.target.value)}
                />
              </div>
            </div>

            {/* Pricing Section */}
            <div className="form-section">
              <div className="form-section-title">Precios y Descuento</div>

              <div className="form-row cols-2">
                <div className="form-group">
                  <label className="form-label">
                    Precio Normal (COP) <span>*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    className="form-input"
                    placeholder="180000"
                    value={form.original_price_cop}
                    onChange={(e) => set('original_price_cop', e.target.value)}
                    required
                  />
                  <span style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 3 }}>
                    Se muestra tachado: {origPrice > 0 ? formatCOP(origPrice) : '$0'}
                  </span>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Precio Final Descontado (COP) <span>*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    className="form-input"
                    placeholder="160000"
                    value={form.price_cop}
                    onChange={(e) => set('price_cop', e.target.value)}
                    required
                  />
                  <span style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 3 }}>
                    Precio a cobrar: {finalPrice > 0 ? formatCOP(finalPrice) : '$0'}
                  </span>
                </div>
              </div>

              {/* Live Preview Card */}
              <div
                style={{
                  background: 'var(--bg)',
                  border: '1.5px solid var(--border)',
                  borderRadius: 12,
                  padding: '14px 18px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                  marginTop: 6,
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    color: 'var(--text-muted)',
                    letterSpacing: '0.06em',
                  }}
                >
                  Vista previa de la tarifa
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
                  {origPrice > finalPrice && (
                    <span
                      style={{
                        textDecoration: 'line-through',
                        color: 'var(--text-light)',
                        fontSize: 15,
                        fontWeight: 600,
                      }}
                    >
                      {formatCOP(origPrice)}
                    </span>
                  )}
                  <span
                    style={{
                      fontSize: 22,
                      fontWeight: 800,
                      color: 'var(--orange)',
                      letterSpacing: '-0.5px',
                    }}
                  >
                    {formatCOP(finalPrice)}
                  </span>
                  {discountPercent > 0 && (
                    <span
                      style={{
                        background: 'var(--orange-light)',
                        color: 'var(--orange)',
                        fontSize: 11,
                        fontWeight: 800,
                        padding: '3px 8px',
                        borderRadius: 99,
                        border: '1px solid var(--orange-mid)',
                      }}
                    >
                      {discountPercent}% OFF
                    </span>
                  )}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: 'var(--text-muted)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginTop: 2,
                    fontWeight: 500,
                  }}
                >
                  <span>Costo calculado por clase:</span>
                  <strong style={{ color: 'var(--text)' }}>{formatCOP(pricePerSession)} / sesión</strong>
                </div>
              </div>
            </div>

            {/* Visibility Toggle Section */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 18px',
                background: 'var(--bg)',
                borderRadius: 'var(--radius)',
                border: '1.5px solid var(--border)',
              }}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--text)' }}>
                  Estado del paquete
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500, marginTop: 2 }}>
                  {form.is_active ? 'Activo — Visible en la pantalla de compra' : 'Inactivo — Oculto para miembros'}
                </div>
              </div>
              <Toggle checked={form.is_active} onChange={(val) => set('is_active', val)} />
            </div>
          </div>

          {/* Footer */}
          <div className="modal-footer">
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
              disabled={isSaving}
            >
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={isSaving}>
              {isSaving ? 'Guardando...' : isEditing ? 'Guardar Cambios' : 'Crear Paquete'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
