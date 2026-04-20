import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { AdminProvider } from '@/lib/admin/AdminContext';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminTopbar from '@/components/admin/AdminTopbar';
import './admin.css';

export const metadata: Metadata = {
  title: 'GlideForce — Panel Admin',
  description: 'Panel de administración de GlideForce Fitness Studio',
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="admin-root">
      <AdminProvider>
        <div className="admin-layout">
          <AdminSidebar />
          <div className="admin-main">
            <AdminTopbar />
            <main className="admin-content">
              {children}
            </main>
          </div>
        </div>
      </AdminProvider>
    </div>
  );
}
