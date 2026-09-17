'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useAdmin } from '@/lib/admin/AdminContext';
import AdminIcon from './AdminIcon';
import { CLASS_COLORS } from '@/lib/admin/constants';
import { 
  adminBookSpots, 
  adminCancelBooking, 
  adminUpdateClassTime, 
  adminUpdateClassTitle,
  adminDeleteClasses,
  adminGetRecurrenceSessions,
  type RecurrenceSessionItem
} from '@/app/actions/booking';
import { formatClassTime } from '@/lib/admin/utils';

interface ViewClassModalProps {
  classId: string;
  onClose: () => void;
}

interface BookingUser {
  id: string;
  booking_id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  status: string;
  booking_date: string;
  machine_id?: string;
  machine_label?: string;
}

export default function ViewClassModal({ classId, onClose }: ViewClassModalProps) {
  const { classes, instructors, refreshClasses, showToast } = useAdmin();
  const cls = classes.find(c => c.id === classId);
  
  const [users, setUsers] = useState<BookingUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Administrative booking states
  const [members, setMembers] = useState<any[]>([]);
  const [machinesList, setMachinesList] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedMember, setSelectedMember] = useState<any | null>(null);
  const [selectedMachineId, setSelectedMachineId] = useState('');
  const [applyToAllRecurring, setApplyToAllRecurring] = useState(false);
  const [chargeStars, setChargeStars] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [activeTab, setActiveTab] = useState<'confirmed' | 'cancelled'>('confirmed');
  const [cancellingBookingId, setCancellingBookingId] = useState<string | null>(null);
  const [refundOption, setRefundOption] = useState<boolean>(true);
  const [isCancellingBooking, setIsCancellingBooking] = useState<boolean>(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // Time editing states
  const [isEditingTime, setIsEditingTime] = useState(false);
  const [editTime, setEditTime] = useState(cls?.time || '10:00');
  const [editAllRecurring, setEditAllRecurring] = useState(false);
  const [isUpdatingTime, setIsUpdatingTime] = useState(false);

  // Title editing states
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState(cls?.title || '');
  const [editAllTitleRecurring, setEditAllTitleRecurring] = useState(false);
  const [isUpdatingTitle, setIsUpdatingTitle] = useState(false);

  // Delete class states
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteMode, setDeleteMode] = useState<'single' | 'all' | 'custom'>('single');
  const [recurrenceSessions, setRecurrenceSessions] = useState<RecurrenceSessionItem[]>([]);
  const [isLoadingRecurrence, setIsLoadingRecurrence] = useState(false);
  const [selectedRecurrenceIds, setSelectedRecurrenceIds] = useState<string[]>([]);
  const [isDeletingClasses, setIsDeletingClasses] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    if (cls) {
      setEditTime(cls.time);
      setEditTitle(cls.title);
    }
  }, [cls]);

  const handleUpdateClassTime = async () => {
    if (!editTime) return;
    setIsUpdatingTime(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await adminUpdateClassTime(classId, editTime, editAllRecurring);
      if ('error' in res && res.error) {
        setErrorMsg(res.error);
      } else {
        setSuccessMsg('✓ Horario de clase actualizado con éxito.');
        setIsEditingTime(false);
        await refreshClasses();
      }
    } catch (err) {
      console.error('Error updating class time:', err);
      setErrorMsg('Ocurrió un error inesperado al actualizar el horario de la clase.');
    } finally {
      setIsUpdatingTime(false);
    }
  };

  const handleUpdateClassTitle = async () => {
    if (!editTitle || !editTitle.trim()) return;
    setIsUpdatingTitle(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await adminUpdateClassTitle(classId, editTitle.trim(), editAllTitleRecurring);
      if ('error' in res && res.error) {
        setErrorMsg(res.error);
      } else {
        setSuccessMsg('✓ Nombre de la clase actualizado con éxito.');
        setIsEditingTitle(false);
        await refreshClasses();
      }
    } catch (err) {
      console.error('Error updating class title:', err);
      setErrorMsg('Ocurrió un error inesperado al actualizar el nombre de la clase.');
    } finally {
      setIsUpdatingTitle(false);
    }
  };

  const isClassInPast = (dateStr?: string, timeStr?: string) => {
    if (!dateStr) return false;
    try {
      const now = new Date();
      const bogotaDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(now);
      const bogotaTime = new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Bogota', hour: '2-digit', minute: '2-digit', hour12: false }).format(now);
      if (dateStr < bogotaDate) return true;
      if (dateStr === bogotaDate && (timeStr || '00:00') < bogotaTime) return true;
      return false;
    } catch {
      return false;
    }
  };

  const isCurrentClassPast = isClassInPast(cls?.date, cls?.time);

  const handleOpenDeleteModal = async () => {
    if (!cls) return;

    if (isCurrentClassPast && !cls.recurring) {
      showToast('Esta clase ya finalizó y no puede ser eliminada.');
      return;
    }

    setDeleteError('');
    setShowDeleteConfirm(true);

    if (isCurrentClassPast) {
      setDeleteMode('all');
      setSelectedRecurrenceIds([]);
    } else {
      setDeleteMode('single');
      setSelectedRecurrenceIds([classId]);
    }

    if (cls.recurring && cls.recurrence_id) {
      setIsLoadingRecurrence(true);
      try {
        const res = await adminGetRecurrenceSessions(cls.recurrence_id, true);
        if ('success' in res) {
          setRecurrenceSessions(res.sessions);
          if (!isCurrentClassPast) {
            setSelectedRecurrenceIds([classId]);
          } else if (res.sessions.length > 0) {
            setSelectedRecurrenceIds(res.sessions.map((s) => s.id));
          }
        }
      } catch (e) {
        console.error('Error fetching recurrence sessions:', e);
      } finally {
        setIsLoadingRecurrence(false);
      }
    }
  };

  const handleDeleteClasses = async () => {
    if (!cls) return;
    let idsToDelete: string[] = [];
    if (!cls.recurring || deleteMode === 'single') {
      if (isCurrentClassPast) {
        setDeleteError('Esta clase ya finalizó y no puede ser eliminada.');
        return;
      }
      idsToDelete = [classId];
    } else if (deleteMode === 'all') {
      idsToDelete = recurrenceSessions.length > 0 ? recurrenceSessions.map((s) => s.id) : (!isCurrentClassPast ? [classId] : []);
    } else if (deleteMode === 'custom') {
      idsToDelete = selectedRecurrenceIds;
    }

    if (idsToDelete.length === 0) {
      setDeleteError(
        cls.recurring && recurrenceSessions.length === 0
          ? 'No hay clases futuras programadas en esta serie para eliminar.'
          : 'Por favor selecciona al menos una clase futura para eliminar.'
      );
      return;
    }

    setIsDeletingClasses(true);
    setDeleteError('');

    try {
      const res = await adminDeleteClasses(idsToDelete);
      if ('error' in res && res.error) {
        setDeleteError(res.error);
      } else if ('success' in res) {
        setShowDeleteConfirm(false);
        onClose();
        await refreshClasses();
        const countDeleted = res.deletedCount;
        const countRefunded = res.refundedCount;
        showToast(
          `✓ Se elimin${countDeleted === 1 ? 'ó' : 'aron'} ${countDeleted} clase${countDeleted === 1 ? '' : 's'} futura${countDeleted === 1 ? '' : 's'} y se reembols${countRefunded === 1 ? 'ó' : 'aron'} ${countRefunded} reserva${countRefunded === 1 ? '' : 's'}`
        );
      }
    } catch (err) {
      console.error('Error deleting classes:', err);
      setDeleteError('Ocurrió un error inesperado al eliminar las clases.');
    } finally {
      setIsDeletingClasses(false);
    }
  };

  useEffect(() => {
    const fetchBookings = async () => {
      if (!cls) return;
      setIsLoading(true);
      const supabase = createClient();
      
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id,
          status,
          created_at,
          machine_id,
          machines (
            id,
            label,
            number
          ),
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
          booking_id: b.id,
          full_name: b.profiles?.full_name || 'Usuario desconocido',
          email: b.profiles?.email || '',
          avatar_url: b.profiles?.avatar_url || null,
          status: b.status,
          machine_id: b.machine_id,
          machine_label: b.machines?.label || null,
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

  // Debounced server-side query for members
  useEffect(() => {
    let active = true;
    
    const fetchMembers = async () => {
      setIsSearching(true);
      const supabase = createClient();
      
      let queryBuilder = supabase
        .from('profiles')
        .select('id, full_name, email, stars_balance')
        .eq('status', 'active');
        
      if (searchQuery.trim()) {
        const queryTerm = `%${searchQuery.trim()}%`;
        queryBuilder = queryBuilder.or(`full_name.ilike.${queryTerm},email.ilike.${queryTerm}`);
      }
      
      const { data, error } = await queryBuilder
        .order('full_name', { ascending: true })
        .limit(30);
        
      if (active) {
        if (!error && data) {
          setMembers(data);
        }
        setIsSearching(false);
      }
    };

    const timer = setTimeout(() => {
      fetchMembers();
    }, 300);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [searchQuery]);

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
        setSelectedMember(null);
        setSelectedMachineId('');
        setSearchQuery('');
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
  
  const handleAdminCancelUserBooking = async (bookingId: string) => {
    setIsCancellingBooking(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await adminCancelBooking(bookingId, refundOption);
      if ('error' in res && res.error) {
        setErrorMsg(res.error);
      } else {
        setSuccessMsg('✓ Reserva cancelada con éxito.');
        setCancellingBookingId(null);
        setRefreshTrigger(prev => prev + 1);
        await refreshClasses();
      }
    } catch (err) {
      console.error('Error cancelling booking:', err);
      setErrorMsg('Ocurrió un error inesperado al cancelar la reserva.');
    } finally {
      setIsCancellingBooking(false);
    }
  };

  if (!cls) return null;

  const instr = instructors.find((i) => i.id === cls.instructor);
  const colorObj = CLASS_COLORS.find((c) => c.key === cls.color) ?? CLASS_COLORS[0];
  const pct = Math.round((cls.enrolled / cls.capacity) * 100);

  const formatSessionDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr + 'T00:00:00');
      return d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
    } catch {
      return dateStr;
    }
  };

  const confirmedCount = users.filter((u) => u.status === 'confirmed').length;
  const totalAllRefunds = recurrenceSessions.reduce((acc, s) => acc + (s.confirmedBookingsCount || 0), 0);
  const totalCustomRefunds = recurrenceSessions
    .filter((s) => selectedRecurrenceIds.includes(s.id))
    .reduce((acc, s) => acc + (s.confirmedBookingsCount || 0), 0);

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" style={{ maxWidth: 500, position: 'relative', overflow: (isDropdownOpen || showDeleteConfirm) ? 'hidden' : 'auto' }}>
        
        {/* Delete Confirmation Overlay */}
        {showDeleteConfirm && (
          <>
            <div
              style={{
                position: 'absolute',
                inset: 0,
                zIndex: 90,
              }}
              onClick={() => {
                if (!isDeletingClasses) setShowDeleteConfirm(false);
              }}
            />
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(255, 255, 255, 0.98)',
                backdropFilter: 'blur(16px)',
                zIndex: 95,
                display: 'flex',
                flexDirection: 'column',
                padding: '24px',
                borderRadius: '20px',
                animation: 'adm-fadeIn 0.2s ease',
                overflowY: 'auto'
              }}
            >
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 34,
                    height: 34,
                    borderRadius: '50%',
                    background: 'rgba(220, 38, 38, 0.1)',
                    color: '#dc2626',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <AdminIcon name="trash" size={17} />
                  </div>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.3px' }}>
                      Eliminar {cls.recurring ? 'Clases' : 'Clase'}
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-muted)', fontWeight: 500, marginTop: 1 }}>
                      Esta acción eliminará las sesiones y procesará reembolsos automáticos
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={isDeletingClasses}
                  onClick={() => setShowDeleteConfirm(false)}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    border: '1.5px solid var(--border)',
                    background: 'var(--bg)',
                    cursor: isDeletingClasses ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--text-muted)',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    if (!isDeletingClasses) {
                      e.currentTarget.style.background = '#FEE2E2';
                      e.currentTarget.style.color = '#DC2626';
                      e.currentTarget.style.borderColor = '#FCA5A5';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isDeletingClasses) {
                      e.currentTarget.style.background = 'var(--bg)';
                      e.currentTarget.style.color = 'var(--text-muted)';
                      e.currentTarget.style.borderColor = 'var(--border)';
                    }
                  }}
                >
                  <AdminIcon name="x" size={13} />
                </button>
              </div>

              {/* Recurrence Mode Selector if recurring */}
              {cls.recurring && (
                <div style={{ display: 'flex', gap: 6, padding: '4px', background: 'var(--bg)', borderRadius: 10, marginBottom: 16 }}>
                  <button
                    type="button"
                    onClick={() => setDeleteMode('single')}
                    style={{
                      flex: 1,
                      padding: '8px 10px',
                      borderRadius: 8,
                      border: 'none',
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                      background: deleteMode === 'single' ? 'white' : 'transparent',
                      color: deleteMode === 'single' ? 'var(--text)' : 'var(--text-muted)',
                      boxShadow: deleteMode === 'single' ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    Solo esta clase {isCurrentClassPast ? '(Pasada)' : ''}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteMode('all')}
                    style={{
                      flex: 1,
                      padding: '8px 10px',
                      borderRadius: 8,
                      border: 'none',
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                      background: deleteMode === 'all' ? 'white' : 'transparent',
                      color: deleteMode === 'all' ? '#dc2626' : 'var(--text-muted)',
                      boxShadow: deleteMode === 'all' ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    Todas las futuras
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteMode('custom')}
                    style={{
                      flex: 1,
                      padding: '8px 10px',
                      borderRadius: 8,
                      border: 'none',
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                      background: deleteMode === 'custom' ? 'white' : 'transparent',
                      color: deleteMode === 'custom' ? 'var(--orange)' : 'var(--text-muted)',
                      boxShadow: deleteMode === 'custom' ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    Personalizada
                  </button>
                </div>
              )}

              {/* Mode 1: Single class */}
              {(!cls.recurring || deleteMode === 'single') && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
                  {isCurrentClassPast ? (
                    <div style={{
                      background: 'rgba(254, 242, 242, 0.8)',
                      border: '1.5px solid rgba(220, 38, 38, 0.3)',
                      borderRadius: 12,
                      padding: '14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#dc2626', fontWeight: 800, fontSize: 13 }}>
                        <span>⚠️ Esta clase ya finalizó</span>
                      </div>
                      <div style={{ fontSize: 12.5, color: '#991b1b', lineHeight: 1.5, fontWeight: 500 }}>
                        La sesión ({cls.date} · {formatClassTime(cls.time)}) ya ocurrió en el pasado y no puede ser eliminada. {cls.recurring ? 'Utiliza la opción "Todas las futuras" o "Personalizada" para eliminar las sesiones venideras.' : ''}
                      </div>
                    </div>
                  ) : (
                    <>
                      <div style={{
                        background: 'var(--bg)',
                        border: '1.5px solid var(--border)',
                        borderRadius: 12,
                        padding: '12px 14px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <div>
                          <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text)' }}>{cls.title}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500, marginTop: 2 }}>
                            {cls.date} · {formatClassTime(cls.time)}
                          </div>
                        </div>
                        <span style={{
                          fontSize: 11,
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: 6,
                          background: confirmedCount > 0 ? 'rgba(234, 112, 52, 0.12)' : 'var(--surface-high)',
                          color: confirmedCount > 0 ? 'var(--orange-hover)' : 'var(--text-muted)'
                        }}>
                          {confirmedCount} reserva{confirmedCount !== 1 ? 's' : ''}
                        </span>
                      </div>

                      <div style={{
                        background: 'rgba(254, 242, 242, 0.7)',
                        border: '1.5px solid rgba(220, 38, 38, 0.2)',
                        borderRadius: 12,
                        padding: '12px 14px',
                        fontSize: 12.5,
                        color: '#b91c1c',
                        lineHeight: 1.5,
                        fontWeight: 500
                      }}>
                        {confirmedCount > 0 ? (
                          <>
                            <strong>Aviso de Reembolso:</strong> Esta clase tiene <strong>{confirmedCount} reserva(s) confirmada(s)</strong>. Al eliminarla, las reservas se cancelarán y las sesiones/estrellitas se reembolsarán inmediatamente a los usuarios.
                          </>
                        ) : (
                          <>
                            Esta clase futura no tiene reservas confirmadas. Se eliminará inmediatamente del sistema sin afectar saldos de usuarios.
                          </>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Mode 2: All recurring (future only) */}
              {cls.recurring && deleteMode === 'all' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
                  <div style={{
                    background: 'rgba(254, 242, 242, 0.7)',
                    border: '1.5px solid rgba(220, 38, 38, 0.25)',
                    borderRadius: 12,
                    padding: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#dc2626', fontWeight: 800, fontSize: 13 }}>
                      <span>⚠️ Eliminación de Clases Futuras de la Serie</span>
                    </div>
                    <div style={{ fontSize: 12.5, color: '#991b1b', lineHeight: 1.5, fontWeight: 500 }}>
                      Se eliminarán <strong>{recurrenceSessions.length} clase{recurrenceSessions.length !== 1 ? 's' : ''} futura{recurrenceSessions.length !== 1 ? 's' : ''}</strong> de esta serie (de hoy en adelante). Las clases pasadas no se verán afectadas ni eliminadas.
                      {totalAllRefunds > 0 ? (
                        <> Un total de <strong>{totalAllRefunds} reserva(s) confirmada(s)</strong> en las clases futuras serán canceladas y reembolsadas automáticamente a los usuarios.</>
                      ) : (
                        <> No hay reservas activas en las clases futuras de la serie.</>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Mode 3: Custom selection (future only) */}
              {cls.recurring && deleteMode === 'custom' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16, flex: 1, minHeight: 0 }}>
                  {/* Quick Select Actions */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>
                      Selecciona las clases futuras a eliminar:
                    </span>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        type="button"
                        onClick={() => setSelectedRecurrenceIds(recurrenceSessions.map(s => s.id))}
                        style={{
                          background: 'none',
                          border: '1px solid var(--border)',
                          borderRadius: 6,
                          padding: '3px 8px',
                          fontSize: 11,
                          fontWeight: 600,
                          cursor: 'pointer',
                          color: 'var(--text)'
                        }}
                      >
                        Todas
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedRecurrenceIds([])}
                        style={{
                          background: 'none',
                          border: '1px solid var(--border)',
                          borderRadius: 6,
                          padding: '3px 8px',
                          fontSize: 11,
                          fontWeight: 600,
                          cursor: 'pointer',
                          color: 'var(--text-muted)'
                        }}
                      >
                        Ninguna
                      </button>
                    </div>
                  </div>

                  {/* List of Sessions */}
                  <div style={{
                    maxHeight: 220,
                    overflowY: 'auto',
                    border: '1.5px solid var(--border)',
                    borderRadius: 12,
                    background: 'var(--bg)',
                    padding: '6px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 5
                  }}>
                    {isLoadingRecurrence ? (
                      <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12, fontWeight: 600 }}>
                        Cargando clases futuras de la serie...
                      </div>
                    ) : recurrenceSessions.length === 0 ? (
                      <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
                        No hay más clases futuras programadas en esta serie.
                      </div>
                    ) : (
                      recurrenceSessions.map((s) => {
                        const isSelected = selectedRecurrenceIds.includes(s.id);
                        const isCurrent = s.id === classId;
                        return (
                          <div
                            key={s.id}
                            onClick={() => {
                              setSelectedRecurrenceIds(prev =>
                                prev.includes(s.id) ? prev.filter(id => id !== s.id) : [...prev, s.id]
                              );
                            }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '8px 10px',
                              borderRadius: 8,
                              cursor: 'pointer',
                              background: isSelected ? 'white' : 'transparent',
                              border: isSelected ? '1.5px solid #dc2626' : '1.5px solid transparent',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {}} // handled by parent div
                                style={{ width: 15, height: 15, accentColor: '#dc2626', cursor: 'pointer' }}
                              />
                              <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text)' }}>
                                  {formatSessionDate(s.date)} · {formatClassTime(s.time)}
                                  {isCurrent && (
                                    <span style={{ marginLeft: 6, fontSize: 10, color: 'var(--orange)', fontWeight: 700 }}>
                                      (Actual)
                                    </span>
                                  )}
                                </div>
                                <span style={{ fontSize: 10.5, color: 'var(--text-muted)', fontWeight: 500 }}>
                                  {s.duration} min · Capacidad: {s.capacity}
                                </span>
                              </div>
                            </div>
                            <span style={{
                              fontSize: 10.5,
                              fontWeight: 700,
                              padding: '2px 7px',
                              borderRadius: 6,
                              background: s.confirmedBookingsCount > 0 ? 'rgba(220, 38, 38, 0.1)' : 'var(--surface-high)',
                              color: s.confirmedBookingsCount > 0 ? '#dc2626' : 'var(--text-muted)'
                            }}>
                              {s.confirmedBookingsCount > 0 ? `${s.confirmedBookingsCount} reserva${s.confirmedBookingsCount > 1 ? 's' : ''}` : 'Sin reservas'}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Custom Selection Summary */}
                  <div style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: 'var(--text)',
                    padding: '6px 8px',
                    background: 'var(--bg)',
                    borderRadius: 8,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span>{selectedRecurrenceIds.length} clase(s) seleccionada(s)</span>
                    <span style={{ color: totalCustomRefunds > 0 ? '#dc2626' : 'var(--text-muted)' }}>
                      {totalCustomRefunds} reserva(s) a reembolsar
                    </span>
                  </div>
                </div>
              )}

              {/* Error display */}
              {deleteError && (
                <div style={{
                  padding: '10px 12px',
                  background: '#fee2e2',
                  border: '1px solid #fca5a5',
                  borderRadius: 8,
                  color: '#b91c1c',
                  fontSize: 12,
                  fontWeight: 600,
                  marginBottom: 14
                }}>
                  {deleteError}
                </div>
              )}

              {/* Bottom Actions */}
              <div style={{ display: 'flex', gap: 10, marginTop: 'auto' }}>
                <button
                  type="button"
                  disabled={isDeletingClasses}
                  className="btn-cancel"
                  style={{ flex: 1, padding: '10px', fontSize: 13, margin: 0 }}
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={
                    isDeletingClasses ||
                    (!cls.recurring && isCurrentClassPast) ||
                    (cls.recurring && deleteMode === 'single' && isCurrentClassPast) ||
                    (cls.recurring && deleteMode === 'all' && recurrenceSessions.length === 0) ||
                    (cls.recurring && deleteMode === 'custom' && selectedRecurrenceIds.length === 0)
                  }
                  onClick={handleDeleteClasses}
                  style={{
                    flex: 2,
                    padding: '10px',
                    fontSize: 13,
                    fontWeight: 700,
                    borderRadius: 10,
                    border: 'none',
                    background: '#dc2626',
                    color: 'white',
                    cursor: (
                      isDeletingClasses ||
                      (!cls.recurring && isCurrentClassPast) ||
                      (cls.recurring && deleteMode === 'single' && isCurrentClassPast) ||
                      (cls.recurring && deleteMode === 'all' && recurrenceSessions.length === 0) ||
                      (cls.recurring && deleteMode === 'custom' && selectedRecurrenceIds.length === 0)
                    ) ? 'not-allowed' : 'pointer',
                    opacity: (
                      isDeletingClasses ||
                      (!cls.recurring && isCurrentClassPast) ||
                      (cls.recurring && deleteMode === 'single' && isCurrentClassPast) ||
                      (cls.recurring && deleteMode === 'all' && recurrenceSessions.length === 0) ||
                      (cls.recurring && deleteMode === 'custom' && selectedRecurrenceIds.length === 0)
                    ) ? 0.6 : 1,
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: 6,
                    transition: 'background 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (!isDeletingClasses) {
                      e.currentTarget.style.background = '#b91c1c';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#dc2626';
                  }}
                >
                  {isDeletingClasses ? (
                    <>
                      <div
                        className="adm-spinner"
                        style={{
                          width: 14,
                          height: 14,
                          border: '2px solid rgba(255,255,255,0.3)',
                          borderTopColor: 'white',
                          borderRadius: '50%',
                        }}
                      />
                      <span>Eliminando...</span>
                    </>
                  ) : (
                    <>
                      <AdminIcon name="trash" size={14} />
                      <span>
                        {cls.recurring && deleteMode === 'all'
                          ? `Eliminar ${recurrenceSessions.length} Clase(s) Futura(s)`
                          : cls.recurring && deleteMode === 'custom'
                          ? `Eliminar ${selectedRecurrenceIds.length} Clase(s) Futura(s)`
                          : isCurrentClassPast
                          ? 'Clase Ya Finalizada'
                          : 'Confirmar y Eliminar'}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </>
        )}
        
        {/* Glassmorphic Search Overlay Dialog */}
        {isDropdownOpen && (
          <>
            <div
              style={{
                position: 'absolute',
                inset: 0,
                zIndex: 90,
              }}
              onClick={() => setIsDropdownOpen(false)}
            />
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(12px)',
                zIndex: 95,
                display: 'flex',
                flexDirection: 'column',
                padding: '20px',
                borderRadius: '20px',
                animation: 'adm-fadeIn 0.2s ease',
              }}
            >
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.3px' }}>Seleccionar Miembro</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500, marginTop: 1 }}>Buscar y seleccionar usuario activo</div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(false)}
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: '50%',
                    border: '1.5px solid var(--border)',
                    background: 'var(--bg)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--text-muted)',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#FEE2E2';
                    e.currentTarget.style.color = '#DC2626';
                    e.currentTarget.style.borderColor = '#FCA5A5';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'var(--bg)';
                    e.currentTarget.style.color = 'var(--text-muted)';
                    e.currentTarget.style.borderColor = 'var(--border)';
                  }}
                >
                  <AdminIcon name="x" size={12} />
                </button>
              </div>

              {/* Search Field */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 12px',
                  background: 'white',
                  border: '1.5px solid var(--orange)',
                  borderRadius: 10,
                  boxShadow: '0 0 0 3px var(--orange-light)',
                  marginBottom: 14,
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--orange)' }}>
                  search
                </span>
                <input
                  type="text"
                  placeholder="Buscar por nombre o correo..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                  style={{
                    flex: 1,
                    background: 'none',
                    border: 'none',
                    outline: 'none',
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'var(--text)',
                  }}
                />
                {isSearching ? (
                  <div
                    className="adm-spinner"
                    style={{
                      width: 14,
                      height: 14,
                      border: '2px solid var(--orange-light)',
                      borderTopColor: 'var(--orange)',
                      borderRadius: '50%',
                    }}
                  />
                ) : searchQuery ? (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}
                  >
                    <AdminIcon name="x" size={11} />
                  </button>
                ) : null}
              </div>

              {/* Members Scrollable List */}
              <div
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  paddingRight: 2,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                }}
              >
                {members.length === 0 && !isSearching ? (
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 16px', textAlign: 'center', background: 'var(--bg)', borderRadius: 12, border: '1px dashed var(--border)' }}>
                    <AdminIcon name="users" size={24} />
                    <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 700, marginTop: 6 }}>
                      No se encontraron miembros
                    </span>
                  </div>
                ) : (
                  members.map((m) => {
                    const isSelected = selectedUserId === m.id;
                    return (
                      <div
                        key={m.id}
                        onClick={() => {
                          setSelectedUserId(m.id);
                          setSelectedMember(m);
                          setIsDropdownOpen(false);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 12px',
                          borderRadius: 8,
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                          background: isSelected ? 'var(--orange-light)' : 'white',
                          border: isSelected ? '1.5px solid var(--orange)' : '1.5px solid var(--border)',
                          color: 'var(--text)',
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.background = 'var(--bg)';
                            e.currentTarget.style.borderColor = 'var(--text-light)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.background = 'white';
                            e.currentTarget.style.borderColor = 'var(--border)';
                          }
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                          <div style={{ width: 28, height: 28, borderRadius: '50%', background: isSelected ? 'var(--orange)' : 'var(--orange-light)', color: isSelected ? 'white' : 'var(--orange)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, flexShrink: 0 }}>
                            {m.full_name.substring(0, 2).toUpperCase()}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 1, minWidth: 0 }}>
                            <span style={{ fontSize: 12.5, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: isSelected ? 'var(--orange-hover)' : 'var(--text)' }}>
                              {m.full_name}
                            </span>
                            <span style={{ fontSize: 10, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 500 }}>
                              {m.email}
                            </span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                          <span style={{ fontSize: 10.5, fontWeight: 700, background: isSelected ? 'rgba(234,112,52,0.1)' : 'var(--surface-high)', padding: '2px 6px', borderRadius: 6, color: isSelected ? 'var(--orange)' : 'var(--text-muted)' }}>
                            {m.stars_balance ?? 0} ★
                          </span>
                          {isSelected && (
                            <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'var(--orange)' }}>
                              check_circle
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </>
        )}
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
            {isEditingTitle ? (
              <div style={{ 
                padding: '12px 14px', 
                background: 'white', 
                borderRadius: 10, 
                border: '1.5px solid var(--border)',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                marginBottom: 10
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>Nuevo nombre:</label>
                  <input 
                    type="text" 
                    value={editTitle} 
                    onChange={(e) => setEditTitle(e.target.value)} 
                    placeholder="Nombre de la clase"
                    style={{ 
                      padding: '8px 12px', 
                      borderRadius: 8, 
                      border: '1.5px solid var(--border)',
                      fontSize: 13,
                      fontWeight: 600,
                      outline: 'none',
                      color: 'var(--text)',
                      width: '100%'
                    }}
                  />
                </div>

                {cls.recurring && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <input 
                      type="checkbox" 
                      id="editAllTitleRecurringCheck"
                      checked={editAllTitleRecurring}
                      onChange={(e) => setEditAllTitleRecurring(e.target.checked)}
                      style={{ width: 15, height: 15, cursor: 'pointer' }}
                    />
                    <label htmlFor="editAllTitleRecurringCheck" style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text)', cursor: 'pointer', userSelect: 'none' }}>
                      Aplicar a todas las clases relacionadas (futuras)
                    </label>
                  </div>
                )}

                <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                  <button 
                    type="button" 
                    disabled={isUpdatingTitle}
                    className="btn-cancel"
                    style={{ padding: '6px 12px', fontSize: 12, margin: 0 }}
                    onClick={() => setIsEditingTitle(false)}
                  >
                    Cancelar
                  </button>
                  <button 
                    type="button" 
                    disabled={isUpdatingTitle || !editTitle.trim()}
                    className="btn-primary"
                    style={{ padding: '6px 14px', fontSize: 12, margin: 0, flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 4 }}
                    onClick={handleUpdateClassTitle}
                  >
                    {isUpdatingTitle ? 'Guardando...' : 'Guardar Nombre'}
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: colorObj.text, letterSpacing: '-0.3px' }}>
                    {cls.title}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setEditTitle(cls.title);
                      setEditAllTitleRecurring(false);
                      setIsEditingTitle(true);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--orange)',
                      cursor: 'pointer',
                      fontSize: 11,
                      fontWeight: 700,
                      padding: '4px',
                      borderRadius: 4,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.15s'
                    }}
                    title="Editar nombre de la clase"
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(234,112,52,0.1)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                  >
                    <AdminIcon name="edit" size={13} />
                  </button>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {cls.status === 'cancelled' && (
                    <span style={{ fontSize: 10, fontWeight: 800, background: 'var(--red)', color: 'white', padding: '2px 8px', borderRadius: 99, textTransform: 'uppercase', flexShrink: 0 }}>
                      Cancelada
                    </span>
                  )}
                  {isCurrentClassPast && !cls.recurring ? (
                    <button
                      type="button"
                      disabled
                      title="Esta clase ya finalizó y no puede ser eliminada"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        padding: '5px 10px',
                        borderRadius: 8,
                        border: '1.5px solid var(--border)',
                        background: 'var(--bg)',
                        color: 'var(--text-muted)',
                        fontSize: 11.5,
                        fontWeight: 600,
                        cursor: 'not-allowed',
                        opacity: 0.6,
                      }}
                    >
                      <AdminIcon name="trash" size={13} />
                      <span>Finalizada</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleOpenDeleteModal}
                      title={cls.recurring && isCurrentClassPast ? "Eliminar clases futuras de esta serie" : "Eliminar esta clase del sistema y procesar reembolsos"}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        padding: '5px 10px',
                        borderRadius: 8,
                        border: '1.5px solid rgba(220, 38, 38, 0.3)',
                        background: 'rgba(254, 242, 242, 0.9)',
                        color: '#dc2626',
                        fontSize: 11.5,
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#dc2626';
                        e.currentTarget.style.color = '#ffffff';
                        e.currentTarget.style.borderColor = '#dc2626';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(254, 242, 242, 0.9)';
                        e.currentTarget.style.color = '#dc2626';
                        e.currentTarget.style.borderColor = 'rgba(220, 38, 38, 0.3)';
                      }}
                    >
                      <AdminIcon name="trash" size={13} />
                      <span>{cls.recurring && isCurrentClassPast ? 'Eliminar Futuras' : 'Eliminar'}</span>
                    </button>
                  )}
                </div>
              </div>
            )}
            {cls.description && (
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6, lineHeight: 1.5, fontWeight: 500 }}>
                {cls.description}
              </div>
            )}
            {isEditingTime ? (
              <div style={{ 
                marginTop: 12, 
                padding: '12px 14px', 
                background: 'white', 
                borderRadius: 10, 
                border: '1.5px solid var(--border)',
                display: 'flex',
                flexDirection: 'column',
                gap: 10
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>Nueva hora:</label>
                  <input 
                    type="time" 
                    value={editTime} 
                    onChange={(e) => setEditTime(e.target.value)} 
                    style={{ 
                      padding: '6px 10px', 
                      borderRadius: 6, 
                      border: '1.5px solid var(--border)',
                      fontSize: 13,
                      fontWeight: 600,
                      outline: 'none',
                      color: 'var(--text)'
                    }}
                  />
                </div>

                {cls.recurring && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <input 
                      type="checkbox" 
                      id="editAllRecurringCheck"
                      checked={editAllRecurring}
                      onChange={(e) => setEditAllRecurring(e.target.checked)}
                      style={{ width: 15, height: 15, cursor: 'pointer' }}
                    />
                    <label htmlFor="editAllRecurringCheck" style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text)', cursor: 'pointer', userSelect: 'none' }}>
                      Aplicar a todas las clases relacionadas (mismo día y hora en adelante)
                    </label>
                  </div>
                )}

                <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                  <button 
                    type="button" 
                    disabled={isUpdatingTime}
                    className="btn-cancel"
                    style={{ padding: '6px 12px', fontSize: 12, margin: 0 }}
                    onClick={() => setIsEditingTime(false)}
                  >
                    Cancelar
                  </button>
                  <button 
                    type="button" 
                    disabled={isUpdatingTime || !editTime}
                    className="btn-primary"
                    style={{ padding: '6px 14px', fontSize: 12, margin: 0, flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 4 }}
                    onClick={handleUpdateClassTime}
                  >
                    {isUpdatingTime ? 'Guardando...' : 'Guardar Horario'}
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 14, marginTop: 14, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>
                  <AdminIcon name="clock" size={14} /> 
                  <span>{formatClassTime(cls.time)} · {cls.duration} min</span>
                  <button
                    type="button"
                    onClick={() => {
                      setEditTime(cls.time);
                      setEditAllRecurring(false);
                      setIsEditingTime(true);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--orange)',
                      cursor: 'pointer',
                      fontSize: 11,
                      fontWeight: 700,
                      padding: '2px 6px',
                      borderRadius: 4,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 3,
                      marginLeft: 4,
                      transition: 'all 0.15s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--orange-light)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                  >
                    <AdminIcon name="edit" size={11} />
                    Editar hora
                  </button>
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
            )}
            
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

          {/* Bookings List Section with Tab Selector */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div className="form-section-title" style={{ margin: 0 }}>Usuarios Inscritos</div>
            <div style={{ display: 'flex', gap: 4, background: 'var(--surface-high)', padding: 3, borderRadius: 8 }}>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('confirmed');
                  setCancellingBookingId(null);
                }}
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '4px 10px',
                  borderRadius: 6,
                  border: 'none',
                  cursor: 'pointer',
                  background: activeTab === 'confirmed' ? 'white' : 'transparent',
                  color: activeTab === 'confirmed' ? 'var(--text)' : 'var(--text-muted)',
                  boxShadow: activeTab === 'confirmed' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.2s'
                }}
              >
                Confirmados ({users.filter(u => u.status === 'confirmed').length})
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('cancelled');
                  setCancellingBookingId(null);
                }}
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '4px 10px',
                  borderRadius: 6,
                  border: 'none',
                  cursor: 'pointer',
                  background: activeTab === 'cancelled' ? 'white' : 'transparent',
                  color: activeTab === 'cancelled' ? 'var(--text)' : 'var(--text-muted)',
                  boxShadow: activeTab === 'cancelled' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.2s'
                }}
              >
                Cancelados ({users.filter(u => u.status === 'cancelled').length})
              </button>
            </div>
          </div>
          
          {isLoading ? (
            <div style={{ padding: 30, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14, fontWeight: 500 }}>
              Cargando inscritos...
            </div>
          ) : users.filter(u => u.status === activeTab).length === 0 ? (
            <div style={{ padding: 30, textAlign: 'center', background: 'var(--surface-high)', borderRadius: 12, border: '1px dashed var(--border)' }}>
               <AdminIcon name="users" size={24} />
               <div style={{ marginTop: 8, fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>
                 {activeTab === 'confirmed' 
                   ? 'No hay usuarios con reserva confirmada en esta clase.' 
                   : 'No hay reservas canceladas en esta clase.'
                 }
               </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 300, overflowY: 'auto', paddingRight: 4 }}>
              {users.filter(u => u.status === activeTab).map((user, idx) => {
                const isThisBookingCancelling = cancellingBookingId === user.booking_id;
                
                if (isThisBookingCancelling) {
                  return (
                    <div key={`${user.id}-${idx}`} style={{ display: 'flex', flexDirection: 'column', padding: '12px 14px', background: '#FEF2F2', border: '1.5px solid #FCA5A5', borderRadius: 10, gap: 10 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#991B1B' }}>
                        ¿Cancelar reserva de {user.full_name}?
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <input 
                          type="checkbox" 
                          id="refundStarCheck"
                          checked={refundOption}
                          onChange={(e) => setRefundOption(e.target.checked)}
                          style={{ width: 16, height: 16, cursor: 'pointer' }}
                        />
                        <label htmlFor="refundStarCheck" style={{ fontSize: 12, fontWeight: 600, color: '#991B1B', cursor: 'pointer', userSelect: 'none' }}>
                          Reembolsar 1 sesión al usuario
                        </label>
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button 
                          type="button" 
                          disabled={isCancellingBooking}
                          style={{ padding: '6px 12px', fontSize: 11.5, background: 'var(--surface-high)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}
                          onClick={() => setCancellingBookingId(null)}
                        >
                          Atrás
                        </button>
                        <button 
                          type="button" 
                          disabled={isCancellingBooking}
                          style={{ padding: '6px 12px', fontSize: 11.5, background: '#DC2626', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 700, flex: 1 }}
                          onClick={() => handleAdminCancelUserBooking(user.booking_id)}
                        >
                          {isCancellingBooking ? 'Cancelando...' : 'Confirmar Cancelación'}
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
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
                       <div style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                         {user.email} {user.machine_label ? ` · ${user.machine_label}` : ''}
                       </div>
                     </div>
                     
                     <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                       <div style={{ textAlign: 'right' }}>
                          {user.status === 'confirmed' ? (
                              <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--green)', background: 'var(--green-light)', padding: '2px 6px', borderRadius: 6, display: 'inline-block', marginBottom: 2 }}>Confirmado</span>
                          ) : (
                              <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', background: 'var(--surface-high)', padding: '2px 6px', borderRadius: 6, display: 'inline-block', marginBottom: 2 }}>{user.status}</span>
                          )}
                          <div style={{ fontSize: 10, color: 'var(--text-light)', fontWeight: 500 }}>{user.booking_date}</div>
                       </div>
                       
                       {user.status === 'confirmed' && (
                         <button
                           type="button"
                           title="Cancelar reserva"
                           onClick={(e) => {
                             e.stopPropagation();
                             setCancellingBookingId(user.booking_id);
                             setRefundOption(true); // default to refunding 1 star
                           }}
                           style={{
                             background: 'none',
                             border: 'none',
                             cursor: 'pointer',
                             color: 'var(--red)',
                             padding: '4px',
                             display: 'flex',
                             alignItems: 'center',
                             justifyContent: 'center',
                             borderRadius: '6px',
                             transition: 'background 0.2s',
                           }}
                           onMouseEnter={(e) => e.currentTarget.style.background = '#FEE2E2'}
                           onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                         >
                           <AdminIcon name="x" size={14} />
                         </button>
                       )}
                     </div>
                  </div>
                );
              })}
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

            <div className="form-group" style={{ marginBottom: 12, position: 'relative' }}>
              <label className="form-label">Miembro <span>*</span></label>
              
              {/* Dropdown Trigger Box */}
              <div 
                onClick={() => {
                  setIsDropdownOpen(prev => !prev);
                  setSearchQuery('');
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  background: 'var(--bg)',
                  border: '1.5px solid var(--border)',
                  borderRadius: 10,
                  fontSize: 13.5,
                  fontWeight: 600,
                  color: 'var(--text)',
                  cursor: 'pointer',
                  userSelect: 'none',
                  transition: 'border-color 0.2s, box-shadow 0.2s',
                  boxShadow: isDropdownOpen ? '0 0 0 3px var(--orange-light)' : 'none',
                  borderColor: isDropdownOpen ? 'var(--orange)' : 'var(--border)'
                }}
              >
                {selectedMember ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
                    <span style={{ fontWeight: 700, color: 'var(--text)' }}>{selectedMember.full_name}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {selectedMember.email} — Saldo: {selectedMember.stars_balance ?? 0} ★
                    </span>
                  </div>
                ) : (
                  <span style={{ color: 'var(--text-muted)' }}>-- Seleccionar Miembro --</span>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {selectedMember && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedUserId('');
                        setSelectedMember(null);
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--text-muted)',
                        padding: 2,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '50%',
                        transition: 'background 0.2s',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-high)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                    >
                      <AdminIcon name="x" size={12} />
                    </button>
                  )}
                  <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--text-muted)', transform: isDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                    expand_more
                  </span>
                </div>
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
                Descontar sesiones del saldo del usuario ({cls.stars_cost || 1} ★)
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
