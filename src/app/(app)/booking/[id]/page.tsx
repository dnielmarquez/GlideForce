'use client';

import { useState, useEffect, Suspense, use } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { createClient } from '@/utils/supabase/client';
import PageTransition from '@/components/PageTransition';
import { processBooking, cancelBooking, getOccupiedMachines } from '@/app/actions/booking';
import { initiateBookingPayment } from '@/app/actions/payments';

// Extend window for Wompi widget
declare global { interface Window { WidgetCheckout?: any; } }

const defaultAvatar = "/logo.png";



function BookingContent({ id }: { id: string }) {
    const router = useRouter();
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<'stars' | 'online' | null>(null);
    const [showPolicyModal, setShowPolicyModal] = useState(false);
    const [showWaitlistModal, setShowWaitlistModal] = useState(false);
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [cancelResult, setCancelResult] = useState<{success: boolean, refunded?: boolean, error?: string} | null>(null);
    const [dateParam, setDateParam] = useState<string | null>(null);
    
    // DB State
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [session, setSession] = useState<any>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [userBooking, setUserBooking] = useState<any>(null);
    const [machinesCount, setMachinesCount] = useState<number>(0);
    const [cancelTimeMinutes, setCancelTimeMinutes] = useState<number>(0);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [machineList, setMachineList] = useState<any[]>([]);
    const [occupied, setOccupied] = useState<string[]>([]);
    const [stars, setStars] = useState<number>(0);
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [selected, setSelected] = useState<string | null>(null);
    const [wompiError, setWompiError] = useState<string | null>(null);

    // Load Wompi widget script once
    useEffect(() => {
        if (document.getElementById('wompi-widget-script')) return;
        const s = document.createElement('script');
        s.id = 'wompi-widget-script';
        s.src = 'https://checkout.wompi.co/widget.js';
        s.async = true;
        document.head.appendChild(s);
    }, []);

    useEffect(() => {
        window.scrollTo(0, 0);
        
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            setDateParam(params.get('date'));
        }

        async function loadData() {
            const supabase = createClient();

            // 1. Fetch Session Info
            const { data: sess } = await supabase.from('class_sessions')
                .select('*, instructors(*)')
                .eq('id', id)
                .single();
            if (sess) setSession(sess);

            // 2. Fetch Machine Limits and Cancel Policy from Settings & Real Machines Table
            const { data: st } = await supabase.from('settings').select('machines_count, cancel_time').single();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            if (st) {
                setMachinesCount((st as any).machines_count || 5);
                setCancelTimeMinutes((st as any).cancel_time || 0);
            }
            
            const { data: ms } = await supabase.from('machines').select('*').eq('active', true).order('number');
            if (ms) setMachineList(ms);

            // 3. Fetch Occupied Machines via server action to bypass RLS
            const occupiedIds = await getOccupiedMachines(id);
            setOccupied(occupiedIds);

            // 4. Fetch Logged-in User Profile Stars
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile } = await supabase.from('profiles').select('stars_balance').eq('id', user.id).single();
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                setStars((profile as any)?.stars_balance || 0);

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const { data: myBookings } = await (supabase as any).from('bookings').select('status, machine_id').eq('session_id', id).eq('member_id', user.id);
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                if (myBookings && myBookings.length > 0) {
                    const active = (myBookings as any[]).find((b: any) => b.status !== 'cancelled');
                    if (active) setUserBooking(active);
                }
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
                <button className="mt-6 font-bold underline" onClick={() => router.push(dateParam ? `/classes?date=${dateParam}` : '/classes')}>Volver al Calendario</button>
            </div>
        );
    }

    const isWaitlist = machinesCount > 0 && occupied.length >= machinesCount;
    const available = Math.max(0, machinesCount - occupied.length);

    const handleConfirmBooking = async () => {
        if (!selected || !paymentMethod) return;
        setWompiError(null);

        if (paymentMethod === 'online') {
            setIsProcessing(true);
            const res = await initiateBookingPayment(id, selected);
            setIsProcessing(false);

            if ('error' in res) { setWompiError(res.error); return; }

            if (!window.WidgetCheckout) {
                setWompiError('La pasarela de pago no está disponible. Recarga la página.');
                return;
            }

            const redirectUrl = `${window.location.origin}/payment/result?ref=${res.reference}`;
            const checkout = new window.WidgetCheckout({
                currency:      res.currency,
                amountInCents: res.amountInCents,
                reference:     res.reference,
                publicKey:     res.publicKey,
                signature:     { integrity: res.integrityHash },
                redirectUrl,
            });
            checkout.open((response: { transaction: { status: string; reference: string } }) => {
                const ref = response?.transaction?.reference;
                if (ref) router.push(`/payment/result?ref=${ref}`);
            });
            setPaymentMethod(null);
            return;
        }

        // Stars payment
        setIsProcessing(true);
        const res = await processBooking(id, selected, 'stars', isWaitlist);
        setIsProcessing(false);
        if ('error' in res && res.error) {
            alert(res.error);
        } else {
            setPaymentMethod(null);
            setShowSuccessModal(true);
        }
    };

    const handleCancelBooking = async () => {
        setIsProcessing(true);
        const res = await cancelBooking(id);
        setIsProcessing(false);
        if (res.error) {
            alert(res.error);
        } else {
            setCancelResult({ success: true, refunded: res.refunded });
        }
    };

    const instructorName = session.instructors?.name || 'Instructor';

    let userBookingStatusLabel = '';
    let userBookingBadgeClass = '';
    let canBook = true;

    let isFinished = false;
    if (session?.date && session?.start_time) {
        const classStart = new Date(`${session.date}T${session.start_time}`);
        const duration = session.duration_minutes || 60;
        const classEnd = new Date(classStart.getTime() + duration * 60000);
        isFinished = new Date() > classEnd;
    }

    if (userBooking) {
        if (userBooking.status === 'confirmed') { 
            if (isFinished) {
                userBookingStatusLabel = 'Completada'; userBookingBadgeClass = 'bg-gray-100 text-gray-700'; canBook = false;
            } else {
                userBookingStatusLabel = 'Activa'; userBookingBadgeClass = 'bg-green-100 text-green-700'; canBook = false;
            }
        } else if (userBooking.status === 'cancelled') { 
            userBookingStatusLabel = 'Cancelada'; userBookingBadgeClass = 'bg-red-100 text-red-700'; canBook = !isFinished; 
        } else if (userBooking.status === 'completed') { 
            userBookingStatusLabel = 'Completada'; userBookingBadgeClass = 'bg-gray-100 text-gray-700'; canBook = false; 
        } else if (userBooking.status === 'no_show') {
            userBookingStatusLabel = 'Inasistencia'; userBookingBadgeClass = 'bg-orange-100 text-orange-700'; canBook = false;
        }
    } else if (isFinished) {
        canBook = false;
    }

    return (
        <PageTransition className="bg-surface-container-low text-on-surface min-h-screen w-full max-w-md md:max-w-5xl lg:max-w-6xl mx-auto relative shadow-2xl overflow-hidden md:my-8 md:min-h-[80vh] md:rounded-3xl">
            {/* Policy Modal */}
            <AnimatePresence>
                {showPolicyModal && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm"
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
                            transition={{ type: "spring", duration: 0.5, bounce: 0.4 }}
                            className="bg-white w-full rounded-[2.5rem] p-8 flex flex-col items-center text-center shadow-2xl"
                        >
                            <h2 className="text-2xl font-black text-on-surface mb-4 tracking-tight">Políticas de Cancelación</h2>
                            <p className="text-on-surface-variant text-sm leading-relaxed mb-8 text-left">
                                {cancelTimeMinutes > 0 ? (
                                    <>Puedes cancelar tu lugar de forma gratuita hasta <strong className="text-on-surface">{Math.floor(cancelTimeMinutes / 60) > 0 ? `${Math.floor(cancelTimeMinutes / 60)} horas ` : ''}{cancelTimeMinutes % 60 > 0 ? `${cancelTimeMinutes % 60} minutos ` : ''}antes</strong> del inicio de la clase.<br /><br /></>
                                ) : (
                                    <>Puedes cancelar tu lugar de forma gratuita en cualquier momento.<br /><br /></>
                                )}
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
                        className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm"
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
                                    : <>Serás redirigido a la pasarela de pago seguro Wompi.<br /></>
                                }
                                Asegúrate de leer las <br />
                                <button onClick={() => setShowPolicyModal(true)} className="text-primary-container font-black underline decoration-primary-container/30 hover:decoration-primary-container underline-offset-4 mt-1 transition-all">políticas de cancelación</button>
                            </p>
                            {wompiError && (
                                <p className="text-red-500 text-sm font-medium mb-4 bg-red-50 p-3 rounded-xl">{wompiError}</p>
                            )}
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
                        className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm"
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
                        className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm"
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
                            <button className="w-full py-4 bg-primary-container text-white rounded-2xl font-bold text-lg shadow-lg active:scale-95 transition-transform" onClick={() => router.push(dateParam ? `/classes?date=${dateParam}` : '/classes')}>
                                Volver al Calendario
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Cancel Modal */}
            <AnimatePresence>
                {showCancelModal && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[130] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm"
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
                            transition={{ type: "spring", duration: 0.5, bounce: 0.4 }}
                            className="bg-white w-full rounded-[2.5rem] p-8 flex flex-col items-center text-center shadow-2xl"
                        >
                            {cancelResult ? (
                                <>
                                    <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 ${cancelResult.refunded ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>
                                        <span className="material-symbols-outlined text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                                            {cancelResult.refunded ? 'check_circle' : 'info'}
                                        </span>
                                    </div>
                                    <h2 className="text-2xl font-black text-on-surface mb-3 tracking-tight">Clase Cancelada</h2>
                                    <p className="text-on-surface-variant text-sm leading-relaxed mb-8">
                                        {cancelResult.refunded 
                                            ? 'Cancelaste a tiempo. Tu estrellita ha sido reembolsada a tu cuenta.' 
                                            : 'Cancelaste fuera del tiempo permitido. La estrellita no fue reembolsada según las políticas.'}
                                    </p>
                                    <button className="w-full py-4 bg-surface-container-high hover:bg-surface-container-highest text-on-surface rounded-2xl font-bold tracking-wide transition-colors" onClick={() => router.push(dateParam ? `/classes?date=${dateParam}` : '/classes')}>
                                        Volver al Calendario
                                    </button>
                                </>
                            ) : (
                                <>
                                    <div className="w-20 h-20 bg-red-50 text-error rounded-full flex items-center justify-center mb-6">
                                        <span className="material-symbols-outlined text-4xl">event_busy</span>
                                    </div>
                                    <h2 className="text-2xl font-black text-on-surface mb-4 tracking-tight">¿Cancelar Clase?</h2>
                                    <p className="text-on-surface-variant text-sm leading-relaxed mb-6 text-left border border-error/20 bg-error/5 p-4 rounded-xl">
                                        <span className="font-bold text-error mb-2 block">Políticas de Cancelación:</span>
                                        {cancelTimeMinutes > 0 ? (
                                            <>Puedes cancelar tu lugar de forma gratuita hasta <strong className="text-on-surface">{Math.floor(cancelTimeMinutes / 60) > 0 ? `${Math.floor(cancelTimeMinutes / 60)} horas ` : ''}{cancelTimeMinutes % 60 > 0 ? `${cancelTimeMinutes % 60} minutos ` : ''}antes</strong> del inicio de la clase.<br /><br /></>
                                        ) : (
                                            <>Puedes cancelar tu lugar de forma gratuita en cualquier momento.<br /><br /></>
                                        )}
                                        Si cancelas después de este plazo o no te presentas, <strong className="text-on-surface">no habrá reembolsos ni devoluciones de estrellitas</strong>.
                                    </p>
                                    <div className="w-full space-y-3">
                                        <button 
                                            className="w-full py-4 bg-error text-white rounded-2xl font-bold text-lg shadow-lg active:scale-95 transition-transform disabled:opacity-50" 
                                            disabled={isProcessing}
                                            onClick={handleCancelBooking}
                                        >
                                            {isProcessing ? 'Procesando...' : 'Confirmar Cancelación'}
                                        </button>
                                        <button className="w-full py-4 bg-transparent text-on-surface-variant font-bold transition-colors" disabled={isProcessing} onClick={() => setShowCancelModal(false)}>
                                            Mantener Reserva
                                        </button>
                                    </div>
                                </>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* View */}
            <main className="pt-20 pb-28 px-6 space-y-8 md:space-y-0 max-w-md md:max-w-none mx-auto md:px-12 md:grid md:grid-cols-12 md:gap-12 md:items-start">
                {/* Desktop Left Column: Details */}
                <div className="md:col-span-7 space-y-8">
                    <section className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-3xl font-extrabold tracking-tight">{session.title}</h2>
                                <p className="text-primary font-semibold text-lg">{instructorName}</p>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                                <div className="bg-primary-container/10 px-4 py-2 rounded-full">
                                    <span className="text-primary font-bold text-sm">En Vivo</span>
                                </div>
                                {userBookingStatusLabel && (
                                    <div className={`${userBookingBadgeClass} px-3 py-1 rounded-full`}>
                                        <span className="font-black text-[10px] uppercase tracking-widest">{userBookingStatusLabel}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="relative w-full h-48 md:h-96 rounded-2xl overflow-hidden shadow-sm border border-surface-container">
                            <img className="w-full h-full object-cover" src="/gym.webp" alt="Class preview" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
                        </div>
                    </section>
                </div>

                {/* Desktop Right Column: Actions */}
                <div className="md:col-span-5 space-y-8 md:sticky md:top-24 md:bg-white md:p-8 md:rounded-3xl md:shadow-sm md:border md:border-surface-container">
                    <section className="space-y-4">
                        <div className="flex justify-between items-end">
                            <h3 className="text-xl font-bold tracking-tight">Selecciona tu Máquina</h3>
                            <span className="text-xs text-on-surface-variant font-medium">{isWaitlist ? "0 disponibles" : `${available} disponibles hoy`}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            {machineList.length > 0 ? machineList.map(m => {
                                const isMyMachine = userBooking?.machine_id === m.id && userBooking?.status === 'confirmed';
                                const isOccupied = occupied.includes(m.id) && !isMyMachine;
                                return (
                                    <button
                                        key={m.id}
                                        disabled={isOccupied || isWaitlist || !canBook}
                                        onClick={() => setSelected(m.id)}
                                        className={`flex flex-col items-center justify-center p-6 rounded-2xl shadow-sm transition-all ${
                                            isMyMachine ? 'border-2 border-green-500 bg-green-50/50' : 
                                            isOccupied || isWaitlist || !canBook ? 'bg-surface-container opacity-50 border border-transparent' : 
                                            (selected === m.id ? 'border-2 border-primary-container bg-primary-container/5' : 'border border-surface-container bg-white hover:border-primary-container/30')
                                        }`}
                                    >
                                        <span className={`material-symbols-outlined text-3xl mb-2 ${isMyMachine ? 'text-green-600' : ''}`} style={{ fontVariationSettings: (selected === m.id && !isOccupied && !isWaitlist) || isMyMachine ? "'FILL' 1" : "'FILL' 0" }}>fitness_center</span>
                                        <span className="text-[11px] font-bold">{m.label}</span>
                                        <span className={`text-[9px] uppercase tracking-wider font-black mt-1 ${isMyMachine ? 'text-green-600' : (isOccupied || isWaitlist ? 'text-primary' : 'text-primary')}`}>
                                            {isMyMachine ? 'Tu Máquina' : (isOccupied || isWaitlist ? 'Ocupado' : 'Disponible')}
                                        </span>
                                    </button>
                                );
                            }) : Array.from({ length: machinesCount || 5 }, (_, i) => i + 1).map(m => (
                                <div key={m} className="flex flex-col items-center justify-center p-6 rounded-2xl shadow-sm border border-surface-container bg-surface-container-low opacity-50">
                                    <span className="text-[11px] font-bold">M-0{m}</span>
                                    <span className="text-[9px] uppercase tracking-wider text-error font-black mt-1">NO CONFIGURADA</span>
                                </div>
                            ))}
                        </div>
                    </section>

                    <section className="bg-surface-container-low md:bg-surface-container-lowest p-6 rounded-2xl border border-surface-container flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="bg-primary-container text-white w-10 h-10 flex items-center justify-center flex-shrink-0 rounded-full"><span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>star</span></div>
                            <div><p className="font-bold text-lg leading-tight">Tienes {stars} Estrellitas</p></div>
                        </div>
                    </section>

                    <section className="space-y-4 pb-12 md:pb-0">
                        {!canBook ? (
                            <div className="flex flex-col gap-3">
                                <div className="w-full h-auto min-h-[4rem] bg-surface-container text-on-surface-variant rounded-2xl font-bold text-sm flex flex-col items-center justify-center shadow-inner p-4 text-center">
                                     <span>{
                                        isFinished && (!userBooking || userBooking.status === 'cancelled') ? 'Esta clase ya finalizó.' :
                                        userBooking?.status === 'confirmed' ? (isFinished ? 'Clase completada. ¡Gracias por asistir!' : 'Ya estás inscrito en esta clase.') :
                                        `Esta clase está ${userBookingStatusLabel.toLowerCase()}.`
                                     }</span>
                                     {userBooking?.status === 'confirmed' && userBooking?.machine_id && (
                                         <span className="text-green-700 mt-2 uppercase tracking-wider text-[11px]">Máquina asignada: {machineList.find(m => m.id === userBooking.machine_id)?.label || userBooking.machine_id}</span>
                                     )}
                                </div>
                                {userBooking?.status === 'confirmed' && !isFinished && (
                                    <button onClick={() => setShowCancelModal(true)} className="w-full py-5 border-2 border-error/30 text-error rounded-2xl font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-all hover:bg-error/5 hover:border-error/50">
                                        <span className="material-symbols-outlined text-lg">cancel</span> Cancelar Clase
                                    </button>
                                )}
                            </div>
                        ) : isWaitlist ? (
                            <button onClick={() => setShowWaitlistModal(true)} className="w-full h-16 bg-surface-container-highest text-on-surface-variant rounded-2xl font-bold text-lg shadow-sm flex items-center justify-center gap-2 transition-all active:scale-95 hover:bg-surface-container-highest/80">
                                <span className="material-symbols-outlined">group_add</span> Entrar a lista de espera
                            </button>
                        ) : (
                            <>
                                <button onClick={() => setPaymentMethod('online')} className="w-full h-16 bg-primary-container text-white rounded-2xl font-bold text-lg shadow-lg shadow-primary-container/20 flex items-center justify-center gap-2 active:scale-95 transition-transform" disabled={!selected}>
                                    <span className="material-symbols-outlined">payments</span> Pagar en Línea
                                </button>
                                <button onClick={() => setPaymentMethod('stars')} className="w-full h-16 bg-surface-container border border-surface-container-high text-on-surface rounded-2xl font-bold text-lg flex items-center justify-center gap-2 active:scale-95 transition-transform hover:bg-surface-container-high" disabled={!selected || stars < (session.stars_cost || 1)}>
                                    <span className="material-symbols-outlined text-primary-container" style={{ fontVariationSettings: "'FILL' 1" }}>stars</span> Usar Estrellitas
                                </button>
                            </>
                        )}
                    </section>
                </div>
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
