'use client';

import TopNavBar from '@/components/TopNavBar';
import BottomNavBar from '@/components/BottomNavBar';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#fcf9f8]">
      <TopNavBar />
      {children}
      <BottomNavBar />
    </div>
  );
}
