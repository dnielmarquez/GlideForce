'use client';

import type { ToastState } from '@/lib/admin/types';

export default function Toast({ toast }: { toast: ToastState }) {
  return (
    <div className={`adm-toast${toast.show ? ' show' : ''}`}>
      <span className="toast-icon">✓</span>
      {toast.msg}
    </div>
  );
}
