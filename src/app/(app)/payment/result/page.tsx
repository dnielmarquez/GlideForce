'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { getPaymentStatus } from '@/app/actions/payments';

type ResultState = 'loading' | 'approved' | 'declined' | 'pending' | 'error';

const POLL_INTERVAL_MS = 2500;
const MAX_POLLS = 20; // 50 seconds max

export default function PaymentResultPage() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const reference = searchParams.get('ref');   // our internal reference
    const [state, setState] = useState<ResultState>('loading');
    const [purpose, setPurpose] = useState<string | null>(null);
    const [pollCount, setPollCount] = useState(0);

    const checkStatus = useCallback(async () => {
        if (!reference) {
            setState('error');
            return;
        }

        const result = await getPaymentStatus(reference);

        if ('error' in result) {
            if (pollCount >= MAX_POLLS) {
                setState('error');
            }
            return;
        }

        setPurpose(result.purpose);

        switch (result.status) {
            case 'approved':
                setState('approved');
                break;
            case 'declined':
            case 'voided':
            case 'error':
            case 'expired':
                setState('declined');
                break;
            default:
                // Still pending — keep polling
                if (pollCount >= MAX_POLLS) {
                    setState('pending'); // Show "processing" message
                }
        }
    }, [reference, pollCount]);

    useEffect(() => {
        checkStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (state !== 'loading') return;
        if (pollCount >= MAX_POLLS) return;

        const timer = setTimeout(async () => {
            setPollCount(c => c + 1);
            await checkStatus();
        }, POLL_INTERVAL_MS);

        return () => clearTimeout(timer);
    }, [state, pollCount, checkStatus]);

    const backPath = purpose === 'star_purchase' ? '/stars' : '/classes';

    const configs: Record<ResultState, {
        icon: string;
        iconColor: string;
        bgColor: string;
        title: string;
        subtitle: string;
        spin?: boolean;
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
            title: purpose === 'star_purchase' ? '¡Estrellitas acreditadas!' : '¡Reserva confirmada!',
            subtitle: purpose === 'star_purchase'
                ? 'Tus estrellitas ya están disponibles en tu cuenta.'
                : 'Tu puesto ha sido asegurado. ¡Te esperamos!',
        },
        declined: {
            icon: 'cancel',
            iconColor: 'text-red-500',
            bgColor: 'bg-red-50',
            title: 'Pago no aprobado',
            subtitle: 'Tu pago fue rechazado o cancelado. No se realizó ningún cargo.',
        },
        pending: {
            icon: 'hourglass_empty',
            iconColor: 'text-amber-500',
            bgColor: 'bg-amber-50',
            title: 'Pago en procesamiento',
            subtitle: 'Estamos esperando la confirmación. Revisa tu historial en unos minutos.',
        },
        error: {
            icon: 'error',
            iconColor: 'text-red-500',
            bgColor: 'bg-red-50',
            title: 'Error al verificar',
            subtitle: 'No pudimos verificar tu pago. Si fue cobrado, contáctanos.',
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
                {/* Icon */}
                <div className={`w-24 h-24 ${config.bgColor} rounded-full flex items-center justify-center mb-8`}>
                    <span
                        className={`material-symbols-outlined text-5xl ${config.iconColor} ${config.spin ? 'animate-spin' : ''}`}
                        style={state === 'approved' ? { fontVariationSettings: "'FILL' 1, 'wght' 700" } : undefined}
                    >
                        {config.icon}
                    </span>
                </div>

                {/* Text */}
                <h1 className="text-2xl font-black text-on-surface mb-3 tracking-tight">{config.title}</h1>
                <p className="text-on-surface-variant text-sm leading-relaxed mb-10">{config.subtitle}</p>

                {/* Progress dots while loading */}
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

                {/* Action button (hidden while loading) */}
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
