'use client';

import { useRouter, usePathname } from 'next/navigation';

export default function TopNavBar() {
    const router = useRouter();
    const path = usePathname();

    // Do not show on auth screens since they use their own LogoHeader inline
    if (path === '/login' || path === '/register') return null;

    if (path.includes('profile')) {
        return (
            <header className="fixed top-0 w-full max-w-md left-1/2 -translate-x-1/2 z-50 bg-[#fcf9f8]/75 backdrop-blur-md shadow-sm">
                <div className="flex justify-between items-center w-full px-6 py-4">
                    <button onClick={() => router.back()} className="text-[#ea7034]"><span className="material-symbols-outlined">arrow_back_ios</span></button>
                    <h1 className="text-xl font-bold tracking-tight">Mi Perfil</h1>
                    <button className="text-[#ea7034]"><span className="material-symbols-outlined">edit</span></button>
                </div>
            </header>
        );
    }

    if (path.includes('booking')) {
        return (
            <header className="fixed top-0 w-full max-w-md left-1/2 -translate-x-1/2 z-50 bg-[#fcf9f8]/75 backdrop-blur-md shadow-sm flex justify-between items-center px-6 h-16">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-white border border-surface-container-high flex items-center justify-center p-0.5 shadow-sm">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src="/logoFixed.jpeg" className="w-full h-full object-contain" alt="Glideforce Logo" />
                    </div>
                    <h1 className="text-2xl font-black text-neutral-900 tracking-tight">Reserva</h1>
                </div>
                <button onClick={() => router.back()} className="text-[#ea7034]"><span className="material-symbols-outlined">close</span></button>
            </header>
        );
    }

    // Default for classes and stars
    const isStars = path.includes('stars');
    return (
        <header className="fixed top-0 w-full max-w-md left-1/2 -translate-x-1/2 z-50 bg-[#fcf9f8]/75 backdrop-blur-md shadow-sm flex justify-between items-center px-6 h-16">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full overflow-hidden bg-white border border-surface-container-high flex items-center justify-center p-0.5 shadow-sm">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/logoFixed.jpeg" className="w-full h-full object-contain" alt="Glideforce Logo" />
                </div>
                <span className="text-2xl font-black text-[#1c1b1b] tracking-tight">Glideforce</span>
            </div>
            <span className="material-symbols-outlined text-[#ea7034] text-2xl">{isStars ? 'grade' : 'calendar_today'}</span>
        </header>
    );
}
