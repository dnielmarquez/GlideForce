'use client';

import { usePathname } from 'next/navigation';
import AdminIcon from './AdminIcon';
import { useAdmin } from '@/lib/admin/AdminContext';

const BREADCRUMB_MAP: Record<string, string> = {
  '/admin':             'Dashboard',
  '/admin/members':     'Miembros',
  '/admin/settings':    'Configuración',
  '/admin/instructors': 'Entrenadoras',
  '/admin/transactions': 'Transacciones',
  '/admin/coupons':     'Descuentos',
};

export default function AdminTopbar() {
  const pathname = usePathname();
  const { setSidebarOpen } = useAdmin();
  const section = BREADCRUMB_MAP[pathname] ?? 'Dashboard';

  return (
    <header className="topbar">
      <button 
        className="topbar-menu-btn" 
        onClick={() => setSidebarOpen(true)}
        aria-label="Abrir menú"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="3" y1="12" x2="21" y2="12"></line>
          <line x1="3" y1="6" x2="21" y2="6"></line>
          <line x1="3" y1="18" x2="21" y2="18"></line>
        </svg>
      </button>
      <div className="topbar-breadcrumb">
        GlideForce &rsaquo; <span>{section}</span>
      </div>
      <div className="topbar-spacer" />
      <div className="topbar-search">
        <AdminIcon name="search" size={14} />
        <input placeholder="Buscar clase, entrenadora…" />
      </div>
      <button className="topbar-btn" aria-label="Notificaciones">
        <AdminIcon name="bell" size={15} />
      </button>
    </header>
  );
}
