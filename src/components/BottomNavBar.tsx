import { useNavigate } from 'react-router-dom';

interface BottomNavBarProps {
    active: 'classes' | 'stars' | 'profile';
}

export default function BottomNavBar({ active }: BottomNavBarProps) {
    const navigate = useNavigate();
    return (
        <nav className="fixed bottom-0 w-full max-w-md left-1/2 -translate-x-1/2 rounded-t-[3rem] z-50 bg-[#fcf9f8]/80 backdrop-blur-xl shadow-[0_-8px_24px_rgba(28,27,27,0.06)] flex justify-around items-center h-20 px-8 pb-4">
            <button 
                onClick={() => navigate('/classes')}
                className={`flex flex-col items-center justify-center transition-all ${active === 'classes' ? 'text-[#ea7034] scale-110' : 'text-[#1c1b1b]/60 hover:text-[#ea7034]'}`}
            >
                <span className="material-symbols-outlined" style={{ fontVariationSettings: active === 'classes' ? "'FILL' 1" : "'FILL' 0" }}>fitness_center</span>
                <span className="font-['Inter'] font-medium text-[11px] mt-1 uppercase tracking-wider">Clases</span>
            </button>
            <button 
                onClick={() => navigate('/stars')}
                className={`flex flex-col items-center justify-center transition-all ${active === 'stars' ? 'text-[#ea7034] scale-110' : 'text-[#1c1b1b]/60 hover:text-[#ea7034]'}`}
            >
                <span className="material-symbols-outlined" style={{ fontVariationSettings: active === 'stars' ? "'FILL' 1" : "'FILL' 0" }}>grade</span>
                <span className="font-['Inter'] font-medium text-[11px] mt-1 uppercase tracking-wider">Estrellitas</span>
            </button>
            <button 
                onClick={() => navigate('/profile')}
                className={`flex flex-col items-center justify-center transition-all ${active === 'profile' ? 'text-[#ea7034] scale-110' : 'text-[#1c1b1b]/60 hover:text-[#ea7034]'}`}
            >
                <span className="material-symbols-outlined" style={{ fontVariationSettings: active === 'profile' ? "'FILL' 1" : "'FILL' 0" }}>person</span>
                <span className="font-['Inter'] font-medium text-[11px] mt-1 uppercase tracking-wider">Perfil</span>
            </button>
        </nav>
    );
}
