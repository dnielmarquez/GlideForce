'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import type { Member, MemberStatus, MemberFormData } from '@/lib/admin/types';
import MembersTable from '@/components/admin/MembersTable';
import Toast from '@/components/admin/Toast';
import type { ToastState } from '@/lib/admin/types';

function generateInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return '?';
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function assignColor(id: string) {
  const colors = ['#E8682A', '#0F8B76', '#6D37C4', '#2563EB', '#C4376D'];
  // Simple deterministic hash
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<ToastState>({ show: false, msg: '' });
  const supabase = createClient();

  useEffect(() => {
    async function loadMembers() {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'member')
        .order('full_name', { ascending: true });

      if (error) {
        console.error('Error fetching members:', error);
      } else if (data) {
        const mapped: Member[] = (data as any[]).map((p) => ({
          id: p.id,
          name: p.full_name,
          email: p.email ?? 'Sin correo',
          phone: p.phone ?? 'Sin celular',
          stars: p.stars_balance,
          status: p.status === 'active' ? 'activa' : 'inactiva',
          joined: new Date(p.created_at).toISOString().split('T')[0],
          initials: generateInitials(p.full_name),
          color: assignColor(p.id),
          avatar: null
        }));
        setMembers(mapped);
      }
      setLoading(false);
    }
    loadMembers();
  }, [supabase]);

  const showToast = (msg: string) => {
    setToast({ show: true, msg });
    setTimeout(() => setToast({ show: false, msg: '' }), 3200);
  };

  const handleSave = async (id: string, form: MemberFormData) => {
    // 1. Optimistic UI update
    setMembers((prev) =>
      prev.map((m) =>
        m.id === id ? { ...m, ...form, stars: typeof form.stars === 'string' ? parseInt(form.stars) : (form.stars ?? m.stars) } : m
      )
    );
    showToast('Guardando cambios...');

    // 2. Map frontend partial form back to Supabase profile row
    const updateData: any = {};
    if (form.name !== undefined) updateData.full_name = form.name;
    if (form.email !== undefined) updateData.email = form.email;
    if (form.phone !== undefined) updateData.phone = form.phone;
    if (form.status !== undefined) updateData.status = form.status === 'activa' ? 'active' : 'inactive';
    if (form.stars !== undefined) updateData.stars_balance = typeof form.stars === 'string' ? parseInt(form.stars) : form.stars;

    const { error } = await supabase.from('profiles').update(updateData as never).eq('id', id);

    if (error) {
      console.error('Error updating member:', error);
      showToast('Error al actualizar: ' + error.message);
    } else {
      showToast('Cambios guardados exitosamente');
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: 'var(--text-muted)' }}>
        Cargando miembros...
      </div>
    );
  }

  return (
    <>
      <MembersTable members={members} onSave={handleSave} />
      <Toast toast={toast} />
    </>
  );
}
