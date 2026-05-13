'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function BottomNavBar() {
    const path = usePathname();

    // Automatically hide on auth screens
    if (path === '/login' || path === '/register') return null;

    let active = 'classes';
    if (path.includes('stars'))   active = 'stars';
    if (path.includes('profile')) active = 'profile';

    const items = [
        { id: 'classes', label: 'Clases',      icon: 'fitness_center', href: '/classes' },
        { id: 'stars',   label: 'Estrellitas', icon: 'grade',          href: '/stars'   },
        { id: 'profile', label: 'Perfil',      icon: 'person',         href: '/profile' },
    ];

    return (
        <nav className="fixed bottom-0 w-full max-w-md left-1/2 -translate-x-1/2 rounded-t-[3rem] z-50 bg-[#fcf9f8]/80 backdrop-blur-xl shadow-[0_-8px_24px_rgba(28,27,27,0.06)] flex justify-around items-center h-20 px-8 pb-4">
            {items.map(item => {
                const isActive = active === item.id;
                return (
                    <Link
                        key={item.id}
                        href={item.href}
                        prefetch={true}
                        className={`flex flex-col items-center justify-center transition-all ${isActive ? 'text-[#ea7034] scale-110' : 'text-[#1c1b1b]/60 hover:text-[#ea7034]'}`}
                    >
                        <span
                            className="material-symbols-outlined"
                            style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}
                        >
                            {item.icon}
                        </span>
                        <span className="font-['Inter'] font-medium text-[11px] mt-1 uppercase tracking-wider">
                            {item.label}
                        </span>
                    </Link>
                );
            })}
        </nav>
    );
}
