'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/utils/supabase/client';
import PageTransition from '@/components/PageTransition';
import { getStarPricing, initStarPurchase } from '@/app/actions/stars';
import { validateCouponAction } from '@/app/actions/coupons';



// Extend window for Wompi widget type
declare global {
    interface Window {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        WidgetCheckout?: any;
    }
}

export default function StarsPage() {
    const defaultAvatar = "/logoFixed.png";
    const supabase = createClient();
    const router = useRouter();

    const [filter, setFilter] = useState("Todas");
    const [balance, setBalance] = useState<number>(0);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [history, setHistory] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showTopUp, setShowTopUp] = useState(false);
    const [quantity, setQuantity] = useState<number>(1);
    const [priceCop, setPriceCop] = useState<number>(45000);
    const [isProcessing, setIsProcessing] = useState(false);
    const [widgetError, setWidgetError] = useState<string | null>(null);

    // Coupon states
    const [couponCode, setCouponCode] = useState<string>('');
    const [isValidatingCoupon, setIsValidatingCoupon] = useState<boolean>(false);
    const [appliedCoupon, setAppliedCoupon] = useState<{ id: string; code: string; title: string; discount_type: '2_for_1' | 'percentage' | 'fixed_amount'; discount_value: number } | null>(null);
    const [couponError, setCouponError] = useState<string | null>(null);
    const [couponSuccess, setCouponSuccess] = useState<boolean>(false);

    const handleApplyCoupon = async () => {
        if (!couponCode.trim()) return;
        setIsValidatingCoupon(true);
        setCouponError(null);
        setCouponSuccess(false);
        setAppliedCoupon(null);

        try {
            const res = await validateCouponAction(couponCode);
            if (res.success) {
                setAppliedCoupon(res.coupon);
                setCouponSuccess(true);
            } else {
                setCouponError(res.error);
            }
        } catch (err) {
            console.error(err);
            setCouponError('Error al validar el cupón.');
        } finally {
            setIsValidatingCoupon(false);
        }
    };

    const handleRemoveCoupon = () => {
        setCouponCode('');
        setAppliedCoupon(null);
        setCouponSuccess(false);
        setCouponError(null);
    };

    const handleCloseTopUp = () => {
        setShowTopUp(false);
        handleRemoveCoupon();
        setWidgetError(null);
    };

    // Wompi script is loaded lazily when the user clicks to pay (see handleOpenWompi)

    // Fetch star price from settings
    useEffect(() => {
        getStarPricing().then(result => {
            if ('priceCop' in result) setPriceCop(result.priceCop);
        });
    }, []);

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
                    id,
                    title,
                    date,
                    start_time,
                    duration_minutes,
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
                
                let isFinished = false;
                if (b.class_sessions?.date && b.class_sessions?.start_time) {
                    const classStart = new Date(`${b.class_sessions.date}T${b.class_sessions.start_time}-05:00`);
                    const duration = b.class_sessions.duration_minutes || 60;
                    const classEnd = new Date(classStart.getTime() + duration * 60000);
                    isFinished = new Date() > classEnd;
                }

                if (b.status === 'confirmed') { 
                    if (isFinished) {
                        statusLabel = 'Completada'; color = 'gray'; 
                    } else {
                        statusLabel = 'Activa'; color = 'green'; 
                    }
                } else if (b.status === 'cancelled') { 
                    statusLabel = 'Cancelada'; color = 'red'; 
                } else if (b.status === 'completed') { 
                    statusLabel = 'Completada'; color = 'gray'; 
                } else if (b.status === 'no_show') {
                    statusLabel = 'Inasistencia'; color = 'orange';
                }

                return {
                    id: b.id,
                    classId: b.class_sessions?.id,
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
        setIsLoading(false);
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

    let discountAmountPerStar = 0;
    if (appliedCoupon) {
        if (appliedCoupon.discount_type === 'percentage') {
            discountAmountPerStar = priceCop * (appliedCoupon.discount_value / 100);
        } else if (appliedCoupon.discount_type === 'fixed_amount') {
            discountAmountPerStar = appliedCoupon.discount_value;
        }
    }
    const finalPricePerStar = Math.max(0, priceCop - discountAmountPerStar);
    const totalCop = quantity * finalPricePerStar;

    const handleOpenWompi = async () => {
        if (!quantity || quantity < 1) return;
        setIsProcessing(true);
        setWidgetError(null);

        const result = await initStarPurchase(quantity, appliedCoupon?.code || undefined);

        if ('error' in result) {
            setWidgetError(result.error);
            setIsProcessing(false);
            return;
        }

        // Load Wompi script lazily — only now that we have a real publicKey
        await new Promise<void>((resolve) => {
            if (window.WidgetCheckout) { resolve(); return; }
            const existing = document.getElementById('wompi-widget-script');
            if (existing) {
                existing.addEventListener('load', () => resolve(), { once: true });
                return;
            }
            const script = document.createElement('script');
            script.id = 'wompi-widget-script';
            script.src = 'https://checkout.wompi.co/widget.js';
            script.async = true;
            script.onload = () => resolve();
            document.head.appendChild(script);
        });

        if (!window.WidgetCheckout) {
            setWidgetError('La pasarela de pago no está disponible. Recarga la página.');
            setIsProcessing(false);
            return;
        }

        const redirectUrl = `${window.location.origin}/payment/result?ref=${result.reference}`;

        const checkout = new window.WidgetCheckout({
            currency:          result.currency,
            amountInCents:     result.amountInCents,
            reference:         result.reference,
            publicKey:         result.publicKey,
            signature:         { integrity: result.integrityHash },
            redirectUrl:       redirectUrl,
        });

        checkout.open((response: { transaction: { status: string; reference: string } }) => {
            setIsProcessing(false);
            const { transaction } = response;
            if (transaction?.reference) {
                router.push(`/payment/result?ref=${transaction.reference}`);
            }
            // If user closed without paying, just stay on the page
        });
    };

    const formatCop = (value: number) =>
        new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value);

    return (
        <PageTransition className="bg-surface-container-low text-on-background font-body min-h-screen w-full max-w-md md:max-w-5xl lg:max-w-6xl mx-auto relative overflow-hidden">
            <main className="pt-24 pb-28 px-6 md:px-12 w-full max-w-2xl md:max-w-none mx-auto md:grid md:grid-cols-12 md:gap-12 md:items-start">
                
                {/* Desktop Left Column: Balance */}
                <div className="md:col-span-5 md:sticky md:top-24 mb-8 md:mb-0">
                    <section className="space-y-4">
                        <h2 className="text-3xl font-black tracking-tight">Mis Sesiones</h2>
                        <div className="bg-white p-8 rounded-2xl shadow-sm border border-surface-container relative overflow-hidden group">
                            <div className="absolute -top-12 -right-12 w-32 h-32 editorial-gradient opacity-10 rounded-full blur-3xl"></div>
                            <div className="flex flex-col items-start gap-1 relative z-10">
                                <span className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-widest">Balance Actual</span>
                                <div className="flex items-end gap-2 mt-2">
                                    <span className="text-6xl font-black text-on-surface leading-none">{balance}</span>
                                    <span className="text-primary-container font-black text-3xl material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>stars</span>
                                </div>
                                <p className="text-sm text-on-surface-variant/70 mt-3 font-medium leading-snug max-w-[200px]">Equivale a {balance} sesiones de entrenamiento personal</p>
                            </div>
                        </div>
                        <button onClick={() => { setShowTopUp(true); setQuantity(1); setWidgetError(null); }} className="bg-primary-container w-full py-5 rounded-full text-white font-bold text-lg shadow-[0_8px_16px_rgba(234,112,52,0.2)] flex items-center justify-center gap-2 active:scale-[0.98] transition-all">
                            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>add_circle</span>
                            Comprar Sesiones
                        </button>
                    </section>
                </div>

                {/* Desktop Right Column: History */}
                <div className="md:col-span-7">
                    <section className="space-y-6">
                        <h3 className="text-2xl font-bold tracking-tight">Historial de Clases</h3>
                        <div
                            className="flex gap-2 w-full overflow-x-auto no-scrollbar cursor-grab active:cursor-grabbing px-2 -mx-2 pb-2 md:px-0 md:mx-0"
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
                                    className={`px-6 py-2.5 rounded-full font-semibold text-sm whitespace-nowrap transition-all ${filter === f ? 'bg-primary-container text-white shadow-md' : 'bg-white border border-surface-container text-on-surface-variant hover:bg-surface-container-high'}`}
                                >
                                    {f}
                                </button>
                            ))}
                        </div>
                        <div className="space-y-4 md:grid md:grid-cols-2 md:gap-4 md:space-y-0">
                            {isLoading
                                ? Array.from({ length: 4 }).map((_, i) => (
                                    <div key={i} className="bg-white p-5 rounded-2xl flex items-center gap-4 border border-surface-container animate-pulse">
                                        <div className="w-14 h-14 rounded-full bg-surface-container-high shrink-0" />
                                        <div className="flex-grow space-y-2">
                                            <div className="h-4 w-32 bg-surface-container-high rounded-full" />
                                            <div className="h-3 w-24 bg-surface-container-high rounded-full" />
                                            <div className="h-2 w-16 bg-surface-container-high rounded-full" />
                                        </div>
                                    </div>
                                ))
                                : filteredHistory.map((item, i) => (
                                <motion.div
                                    key={item.id}
                                    onClick={() => { if (item.classId) router.push('/booking/' + item.classId); }}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ duration: 0.3, delay: i * 0.08, ease: "easeOut" }}
                                    className="bg-white p-5 rounded-2xl flex items-center gap-4 border border-surface-container hover:shadow-md transition-all cursor-pointer"
                                >
                                    <div className="w-14 h-14 rounded-full overflow-hidden flex-shrink-0 bg-surface-container border-2 border-primary-container/10">
                                        <img src={item.img} className="w-full h-full object-cover" alt={item.title} />
                                    </div>
                                    <div className="flex-grow min-w-0">
                                        <div className="flex justify-between items-start mb-1">
                                            <h4 className="text-base font-bold text-on-surface truncate pr-2">{item.title}</h4>
                                            <span className={`bg-${item.color}-50 text-${item.color}-700 text-[9px] font-black uppercase px-2 py-0.5 rounded-full tracking-widest shrink-0 border border-${item.color}-100`}>{item.statusLabel}</span>
                                        </div>
                                        <p className="text-xs text-on-surface-variant font-medium mt-0.5">Profesor: <span className="text-on-surface font-semibold">{item.instructorName}</span></p>
                                        {item.date && (
                                            <p className="text-xs text-on-surface-variant/60 font-medium mt-1 uppercase tracking-wider text-[10px]">
                                                {new Date(item.date + 'T00:00:00').toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' })}
                                                {item.startTime ? ` · ${item.startTime.slice(0, 5)}` : ''}
                                            </p>
                                        )}
                                    </div>
                                </motion.div>
                            ))}
                            {!isLoading && filteredHistory.length === 0 && (
                                 <p className="text-sm text-center font-medium mt-8 text-on-surface-variant md:col-span-2">No tienes reservas registradas en este filtro.</p>
                            )}
                        </div>
                    </section>
                </div>
            </main>

            {/* ── Top-Up Bottom Sheet ─────────────────────────────────────────── */}
            <AnimatePresence>
                {showTopUp && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4 sm:p-6">
                        <motion.div initial={{ opacity: 0, scale: 0.92, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.92, y: 20 }} transition={{ type: "spring", bounce: 0.25, duration: 0.4 }} className="bg-white w-full max-w-sm rounded-[2rem] md:rounded-[2.5rem] p-5 md:p-8 flex flex-col shadow-2xl max-h-[85vh]">
                            <div className="flex items-start justify-between shrink-0 mb-3 md:mb-4">
                                <div className="space-y-1">
                                    <h3 className="text-2xl font-black text-on-surface">Comprar Sesiones</h3>
                                    <p className="text-on-surface-variant text-sm font-medium">{formatCop(priceCop)} por sesión</p>
                                </div>
                                <button onClick={handleCloseTopUp} className="bg-surface-container-low text-on-surface-variant p-2 rounded-full hover:bg-surface-container transition-colors">
                                    <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>close</span>
                                </button>
                            </div>
                            
                            {/* Scrollable Body */}
                            <div className="flex-1 overflow-y-auto no-scrollbar py-2 my-2 space-y-5">
                                {/* Quantity Selector */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant ml-1">Cantidad de Sesiones</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        {[1, 4, 8, 12].map((q) => {
                                            const isSelected = quantity === q;
                                            return (
                                                <button
                                                    key={q}
                                                    type="button"
                                                    onClick={() => setQuantity(q)}
                                                    className={`flex flex-col items-center justify-center py-4 px-3 rounded-2xl border-2 transition-all relative overflow-hidden ${
                                                        isSelected
                                                            ? 'border-primary-container bg-primary-container/5 text-on-surface shadow-sm'
                                                            : 'border-surface-container bg-white text-on-surface-variant hover:border-primary-container/20 hover:bg-surface-container-low'
                                                    }`}
                                                >
                                                    {isSelected && (
                                                        <div className="absolute top-0 right-0 bg-primary-container text-white px-2 py-0.5 rounded-bl-xl text-[9px] font-black uppercase tracking-wider">
                                                            Pack
                                                        </div>
                                                    )}
                                                    <div className="flex items-center gap-1 mt-1">
                                                        <span className="text-2xl font-black">{q}</span>
                                                        <span className="material-symbols-outlined text-lg text-primary-container" style={{ fontVariationSettings: "'FILL' 1" }}>
                                                            stars
                                                        </span>
                                                    </div>
                                                    <span className="text-[10px] font-extrabold uppercase tracking-wider mt-1 text-on-surface-variant">
                                                        {q === 1 ? 'Sesión' : 'Sesiones'}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Coupon Input */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant ml-1">Cupón de Descuento</label>
                                    <div className="flex gap-2">
                                        <input
                                            className="flex-1 px-4 py-3 bg-surface-container rounded-xl border border-surface-container-high text-sm font-semibold outline-none focus:border-primary-container uppercase"
                                            placeholder="ej. GLIDEFORCE20"
                                            value={couponCode}
                                            onChange={e => setCouponCode(e.target.value.toUpperCase())}
                                            disabled={couponSuccess || isValidatingCoupon}
                                        />
                                        {couponSuccess ? (
                                            <button
                                                onClick={handleRemoveCoupon}
                                                className="px-4 py-3 bg-red-100 text-red-700 hover:bg-red-200 rounded-xl text-sm font-bold transition-all shrink-0"
                                            >
                                                Quitar
                                            </button>
                                        ) : (
                                            <button
                                                onClick={handleApplyCoupon}
                                                disabled={isValidatingCoupon || !couponCode.trim()}
                                                className="px-5 py-3 bg-primary-container text-white hover:opacity-90 rounded-xl text-sm font-bold transition-all disabled:opacity-50 shrink-0"
                                            >
                                                {isValidatingCoupon ? '...' : 'Aplicar'}
                                            </button>
                                        )}
                                    </div>
                                    {couponError && (
                                        <p className="text-red-500 text-xs font-semibold px-1 mt-1">⚠️ {couponError}</p>
                                    )}
                                    {couponSuccess && appliedCoupon && (
                                        <p className="text-green-700 text-xs font-semibold px-1 mt-1">
                                            ✓ Cupón &quot;{appliedCoupon.title}&quot; aplicado.
                                        </p>
                                    )}
                                </div>

                                {/* Price Preview Breakdown */}
                                <div className="bg-surface-container-low rounded-2xl p-5 space-y-3 border border-surface-container text-sm">
                                    <div className="flex justify-between items-center text-on-surface-variant font-medium">
                                        <span>Subtotal ({quantity} {quantity === 1 ? 'sesión' : 'sesiones'})</span>
                                        <span>{formatCop(quantity * priceCop)}</span>
                                    </div>
                                    
                                    {appliedCoupon && (
                                        <div className="flex justify-between items-center text-green-700 font-medium">
                                            <span>
                                                Descuento
                                                {appliedCoupon.discount_type === 'percentage' && ` (${appliedCoupon.discount_value}%)`}
                                                {appliedCoupon.discount_type === '2_for_1' && ` (Promo 2x1)`}
                                            </span>
                                            <span>
                                                {appliedCoupon.discount_type === '2_for_1' 
                                                    ? '¡1 de regalo!' 
                                                    : `-${formatCop(quantity * discountAmountPerStar)}`
                                                }
                                            </span>
                                        </div>
                                    )}

                                    <div className="h-px bg-surface-container-high my-1" />

                                    <div className="flex justify-between items-center text-base font-black">
                                        <span>Total a pagar</span>
                                        <span className="text-on-surface">{formatCop(totalCop)}</span>
                                    </div>

                                    <div className="flex justify-between items-center font-bold text-primary-container mt-1 bg-primary-container/5 rounded-xl px-3 py-2 text-xs">
                                        <span className="flex items-center gap-1">
                                            <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>stars</span>
                                            Recibirás en tu cuenta:
                                        </span>
                                        <span className="text-sm font-black">
                                            {quantity + (appliedCoupon?.discount_type === '2_for_1' ? 1 : 0)} {quantity + (appliedCoupon?.discount_type === '2_for_1' ? 1 : 0) === 1 ? 'sesión' : 'sesiones'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Pinned Footer */}
                            <div className="w-full shrink-0 pt-3 border-t border-surface-container-high space-y-3">
                                {/* Error */}
                                {widgetError && (
                                    <p className="text-red-500 text-sm font-medium text-center bg-red-50 p-3 rounded-xl">⚠️ {widgetError}</p>
                                )}

                                {/* CTA */}
                                <button
                                    id="btn-comprar-sesiones"
                                    onClick={handleOpenWompi}
                                    disabled={isProcessing}
                                    className="w-full bg-primary-container text-white py-5 rounded-full font-bold text-lg shadow-[0_8px_16px_rgba(234,112,52,0.2)] active:scale-[0.98] transition-transform disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {isProcessing
                                        ? <><span className="material-symbols-outlined animate-spin text-xl">progress_activity</span> Preparando pago...</>
                                        : <><span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>payments</span> Pagar con Wompi</>
                                    }
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </PageTransition>
    );
}
