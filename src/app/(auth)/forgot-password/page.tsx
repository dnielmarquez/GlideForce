'use client';

import { useState } from 'react';
import Link from 'next/link';
import LogoHeader from '@/components/LogoHeader';
import PageTransition from '@/components/PageTransition';
import { forgotPassword } from '@/app/actions/auth';

type FormState = 'idle' | 'loading' | 'success' | 'error';

export default function ForgotPasswordPage() {
    const [state, setState] = useState<FormState>('idle');
    const [error, setError] = useState<string | null>(null);
    const [sentEmail, setSentEmail] = useState('');

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError(null);
        setState('loading');
        const formData = new FormData(e.currentTarget);
        const email = formData.get('email') as string;
        setSentEmail(email);
        const res = await forgotPassword(formData);
        if (res?.error) {
            setError(res.error);
            setState('error');
        } else {
            setState('success');
        }
    };

    // ── Email sent confirmation ────────────────────────────────────────────────
    if (state === 'success') {
        return (
            <PageTransition className="min-h-screen flex flex-col bg-white max-w-md mx-auto relative shadow-2xl overflow-hidden">
                <LogoHeader subtitle="Recuperar contraseña" />
                <main className="flex-grow px-8 pb-12 flex flex-col items-center justify-center">
                    <div className="w-full max-w-md space-y-6 text-center">
                        <div className="mx-auto w-20 h-20 rounded-full bg-orange-50 flex items-center justify-center border-2 border-orange-100">
                            <span className="material-symbols-outlined text-primary-container" style={{ fontSize: 40 }}>send</span>
                        </div>

                        <div className="space-y-2">
                            <h2 className="text-2xl font-black tracking-tight text-on-surface">Correo enviado</h2>
                            <p className="text-on-surface-variant text-sm leading-relaxed max-w-xs mx-auto">
                                Enviamos un enlace para restablecer tu contraseña a{' '}
                                <span className="font-bold text-on-surface">{sentEmail}</span>.
                            </p>
                        </div>

                        <div className="bg-surface-container-low rounded-2xl p-5 text-left space-y-3 border border-surface-container text-sm text-on-surface-variant">
                            <div className="flex items-start gap-3">
                                <span className="material-symbols-outlined text-primary-container text-base mt-0.5">inbox</span>
                                <p>Revisa tu bandeja de entrada y la carpeta de spam.</p>
                            </div>
                            <div className="flex items-start gap-3">
                                <span className="material-symbols-outlined text-primary-container text-base mt-0.5">schedule</span>
                                <p>El enlace expira en 1 hora.</p>
                            </div>
                        </div>

                        <Link
                            href="/login"
                            className="inline-flex items-center gap-2 text-primary-container font-bold text-sm hover:underline"
                        >
                            <span className="material-symbols-outlined text-sm">arrow_back</span>
                            Volver al inicio de sesión
                        </Link>
                    </div>
                </main>
                <footer className="h-12 w-full flex items-center justify-center bg-white">
                    <div className="w-32 h-1 bg-surface-container-high rounded-full opacity-50" />
                </footer>
            </PageTransition>
        );
    }

    // ── Form ──────────────────────────────────────────────────────────────────
    return (
        <PageTransition className="min-h-screen flex flex-col bg-white max-w-md mx-auto relative shadow-2xl overflow-hidden">
            <LogoHeader subtitle="Recuperar contraseña" />
            <main className="flex-grow px-8 pb-12">
                <div className="max-w-md mx-auto space-y-8">
                    <section className="bg-white p-8 rounded-2xl ios-shadow space-y-6 border border-surface-container">
                        <div className="space-y-1 text-center">
                            <p className="text-on-surface-variant text-sm leading-relaxed">
                                Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.
                            </p>
                        </div>

                        {/* Error banner */}
                        {error && (
                            <div className="flex items-start gap-3 bg-red-50 text-red-600 text-sm p-4 rounded-xl border border-red-200 animate-in fade-in">
                                <span className="material-symbols-outlined text-red-500 text-xl leading-none mt-0.5">error</span>
                                <p>{error}</p>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant ml-4">
                                    Correo electrónico
                                </label>
                                <input
                                    name="email"
                                    required
                                    autoComplete="email"
                                    className="w-full bg-surface-container-low border border-surface-container-high rounded-full px-6 py-4 text-on-surface placeholder:text-outline focus:ring-2 focus:ring-primary-container outline-none transition"
                                    placeholder="nombre@ejemplo.com"
                                    type="email"
                                />
                            </div>

                            <button
                                disabled={state === 'loading'}
                                type="submit"
                                className="w-full bg-primary-container text-white py-5 rounded-full font-bold text-lg shadow-[0_8px_16px_rgba(234,112,52,0.2)] active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2 transition-all"
                            >
                                {state === 'loading' ? (
                                    <>
                                        <span className="inline-block w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Enviando...
                                    </>
                                ) : 'Enviar enlace de recuperación'}
                            </button>
                        </form>
                    </section>

                    <div className="text-center">
                        <Link
                            href="/login"
                            className="inline-flex items-center gap-1.5 text-on-surface-variant font-semibold text-sm hover:text-on-surface transition"
                        >
                            <span className="material-symbols-outlined text-sm">arrow_back</span>
                            Volver al inicio de sesión
                        </Link>
                    </div>
                </div>
            </main>
            <footer className="h-12 w-full flex items-center justify-center bg-white">
                <div className="w-32 h-1 bg-surface-container-high rounded-full opacity-50" />
            </footer>
        </PageTransition>
    );
}
