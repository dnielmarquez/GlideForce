'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { createClient } from '@/utils/supabase/client';
import PageTransition from '@/components/PageTransition';

export const dynamic = 'force-dynamic';

const defaultAvatar = "/logo.png";

function formatTime(t: string) {
    if (!t) return '';
    const [hStr, mStr] = t.split(':');
    let h = parseInt(hStr, 10);
    const suffix = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h.toString().padStart(2, '0')}:${mStr} ${suffix}`;
}

export default function ClassesPage() {
    const router = useRouter();
    const supabase = createClient();
    
    const [currentMonth, setCurrentMonth] = useState(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            const dateParam = params.get('date');
            if (dateParam) {
                const parsed = new Date(`${dateParam}T12:00:00`);
                if (!isNaN(parsed.getTime())) return parsed;
            }
        }
        return new Date();
    });
    const [selectedDay, setSelectedDay] = useState(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            const dateParam = params.get('date');
            if (dateParam) {
                const parsed = new Date(`${dateParam}T12:00:00`);
                if (!isNaN(parsed.getTime())) return parsed.getDate();
            }
        }
        return new Date().getDate();
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [dbClasses, setDbClasses] = useState<any[]>([]);
    const [userBookings, setUserBookings] = useState<Record<string, boolean>>({});
    const [isLoading, setIsLoading] = useState(true);

    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    useEffect(() => {
        const loadClasses = async () => {
            setIsLoading(true);
            const start = new Date(year, month, 1).toISOString().split('T')[0];
            const end = new Date(year, month + 1, 0).toISOString().split('T')[0];
            
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data, error } = await (supabase as any).from('class_sessions')
               .select('*, instructors(*)')
               .gte('date', start).lte('date', end)
               .neq('status', 'cancelled')
               .order('start_time', { ascending: true });
               
            if (!error && data) {
                setDbClasses(data);
                
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const sessionIds = (data as any[]).map((c: any) => c.id);
                    if (sessionIds.length > 0) {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const { data: bks } = await (supabase as any).from('bookings')
                            .select('session_id')
                            .eq('member_id', user.id)
                            .in('status', ['confirmed'])
                            .in('session_id', sessionIds);
                        if (bks) {
                            const bkMap: Record<string, boolean> = {};
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            (bks as any[]).forEach((b: any) => { bkMap[b.session_id] = true; });
                            setUserBookings(bkMap);
                        }
                    }
                }
            }
            setIsLoading(false);
        };
        
        loadClasses();

        // Clear date param from URL if present
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            if (params.get('date')) {
                window.history.replaceState({}, '', window.location.pathname);
            }
        }
    }, [year, month, supabase]);

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

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

    const days = [];
    for (let i = 1; i <= daysInMonth; i++) {
        const d = new Date(year, month, i);
        days.push({ name: dayNames[d.getDay()], date: i, fullDate: d });
    }

    const prevMonth = () => { setCurrentMonth(new Date(year, month - 1, 1)); setSelectedDay(1); };
    const nextMonth = () => { setCurrentMonth(new Date(year, month + 1, 1)); setSelectedDay(1); };

    useEffect(() => {
        const el = document.getElementById(`date-btn-${selectedDay}`);
        if (el && scrollRef.current) {
            const container = scrollRef.current;
            const scrollTarget = el.offsetLeft - container.offsetLeft - (container.offsetWidth / 2) + (el.offsetWidth / 2);
            container.scrollTo({ left: scrollTarget, behavior: 'smooth' });
        }
    }, [selectedDay]);

    return (
        <PageTransition className="bg-surface-container-low font-body text-on-surface min-h-screen w-full max-w-md md:max-w-5xl lg:max-w-6xl mx-auto relative shadow-2xl overflow-hidden md:my-8 md:min-h-[80vh] md:rounded-3xl">
            <main className="pt-20 pb-28 px-6 md:px-12 w-full max-w-md md:max-w-none mx-auto md:grid md:grid-cols-12 md:gap-10">
                
                {/* Desktop Left Column: Header & Calendar */}
                <div className="md:col-span-5 md:sticky md:top-20 md:h-fit">
                    <section className="mb-8 text-center md:text-left">
                        <p className="text-on-surface-variant font-medium label-sm uppercase opacity-70">Buenos días</p>
                        <h1 className="text-4xl font-extrabold tracking-tighter text-on-surface mt-1">Explora tus Clases</h1>
                    </section>
                    <section className="mb-10">
                        <div className="flex justify-between items-center mb-4 px-2">
                            <span className="text-on-surface-variant font-bold uppercase tracking-widest text-sm capitalize">
                                {currentMonth.toLocaleString('es-ES', { month: 'long', year: 'numeric' })}
                            </span>
                            <div className="flex gap-2">
                                <button onClick={prevMonth} className="w-8 h-8 flex items-center justify-center rounded-full bg-surface-container-low hover:bg-surface-container-high text-on-surface-variant transition-colors" aria-label="Mes anterior">
                                    <span className="material-symbols-outlined text-lg">chevron_left</span>
                                </button>
                                <button onClick={nextMonth} className="w-8 h-8 flex items-center justify-center rounded-full bg-surface-container-low hover:bg-surface-container-high text-on-surface-variant transition-colors" aria-label="Mes siguiente">
                                    <span className="material-symbols-outlined text-lg">chevron_right</span>
                                </button>
                            </div>
                        </div>
                        <div
                            ref={scrollRef}
                            onMouseDown={onMouseDown}
                            onMouseLeave={onMouseLeave}
                            onMouseUp={onMouseUp}
                            onMouseMove={onMouseMove}
                            className="flex gap-4 py-4 w-full overflow-x-auto no-scrollbar cursor-grab active:cursor-grabbing px-4 -mx-4 md:px-0 md:mx-0"
                        >
                            {days.map((day) => {
                                const isSelected = selectedDay === day.date;
                                return (
                                    <div
                                        id={`date-btn-${day.date}`}
                                        key={day.date}
                                        onClick={() => setSelectedDay(day.date)}
                                        className={`flex flex-col items-center justify-center min-w-[64px] h-24 rounded-xl transition-all select-none ${isSelected
                                            ? 'bg-primary-container text-white shadow-lg shadow-primary-container/20 scale-105'
                                            : 'bg-white text-on-surface-variant hover:bg-surface-container-high cursor-pointer shadow-sm'
                                            }`}
                                    >
                                        <span className={`text-[11px] uppercase tracking-widest ${isSelected ? 'font-bold opacity-80' : 'font-medium'}`}>{day.name}</span>
                                        <span className={`text-2xl ${isSelected ? 'font-black' : 'font-bold'}`}>{day.date}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                </div>

                {/* Desktop Right Column: Classes List */}
                <div className="md:col-span-7">
                    <section className="space-y-6 md:grid md:grid-cols-2 md:gap-6 md:space-y-0">
                        {(() => {
                            if (isLoading) {
                                return (
                                    <div className="flex flex-col items-center justify-center py-16 text-center opacity-60 md:col-span-2">
                                        <span className="material-symbols-outlined text-4xl mb-4">progress_activity</span>
                                        <h3 className="text-sm font-bold tracking-tight">Cargando clases...</h3>
                                    </div>
                                );
                            }
                        
                            // Local timezone padded iso date mapping.
                            const pad = (n: number) => n.toString().padStart(2, '0');
                            const selectedDateStr = `${year}-${pad(month + 1)}-${pad(selectedDay)}`;
                            
                            const currentClasses = dbClasses.filter(c => c.date === selectedDateStr);
                            
                            if (currentClasses.length === 0) {
                                return (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ duration: 0.3 }}
                                        className="flex flex-col items-center justify-center py-16 text-center md:col-span-2 bg-white rounded-3xl border border-surface-container shadow-sm"
                                    >
                                        <span className="material-symbols-outlined text-6xl text-surface-container-highest mb-4" style={{ fontVariationSettings: "'FILL' 0" }}>event_busy</span>
                                        <h3 className="text-xl font-bold text-on-surface tracking-tight">No hay clases hoy</h3>
                                        <p className="text-sm text-on-surface-variant font-medium mt-1">Selecciona otra fecha en el calendario.</p>
                                    </motion.div>
                                );
                            }
                            
                            return currentClasses.map((c, i) => {
                                const profName = c.instructors?.name || 'Profesor Interino';
                                const dur = `${c.duration_minutes} MIN`;
                                const imgUrl = c.instructors?.photo_url || defaultAvatar;

                                const classStart = new Date(`${c.date}T${c.start_time}`);
                                const classEnd = new Date(classStart.getTime() + (c.duration_minutes || 60) * 60000);
                                const isFinished = new Date() > classEnd;

                                return (
                                    <motion.div
                                        key={c.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.3, delay: i * 0.1, ease: "easeOut" }}
                                        className={`bg-white rounded-2xl p-6 shadow-sm border border-surface-container relative overflow-hidden group ${isFinished ? 'opacity-80' : ''}`}
                                    >
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <span className="text-primary-container font-black text-sm tracking-widest uppercase mb-1 block">
                                                    {formatTime(c.start_time)}
                                                </span>
                                                <h3 className="text-xl md:text-2xl font-extrabold text-on-surface tracking-tight">{c.title}</h3>
                                            </div>
                                            <div className="bg-surface-container-low px-3 py-1 rounded-full text-[10px] font-bold uppercase text-on-surface-variant shrink-0">
                                                {dur}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 mb-6">
                                            <div className="w-10 h-10 rounded-full border-2 border-primary-container/20 overflow-hidden bg-surface-container-high shrink-0">
                                                <img src={imgUrl} className="w-full h-full object-cover" alt="Instructor" />
                                            </div>
                                            <span className="font-bold text-on-surface text-sm">{profName}</span>
                                        </div>
                                        <button
                                            disabled={isFinished}
                                            onClick={() => router.push(`/booking/${c.id}?date=${selectedDateStr}`)}
                                            className={`w-full py-4 border-2 rounded-full font-black text-sm uppercase tracking-widest transition-all ${
                                                isFinished 
                                                ? 'bg-surface-container-high border-transparent text-on-surface-variant cursor-not-allowed opacity-70' 
                                                : userBookings[c.id]
                                                ? 'bg-green-500 border-green-500 text-white hover:bg-green-600 hover:border-green-600 shadow-md shadow-green-500/20'
                                                : 'bg-primary-container/10 border-primary-container text-primary-container hover:bg-primary-container hover:text-white'
                                            }`}
                                        >
                                            {isFinished ? 'Finalizada' : (userBookings[c.id] ? 'Reservada' : 'Reservar')}
                                        </button>
                                    </motion.div>
                                );
                            });
                        })()}
                    </section>
                </div>
            </main>
        </PageTransition>
    );
}
