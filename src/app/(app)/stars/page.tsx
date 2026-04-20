'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/utils/supabase/client';
import PageTransition from '@/components/PageTransition';
import { purchaseStars } from '@/app/actions/stars';

export default function StarsPage() {
    const defaultAvatar = "https://lh3.googleusercontent.com/aida-public/AB6AXuBlTIX2c0YLEM31fa8dvXo8YXKgTQCDf5KeisuISVpwYYPcpytHwooEWAYwzLSvkZyWU1SWUViVYF-iOHbyAmzPjYCbjO0sTNxyP1V5OguCoqKyLvlMW-8st3UQrPTtCU7t9Y3xYT3yjnpPvQMhuyJEYyRofpUQ40QxtIVeClq0xmnjGtS8T7llSu3ADIhjFInPWFwpRhIzPKe6YEvZqKHKj4fyF4kD-_uUG0ix7UCkCvS-WHXZqGwNu5jlEyKU2Xb_whVAsDVYuYk";
    const supabase = createClient();

    const [filter, setFilter] = useState("Todas");
    const [balance, setBalance] = useState<number>(0);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [history, setHistory] = useState<any[]>([]);
    
    const [showTopUp, setShowTopUp] = useState(false);
    const [topUpAmount, setTopUpAmount] = useState<number | ''>('');
    const [isProcessing, setIsProcessing] = useState(false);

    // Fetch Database Data Natively
    const loadData = useCallback(async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Fetch Balance
        const { data: profile } = await supabase.from('profiles').select('stars_balance').eq('id', user.id).single();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (profile) setBalance((profile as any).stars_balance);

        // Fetch Bookings History deeply joined
        const { data: bks } = await supabase.from('bookings')
            .select(`
                id,
                status,
                class_sessions (
                    title,
                    date,
                    start_time,
                    instructors ( name, photo_url )
                )
            `)
            .eq('member_id', user.id)
            .order('created_at', { ascending: false });

        if (bks) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const mappedHistory = (bks as any[]).map(b => {
                let statusLabel = 'Activa';
                let color = 'green';
                
                if (b.status === 'confirmed') { 
                    statusLabel = 'Activa'; color = 'green'; 
                } else if (b.status === 'cancelled') { 
                    statusLabel = 'Cancelada'; color = 'red'; 
                } else if (b.status === 'completed') { 
                    statusLabel = 'Completada'; color = 'gray'; 
                } else if (b.status === 'no_show') {
                    statusLabel = 'Inasistencia'; color = 'orange';
                }

                return {
                    id: b.id,
                    title: b.class_sessions?.title || 'Sesión',
                    statusLabel: statusLabel,
                    color: color,
                    instructorName: b.class_sessions?.instructors?.name || 'Instructor',
                    img: b.class_sessions?.instructors?.photo_url || defaultAvatar,
                    date: b.class_sessions?.date || null,
                    startTime: b.class_sessions?.start_time || null,
                };
            });
            setHistory(mappedHistory);
        }
    }, [supabase]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const filteredHistory = filter === "Todas"
        ? history
        : history.filter(h => {
             if (filter === 'Activas') return h.statusLabel === 'Activa';
             if (filter === 'Canceladas') return h.statusLabel === 'Cancelada';
             if (filter === 'Completadas') return h.statusLabel === 'Completada';
             return true;
        });

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

    const handlePurchase = async () => {
        if (!topUpAmount || topUpAmount <= 0) return;
        setIsProcessing(true);
        const result = await purchaseStars(Number(topUpAmount));
        setIsProcessing(false);
        if (result.error) {
            alert(result.error);
        } else {
            setShowTopUp(false);
            setTopUpAmount('');
            loadData(); // Re-sync local cache instantly
        }
    };

    return (
        <PageTransition className="bg-surface-container-low text-on-background font-body min-h-screen pb-24 max-w-md mx-auto relative shadow-2xl overflow-hidden">
            <main className="pt-24 px-6 max-w-2xl mx-auto space-y-8">
                <section className="space-y-4">
                    <h2 className="text-3xl font-black tracking-tight">Mis Estrellitas</h2>
                    <div className="bg-white p-8 rounded-lg shadow-sm relative overflow-hidden group">
                        <div className="absolute -top-12 -right-12 w-32 h-32 editorial-gradient opacity-10 rounded-full blur-3xl"></div>
                        <div className="flex flex-col items-start gap-1">
                            <span className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-widest">Balance Actual</span>
                            <div className="flex items-end gap-2 mt-2">
                                <span className="text-5xl font-black text-on-surface leading-none">{balance}</span>
                                <span className="text-primary-container font-black text-2xl material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>stars</span>
                            </div>
                            <p className="text-sm text-on-surface-variant/70 mt-2 font-medium">Equivale a {balance} sesiones de entrenamiento personal</p>
                        </div>
                    </div>
                    <button onClick={() => setShowTopUp(true)} className="bg-primary-container w-full py-5 rounded-xl text-white font-bold text-lg shadow-lg flex items-center justify-center gap-2 active:scale-[0.98] transition-transform">
                        <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>add_circle</span>
                        Recargar Estrellitas
                    </button>
                </section>
                <section className="space-y-6">
                    <h3 className="text-xl font-bold tracking-tight">Historial de Clases</h3>
                    <div
                        className="flex gap-2 w-full overflow-x-auto no-scrollbar cursor-grab active:cursor-grabbing px-2 -mx-2 pb-2"
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
                            <motion.div
                                key={item.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.3, delay: i * 0.08, ease: "easeOut" }}
                                className="bg-white p-5 rounded-lg flex items-center gap-4 hover:shadow-md transition-all cursor-pointer"
                            >
                                <div className="w-16 h-16 rounded-full overflow-hidden flex-shrink-0 bg-surface-container">
                                    <img src={item.img} className="w-full h-full object-cover" alt={item.title} />
                                </div>
                                <div className="flex-grow min-w-0">
                                    <div className="flex justify-between items-start">
                                        <h4 className="text-base font-bold text-on-surface truncate">{item.title}</h4>
                                        <span className={`bg-${item.color}-100 text-${item.color}-700 text-[10px] font-black uppercase px-2 py-0.5 rounded-full tracking-wider`}>{item.statusLabel}</span>
                                    </div>
                                    <p className="text-xs text-on-surface-variant font-medium mt-0.5">Instructor: {item.instructorName}</p>
                                    {item.date && (
                                        <p className="text-xs text-on-surface-variant/60 font-medium mt-0.5">
                                            {new Date(item.date + 'T00:00:00').toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' })}
                                            {item.startTime ? ` · ${item.startTime.slice(0, 5)}` : ''}
                                        </p>
                                    )}
                                </div>
                            </motion.div>
                        ))}
                        {filteredHistory.length === 0 && (
                             <p className="text-sm text-center font-medium mt-8 text-on-surface-variant">No tienes reservas registradas en este filtro.</p>
                        )}
                    </div>
                </section>
            </main>

            <AnimatePresence>
                {showTopUp && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end justify-center sm:items-center bg-black/40 backdrop-blur-sm p-4 sm:p-0">
                        <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", bounce: 0, duration: 0.4 }} className="bg-white w-full max-w-sm rounded-[32px] p-8 pb-10 shadow-2xl space-y-6">
                            <div className="flex items-start justify-between">
                                <div className="space-y-1">
                                    <h3 className="text-2xl font-black text-on-surface">Comprar Estrellitas</h3>
                                    <p className="text-on-surface-variant text-sm font-medium">Recarga tu cuenta de manera instantánea vía pago simualdo.</p>
                                </div>
                                <button onClick={() => setShowTopUp(false)} className="bg-surface-container-low text-on-surface-variant p-2 rounded-full hover:bg-surface-container transition-colors">
                                    <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>close</span>
                                </button>
                            </div>
                            
                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant ml-4">Cantidad de Estrellitas</label>
                                    <input 
                                        type="number" 
                                        placeholder="Ej: 5" 
                                        value={topUpAmount} 
                                        onChange={(e) => setTopUpAmount(parseInt(e.target.value) || '')} 
                                        className="w-full bg-surface-container-low border border-surface-container-high rounded-full px-6 py-4 text-on-surface placeholder:text-outline focus:ring-2 focus:ring-primary-container outline-none"
                                    />
                                </div>
                                <button
                                    onClick={handlePurchase}
                                    disabled={!topUpAmount || topUpAmount <= 0 || isProcessing}
                                    className="w-full bg-primary-container text-white py-5 rounded-full font-bold text-lg shadow-[0_8px_16px_rgba(234,112,52,0.2)] active:scale-[0.98] transition-transform disabled:opacity-50 mt-4"
                                >
                                    {isProcessing ? 'Procesando...' : 'Pagar en Línea'}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </PageTransition>
    );
}
