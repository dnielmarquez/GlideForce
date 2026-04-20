'use client';

import { useState, useEffect, Suspense, use } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { createClient } from '@/utils/supabase/client';
import PageTransition from '@/components/PageTransition';
import { processBooking } from '@/app/actions/booking';

const defaultAvatar = "https://lh3.googleusercontent.com/aida-public/AB6AXuBlTIX2c0YLEM31fa8dvXo8YXKgTQCDf5KeisuISVpwYYPcpytHwooEWAYwzLSvkZyWU1SWUViVYF-iOHbyAmzPjYCbjO0sTNxyP1V5OguCoqKyLvlMW-8st3UQrPTtCU7t9Y3xYT3yjnpPvQMhuyJEYyRofpUQ40QxtIVeClq0xmnjGtS8T7llSu3ADIhjFInPWFwpRhIzPKe6YEvZqKHKj4fyF4kD-_uUG0ix7UCkCvS-WHXZqGwNu5jlEyKU2Xb_whVAsDVYuYk";

function formatTime(t: string | undefined) {
    if (!t) return '';
    const [hStr, mStr] = t.split(':');
    let h = parseInt(hStr, 10);
    const suffix = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h.toString().padStart(2, '0')}:${mStr} ${suffix}`;
}

function BookingContent({ id }: { id: string }) {
    const router = useRouter();
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<'stars' | 'online' | null>(null);
    const [showPolicyModal, setShowPolicyModal] = useState(false);
    const [showWaitlistModal, setShowWaitlistModal] = useState(false);
    
    // DB State
    const [session, setSession] = useState<any>(null);
    const [machinesCount, setMachinesCount] = useState<number>(0);
    const [machineList, setMachineList] = useState<any[]>([]);
    const [occupied, setOccupied] = useState<string[]>([]);
    const [stars, setStars] = useState<number>(0);
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [selected, setSelected] = useState<string | null>(null);

    useEffect(() => {
        window.scrollTo(0, 0);

        async function loadData() {
            const supabase = createClient();

            // 1. Fetch Session Info
            const { data: sess } = await supabase.from('class_sessions')
                .select('*, instructors(*)')
                .eq('id', id)
                .single();
            if (sess) setSession(sess);

            // 2. Fetch Machine Limits from Settings & Real Machines Table
            const { data: st } = await supabase.from('settings').select('machines_count').single();
            if (st) setMachinesCount((st as any).machines_count || 5);
            
            const { data: ms } = await supabase.from('machines').select('*').eq('active', true).order('number');
            if (ms) setMachineList(ms);

            // 3. Fetch Occupied Machines
            const { data: bks } = await supabase.from('bookings')
                .select('machine_id')
                .eq('session_id', id)
                .in('status', ['confirmed']);
            if (bks) {
                setOccupied((bks as any[]).map(b => b.machine_id));
            }

            // 4. Fetch Logged-in User Profile Stars
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile } = await supabase.from('profiles').select('stars_balance').eq('id', user.id).single();
                setStars((profile as any)?.stars_balance || 0);
            } else {
                // Mock fallback in case testing environment lacks strict auth wiring initially.
                setStars(15);
            }

            setIsLoading(false);
        }

        loadData();
    }, [id]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-surface-container-low flex flex-col items-center justify-center text-on-surface-variant">
                <span className="material-symbols-outlined text-4xl animate-spin mb-4">progress_activity</span>
                <p className="font-bold tracking-tight">Cargando detalles...</p>
            </div>
        );
    }

    if (!session) {
        return (
            <div className="min-h-screen bg-surface-container-low flex flex-col items-center justify-center text-on-surface-variant">
                <span className="material-symbols-outlined text-4xl mb-4">event_busy</span>
                <p className="font-bold tracking-tight">Clase no encontrada</p>
                <button className="mt-6 font-bold underline" onClick={() => router.push('/classes')}>Volver al Calendario</button>
            </div>
        );
    }

    const isWaitlist = machinesCount > 0 && occupied.length >= machinesCount;
    const available = Math.max(0, machinesCount - occupied.length);

    const handleConfirmBooking = async () => {
        if (!selected || !paymentMethod) return;
        setIsProcessing(true);
        const res = await processBooking(id, selected, paymentMethod, isWaitlist);
        setIsProcessing(false);
        
        if (res.error) {
            alert(res.error); // Basic fallback for UI notifications
        } else {
            setPaymentMethod(null);
            setShowSuccessModal(true);
        }
    };

    const instructorName = session.instructors?.name || 'Instructor';
    const instructorImg = session.instructors?.photo_url || defaultAvatar;

    return (
        <PageTransition className="bg-surface-container-low text-on-surface min-h-screen pb-32 max-w-md mx-auto relative shadow-2xl overflow-hidden">
            {/* Policy Modal */}
            <AnimatePresence>
                {showPolicyModal && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-y-0 w-full z-[120] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm max-w-md mx-auto left-1/2 -translate-x-1/2"
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
                            transition={{ type: "spring", duration: 0.5, bounce: 0.4 }}
                            className="bg-white w-full rounded-[2.5rem] p-8 flex flex-col items-center text-center shadow-2xl"
                        >
                            <h2 className="text-2xl font-black text-on-surface mb-4 tracking-tight">Políticas de Cancelación</h2>
                            <p className="text-on-surface-variant text-sm leading-relaxed mb-8 text-left">
                                Puedes cancelar tu lugar de forma gratuita hasta <strong className="text-on-surface">12 horas antes</strong> del inicio de la clase.<br /><br />
                                Si cancelas después de este plazo o no te presentas, <strong className="text-on-surface">no habrá reembolsos ni devoluciones de estrellitas</strong>.
                            </p>
                            <button className="w-full py-4 bg-surface-container-high hover:bg-surface-container-highest text-on-surface rounded-2xl font-bold tracking-wide transition-colors" onClick={() => setShowPolicyModal(false)}>
                                Entendido
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Disclaimer Modal */}
            <AnimatePresence>
                {paymentMethod && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-y-0 w-full z-[110] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm max-w-md mx-auto left-1/2 -translate-x-1/2"
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
                            transition={{ type: "spring", duration: 0.5, bounce: 0.4 }}
                            className="bg-white w-full rounded-[2.5rem] p-8 flex flex-col items-center text-center shadow-2xl"
                        >
                            <div className="w-20 h-20 bg-surface-container-high rounded-full flex items-center justify-center mb-6">
                                <span className="material-symbols-outlined text-4xl text-on-surface-variant">info</span>
                            </div>
                            <h2 className="text-2xl font-black text-on-surface mb-3 tracking-tight">
                                {paymentMethod === 'stars' ? 'Confirmar Reserva' : 'Pago Seguro'}
                            </h2>
                            <p className="text-on-surface-variant text-sm leading-relaxed mb-8">
                                {paymentMethod === 'stars'
                                    ? <>Al confirmar, descontaremos <strong className="text-on-surface">{session.stars_cost || 1} estrellita</strong>.<br /></>
                                    : <>Serás redirigido a nuestra pasarela de pago para adquirir esta clase.<br /></>
                                }
                                Asegúrate de leer las <br />
                                <button onClick={() => setShowPolicyModal(true)} className="text-primary-container font-black underline decoration-primary-container/30 hover:decoration-primary-container underline-offset-4 mt-1 transition-all">políticas de cancelación</button>
                            </p>
                            <div className="w-full space-y-3">
                                <button 
                                    className="w-full py-4 bg-primary-container text-white rounded-2xl font-bold text-lg shadow-lg shadow-primary-container/20 active:scale-95 transition-transform disabled:opacity-50" 
                                    disabled={(paymentMethod === 'stars' && stars < (session.stars_cost || 1)) || isProcessing}
                                    onClick={handleConfirmBooking}
                                >
                                    {isProcessing ? 'Procesando...' : 
                                        (paymentMethod === 'stars' && stars < (session.stars_cost || 1) 
                                        ? 'Estrellitas insuficientes' 
                                        : (paymentMethod === 'stars' ? 'Confirmar Reserva' : 'Ir a Pagar'))}
                                </button>
                                <button className="w-full py-4 bg-transparent text-on-surface-variant font-bold transition-colors" disabled={isProcessing} onClick={() => setPaymentMethod(null)}>
                                    Cancelar
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Waitlist Modal */}
            <AnimatePresence>
                {showWaitlistModal && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-y-0 w-full z-[110] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm max-w-md mx-auto left-1/2 -translate-x-1/2"
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
                            transition={{ type: "spring", duration: 0.5, bounce: 0.4 }}
                            className="bg-white w-full rounded-[2.5rem] p-8 flex flex-col items-center text-center shadow-2xl"
                        >
                            <div className="w-20 h-20 bg-surface-container-high rounded-full flex items-center justify-center mb-6">
                                <span className="material-symbols-outlined text-4xl text-on-surface-variant">hourglass_empty</span>
                            </div>
                            <h2 className="text-2xl font-black text-on-surface mb-3 tracking-tight">Lista de Espera</h2>
                            <p className="text-on-surface-variant text-sm leading-relaxed mb-8">
                                Te asignaremos la clase inmediatamente si alguien cancela. Te notificaremos. Asegúrate que puedes tomar la clase si eso sucede.
                            </p>
                            <div className="w-full space-y-3">
                                <button className="w-full py-4 bg-primary-container text-white rounded-2xl font-bold text-lg shadow-lg shadow-primary-container/20 active:scale-95 transition-transform" onClick={() => { setShowWaitlistModal(false); setShowSuccessModal(true); }}>
                                    Entrar a Lista
                                </button>
                                <button className="w-full py-4 bg-transparent text-on-surface-variant font-bold transition-colors" onClick={() => setShowWaitlistModal(false)}>
                                    Cancelar
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Success Modal */}
            <AnimatePresence>
                {showSuccessModal && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-y-0 w-full z-[100] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm max-w-md mx-auto left-1/2 -translate-x-1/2"
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
                            transition={{ type: "spring", duration: 0.5, bounce: 0.4 }}
                            className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 flex flex-col items-center text-center shadow-2xl"
                        >
                            <div className="w-20 h-20 bg-primary-container/10 rounded-full flex items-center justify-center mb-6">
                                <span className="material-symbols-outlined text-primary-container text-5xl" style={{ fontVariationSettings: "'FILL' 1, 'wght' 700" }}>check_circle</span>
                            </div>
                            <h2 className="text-2xl font-black text-on-surface mb-3 tracking-tight">¡Genial!</h2>
                            <p className="text-on-surface-variant text-base leading-relaxed mb-8">
                                Tu puesto ha sido asegurado. ¡Te esperamos!
                            </p>
                            <button className="w-full py-4 bg-primary-container text-white rounded-2xl font-bold text-lg shadow-lg active:scale-95 transition-transform" onClick={() => router.push('/classes')}>
                                Volver al Calendario
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* View */}
            <main className="pt-20 pb-28 px-6 space-y-8 max-w-md mx-auto">
                <section className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-3xl font-extrabold tracking-tight">{session.title}</h2>
                            <p className="text-primary font-semibold text-lg">{instructorName}</p>
                        </div>
                        <div className="bg-primary-container/10 px-4 py-2 rounded-full">
                            <span className="text-primary font-bold text-sm">En Vivo</span>
                        </div>
                    </div>
                    <div className="relative w-full h-48 rounded-lg overflow-hidden shadow-sm">
                        <img className="w-full h-full object-cover" src={instructorImg} alt="Class preview" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
                    </div>
                </section>

                <section className="space-y-4">
                    <div className="flex justify-between items-end">
                        <h3 className="text-xl font-bold tracking-tight">Selecciona tu Máquina</h3>
                        <span className="text-xs text-on-surface-variant font-medium">{isWaitlist ? "0 disponibles" : `${available} disponibles hoy`}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        {machineList.length > 0 ? machineList.map(m => {
                            const isOccupied = occupied.includes(m.id);
                            return (
                                <button
                                    key={m.id}
                                    disabled={isOccupied || isWaitlist}
                                    onClick={() => setSelected(m.id)}
                                    className={`flex flex-col items-center justify-center p-6 rounded-lg shadow-sm transition-all ${isOccupied || isWaitlist ? 'bg-surface-container-low opacity-50' : (selected === m.id ? 'border-2 border-primary-container bg-white' : 'border-2 border-transparent bg-surface-container-lowest')}`}
                                >
                                    <span className="material-symbols-outlined text-3xl mb-2" style={{ fontVariationSettings: (selected === m.id && !isOccupied && !isWaitlist) ? "'FILL' 1" : "'FILL' 0" }}>fitness_center</span>
                                    <span className="text-[11px] font-bold">{m.label}</span>
                                    <span className="text-[9px] uppercase tracking-wider text-primary font-black mt-1">{isOccupied || isWaitlist ? 'Ocupado' : 'Disponible'}</span>
                                </button>
                            );
                        }) : Array.from({ length: machinesCount || 5 }, (_, i) => i + 1).map(m => (
                            <div key={m} className="flex flex-col items-center justify-center p-6 rounded-lg shadow-sm bg-surface-container-low opacity-50">
                                <span className="text-[11px] font-bold">M-0{m}</span>
                                <span className="text-[9px] uppercase tracking-wider text-error font-black mt-1">NO CONFIGURADA</span>
                            </div>
                        ))}
                    </div>
                </section>

                <section className="bg-surface-container-high/50 p-6 rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="bg-primary-container text-white w-10 h-10 flex items-center justify-center flex-shrink-0 rounded-full"><span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>star</span></div>
                        <div><p className="font-bold text-lg leading-tight">Tienes {stars} Estrellitas</p></div>
                    </div>
                </section>

                <section className="space-y-4 pb-12">
                    {isWaitlist ? (
                        <button onClick={() => setShowWaitlistModal(true)} className="w-full h-16 bg-surface-container-highest text-on-surface-variant rounded-xl font-bold text-lg shadow-sm flex items-center justify-center gap-2 transition-all active:scale-95">
                            <span className="material-symbols-outlined">group_add</span> Entrar a lista de espera
                        </button>
                    ) : (
                        <>
                            <button onClick={() => setPaymentMethod('online')} className="w-full h-16 bg-primary-container text-white rounded-xl font-bold text-lg shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-transform" disabled={!selected}>
                                <span className="material-symbols-outlined">payments</span> Pagar en Línea
                            </button>
                            <button onClick={() => setPaymentMethod('stars')} className="w-full h-16 bg-primary-container/15 text-on-primary-container rounded-xl font-bold text-lg flex items-center justify-center gap-2 active:scale-95 transition-transform" disabled={!selected || stars < (session.stars_cost || 1)}>
                                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>stars</span> Usar Estrellitas
                            </button>
                        </>
                    )}
                </section>
            </main>
        </PageTransition>
    );
}

// NextJS App Router Dynamic Routes
export default function BookingPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    
    return (
        <Suspense>
            <BookingContent id={id} />
        </Suspense>
    );
}
