'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useAdmin } from '@/lib/admin/AdminContext';
import AdminIcon from './AdminIcon';
import { CLASS_COLORS } from '@/lib/admin/constants';
import { adminBookSpots } from '@/app/actions/booking';
import { formatClassTime } from '@/lib/admin/utils';

interface ViewClassModalProps {
  classId: string;
  onClose: () => void;
}

interface BookingUser {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  status: string;
  booking_date: string;
  machine_id?: string;
}

export default function ViewClassModal({ classId, onClose }: ViewClassModalProps) {
  const { classes, instructors, refreshClasses } = useAdmin();
  const cls = classes.find(c => c.id === classId);
  
  const [users, setUsers] = useState<BookingUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Administrative booking states
  const [members, setMembers] = useState<any[]>([]);
  const [machinesList, setMachinesList] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedMachineId, setSelectedMachineId] = useState('');
  const [applyToAllRecurring, setApplyToAllRecurring] = useState(false);
  const [chargeStars, setChargeStars] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    const fetchBookings = async () => {
      if (!cls) return;
      setIsLoading(true);
      const supabase = createClient();
      
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          status,
          created_at,
          machine_id,
          profiles:member_id (
            id,
            full_name,
            email,
            avatar_url
          )
        `)
        .eq('session_id', classId)
        .order('created_at', { ascending: true });

      if (!error && data) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const formattedUsers = data.map((b: any) => ({
          id: b.profiles?.id || Math.random().toString(),
          full_name: b.profiles?.full_name || 'Usuario desconocido',
          email: b.profiles?.email || '',
          avatar_url: b.profiles?.avatar_url || null,
          status: b.status,
          machine_id: b.machine_id,
          booking_date: new Date(b.created_at).toLocaleString('es-ES', { 
            day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' 
          }),
        }));
        setUsers(formattedUsers);
      }
      setIsLoading(false);
    };

    fetchBookings();
  }, [classId, cls, refreshTrigger]);

  useEffect(() => {
    const fetchAdminData = async () => {
      const supabase = createClient();
      
      // Fetch active members
      const { data: mems } = await supabase
        .from('profiles')
        .select('id, full_name, email, stars_balance')
        .eq('role', 'member')
        .eq('status', 'active')
        .order('full_name', { ascending: true });
        
      if (mems) {
        setMembers(mems);
      }
      
      // Fetch active machines
      const { data: ms } = await supabase
        .from('machines')
        .select('*')
        .eq('active', true)
        .order('number');
        
      if (ms) {
        setMachinesList(ms);
      }
    };
    
    fetchAdminData();
  }, []);

  const handleAdminBook = async () => {
    if (!selectedUserId || !selectedMachineId) return;
    setIsSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');
    
    try {
      const res = await adminBookSpots(
        classId,
        selectedUserId,
        selectedMachineId,
        applyToAllRecurring,
        chargeStars
      );
      
      if ('error' in res) {
        setErrorMsg(res.error);
      } else {
        setSuccessMsg(`✓ ¡Reserva realizada con éxito! Se crearon ${res.count} reserva(s).`);
        setSelectedUserId('');
        setSelectedMachineId('');
        // Trigger bookings list refetch in this modal
        setRefreshTrigger(prev => prev + 1);
        // Refresh classes in calendar context so the calendar gets updated immediately!
        await refreshClasses();
      }
    } catch (err: any) {
      console.error('Error reserving spots:', err);
      setErrorMsg('Ocurrió un error inesperado al procesar la reserva.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!cls) return null;

  const instr = instructors.find((i) => i.id === cls.instructor);
  const colorObj = CLASS_COLORS.find((c) => c.key === cls.color) ?? CLASS_COLORS[0];
  const pct = Math.round((cls.enrolled / cls.capacity) * 100);

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" style={{ maxWidth: 500 }}>
        {/* Header */}
        <div className="modal-header">
          <div>
            <div className="modal-title">Detalles de la Clase</div>
            <div className="modal-subtitle">
              Resumen y usuarios inscritos
            </div>
          </div>
          <button className="modal-close" onClick={onClose}><AdminIcon name="x" size={14} /></button>
        </div>

        {/* Body */}
        <div className="modal-body" style={{ padding: '20px' }}>
          
          {/* Class Summary Card */}
          <div style={{ background: colorObj.bg, borderRadius: 14, padding: '18px 20px', borderLeft: `4px solid ${colorObj.hex}`, marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: colorObj.text, letterSpacing: '-0.3px' }}>
                {cls.title}
                </div>
                {cls.status === 'cancelled' && (
                    <span style={{ fontSize: 10, fontWeight: 800, background: 'var(--red)', color: 'white', padding: '2px 8px', borderRadius: 99, textTransform: 'uppercase' }}>
                        Cancelada
                    </span>
                )}
            </div>
            {cls.description && (
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6, lineHeight: 1.5, fontWeight: 500 }}>
                {cls.description}
              </div>
            )}
            <div style={{ display: 'flex', gap: 14, marginTop: 14, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>
                <AdminIcon name="clock" size={14} /> {formatClassTime(cls.time)} · {cls.duration} min
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>
                <AdminIcon name="calendar" size={14} /> {cls.date}
              </div>
              {instr && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>
                  <AdminIcon name="users" size={14} /> {instr.name}
                </div>
              )}
            </div>
            
            <div style={{ marginTop: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, color: colorObj.text, marginBottom: 6 }}>
                <span>Ocupación</span>
                <span>{cls.enrolled} / {cls.capacity} ({pct}%)</span>
              </div>
              <div style={{ width: '100%', height: 6, background: 'var(--bg)', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ width: `${pct}%`, height: '100%', background: colorObj.hex, borderRadius: 99 }} />
              </div>
            </div>
          </div>

          {/* Bookings List */}
          <div className="form-section-title" style={{ marginBottom: 12 }}>Usuarios Inscritos ({users.length})</div>
          
          {isLoading ? (
            <div style={{ padding: 30, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14, fontWeight: 500 }}>
              Cargando inscritos...
            </div>
          ) : users.length === 0 ? (
            <div style={{ padding: 30, textAlign: 'center', background: 'var(--surface-high)', borderRadius: 12, border: '1px dashed var(--border)' }}>
               <AdminIcon name="users" size={24} />
               <div style={{ marginTop: 8, fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>No hay usuarios inscritos en esta clase.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 300, overflowY: 'auto', paddingRight: 4 }}>
              {users.map((user, idx) => (
                <div key={`${user.id}-${idx}`} style={{ display: 'flex', alignItems: 'center', padding: '10px 14px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, gap: 12 }}>
                   <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--orange-light)', color: 'var(--orange)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, overflow: 'hidden', flexShrink: 0 }}>
                     {user.avatar_url ? (
                        <img src={user.avatar_url} alt={user.full_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                     ) : (
                        user.full_name.substring(0, 2).toUpperCase()
                     )}
                   </div>
                   <div style={{ flex: 1, minWidth: 0 }}>
                     <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.full_name}</div>
                     <div style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.email}</div>
                   </div>
                   <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      {user.status === 'confirmed' ? (
                          <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--green)', background: 'var(--green-light)', padding: '2px 6px', borderRadius: 6, display: 'inline-block', marginBottom: 2 }}>Confirmado</span>
                      ) : (
                          <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', background: 'var(--surface-high)', padding: '2px 6px', borderRadius: 6, display: 'inline-block', marginBottom: 2 }}>{user.status}</span>
                      )}
                      <div style={{ fontSize: 10, color: 'var(--text-light)', fontWeight: 500 }}>{user.booking_date}</div>
                   </div>
                </div>
              ))}
            </div>
          )}

          {/* Admin Booking Form Section */}
          <div className="form-section" style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
            <div className="form-section-title" style={{ marginBottom: 12 }}>Reservar / Bloquear Máquina (Admin)</div>
            
            {errorMsg && (
              <div style={{ 
                padding: '10px 14px', 
                background: '#FEE2E2', 
                border: '1px solid #F87171', 
                color: '#991B1B', 
                borderRadius: 8, 
                fontSize: 12, 
                fontWeight: 600, 
                marginBottom: 12,
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}>
                <AdminIcon name="x" size={14} />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div style={{ 
                padding: '10px 14px', 
                background: '#DCFCE7', 
                border: '1px solid #4ADE80', 
                color: '#166534', 
                borderRadius: 8, 
                fontSize: 12, 
                fontWeight: 600, 
                marginBottom: 12,
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}>
                <AdminIcon name="check" size={14} />
                <span>{successMsg}</span>
              </div>
            )}

            <div className="form-group" style={{ marginBottom: 12 }}>
              <label className="form-label">Miembro <span>*</span></label>
              <div className="form-select-wrap">
                <select 
                  className="form-select" 
                  value={selectedUserId} 
                  onChange={(e) => setSelectedUserId(e.target.value)}
                >
                  <option value="">-- Seleccionar Miembro --</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.full_name} ({m.email}) — Saldo: {m.stars_balance ?? 0} ★
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 12 }}>
              <label className="form-label">Máquina / Spot <span>*</span></label>
              <div className="form-select-wrap">
                <select 
                  className="form-select" 
                  value={selectedMachineId} 
                  onChange={(e) => setSelectedMachineId(e.target.value)}
                >
                  <option value="">-- Seleccionar Máquina --</option>
                  {machinesList.map((m) => {
                    const occupiedByUser = users.find(u => u.machine_id === m.id && u.status === 'confirmed');
                    const isOccupied = !!occupiedByUser;
                    return (
                      <option key={m.id} value={m.id} disabled={isOccupied}>
                        Máquina {m.number} {m.name ? `(${m.name})` : ''} {isOccupied ? ` - OCUPADA por ${occupiedByUser.full_name}` : ' - Libre'}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>

            {cls.recurring && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <input 
                  type="checkbox" 
                  id="applyToAllRecurring" 
                  checked={applyToAllRecurring}
                  onChange={(e) => setApplyToAllRecurring(e.target.checked)}
                  style={{ width: 16, height: 16, cursor: 'pointer' }}
                />
                <label htmlFor="applyToAllRecurring" style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', cursor: 'pointer', userSelect: 'none' }}>
                  Asignar a toda la serie recurrente (clases futuras)
                </label>
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <input 
                type="checkbox" 
                id="chargeStars" 
                checked={chargeStars}
                onChange={(e) => setChargeStars(e.target.checked)}
                style={{ width: 16, height: 16, cursor: 'pointer' }}
              />
              <label htmlFor="chargeStars" style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', cursor: 'pointer', userSelect: 'none' }}>
                Descontar estrellitas del saldo del usuario ({cls.stars_cost || 1} ★)
              </label>
            </div>

            <button 
              className="btn btn-primary" 
              style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, padding: '10px' }}
              disabled={isSubmitting || !selectedUserId || !selectedMachineId}
              onClick={handleAdminBook}
            >
              {isSubmitting ? (
                <>Cargando...</>
              ) : (
                <>
                  <AdminIcon name="plus" size={14} />
                  Crear Reserva Administrativa
                </>
              )}
            </button>
          </div>
          
        </div>
      </div>
    </div>
  );
}
