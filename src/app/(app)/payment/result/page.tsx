'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { getPaymentStatus } from '@/app/actions/payments';

type ResultState = 'loading' | 'approved' | 'declined' | 'timeout' | 'error';

const POLL_INTERVAL_MS = 2500;
const MAX_POLLS = 20; // 50 seconds max

function PaymentResultContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const reference = searchParams.get('ref');

    const [state, setState] = useState<ResultState>('loading');
    const [purpose, setPurpose] = useState<string | null>(null);
    // useRef keeps the counter always fresh — no stale closure issue
    const pollCountRef = useRef(0);
    const stoppedRef = useRef(false);

    useEffect(() => {
        if (!reference) {
            setState('error');
            return;
        }

        let timer: ReturnType<typeof setTimeout>;

        const poll = async () => {
            if (stoppedRef.current) return;

            const result = await getPaymentStatus(reference);

            if (stoppedRef.current) return; // guard against unmount mid-fetch

            if ('error' in result) {
                pollCountRef.current += 1;
                if (pollCountRef.current >= MAX_POLLS) {
                    stoppedRef.current = true;
                    setState('error');
                    return;
                }
                timer = setTimeout(poll, POLL_INTERVAL_MS);
                return;
            }

            setPurpose(result.purpose);

            switch (result.status) {
                case 'approved':
                    stoppedRef.current = true;
                    setState('approved');
                    return;
                case 'declined':
                case 'voided':
                case 'error':
                case 'expired':
                    stoppedRef.current = true;
                    setState('declined');
                    return;
                default:
                    // Still pending — check budget
                    pollCountRef.current += 1;
                    if (pollCountRef.current >= MAX_POLLS) {
                        stoppedRef.current = true;
                        setState('timeout');
                        return;
                    }
                    timer = setTimeout(poll, POLL_INTERVAL_MS);
            }
        };

        poll();

        return () => {
            stoppedRef.current = true;
            clearTimeout(timer);
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [reference]);

    const backPath = purpose === 'star_purchase' ? '/stars' : '/classes';

    const configs: Record<ResultState, {
        icon: string;
        iconColor: string;
        bgColor: string;
        title: string;
        subtitle: string;
        spin?: boolean;
        showContact?: boolean;
    }> = {
        loading: {
            icon: 'progress_activity',
            iconColor: 'text-primary-container',
            bgColor: 'bg-primary-container/10',
            title: 'Verificando pago...',
            subtitle: 'Esto puede tardar unos segundos.',
            spin: true,
        },
        approved: {
            icon: 'check_circle',
            iconColor: 'text-green-600',
            bgColor: 'bg-green-50',
            title: purpose === 'star_purchase' ? '¡Sesiones acreditadas!' : '¡Reserva confirmada!',
            subtitle: purpose === 'star_purchase'
                ? 'Tus sesiones ya están disponibles en tu cuenta.'
                : 'Tu puesto ha sido asegurado. ¡Te esperamos!',
        },
        declined: {
            icon: 'cancel',
            iconColor: 'text-red-500',
            bgColor: 'bg-red-50',
            title: 'Pago no aprobado',
            subtitle: 'Tu pago fue rechazado o cancelado. No se realizó ningún cargo.',
            showContact: true,
        },
        timeout: {
            icon: 'hourglass_empty',
            iconColor: 'text-amber-500',
            bgColor: 'bg-amber-50',
            title: 'Pago en procesamiento',
            subtitle: 'No pudimos confirmar el resultado aún. Si se realizó un cargo, contáctanos y lo resolveremos.',
            showContact: true,
        },
        error: {
            icon: 'error',
            iconColor: 'text-red-500',
            bgColor: 'bg-red-50',
            title: 'Error al verificar',
            subtitle: 'Ocurrió un problema al verificar tu pago. Si fue cobrado, contáctanos.',
            showContact: true,
        },
    };

    const config = configs[state];

    return (
        <div className="min-h-screen bg-surface-container-low flex flex-col items-center justify-center p-6">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', duration: 0.5, bounce: 0.3 }}
                className="bg-white w-full max-w-sm rounded-[2.5rem] p-10 flex flex-col items-center text-center shadow-2xl"
            >
                <div className={`w-24 h-24 ${config.bgColor} rounded-full flex items-center justify-center mb-8`}>
                    <span
                        className={`material-symbols-outlined text-5xl ${config.iconColor} ${config.spin ? 'animate-spin' : ''}`}
                        style={state === 'approved' ? { fontVariationSettings: "'FILL' 1, 'wght' 700" } : undefined}
                    >
                        {config.icon}
                    </span>
                </div>

                <h1 className="text-2xl font-black text-on-surface mb-3 tracking-tight">{config.title}</h1>
                <p className="text-on-surface-variant text-sm leading-relaxed mb-8">{config.subtitle}</p>

                {state === 'loading' && (
                    <div className="flex gap-2 mb-8">
                        {[0, 1, 2].map(i => (
                            <motion.div
                                key={i}
                                className="w-2 h-2 rounded-full bg-primary-container"
                                animate={{ opacity: [0.3, 1, 0.3] }}
                                transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.3 }}
                            />
                        ))}
                    </div>
                )}

                {config.showContact && (
                    <a
                        href="mailto:soporte@glideforce.co"
                        className="text-sm text-primary-container underline underline-offset-2 mb-6"
                    >
                        Contactar soporte →
                    </a>
                )}

                {state !== 'loading' && (
                    <button
                        onClick={() => router.push(backPath)}
                        className="w-full py-4 bg-primary-container text-white rounded-2xl font-bold text-lg shadow-lg shadow-primary-container/20 active:scale-95 transition-transform"
                    >
                        {state === 'approved' ? 'Ver mi cuenta' : 'Volver'}
                    </button>
                )}
            </motion.div>
        </div>
    );
}

export default function PaymentResultPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-surface-container-low flex flex-col items-center justify-center p-6">
                <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-10 flex flex-col items-center text-center shadow-2xl">
                    <div className="w-24 h-24 bg-primary-container/10 rounded-full flex items-center justify-center mb-8">
                        <span className="material-symbols-outlined text-5xl text-primary-container animate-spin">progress_activity</span>
                    </div>
                    <h1 className="text-2xl font-black text-on-surface mb-3 tracking-tight">Verificando pago...</h1>
                    <p className="text-on-surface-variant text-sm leading-relaxed mb-10">Esto puede tardar unos segundos.</p>
                </div>
            </div>
        }>
            <PaymentResultContent />
        </Suspense>
    );
}
