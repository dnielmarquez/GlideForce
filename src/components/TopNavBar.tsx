import { useNavigate, useLocation } from 'react-router-dom';

export default function TopNavBar() {
    const navigate = useNavigate();
    const location = useLocation();
    const path = location.pathname;

    // Do not show on auth screens since they use their own LogoHeader inline
    if (path === '/' || path === '/register') return null;

    if (path.includes('profile')) {
        return (
            <header className="fixed top-0 w-full max-w-md left-1/2 -translate-x-1/2 z-50 bg-[#fcf9f8]/75 backdrop-blur-md shadow-sm">
                <div className="flex justify-between items-center w-full px-6 py-4">
                    <button onClick={() => navigate(-1)} className="text-[#ea7034]"><span className="material-symbols-outlined">arrow_back_ios</span></button>
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
                    <div className="w-8 h-8 rounded-full overflow-hidden bg-surface-container-highest">
                        <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuDSVXEub8MUtidbXvr0CJ5tWhsrn5iotFVo68HQb6z4b_WSG9yI039ZFJxBjc1l0jo9TMgP3V2CdSieCEXjTUMwg_dmcpl3F8GEjE2GD_vqA6RY0Kn1cMH80cShrRCYrWiu3q6KdrP_cqPOuteo2frsmwqwSOLGcDSAQHrgl3cm94QPgfcCOuUIoc-Tdw0Q2AZZ49jG5lX5PJ3W7Yf12f3x9NAUdxMUcK8ujeukxDowFz3szFIT2zn_jcawyuA9sFVWXBD2Z2EXqfA" className="w-full h-full object-cover" alt="Class" />
                    </div>
                    <h1 className="text-2xl font-black text-neutral-900 tracking-tight">Reserva</h1>
                </div>
                <button onClick={() => navigate(-1)} className="text-[#ea7034]"><span className="material-symbols-outlined">close</span></button>
            </header>
        );
    }

    // Default for classes and stars
    const isStars = path.includes('stars');
    return (
        <header className="fixed top-0 w-full max-w-md left-1/2 -translate-x-1/2 z-50 bg-[#fcf9f8]/75 backdrop-blur-md shadow-sm flex justify-between items-center px-6 h-16">
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full overflow-hidden">
                    <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuA5QwU6Gx3c_OswaEHgkETPRIvve4hFps-Q2MidZAwJ7MnUe8OJ3ABB503DJrFMHpeF-aOwFdOOoHPKnmwssqmO1ugQBEL6yflzV-Y0EygRyVflrIF_OjN87AbLhCFGz3FbjRbPIsgEZDKdXlGFI_Xs1sQ1pWyiQ-oGCMdzNPSan07N5KjekxlQYoRnugF2M38ENCH06z10IhK6J1mHKKrHFgKf-2l4IWVMNx55O-o0dWTkBcVXqEZSncKHtMr2eEu1MZE5RJfbPq0" className="w-full h-full object-cover" alt="Profile" />
                </div>
                <span className="text-2xl font-black text-[#1c1b1b] tracking-tight">GlideForce</span>
            </div>
            <span className="material-symbols-outlined text-[#ea7034] text-2xl">{isStars ? 'grade' : 'calendar_today'}</span>
        </header>
    );
}
