import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { AdminProvider } from '@/lib/admin/AdminContext';
import AdminLayoutInner from '@/components/admin/AdminLayoutInner';
import './admin.css';

export const metadata: Metadata = {
  title: 'GlideForce — Panel Admin',
  description: 'Panel de administración de GlideForce Fitness Studio',
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="admin-root">
      <AdminProvider>
        <AdminLayoutInner>{children}</AdminLayoutInner>
      </AdminProvider>
    </div>
  );
}
