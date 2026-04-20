'use client';

import { useState } from 'react';
import type { Member, MemberFormData } from '@/lib/admin/types';
import { MEMBER_HISTORY, MEMBER_UPCOMING } from '@/lib/admin/data';
import AdminIcon from './AdminIcon';

interface Props {
  member: Member;
  isEdit: boolean;
  onClose: () => void;
  onSave: (id: string, data: MemberFormData) => void;
}

export default function MemberDetailModal({ member, isEdit: initEdit, onClose, onSave }: Props) {
  const [isEdit, setIsEdit] = useState(initEdit);
  const [form, setForm] = useState<MemberFormData>({
    name: member.name,
    email: member.email,
    phone: member.phone,
    stars: member.stars,
    status: member.status,
  });
  const [histTab, setHistTab] = useState<'upcoming' | 'history'>('upcoming');

  const set = <K extends keyof MemberFormData>(k: K, v: MemberFormData[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const history  = MEMBER_HISTORY[member.id]  ?? [];
  const upcoming = MEMBER_UPCOMING[member.id] ?? [];

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal modal-sm">
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: member.color + '22', color: member.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, fontWeight: 800, flexShrink: 0 }}>
              {member.initials}
            </div>
            <div>
              <div className="modal-title" style={{ fontSize: 17 }}>{member.name}</div>
              <div className="modal-subtitle">{member.email} · Miembro desde {member.joined}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setIsEdit((e) => !e)}
              className={isEdit ? 'btn-primary' : 'btn-secondary'}
              style={{ padding: '7px 14px', fontSize: 12.5, margin: 0 }}
            >
              <AdminIcon name={isEdit ? 'check' : 'edit'} size={13} />
              {isEdit ? 'Editando' : 'Editar'}
            </button>
            <button className="modal-close" onClick={onClose}><AdminIcon name="x" size={14} /></button>
          </div>
        </div>

        <div className="modal-body">
          {/* Personal info */}
          <div className="form-section">
            <div className="form-section-title">Información personal</div>
            <div className="form-row cols-2">
              <div className="form-group">
                <label className="form-label">Nombre completo</label>
                {isEdit
                  ? <input className="form-input" value={form.name} onChange={(e) => set('name', e.target.value)} />
                  : <div style={{ padding: '10px 13px', background: 'var(--bg)', borderRadius: 10, fontSize: 13.5, fontWeight: 600, border: '1.5px solid var(--border)' }}>{member.name}</div>
                }
              </div>
              <div className="form-group">
                <label className="form-label">Estado</label>
                {isEdit
                  ? (
                    <div className="form-select-wrap">
                      <select className="form-select" value={form.status} onChange={(e) => set('status', e.target.value as 'activa' | 'inactiva')}>
                        <option value="activa">Activa</option>
                        <option value="inactiva">Inactiva</option>
                      </select>
                    </div>
                  )
                  : (
                    <div style={{
                      padding: '10px 13px', borderRadius: 10, fontSize: 13.5, fontWeight: 700,
                      border: '1.5px solid',
                      background: member.status === 'activa' ? '#E6F7F4' : 'var(--bg)',
                      borderColor: member.status === 'activa' ? '#0F8B76' : 'var(--border)',
                      color: member.status === 'activa' ? '#0F8B76' : 'var(--text-muted)',
                    }}>
                      {member.status === 'activa' ? '● Activa' : '○ Inactiva'}
                    </div>
                  )
                }
              </div>
            </div>
            <div className="form-row cols-2">
              <div className="form-group">
                <label className="form-label">Correo electrónico</label>
                {isEdit
                  ? <input className="form-input" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
                  : <div style={{ padding: '10px 13px', background: 'var(--bg)', borderRadius: 10, fontSize: 13.5, fontWeight: 600, border: '1.5px solid var(--border)' }}>{member.email}</div>
                }
              </div>
              <div className="form-group">
                <label className="form-label">Celular</label>
                {isEdit
                  ? <input className="form-input" type="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
                  : <div style={{ padding: '10px 13px', background: 'var(--bg)', borderRadius: 10, fontSize: 13.5, fontWeight: 600, border: '1.5px solid var(--border)' }}>{member.phone}</div>
                }
              </div>
            </div>
          </div>

          {/* Stars */}
          <div className="form-section">
            <div className="form-section-title">Estrellitas</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20, padding: '16px 18px', background: 'var(--orange-light)', borderRadius: 12, border: '1.5px solid var(--orange-mid)' }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--orange)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AdminIcon name="star" size={22} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--orange)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Balance actual</div>
                {isEdit ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
                    <button
                      onClick={() => set('stars', Math.max(0, form.stars - 1))}
                      style={{ width: 32, height: 32, borderRadius: 8, border: '1.5px solid var(--orange-mid)', background: 'white', cursor: 'pointer', fontSize: 16, fontWeight: 700, color: 'var(--orange)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >−</button>
                    <span style={{ fontSize: 28, fontWeight: 800, color: 'var(--orange)', letterSpacing: '-1px', minWidth: 40, textAlign: 'center' }}>{form.stars}</span>
                    <button
                      onClick={() => set('stars', form.stars + 1)}
                      style={{ width: 32, height: 32, borderRadius: 8, border: '1.5px solid var(--orange-mid)', background: 'white', cursor: 'pointer', fontSize: 16, fontWeight: 700, color: 'var(--orange)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >+</button>
                    <span style={{ fontSize: 12, color: 'var(--orange)', fontWeight: 600 }}>estrellitas</span>
                  </div>
                ) : (
                  <div style={{ fontSize: 30, fontWeight: 800, color: 'var(--orange)', letterSpacing: '-1px', marginTop: 2 }}>
                    {member.stars} <span style={{ fontSize: 14, fontWeight: 600 }}>estrellitas</span>
                  </div>
                )}
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 11, color: 'var(--orange)', fontWeight: 600 }}>Equivale a</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--orange)' }}>{isEdit ? form.stars : member.stars} sesiones</div>
              </div>
            </div>
          </div>

          {/* History / Upcoming tabs */}
          <div className="form-section">
            <div className="hist-tabs">
              {([['upcoming', 'Clases reservadas'], ['history', 'Historial de clases']] as const).map(([k, l]) => (
                <div
                  key={k}
                  className={`hist-tab${histTab === k ? ' active' : ''}`}
                  onClick={() => setHistTab(k)}
                >
                  {l}
                  {histTab === k && (
                    <span style={{ marginLeft: 4, background: 'var(--orange)', color: 'white', fontSize: 10, fontWeight: 700, padding: '1px 5px', borderRadius: 99 }}>
                      {k === 'upcoming' ? upcoming.length : history.length}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {histTab === 'upcoming' && (
              upcoming.length === 0
                ? <div style={{ textAlign: 'center', padding: '28px 0', color: 'var(--text-muted)', fontSize: 13, fontWeight: 500 }}>Sin clases reservadas próximamente</div>
                : upcoming.map((c, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px', background: 'var(--orange-light)', borderRadius: 10, marginBottom: 8, border: '1.5px solid var(--orange-mid)' }}>
                    <div style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--orange)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', flexShrink: 0 }}>
                      <AdminIcon name="calendar" size={16} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--text)' }}>{c.title}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--text-muted)', fontWeight: 500, marginTop: 2 }}>
                        {c.instructor} · {c.date} · {c.time} · {c.machine}
                      </div>
                    </div>
                    <span style={{ fontSize: 10.5, fontWeight: 700, background: 'var(--orange)', color: 'white', padding: '3px 9px', borderRadius: 99 }}>Reservada</span>
                  </div>
                ))
            )}

            {histTab === 'history' && (
              history.length === 0
                ? <div style={{ textAlign: 'center', padding: '28px 0', color: 'var(--text-muted)', fontSize: 13, fontWeight: 500 }}>Sin historial de clases</div>
                : history.map((c) => (
                  <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px', background: 'var(--bg)', borderRadius: 10, marginBottom: 8, border: '1.5px solid var(--border)' }}>
                    <div style={{ width: 38, height: 38, borderRadius: 10, background: c.status === 'completada' ? '#E6F7F4' : '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: c.status === 'completada' ? '#0F8B76' : '#DC2626', flexShrink: 0 }}>
                      <AdminIcon name={c.status === 'completada' ? 'check' : 'x'} size={15} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 13.5 }}>{c.title}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--text-muted)', fontWeight: 500, marginTop: 2 }}>{c.instructor} · {c.date} · {c.time}</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                      <span style={{ fontSize: 10.5, fontWeight: 700, padding: '3px 9px', borderRadius: 99, background: c.status === 'completada' ? '#E6F7F4' : '#FEE2E2', color: c.status === 'completada' ? '#0F8B76' : '#DC2626' }}>
                        {c.status}
                      </span>
                      {c.stars > 0 && <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--orange)' }}>−1 ★</span>}
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>

        {isEdit && (
          <div className="modal-footer">
            <button className="btn-cancel" onClick={() => setIsEdit(false)}>Cancelar</button>
            <button
              className="btn-primary"
              style={{ margin: 0 }}
              onClick={() => { onSave(member.id, form); onClose(); }}
            >
              <AdminIcon name="check" size={14} /> Guardar cambios
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
