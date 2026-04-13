import { useState, useRef } from 'react';
import BottomNavBar from '../components/BottomNavBar';

export default function StarsScreen() {
    
    // Filtering logic
    const [filter, setFilter] = useState("Todas");
    const allHistory = [
        { title: "Yoga Flow", status: "Activa", color: "green", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuB00AAHCLLM1n6QOwAyRM0jDfrB-9A0uXRC32jsX4lDk1Y7MqYdCGPsp0-bJTAngJNOeNirwr_dCfKAd1-7KHI0IVWIDat3yaxyUQ4iOsRgnlkLuY7Jr6WJWsYXFO2sTDiA98kyqF-vdUctAtW2hvDojCeQ-M1WND-GTg_0L1wrJEgTP4HfZ8eRjQIf754whDMRcj1nFshDYSTDrbCg5dZpnRzASZYshdtrGWF4EBlguBG_9knwrFT5QtbD2jSf3ExXP46reCfOIvQ" },
        { title: "HIIT Burn", status: "Cancelada", color: "red", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuDj-HzF-nuHuNolQakcjaDTTZO7iQIj_sSU2dzjF9HMwDONSRxq4-DG-5tVbRhIr2RCAqf-gAtrDzGcBvux94Ya10Eb_edOvzHkMQDtd2zjosbTf6S9go94DFErHqVvgx3zm4Wmr7LkNMOg3wBQkUwWSp33Kqe8QtO20Fp5VGMM7AmnfnxG1W4YHbjHoO3U-JxJByv9z2W6ikM6f_pAh7OdL1GsY6AT8-QjffAfhNnCmprmoHcc2h4fuK6JPpFwAXcD8XIQ784vvP0" },
        { title: "Pilates Core", status: "Completada", color: "gray", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuAcSpdaNGNgMLkT11ZdAk0lcuEQlHuYcdsnfHfocuLNWFIe7EBRVapXsXjHhgBFGt-LaLF1MW4yUiqOOKR7yOCcrQymQEAPy5ZKrztN0cPYsLbLVubfL3OgMURpD8bkYyKTGjogBTPb7gTdr-sn14nsE9jpyelbOGehLtty-5RKq0I6uJDlh7_oQyBS9Rmb4kIgLcQUQ8ePPB6guCpZ4Srr5_BCX2iJXcno_BdewRdtEqS4QG9WrJwnAh_d5ujCqM4tDoVzF7g-fIA" }
    ];
    
    const filteredHistory = filter === "Todas" 
        ? allHistory 
        : allHistory.filter(h => h.status.toLowerCase() === filter.toLowerCase().replace(/s$/, ''));

    // Drag to scroll logic
    const scrollRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);

    const onMouseDown = (e: React.MouseEvent) => {
        setIsDragging(true);
        if (!scrollRef.current) return;
        setStartX(e.pageX - scrollRef.current.offsetLeft);
        setScrollLeft(scrollRef.current.scrollLeft);
    };
    const onMouseLeave = () => setIsDragging(false);
    const onMouseUp = () => setIsDragging(false);
    const onMouseMove = (e: React.MouseEvent) => {
        if (!isDragging || !scrollRef.current) return;
        e.preventDefault();
        const x = e.pageX - scrollRef.current.offsetLeft;
        const walk = (x - startX) * 2;
        scrollRef.current.scrollLeft = scrollLeft - walk;
    };

    return (
        <div className="bg-surface-container-low text-on-background font-body min-h-screen pb-24 max-w-md mx-auto relative shadow-2xl overflow-hidden">
            <header className="fixed top-0 w-full max-w-md left-1/2 -translate-x-1/2 z-50 bg-[#fcf9f8]/75 backdrop-blur-md flex justify-between items-center px-6 h-16 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full overflow-hidden">
                        <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuA5QwU6Gx3c_OswaEHgkETPRIvve4hFps-Q2MidZAwJ7MnUe8OJ3ABB503DJrFMHpeF-aOwFdOOoHPKnmwssqmO1ugQBEL6yflzV-Y0EygRyVflrIF_OjN87AbLhCFGz3FbjRbPIsgEZDKdXlGFI_Xs1sQ1pWyiQ-oGCMdzNPSan07N5KjekxlQYoRnugF2M38ENCH06z10IhK6J1mHKKrHFgKf-2l4IWVMNx55O-o0dWTkBcVXqEZSncKHtMr2eEu1MZE5RJfbPq0" className="w-full h-full object-cover" alt="Profile" />
                    </div>
                    <span className="text-2xl font-black text-[#1c1b1b] tracking-tight">GlideForce</span>
                </div>
                <span className="material-symbols-outlined text-[#ea7034] text-2xl">notifications</span>
            </header>
            <main className="pt-24 px-6 max-w-2xl mx-auto space-y-8">
                <section className="space-y-4">
                    <h2 className="text-3xl font-black tracking-tight">Mis Estrellitas</h2>
                    <div className="bg-white p-8 rounded-lg shadow-sm relative overflow-hidden group">
                        <div className="absolute -top-12 -right-12 w-32 h-32 editorial-gradient opacity-10 rounded-full blur-3xl"></div>
                        <div className="flex flex-col items-start gap-1">
                            <span className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-widest">Balance Actual</span>
                            <div className="flex items-end gap-2 mt-2">
                                <span className="text-5xl font-black text-on-surface leading-none">24</span>
                                <span className="text-primary-container font-black text-2xl material-symbols-outlined" style={{fontVariationSettings: "'FILL' 1"}}>stars</span>
                            </div>
                            <p className="text-sm text-on-surface-variant/70 mt-2 font-medium">Equivale a 24 sesiones de entrenamiento personal</p>
                        </div>
                    </div>
                    <button className="bg-primary-container w-full py-5 rounded-xl text-white font-bold text-lg shadow-lg flex items-center justify-center gap-2">
                        <span className="material-symbols-outlined" style={{fontVariationSettings: "'FILL' 1"}}>add_circle</span>
                        Recargar Estrellitas
                    </button>
                </section>
                <section className="space-y-6">
                    <h3 className="text-xl font-bold tracking-tight">Historial de Clases</h3>
                    <div className="flex gap-2 w-full overflow-x-auto no-scrollbar cursor-grab active:cursor-grabbing px-2 -mx-2 pb-2"
                        ref={scrollRef}
                        onMouseDown={onMouseDown}
                        onMouseLeave={onMouseLeave}
                        onMouseUp={onMouseUp}
                        onMouseMove={onMouseMove}
                    >
                        {["Todas", "Activas", "Canceladas", "Completadas"].map((f) => (
                            <button 
                                key={f} 
                                onClick={() => setFilter(f)}
                                className={`px-6 py-2.5 rounded-full font-semibold text-sm whitespace-nowrap transition-all ${filter === f ? 'bg-primary-container text-white shadow-md' : 'bg-surface-container-highest text-on-surface-variant hover:bg-surface-container-highest/80'}`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                    <div className="space-y-4">
                        {filteredHistory.map((item, i) => (
                            <div key={i} className="bg-white p-5 rounded-lg flex items-center gap-4 hover:shadow-md transition-all">
                                <div className="w-16 h-16 rounded-full overflow-hidden flex-shrink-0 bg-surface-container">
                                    <img src={item.img} className="w-full h-full object-cover" alt={item.title} />
                                </div>
                                <div className="flex-grow min-w-0">
                                    <div className="flex justify-between items-start">
                                        <h4 className="text-base font-bold text-on-surface truncate">{item.title}</h4>
                                        <span className={`bg-${item.color}-100 text-${item.color}-700 text-[10px] font-black uppercase px-2 py-0.5 rounded-full tracking-wider`}>{item.status}</span>
                                    </div>
                                    <p className="text-xs text-on-surface-variant font-medium mt-0.5">Profesora: Tania Janek</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            </main>
            <BottomNavBar active="stars" />
        </div>
    );
}
