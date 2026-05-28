'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import type { GFClass, Instructor, ToastState } from './types';
import { createClient } from '@/utils/supabase/client';

interface AdminContextType {
  classes: GFClass[];
  instructors: Instructor[];
  setClasses: (fn: GFClass[] | ((prev: GFClass[]) => GFClass[])) => void;
  refreshClasses: () => Promise<void>;
  toast: ToastState;
  showToast: (msg: string) => void;
}

const AdminContext = createContext<AdminContextType | null>(null);

export function AdminProvider({ children }: { children: ReactNode }) {
  const [classes, setClasses] = useState<GFClass[]>([]);
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [toast, setToast] = useState<ToastState>({ show: false, msg: '' });
  const supabase = createClient();

  const loadInstructors = useCallback(async () => {
    const { data } = await supabase.from('instructors').select('*').eq('active', true);
    if (data) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setInstructors((data as any[]).map((i) => ({
        id: i.id,
        name: i.name,
        specialty: i.specialty ?? '',
        initials: i.initials,
        color: i.color
      })));
    }
  }, [supabase]);

  const refreshClasses = useCallback(async () => {
    const { data } = await supabase
      .from('class_sessions')
      .select('*, instructors(*), bookings(status)')
      .neq('status', 'cancelled');
    
    if (data) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setClasses((data as any[]).map((c) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const enrolledCount = c.bookings ? c.bookings.filter((b: any) => b.status === 'confirmed').length : 0;
        return {
          id: c.id,
          title: c.title,
          description: c.description ?? undefined,
          instructor: (c.instructors as { id: string } | null)?.id ?? '',
          time: c.start_time.substring(0, 5), // 'HH:MM:SS' to 'HH:MM'
          duration: c.duration_minutes,
          date: c.date,
          color: c.color,
          capacity: c.capacity,
          enrolled: enrolledCount, 
          recurring: !!c.recurrence_id,
          recurrence_id: c.recurrence_id,
          stars_cost: c.stars_cost,
          status: c.status
        };
      }));
    }
  }, [supabase]);

  // Initial load
  useEffect(() => {
    loadInstructors();
    refreshClasses();
  }, [loadInstructors, refreshClasses]);

  const showToast = (msg: string) => {
    setToast({ show: true, msg });
    setTimeout(() => setToast({ show: false, msg: '' }), 3200);
  };

  return (
    <AdminContext.Provider value={{ classes, instructors, setClasses, refreshClasses, toast, showToast }}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin(): AdminContextType {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error('useAdmin must be used within AdminProvider');
  return ctx;
}
