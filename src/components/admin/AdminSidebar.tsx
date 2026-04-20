'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import AdminIcon from './AdminIcon';
import { useAdmin } from '@/lib/admin/AdminContext';

const NAV_MAIN = [
  { id: 'classes', label: 'Clases', icon: 'dumbbell' as const, href: '/admin', showBadge: true },
];

const NAV_MANAGE = [
  { id: 'instructors', label: 'Profesoras',    icon: 'users'    as const, href: '/admin/instructors' },
  { id: 'members',     label: 'Miembros',      icon: 'star'     as const, href: '/admin/members' },
  { id: 'settings',    label: 'Configuración', icon: 'settings' as const, href: '/admin/settings' },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const { classes } = useAdmin();

  const isActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin';
    return pathname.startsWith(href);
  };

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">G</div>
        <div>
          <div className="sidebar-logo-text">GlideForce</div>
          <div className="sidebar-logo-sub">Panel Admin</div>
        </div>
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
