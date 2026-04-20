'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { GFClass, ToastState } from './types';
import { seedClasses } from './data';

interface AdminContextType {
  classes: GFClass[];
  setClasses: (fn: GFClass[] | ((prev: GFClass[]) => GFClass[])) => void;
  toast: ToastState;
  showToast: (msg: string) => void;
}

const AdminContext = createContext<AdminContextType | null>(null);

export function AdminProvider({ children }: { children: ReactNode }) {
  const [classes, setClasses] = useState<GFClass[]>(seedClasses);
  const [toast, setToast] = useState<ToastState>({ show: false, msg: '' });

  // Hydrate from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('gf_classes');
    if (saved) {
      try { setClasses(JSON.parse(saved)); } catch { /* ignore */ }
    }
  }, []);

  // Persist to localStorage on change
  useEffect(() => {
    localStorage.setItem('gf_classes', JSON.stringify(classes));
  }, [classes]);

  const showToast = (msg: string) => {
    setToast({ show: true, msg });
    setTimeout(() => setToast({ show: false, msg: '' }), 3200);
  };

  return (
    <AdminContext.Provider value={{ classes, setClasses, toast, showToast }}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin(): AdminContextType {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error('useAdmin must be used within AdminProvider');
  return ctx;
}
