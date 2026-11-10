'use client';

import { ReactNode } from 'react';
import { useAdmin } from '@/lib/admin/AdminContext';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminTopbar from '@/components/admin/AdminTopbar';

export default function AdminLayoutInner({ children }: { children: ReactNode }) {
  const { sidebarOpen, setSidebarOpen } = useAdmin();

  return (
    <div className={`admin-layout${sidebarOpen ? ' sidebar-open' : ''}`}>
      <AdminSidebar />
      {sidebarOpen && (
        <div 
          className="sidebar-overlay-backdrop" 
          onClick={() => setSidebarOpen(false)} 
        />
      )}
      <div className="admin-main">
        <AdminTopbar />
        <main className="admin-content">
          {children}
        </main>
      </div>
    </div>
  );
}
