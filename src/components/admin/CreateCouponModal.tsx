'use client';

import { useState } from 'react';
import AdminIcon from './AdminIcon';
import Toggle from './Toggle';
import { createAdminCoupon } from '@/app/actions/coupons';

interface Props {
  onClose: () => void;
  onSave: () => void;
}

export default function CreateCouponModal({ onClose, onSave }: Props) {
  const [step, setStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: '',
    code: '',
    description: '',
    discount_type: '2_for_1' as '2_for_1' | 'percentage' | 'fixed_amount',
    discount_value: '',
    start_date: '',
    end_date: '',
    max_uses: '',
    limit_per_user: true,
    user_limit_type: 'single' as 'single' | 'custom',
    max_uses_per_user: '1',
  });

  const set = <K extends keyof typeof form>(key: K, val: typeof form[K]) =>
    setForm((f) => ({ ...f, [key]: val }));

  const handleCodeChange = (val: string) => {
    // Upper case and only alphanumeric, hyphens, underscores
    const clean = val.toUpperCase().replace(/[^A-Z0-9_-]/g, '');
    set('code', clean);
  };

  const handleNext = () => {
    if (!form.title.trim()) {
      setErrorMsg('El título es requerido.');
      return;
    }
    if (!form.code.trim()) {
      setErrorMsg('El código de cupón es requerido.');
      return;
    }
    if (form.discount_type !== '2_for_1' && (!form.discount_value || parseFloat(form.discount_value) <= 0)) {
      setErrorMsg('El valor de descuento debe ser mayor a 0.');
      return;
    }
    setErrorMsg(null);
    setStep(2);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setErrorMsg(null);

    const valMaxUses = parseInt(form.max_uses) || 0;
    
    let valMaxUsesPerUser = 0; // unlimited
    if (form.limit_per_user) {
      if (form.user_limit_type === 'single') {
        valMaxUsesPerUser = 1;
      } else {
        valMaxUsesPerUser = parseInt(form.max_uses_per_user) || 1;
      }
    }

    const payload = {
      title: form.title,
      code: form.code,
      description: form.description || undefined,
      discount_type: form.discount_type,
      discount_value: form.discount_type === '2_for_1' ? 0 : parseFloat(form.discount_value) || 0,
      start_date: form.start_date ? new Date(form.start_date + 'T00:00:00').toISOString() : null,
      end_date: form.end_date ? new Date(form.end_date + 'T23:59:59').toISOString() : null,
      max_uses: valMaxUses,
      max_uses_per_user: valMaxUsesPerUser,
    };

    try {
      const res = await createAdminCoupon(payload);
      if (res.success) {
        onSave();
      } else {
        setErrorMsg(res.error || 'Error al crear el cupón. Es posible que el código ya exista.');
        setIsSaving(false);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Error de red al intentar crear el cupón.');
      setIsSaving(false);
    }
  };

  const stepLabel = step === 1
    ? 'Información general del cupón'
    : 'Límites de uso y vigencia';

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget && !isSaving) onClose(); }}>
      <div className="modal modal-sm">
        {/* Header */}
        <div className="modal-header">
          <div>
            <div className="modal-title">Nuevo Cupón de Descuento</div>
            <div className="modal-subtitle">
              {stepLabel}
              <span style={{ marginLeft: 8, color: 'var(--text-light)', fontWeight: 500, fontSize: 12 }}>
                Paso {step} de 2
              </span>
            </div>
          </div>
          <button className="modal-close" onClick={onClose} disabled={isSaving}>
            <AdminIcon name="x" size={14} />
          </button>
        </div>

        {/* Step progress bar */}
        <div className="step-bar">
          {[1, 2].map((s) => (
            <div
              key={s}
              className="step-seg"
              style={{
                background: s <= step ? 'var(--orange)' : 'var(--border)',
                cursor: s < step && !isSaving ? 'pointer' : 'default',
              }}
              onClick={() => s < step && !isSaving && setStep(s)}
            />
          ))}
        </div>

        {/* Body */}
        <div className="modal-body">
          {errorMsg && (
            <div style={{ padding: '12px 16px', background: '#FEE2E2', border: '1.5px solid #FCA5A5', color: '#DC2626', borderRadius: 10, fontSize: 13, fontWeight: 600 }}>
              ⚠️ {errorMsg}
            </div>
          )}

          {step === 1 && (
            <>
              {/* General Section */}
              <div className="form-section">
                <div className="form-section-title">Detalles básicos</div>
                <div className="form-group">
                  <label className="form-label">Título del cupón <span>*</span></label>
                  <input
                    className="form-input"
                    placeholder="ej. Promo Apertura, Descuento Especial…"
                    value={form.title}
                    onChange={(e) => set('title', e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Código promocional <span>*</span></label>
                  <input
                    className="form-input"
                    style={{ fontFamily: 'monospace', fontSize: 14, letterSpacing: '0.05em', textTransform: 'uppercase' }}
                    placeholder="ej. GLIDEFORCE50, BIENVENIDA2X1"
                    value={form.code}
                    onChange={(e) => handleCodeChange(e.target.value)}
                  />
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                    Solo letras, números, guiones y guiones bajos. Sin espacios.
                  </span>
                </div>

                <div className="form-group">
                  <label className="form-label">Descripción</label>
                  <textarea
                    className="form-textarea"
                    placeholder="ej. Otorga un 2x1 en la compra de clases o un 20% en la primera transacción…"
                    value={form.description}
                    onChange={(e) => set('description', e.target.value)}
                  />
                </div>
              </div>

              {/* Promo Type Section */}
              <div className="form-section">
                <div className="form-section-title">Tipo de beneficio</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[
                    {
                      key: '2_for_1',
                      title: '🎟️ Promo 2 por 1',
                      desc: 'Segunda estrella gratis después de pagar la primera clase usando este cupón.',
                    },
                    {
                      key: 'percentage',
                      title: '🏷️ Descuento Porcentual (%)',
                      desc: 'Aplica un descuento proporcional sobre el valor total de la transacción.',
                    },
                    {
                      key: 'fixed_amount',
                      title: '💵 Descuento Fijo (COP)',
                      desc: 'Resta un valor monetario directo al precio total de la compra.',
                    },
                  ].map((t) => (
                    <div
                      key={t.key}
                      className={`instructor-option${form.discount_type === t.key ? ' selected' : ''}`}
                      onClick={() => set('discount_type', t.key as any)}
                      style={{ padding: '12px 14px' }}
                    >
                      <div>
                        <div className="instr-name">{t.title}</div>
                        <div className="instr-spec" style={{ marginTop: 2, lineHeight: 1.4 }}>{t.desc}</div>
                      </div>
                      <div className="instructor-check" style={{ background: 'var(--orange)', opacity: form.discount_type === t.key ? 1 : 0 }}>
                        <AdminIcon name="check" size={10} />
                      </div>
                    </div>
                  ))}
                </div>

                {form.discount_type !== '2_for_1' && (
                  <div className="form-group" style={{ marginTop: 8 }}>
                    <label className="form-label">
                      {form.discount_type === 'percentage' ? 'Porcentaje de descuento (%)' : 'Valor del descuento (COP)'} <span>*</span>
                    </label>
                    <input
                      className="form-input"
                      type="number"
                      min="1"
                      placeholder={form.discount_type === 'percentage' ? 'ej. 20' : 'ej. 15000'}
                      value={form.discount_value}
                      onChange={(e) => set('discount_value', e.target.value)}
                    />
                  </div>
                )}
              </div>
            </>
          )}

          {step === 2 && (
            <>
              {/* Vigencia */}
              <div className="form-section">
                <div className="form-section-title">Vigencia temporal</div>
                <div className="form-row cols-2">
                  <div className="form-group">
                    <label className="form-label">Fecha de inicio (Opcional)</label>
                    <input
                      className="form-input"
                      type="date"
                      value={form.start_date}
                      onChange={(e) => set('start_date', e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Fecha de expiración (Opcional)</label>
                    <input
                      className="form-input"
                      type="date"
                      min={form.start_date || undefined}
                      value={form.end_date}
                      onChange={(e) => set('end_date', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Limites de uso */}
              <div className="form-section">
                <div className="form-section-title">Límites de uso</div>
                
                {/* Límite Global */}
                <div className="form-group">
                  <label className="form-label">Límite de usos global total</label>
                  <input
                    className="form-input"
                    type="number"
                    min="0"
                    placeholder="Ilimitado (deja en 0 o vacío)"
                    value={form.max_uses}
                    onChange={(e) => set('max_uses', e.target.value)}
                  />
                  <span style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>
                    Cantidad máxima de veces que el cupón puede ser usado por todos los clientes juntos.
                  </span>
                </div>

                {/* Límite por Cuenta */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
                  <div className="toggle-row">
                    <div>
                      <div className="toggle-label">Limitar usos por usuario</div>
                      <div className="toggle-desc">Evita que una misma cuenta use este cupón repetidas veces</div>
                    </div>
                    <Toggle checked={form.limit_per_user} onChange={(v) => set('limit_per_user', v)} />
                  </div>

                  {form.limit_per_user && (
                    <div style={{ background: 'var(--bg)', border: '1.5px solid var(--border)', borderRadius: 12, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div style={{ display: 'flex', gap: 12 }}>
                        {[
                          { key: 'single', label: 'Solo 1 uso por cuenta' },
                          { key: 'custom', label: 'Límite personalizado' },
                        ].map((opt) => (
                          <label key={opt.key} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', color: 'var(--text)' }}>
                            <input
                              type="radio"
                              name="user_limit_type"
                              checked={form.user_limit_type === opt.key}
                              onChange={() => set('user_limit_type', opt.key as any)}
                              style={{ accentColor: 'var(--orange)' }}
                            />
                            {opt.label}
                          </label>
                        ))}
                      </div>

                      {form.user_limit_type === 'custom' && (
                        <div className="form-group" style={{ marginTop: 4 }}>
                          <label className="form-label">Número de usos máximos por cuenta <span>*</span></label>
                          <input
                            className="form-input"
                            type="number"
                            min="1"
                            value={form.max_uses_per_user}
                            onChange={(e) => set('max_uses_per_user', e.target.value)}
                            style={{ background: 'white' }}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer">
          {step > 1 && (
            <button className="btn-cancel" onClick={() => setStep(1)} disabled={isSaving}>
              ← Atrás
            </button>
          )}
          <button className="btn-cancel" onClick={onClose} disabled={isSaving}>
            Cancelar
          </button>
          {step === 1 ? (
            <button className="btn-primary" onClick={handleNext} style={{ margin: 0 }}>
              Siguiente →
            </button>
          ) : (
            <button className="btn-primary" onClick={handleSave} disabled={isSaving} style={{ margin: 0 }}>
              {isSaving ? 'Creando...' : 'Crear Cupón'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
