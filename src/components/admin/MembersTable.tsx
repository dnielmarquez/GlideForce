'use client';

import { useState } from 'react';
import type { Member, MemberFormData } from '@/lib/admin/types';
import AdminIcon from './AdminIcon';
import MemberDetailModal from './MemberDetailModal';

interface MembersTableProps {
  members: Member[];
  onSave: (id: string, data: MemberFormData) => void;
}

export default function MembersTable({ members, onSave }: MembersTableProps) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'todas' | 'activa' | 'inactiva'>('todas');
  const [selected, setSelected] = useState<Member | null>(null);
  const [openEdit, setOpenEdit] = useState(false);

  const filtered = members.filter((m) => {
    const q = search.toLowerCase();
    const matchSearch =
      m.name.toLowerCase().includes(q) ||
      m.email.toLowerCase().includes(q) ||
      m.phone.includes(q);
    const matchFilter = filter === 'todas' || m.status === filter;
    return matchSearch && matchFilter;
  });

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.5px' }}>Miembros</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500, marginTop: 2 }}>
            {members.length} miembros registrados
          </div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, alignItems: 'center' }}>
          <div className="topbar-search" style={{ width: 240 }}>
            <AdminIcon name="search" size={14} />
            <input
              placeholder="Buscar por nombre, correo…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="cal-view-tabs">
            {(['todas', 'activa', 'inactiva'] as const).map((k) => (
              <div
                key={k}
                className={`cal-view-tab${filter === k ? ' active' : ''}`}
                onClick={() => setFilter(k)}
              >
                {k === 'todas' ? 'Todas' : k === 'activa' ? 'Activas' : 'Inactivas'}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="members-table">
        <div className="members-thead">
          {['Miembro', 'Correo', 'Celular', 'Estrellitas', 'Estado', 'Acciones'].map((h) => (
            <div key={h} className="members-th">{h}</div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)', fontSize: 13.5, fontWeight: 500 }}>
            No se encontraron miembros que coincidan con la búsqueda.
          </div>
        )}

        {filtered.map((m) => (
          <div key={m.id} className="members-row">
            {/* Avatar + name */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 38, height: 38, borderRadius: '50%', background: m.color + '22', color: m.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, flexShrink: 0 }}>
                {m.initials}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--text)' }}>{m.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-light)', fontWeight: 500, marginTop: 1 }}>Desde {m.joined}</div>
              </div>
            </div>
            {/* Email */}
            <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.email}</div>
            {/* Phone */}
            <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>{m.phone}</div>
            {/* Stars */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 26, height: 26, borderRadius: '50%', background: m.stars > 0 ? 'var(--orange)' : 'var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                <AdminIcon name="star" size={12} />
              </div>
              <span style={{ fontWeight: 800, fontSize: 14, color: m.stars > 0 ? 'var(--orange)' : 'var(--text-muted)' }}>{m.stars}</span>
            </div>
            {/* Status */}
            <div>
              <span style={{
                fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 99,
                background: m.status === 'activa' ? '#E6F7F4' : 'var(--bg)',
                color: m.status === 'activa' ? '#0F8B76' : 'var(--text-muted)',
                border: '1.5px solid',
                borderColor: m.status === 'activa' ? '#0F8B76' : 'var(--border)',
              }}>
                {m.status === 'activa' ? 'Activa' : 'Inactiva'}
              </span>
            </div>
            {/* Actions */}
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                title="Ver detalles"
                onClick={() => { setSelected(m); setOpenEdit(false); }}
                style={{ width: 32, height: 32, borderRadius: 8, border: '1.5px solid var(--border)', background: 'var(--bg)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', transition: 'all 0.15s' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--orange-light)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--orange)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'; }}
              >
                <AdminIcon name="layout" size={13} />
              </button>
              <button
                title="Editar"
                onClick={() => { setSelected(m); setOpenEdit(true); }}
                style={{ width: 32, height: 32, borderRadius: 8, border: '1.5px solid var(--border)', background: 'var(--bg)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', transition: 'all 0.15s' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#E8F1FD'; (e.currentTarget as HTMLButtonElement).style.color = '#2563EB'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'; }}
              >
                <AdminIcon name="edit" size={13} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {selected && (
        <MemberDetailModal
          member={selected}
          isEdit={openEdit}
          onClose={() => setSelected(null)}
          onSave={(id, form) => { onSave(id, form); setSelected(null); }}
        />
      )}
    </div>
  );
}
