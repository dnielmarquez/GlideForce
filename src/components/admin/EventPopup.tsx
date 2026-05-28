'use client';

import type { EventPopupData } from '@/lib/admin/types';
import { CLASS_COLORS } from '@/lib/admin/constants';
import { useAdmin } from '@/lib/admin/AdminContext';
import { useState } from 'react';
import AdminIcon from './AdminIcon';
import { formatClassTime } from '@/lib/admin/utils';

interface EventPopupProps {
  data: EventPopupData;
  onClose: () => void;
  onCancel: (id: string) => void;
  onView: (id: string) => void;
}

export default function EventPopup({ data, onClose, onCancel, onView }: EventPopupProps) {
  const [confirmCancel, setConfirmCancel] = useState(false);
  const { event, pos } = data;
  const { instructors } = useAdmin();
  const instr = instructors.find((i) => i.id === event.instructor);
  const colorObj = CLASS_COLORS.find((c) => c.key === event.color) ?? CLASS_COLORS[0];
  const pct = Math.round((event.enrolled / event.capacity) * 100);
  const classStart = new Date(`${event.date}T${event.time.substring(0, 5)}:00-05:00`);
  const isPast = classStart.getTime() < Date.now();

  return (
    <>
      {/* Click-away backdrop */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 49 }} onClick={onClose} />
      <div
        className="event-popup"
        style={{ top: pos.y, left: pos.x }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div className="event-popup-title" style={{ color: colorObj.text }}>{event.title}</div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2 }}
          >
            <AdminIcon name="x" size={13} />
          </button>
        </div>

        <div className="event-popup-row"><AdminIcon name="clock" size={12} /> {formatClassTime(event.time)} · {event.duration} min</div>
        {instr && <div className="event-popup-row"><AdminIcon name="users" size={12} /> {instr.name}</div>}

        <div className="event-popup-row">
          <AdminIcon name="dumbbell" size={12} />
          {event.enrolled}/{event.capacity} inscritas
          <div style={{ flex: 1, height: 4, background: 'var(--border)', borderRadius: 99, marginLeft: 6, overflow: 'hidden' }}>
            <div style={{ width: `${pct}%`, height: '100%', background: colorObj.hex, borderRadius: 99 }} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
          {event.recurring && (
            <span className="chip" style={{ background: colorObj.bg, color: colorObj.text, display: 'inline-flex' }}>
              <AdminIcon name="repeat" size={10} />&nbsp;Recurrente
            </span>
          )}
          {isPast && (
            <span className="chip" style={{ background: '#F5F5F4', color: '#78716C', display: 'inline-flex' }}>
              <AdminIcon name="clock" size={10} />&nbsp;Pasada
            </span>
          )}
        </div>

        <div className="event-popup-actions">
          {confirmCancel ? (
            <div style={{ display: 'flex', gap: 6, width: '100%' }}>
              <button className="popup-btn" style={{ flex: 1 }} onClick={() => setConfirmCancel(false)}>No</button>
              <button className="popup-btn danger" style={{ flex: 1 }} onClick={() => onCancel(event.id)}>Sí, cancelar</button>
            </div>
          ) : (
            <>
              <button className="popup-btn" onClick={() => onView(event.id)}>
                <AdminIcon name="eye" size={12} /> Ver Clase
              </button>
              <button className="popup-btn danger" onClick={() => setConfirmCancel(true)}>
                <AdminIcon name="x" size={12} /> Cancelar
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}
