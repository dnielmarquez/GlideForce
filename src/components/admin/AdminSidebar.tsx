'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import AdminIcon from './AdminIcon';
import { useAdmin } from '@/lib/admin/AdminContext';

const NAV_MAIN = [
  { id: 'classes', label: 'Clases', icon: 'dumbbell' as const, href: '/admin', showBadge: true },
];

const NAV_MANAGE = [
  { id: 'instructors', label: 'Entrenadoras', icon: 'users' as const, href: '/admin/instructors' },
  { id: 'members', label: 'Miembros', icon: 'star' as const, href: '/admin/members' },
  { id: 'transactions', label: 'Transacciones', icon: 'receipt' as const, href: '/admin/transactions' },
  { id: 'coupons', label: 'Descuentos', icon: 'ticket' as const, href: '/admin/coupons' },
  { id: 'settings', label: 'Configuración', icon: 'settings' as const, href: '/admin/settings' },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const { classes, setSidebarOpen } = useAdmin();

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname, setSidebarOpen]);

  const isActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin';
    return pathname.startsWith(href);
  };

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">G</div>
        <div style={{ flex: 1 }}>
          <div className="sidebar-logo-text">Glideforce</div>
          <div className="sidebar-logo-sub">Panel Admin</div>
        </div>
        <button
          className="sidebar-close-btn"
          onClick={() => setSidebarOpen(false)}
          aria-label="Cerrar menú"
        >
          <AdminIcon name="x" size={16} />
        </button>
      </div>

      {/* Nav */}
      <nav className="sidebar-nav">
        <div className="sidebar-section-label">Principal</div>
        {NAV_MAIN.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className={`nav-item${isActive(item.href) && item.id === 'dashboard' ? ' active' : ''}`}

          >
            <AdminIcon name={item.icon} size={16} />
            {item.label}
            {item.showBadge && (
              <span className="nav-badge">{classes.length}</span>
            )}
          </Link>
        ))}

        <div className="sidebar-section-label">Gestión</div>
        {NAV_MANAGE.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className={`nav-item${isActive(item.href) ? ' active' : ''}`}

          >
            <AdminIcon name={item.icon} size={16} />
            {item.label}
          </Link>
        ))}
      </nav>

      {/* User */}
      <div className="sidebar-bottom">
        <div className="sidebar-user">
          <div className="sidebar-avatar">A</div>
          <div>
            <div className="sidebar-user-name">Admin</div>
            <div className="sidebar-user-role">Administrador</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
