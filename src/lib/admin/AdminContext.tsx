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
      setInstructors(data.map((i) => ({
        id: i.id,
        name: i.name,
        specialty: i.specialty ?? '',
        initials: i.initials,
        color: i.color
      })));
    }
  }, [supabase]);

  const refreshClasses = useCallback(async () => {
    // Only grab classes where status is scheduled or in_progress (omit cancelled perhaps? or fetch all based on calendar logic)
    const { data } = await supabase
      .from('class_sessions')
      .select('*, instructors(*)')
      .neq('status', 'cancelled');
    
    if (data) {
      setClasses(data.map((c) => ({
        id: c.id,
        title: c.title,
        description: c.description ?? undefined,
        instructor: (c.instructors as { id: string } | null)?.id ?? '',
        time: c.start_time.substring(0, 5), // 'HH:MM:SS' to 'HH:MM'
        duration: c.duration_minutes,
        date: c.date,
        color: c.color,
        capacity: c.capacity,
        enrolled: 0, 
        recurring: !!c.recurrence_id
      })));
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
