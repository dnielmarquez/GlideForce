'use client';

import TopNavBar from '@/components/TopNavBar';
import BottomNavBar from '@/components/BottomNavBar';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <TopNavBar />
      {children}
      <BottomNavBar />
    </>
  );
}
