'use client';

import type { EventPopupData } from '@/lib/admin/types';
import { CLASS_COLORS } from '@/lib/admin/constants';
import { useAdmin } from '@/lib/admin/AdminContext';
import AdminIcon from './AdminIcon';

interface EventPopupProps {
  data: EventPopupData;
  onClose: () => void;
  onDelete: (id: string) => void;
}

export default function EventPopup({ data, onClose, onDelete }: EventPopupProps) {
  const { event, pos } = data;
  const { instructors } = useAdmin();
  const instr = instructors.find((i) => i.id === event.instructor);
  const colorObj = CLASS_COLORS.find((c) => c.key === event.color) ?? CLASS_COLORS[0];
  const pct = Math.round((event.enrolled / event.capacity) * 100);

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

        <div className="event-popup-row"><AdminIcon name="clock" size={12} /> {event.time} · {event.duration} min</div>
        {instr && <div className="event-popup-row"><AdminIcon name="users" size={12} /> {instr.name}</div>}

        <div className="event-popup-row">
          <AdminIcon name="dumbbell" size={12} />
          {event.enrolled}/{event.capacity} inscritas
          <div style={{ flex: 1, height: 4, background: 'var(--border)', borderRadius: 99, marginLeft: 6, overflow: 'hidden' }}>
            <div style={{ width: `${pct}%`, height: '100%', background: colorObj.hex, borderRadius: 99 }} />
          </div>
        </div>

        {event.recurring && (
          <span className="chip" style={{ background: colorObj.bg, color: colorObj.text, marginTop: 8, display: 'inline-flex' }}>
            <AdminIcon name="repeat" size={10} />&nbsp;Recurrente
          </span>
        )}

        <div className="event-popup-actions">
          <button className="popup-btn">
            <AdminIcon name="edit" size={12} /> Editar
          </button>
          <button className="popup-btn danger" onClick={() => onDelete(event.id)}>
            <AdminIcon name="trash" size={12} /> Eliminar
          </button>
        </div>
      </div>
    </>
  );
}
