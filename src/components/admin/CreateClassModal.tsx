'use client';

import { useState } from 'react';
import type { ClassFormData } from '@/lib/admin/types';
import { CLASS_COLORS, DAYS_OF_WEEK, DAYS_FULL } from '@/lib/admin/constants';
import { countRecurringPreview, isHoliday } from '@/lib/admin/utils';
import { useAdmin } from '@/lib/admin/AdminContext';
import { createClient } from '@/utils/supabase/client';
import AdminIcon from './AdminIcon';
import Toggle from './Toggle';

const EMPTY_FORM: ClassFormData = {
  title: '', description: '', instructorId: null,
  time: '10:00', duration: '45', capacity: '12',
  startDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
  endDate: new Date(Date.now() + 86400000 * 60).toISOString().split('T')[0],
  selectedDays: [1, 3, 5],
  isRecurring: true,
  excludeHolidays: true,
  color: 'orange',
};

interface Props {
  onClose: () => void;
  onSave: (count: number) => void;
}

export default function CreateClassModal({ onClose, onSave }: Props) {
  const { instructors, showToast } = useAdmin();
  const [form, setForm] = useState<ClassFormData>(EMPTY_FORM);
  const [step, setStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const supabase = createClient();

  const set = <K extends keyof ClassFormData>(key: K, val: ClassFormData[K]) =>
    setForm((f) => ({ ...f, [key]: val }));

  const toggleDay = (d: number) => {
    set('selectedDays', form.selectedDays.includes(d)
      ? form.selectedDays.filter((x) => x !== d)
      : [...form.selectedDays, d].sort((a, b) => a - b));
  };

  const previewCount = () => countRecurringPreview(form);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // 1. Insert Template
      const { data: template, error: tErr } = await supabase
        .from('class_templates')
        .insert({
          title: form.title,
          description: form.description || null,
          instructor_id: form.instructorId!,
          duration_minutes: parseInt(form.duration),
          capacity: parseInt(form.capacity),
          color: form.color,
          stars_cost: 1,
          active: true,
        } as any)
        .select('id')
        .single();
        
      if (tErr || !template) throw new Error(tErr?.message || 'Error creating template');

      let recurrenceId = null;

      // 2. Insert Recurrence if needed
      if (form.isRecurring) {
        const { data: rec, error: rErr } = await supabase
          .from('class_recurrences')
          .insert({
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            template_id: (template as any).id,
            start_date: form.startDate,
            end_date: form.endDate,
            selected_days: form.selectedDays,
            exclude_holidays: form.excludeHolidays,
            sessions_created: previewCount(),
          } as any)
          .select('id')
          .single();
          
        if (rErr) throw new Error(rErr.message);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        recurrenceId = (rec as any)?.id || null;
      }

      // 3. Generate Sessions Payload
      const sessions = [];
      const start = new Date(form.startDate + 'T00:00:00');
      const end = form.isRecurring ? new Date(form.endDate + 'T00:00:00') : new Date(start);
      let cur = new Date(start);

      while (cur <= end) {
        const dow = cur.getDay();
        // If it's a single class, just do it. If recurring, check days.
        if (!form.isRecurring || form.selectedDays.includes(dow)) {
          if (form.isRecurring && form.excludeHolidays && isHoliday(cur)) {
            cur.setDate(cur.getDate() + 1);
            continue;
          }
          const dateStr = cur.toISOString().split('T')[0];
          
          sessions.push({
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            template_id: (template as any).id,
            recurrence_id: recurrenceId,
            title: form.title,
            description: form.description || null,
            instructor_id: form.instructorId!,
            date: dateStr,
            start_time: form.time + ':00', // Needs HH:MM:SS
            duration_minutes: parseInt(form.duration),
            capacity: parseInt(form.capacity),
            color: form.color,
            stars_cost: 1,
            status: 'scheduled',
          } as any);
        }
        cur.setDate(cur.getDate() + 1);
      }

      // 4. Batch Insert Sessions
      if (sessions.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: sErr } = await supabase.from('class_sessions').insert(sessions as any);
        if (sErr) throw new Error(sErr.message);
      }

      onSave(sessions.length);
    } catch (err) {
      console.error(err);
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      showToast('Error: ' + msg);
      setIsSaving(false);
    }
  };

  const isValid = form.title.trim() && form.instructorId && (!form.isRecurring || form.selectedDays.length > 0);
  const colorObj = CLASS_COLORS.find((c) => c.key === form.color);
  const count = form.isRecurring ? previewCount() : 1;

  const stepLabel = step === 1
    ? 'Información general de la clase'
    : step === 2
    ? 'Horario y recurrencia'
    : 'Confirmar y crear';

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget && !isSaving) onClose(); }}>
      <div className="modal">
        {/* Header */}
        <div className="modal-header">
          <div>
            <div className="modal-title">Nueva Clase</div>
            <div className="modal-subtitle">
              {stepLabel}
              <span style={{ marginLeft: 8, color: 'var(--text-light)', fontWeight: 500, fontSize: 12 }}>
                Paso {step} de 3
              </span>
            </div>
          </div>
          <button className="modal-close" onClick={onClose} disabled={isSaving}><AdminIcon name="x" size={14} /></button>
        </div>

        {/* Step bar */}
        <div className="step-bar">
          {[1, 2, 3].map((s) => (
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
          {/* ── Step 1: Info ── */}
          {step === 1 && (
            <>
              <div className="form-section">
                <div className="form-section-title">Información de la clase</div>
                <div className="form-group">
                  <label className="form-label">Título de la clase <span>*</span></label>
                  <input className="form-input" placeholder="ej. HIIT Burn, Yoga Flow…" value={form.title}
                    onChange={(e) => set('title', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Descripción</label>
                  <textarea className="form-textarea" placeholder="Describe brevemente la clase, nivel de dificultad, qué esperar…"
                    value={form.description} onChange={(e) => set('description', e.target.value)} />
                </div>
                <div className="form-row cols-2">
                  <div className="form-group">
                    <label className="form-label">Duración (min) <span>*</span></label>
                    <div className="form-select-wrap">
                      <select className="form-select" value={form.duration} onChange={(e) => set('duration', e.target.value)}>
                        {[30, 45, 50, 60, 75, 90].map((d) => (
                          <option key={d} value={d}>{d} minutos</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Capacidad máx.</label>
                    <input className="form-input" type="number" min="1" max="50"
                      value={form.capacity} onChange={(e) => set('capacity', e.target.value)} />
                  </div>
                </div>
              </div>

              <div className="form-section">
                <div className="form-section-title">Profesora</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {instructors.map((instr) => (
                    <div
                      key={instr.id}
                      className={`instructor-option${form.instructorId === instr.id ? ' selected' : ''}`}
                      onClick={() => set('instructorId', instr.id)}
                    >
                      <div className="instr-avatar" style={{ background: instr.color + '22', color: instr.color }}>
                        {instr.initials}
                      </div>
                      <div>
                        <div className="instr-name">{instr.name}</div>
                        <div className="instr-spec">{instr.specialty}</div>
                      </div>
                      <div className="instructor-check" style={{ background: instr.color }}>
                        <AdminIcon name="check" size={10} />
                      </div>
                    </div>
                  ))}
                  {instructors.length === 0 && (
                     <div style={{ padding: 10, fontSize: 13, color: 'var(--text-muted)' }}>Ninguna profesora registrada en el sistema.</div>
                  )}
                </div>
              </div>

              <div className="form-section">
                <div className="form-section-title">Color en calendario</div>
                <div className="color-picker">
                  {CLASS_COLORS.map((c) => (
                    <div
                      key={c.key}
                      className={`color-dot${form.color === c.key ? ' selected' : ''}`}
                      style={{ background: c.hex }}
                      title={c.label}
                      onClick={() => set('color', c.key)}
                    />
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ── Step 2: Schedule ── */}
          {step === 2 && (
            <>
              <div className="form-section">
                <div className="form-section-title">Horario</div>
                <div className="form-row cols-2">
                  <div className="form-group">
                    <label className="form-label">Hora de inicio <span>*</span></label>
                    <input className="form-input" type="time" value={form.time}
                      onChange={(e) => set('time', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Fecha de inicio <span>*</span></label>
                    <input className="form-input" type="date" value={form.startDate}
                      onChange={(e) => set('startDate', e.target.value)} />
                  </div>
                </div>
              </div>

              <div className="form-section">
                <div className="form-section-title">Recurrencia</div>
                <div className="toggle-row">
                  <div>
                    <div className="toggle-label">Clase recurrente</div>
                    <div className="toggle-desc">Se creará en múltiples fechas automáticamente</div>
                  </div>
                  <Toggle checked={form.isRecurring} onChange={(v) => set('isRecurring', v)} />
                </div>

                {form.isRecurring && (
                  <>
                    <div className="form-group">
                      <label className="form-label">Días de la semana <span>*</span></label>
                      <div className="days-selector">
                        {DAYS_OF_WEEK.map((d, i) => (
                          <div
                            key={i}
                            className={`day-pill${form.selectedDays.includes(i) ? ' selected' : ''}`}
                            onClick={() => toggleDay(i)}
                          >
                            {d}
                          </div>
                        ))}
                      </div>
                      <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 6, fontWeight: 500 }}>
                        {form.selectedDays.length === 0
                          ? 'Selecciona al menos un día'
                          : `Seleccionados: ${form.selectedDays.map((d) => DAYS_FULL[d]).join(', ')}`}
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Fecha de fin <span>*</span></label>
                      <input className="form-input" type="date" value={form.endDate} min={form.startDate}
                        onChange={(e) => set('endDate', e.target.value)} />
                    </div>

                    <div className="toggle-row">
                      <div>
                        <div className="toggle-label">Excluir festivos</div>
                        <div className="toggle-desc">No se crearán clases en días festivos de Colombia</div>
                      </div>
                      <Toggle checked={form.excludeHolidays} onChange={(v) => set('excludeHolidays', v)} />
                    </div>
                  </>
                )}
              </div>
            </>
          )}

          {/* ── Step 3: Preview ── */}
          {step === 3 && (
            <>
              {/* Preview card */}
              <div style={{ background: colorObj?.bg ?? 'var(--orange-light)', borderRadius: 14, padding: '18px 20px', borderLeft: `4px solid ${colorObj?.hex ?? 'var(--orange)'}` }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: colorObj?.text ?? 'var(--orange)', letterSpacing: '-0.3px' }}>
                  {form.title || 'Sin título'}
                </div>
                {form.description && (
                  <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 6, lineHeight: 1.5, fontWeight: 500 }}>
                    {form.description}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 12, marginTop: 12, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>
                    <AdminIcon name="clock" size={13} /> {form.time} · {form.duration} min
                  </div>
                  {form.instructorId && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>
                      <AdminIcon name="users" size={13} /> {instructors.find((i) => i.id === form.instructorId)?.name}
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>
                    👥 Capacidad: {form.capacity}
                  </div>
                </div>
              </div>

              {/* Recurrence summary */}
              {form.isRecurring && (
                <div style={{ background: 'var(--bg)', border: '1.5px solid var(--border)', borderRadius: 12, padding: '16px 18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <AdminIcon name="repeat" size={15} />
                    <span style={{ fontWeight: 700, fontSize: 13.5 }}>Resumen de recurrencia</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {[
                      ['Días', form.selectedDays.map((d) => DAYS_OF_WEEK[d]).join(', ') || '—'],
                      ['Desde', form.startDate],
                      ['Hasta', form.endDate],
                      ['Hora', form.time],
                      ['Excluir festivos', form.excludeHolidays ? 'Sí' : 'No'],
                    ].map(([k, v]) => (
                      <div key={k}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{k}</div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginTop: 2 }}>{v}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: 14, padding: '10px 14px', background: 'var(--orange-light)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Total de clases a crear</span>
                    <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--orange)' }}>{count}</span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer">
          {step > 1 && (
            <button className="btn-cancel" onClick={() => setStep((s) => s - 1)} disabled={isSaving}>← Atrás</button>
          )}
          <button className="btn-cancel" onClick={onClose} disabled={isSaving}>Cancelar</button>
          {step < 3 ? (
            <button
              className="btn-primary"
              onClick={() => setStep((s) => s + 1)}
              disabled={step === 1 && (!form.title.trim() || !form.instructorId)}
              style={{ margin: 0 }}
            >
              Siguiente →
            </button>
          ) : (
            <button
              className="btn-primary"
              onClick={handleSave}
              disabled={!isValid || isSaving}
              style={{ margin: 0 }}
            >
              {isSaving ? (
                <>Creando...</>
              ) : (
                <>
                  <AdminIcon name="plus" size={14} />
                  Crear {count > 1 ? `${count} clases` : 'clase'}
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
