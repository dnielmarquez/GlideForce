'use client';

import { usePathname } from 'next/navigation';
import AdminIcon from './AdminIcon';

const BREADCRUMB_MAP: Record<string, string> = {
  '/admin':             'Dashboard',
  '/admin/members':     'Miembros',
  '/admin/settings':    'Configuración',
  '/admin/instructors': 'Profesoras',
};

export default function AdminTopbar() {
  const pathname = usePathname();
  const section = BREADCRUMB_MAP[pathname] ?? 'Dashboard';

  return (
    <header className="topbar">
      <div className="topbar-breadcrumb">
        GlideForce &rsaquo; <span>{section}</span>
      </div>
      <div className="topbar-spacer" />
      <div className="topbar-search">
        <AdminIcon name="search" size={14} />
        <input placeholder="Buscar clase, profesora…" />
      </div>
      <button className="topbar-btn" aria-label="Notificaciones">
        <AdminIcon name="bell" size={15} />
      </button>
    </header>
  );
}
