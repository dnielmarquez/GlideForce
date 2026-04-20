'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import AdminIcon from '@/components/admin/AdminIcon';
import Toggle from '@/components/admin/Toggle';
import Toast from '@/components/admin/Toast';
import type { ToastState } from '@/lib/admin/types';
import type { Settings, WaitlistMinutes } from '@/types';

export default function SettingsPage() {
  const [cfg, setCfg] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [toast, setToast] = useState<ToastState>({ show: false, msg: '' });
  const supabase = createClient();

  useEffect(() => {
    async function loadSettings() {
      const { data, error } = await supabase.from('settings').select('*').eq('id', 1).single();
      if (data && !error) {
        setCfg(data);
      } else {
        console.error('Error fetching settings:', error);
      }
      setLoading(false);
    }
    loadSettings();
  }, [supabase]);

  const showToast = (msg: string) => {
    setToast({ show: true, msg });
    setTimeout(() => setToast({ show: false, msg: '' }), 3200);
  };

  const updateCfg = <K extends keyof Settings>(key: K, val: Settings[K]) => {
    setCfg((prev) => prev ? { ...prev, [key]: val } : null);
  };

  const saveSettings = async () => {
    if (!cfg) return;
    setSaving(true);
    // Don't update id or updated_by for now (or let DB handle it)
    const { id, updated_at, ...updateData } = cfg;
    
    // updated_at trigger handles the timestamp automatically in DB
    const { error } = await supabase.from('settings').update(updateData as never).eq('id', 1);
    
    setSaving(false);
    if (error) {
      console.error('Error saving settings:', error);
      showToast('Error al guardar la configuración');
    } else {
      setSaved(true);
      showToast('Configuración guardada correctamente');
      setTimeout(() => setSaved(false), 2000);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: 'var(--text-muted)' }}>
        Cargando configuración...
      </div>
    );
  }

  if (!cfg) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: 'var(--text-muted)' }}>
        Error al cargar la configuración
      </div>
    );
  }

  return (
    <>
      <div style={{ maxWidth: 760 }}>
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.5px', marginBottom: 4 }}>Configuración General</div>
          <div style={{ fontSize: 13.5, color: 'var(--text-muted)', fontWeight: 500 }}>
            Ajusta las políticas y parámetros de operación del estudio
          </div>
        </div>

        {/* ── Studio info ─────────────────────────────────────────────── */}
        <div className="settings-card">
          <div className="settings-card-header">
            <div className="settings-card-icon" style={{ background: 'var(--orange-light)', color: 'var(--orange)' }}>
              <AdminIcon name="home" size={16} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 14 }}>Información del estudio</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>Datos básicos de tu cuenta</div>
            </div>
          </div>
          <div className="settings-card-body">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
              <div className="form-group">
                <label className="form-label">Nombre del estudio</label>
                <input className="form-input" value={cfg.studio_name} onChange={(e) => updateCfg('studio_name', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Correo de contacto</label>
                <input className="form-input" type="email" value={cfg.contact_email} onChange={(e) => updateCfg('contact_email', e.target.value)} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div className="form-group">
                <label className="form-label">Moneda</label>
                <div className="form-select-wrap">
                  <select className="form-select" value={cfg.currency} onChange={(e) => updateCfg('currency', e.target.value)}>
                    <option value="COP">COP — Peso Colombiano</option>
                    <option value="USD">USD — Dólar Americano</option>
                    <option value="EUR">EUR — Euro</option>
                    <option value="MXN">MXN — Peso Mexicano</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Zona horaria</label>
                <div className="form-select-wrap">
                  <select className="form-select" value={cfg.timezone} onChange={(e) => updateCfg('timezone', e.target.value)}>
                    <option value="America/Bogota">America/Bogotá (UTC-5)</option>
                    <option value="America/Mexico_City">America/Ciudad de México (UTC-6)</option>
                    <option value="America/Lima">America/Lima (UTC-5)</option>
                    <option value="America/Buenos_Aires">America/Buenos Aires (UTC-3)</option>
                    <option value="America/New_York">America/Nueva York (UTC-4)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Cancellation policy ──────────────────────────────────────── */}
        <div className="settings-card">
          <div className="settings-card-header">
            <div className="settings-card-icon" style={{ background: '#FDE8F0', color: '#C4376D' }}>
              <AdminIcon name="repeat" size={16} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 14 }}>Política de cancelación</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>Tiempo mínimo antes de la clase para cancelar sin penalización</div>
            </div>
          </div>
          <div className="settings-card-body">
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Días de anticipación para cancelar</div>
                <div style={{ fontSize: 12.5, color: 'var(--text-muted)', fontWeight: 500, lineHeight: 1.5 }}>
                  Los usuarios podrán cancelar su reserva hasta <strong>{cfg.cancel_days} día{cfg.cancel_days !== 1 ? 's' : ''}</strong> antes del inicio de la clase sin perder su estrellita.
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                <div className="counter-box">
                  <button className="counter-btn" onClick={() => updateCfg('cancel_days', Math.max(0, cfg.cancel_days - 1))}>−</button>
                  <div className="counter-val" style={{ width: 64, color: 'var(--orange)' }}>{cfg.cancel_days}</div>
                  <button className="counter-btn" onClick={() => updateCfg('cancel_days', Math.min(30, cfg.cancel_days + 1))}>+</button>
                </div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Días</div>
              </div>
            </div>
            <div style={{ marginTop: 16 }}>
              <input type="range" min="0" max="30" value={cfg.cancel_days}
                onChange={(e) => updateCfg('cancel_days', parseInt(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--orange)', cursor: 'pointer', height: 4 }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: 'var(--text-light)', fontWeight: 600, marginTop: 4 }}>
                <span>0 días (sin política)</span><span>15 días</span><span>30 días</span>
              </div>
            </div>
            {cfg.cancel_days === 0 && (
              <div style={{ marginTop: 12, padding: '10px 14px', background: '#FDE8F0', borderRadius: 10, fontSize: 12.5, color: '#C4376D', fontWeight: 600 }}>
                ⚠️ Sin política activa — los usuarios pueden cancelar en cualquier momento sin consecuencias.
              </div>
            )}
          </div>
        </div>

        {/* ── Waitlist ─────────────────────────────────────────────────── */}
        <div className="settings-card">
          <div className="settings-card-header" style={{ justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div className="settings-card-icon" style={{ background: '#EFE9FD', color: '#6D37C4' }}>
                <AdminIcon name="clock" size={16} />
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 14 }}>Lista de espera</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>Tiempo máximo que una usuaria tiene para confirmar su lugar</div>
              </div>
            </div>
            <Toggle checked={cfg.waitlist_enabled} onChange={(v) => updateCfg('waitlist_enabled', v)} />
          </div>
          <div className="settings-card-body" style={{ opacity: cfg.waitlist_enabled ? 1 : 0.4, pointerEvents: cfg.waitlist_enabled ? 'auto' : 'none', transition: 'opacity 0.2s' }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>
              Tiempo máximo de confirmación: <span style={{ color: 'var(--orange)', fontWeight: 800 }}>{cfg.waitlist_hours}h {cfg.waitlist_minutes}min</span>
            </div>
            <div style={{ display: 'flex', gap: 24, alignItems: 'flex-end' }}>
              {/* Hours */}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Horas</div>
                <div className="counter-box" style={{ height: 52 }}>
                  <button className="counter-btn" style={{ height: 52 }} onClick={() => updateCfg('waitlist_hours', Math.max(0, cfg.waitlist_hours - 1))}>−</button>
                  <div style={{ flex: 1, textAlign: 'center', fontSize: 30, fontWeight: 800, color: '#6D37C4', letterSpacing: '-1px' }}>{String(cfg.waitlist_hours).padStart(2, '0')}</div>
                  <button className="counter-btn" style={{ height: 52 }} onClick={() => updateCfg('waitlist_hours', Math.min(72, cfg.waitlist_hours + 1))}>+</button>
                </div>
                <input type="range" min="0" max="72" value={cfg.waitlist_hours}
                  onChange={(e) => updateCfg('waitlist_hours', parseInt(e.target.value))}
                  style={{ width: '100%', accentColor: '#6D37C4', cursor: 'pointer', marginTop: 10 }} />
              </div>
              <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-light)', paddingBottom: 28 }}>:</div>
              {/* Minutes */}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Minutos</div>
                <div className="counter-box" style={{ height: 52 }}>
                  <button className="counter-btn" style={{ height: 52 }} onClick={() => updateCfg('waitlist_minutes', cfg.waitlist_minutes === 0 ? 45 : (cfg.waitlist_minutes - 15) as WaitlistMinutes)}>−</button>
                  <div style={{ flex: 1, textAlign: 'center', fontSize: 30, fontWeight: 800, color: '#6D37C4', letterSpacing: '-1px' }}>{String(cfg.waitlist_minutes).padStart(2, '0')}</div>
                  <button className="counter-btn" style={{ height: 52 }} onClick={() => updateCfg('waitlist_minutes', cfg.waitlist_minutes === 45 ? 0 : (cfg.waitlist_minutes + 15) as WaitlistMinutes)}>+</button>
                </div>
                <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                  {([0, 15, 30, 45] as WaitlistMinutes[]).map((m) => (
                    <div key={m} onClick={() => updateCfg('waitlist_minutes', m)}
                      style={{ flex: 1, textAlign: 'center', padding: '4px 0', borderRadius: 8, fontSize: 11.5, fontWeight: 700, cursor: 'pointer',
                        background: cfg.waitlist_minutes === m ? '#6D37C4' : 'var(--bg)',
                        color: cfg.waitlist_minutes === m ? 'white' : 'var(--text-muted)',
                        border: '1.5px solid', borderColor: cfg.waitlist_minutes === m ? '#6D37C4' : 'var(--border)',
                        transition: 'all 0.15s' }}>
                      :{String(m).padStart(2, '0')}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ marginTop: 14, padding: '10px 14px', background: '#EFE9FD', borderRadius: 10, fontSize: 12.5, color: '#6D37C4', fontWeight: 600 }}>
              Cuando un cupo se libere, la siguiente usuaria en lista de espera tendrá <strong>{cfg.waitlist_hours}h {cfg.waitlist_minutes}min</strong> para confirmar antes de pasar al siguiente.
            </div>
          </div>
        </div>

        {/* ── Machines ─────────────────────────────────────────────────── */}
        <div className="settings-card">
          <div className="settings-card-header">
            <div className="settings-card-icon" style={{ background: '#E6F7F4', color: '#0F8B76' }}>
              <AdminIcon name="dumbbell" size={16} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 14 }}>Máquinas disponibles</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>Número total de puestos/máquinas en el estudio</div>
            </div>
          </div>
          <div className="settings-card-body">
            <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Total de máquinas en el estudio</div>
                <div style={{ fontSize: 12.5, color: 'var(--text-muted)', fontWeight: 500, lineHeight: 1.5 }}>
                  Este número determina cuántos puestos se muestran al reservar. Actualmente hay <strong style={{ color: '#0F8B76' }}>{cfg.machines_count} máquinas</strong> disponibles.
                </div>
                <div style={{ marginTop: 14 }}>
                  <input type="range" min="1" max="50" value={cfg.machines_count}
                    onChange={(e) => updateCfg('machines_count', parseInt(e.target.value))}
                    style={{ width: '100%', accentColor: '#0F8B76', cursor: 'pointer' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: 'var(--text-light)', fontWeight: 600, marginTop: 4 }}>
                    <span>1</span><span>25</span><span>50</span>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                <div className="counter-box" style={{ height: 56 }}>
                  <button className="counter-btn" style={{ width: 44, height: 56, fontSize: 22 }} onClick={() => updateCfg('machines_count', Math.max(1, cfg.machines_count - 1))}>−</button>
                  <div style={{ width: 72, textAlign: 'center', fontSize: 34, fontWeight: 800, color: '#0F8B76', letterSpacing: '-1px' }}>{cfg.machines_count}</div>
                  <button className="counter-btn" style={{ width: 44, height: 56, fontSize: 22 }} onClick={() => updateCfg('machines_count', Math.min(50, cfg.machines_count + 1))}>+</button>
                </div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Máquinas</div>
              </div>
            </div>
            {/* Machine grid preview */}
            <div style={{ marginTop: 20, padding: '14px 16px', background: 'var(--bg)', borderRadius: 12, border: '1.5px solid var(--border)' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>Vista previa — cómo se verá en la app</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {Array.from({ length: Math.min(cfg.machines_count, 30) }, (_, i) => (
                  <div key={i} style={{ width: 36, height: 36, borderRadius: 8, background: i === 0 ? 'var(--orange)' : 'white', border: `1.5px solid ${i === 0 ? 'var(--orange)' : 'var(--border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: i === 0 ? 'white' : 'var(--text-muted)' }}>
                    M-{String(i + 1).padStart(2, '0')}
                  </div>
                ))}
                {cfg.machines_count > 30 && (
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: 'var(--text-muted)' }}>
                    +{cfg.machines_count - 30}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Bookings & Notifications ──────────────────────────────────── */}
        <div className="settings-card" style={{ marginBottom: 24 }}>
          <div className="settings-card-header">
            <div className="settings-card-icon" style={{ background: '#E8F1FD', color: '#2563EB' }}>
              <AdminIcon name="bell" size={16} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 14 }}>Reservas y notificaciones</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>Controla el comportamiento de reservas y alertas</div>
            </div>
          </div>
          <div className="settings-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {([
              { key: 'booking_open' as const, label: 'Reservas abiertas',           desc: 'Las usuarias pueden reservar clases desde la app' },
              { key: 'notify_email' as const, label: 'Notificaciones por correo',   desc: 'Enviar confirmaciones y recordatorios por email' },
              { key: 'notify_push'  as const, label: 'Notificaciones push',         desc: 'Enviar alertas push cuando una clase se libera o modifica' },
            ]).map(({ key, label, desc }) => (
              <div key={key} className="toggle-row" style={{ marginBottom: 8 }}>
                <div>
                  <div className="toggle-label">{label}</div>
                  <div className="toggle-desc">{desc}</div>
                </div>
                <Toggle checked={cfg[key] as boolean} onChange={(v) => updateCfg(key, v)} />
              </div>
            ))}
          </div>
        </div>

        {/* Save */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button className="btn-primary" onClick={saveSettings} disabled={saving} style={{ minWidth: 160, justifyContent: 'center', margin: 0 }}>
            {saving 
              ? 'Guardando...' 
              : saved
                ? <><AdminIcon name="check" size={15} /> Guardado</>
                : <><AdminIcon name="settings" size={15} /> Guardar cambios</>
            }
          </button>
        </div>
      </div>

      <Toast toast={toast} />
    </>
  );
}
