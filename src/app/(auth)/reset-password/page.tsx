'use client';

import { useState } from 'react';
import LogoHeader from '@/components/LogoHeader';
import PageTransition from '@/components/PageTransition';
import { resetPassword } from '@/app/actions/auth';

type FormState = 'idle' | 'loading' | 'error';

export default function ResetPasswordPage() {
    const [state, setState] = useState<FormState>('idle');
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError(null);
        setState('loading');

        const formData = new FormData(e.currentTarget);
        const password = formData.get('password') as string;
        const confirmPassword = formData.get('confirmPassword') as string;

        if (password !== confirmPassword) {
            setError('Las contraseñas no coinciden.');
            setState('error');
            return;
        }

        const res = await resetPassword(formData);
        if (res?.error) {
            setError(res.error);
            setState('error');
        }
        // On success, the server action redirects to /classes automatically
    };

    return (
        <PageTransition className="min-h-screen flex flex-col bg-white max-w-md mx-auto relative shadow-2xl overflow-hidden">
            <LogoHeader subtitle="Nueva contraseña" />
            <main className="flex-grow px-8 pb-12">
                <div className="max-w-md mx-auto space-y-8">
                    <section className="bg-white p-8 rounded-2xl ios-shadow space-y-6 border border-surface-container">
                        <div className="text-center">
                            <p className="text-on-surface-variant text-sm leading-relaxed">
                                Elige una contraseña segura para proteger tu cuenta.
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
                            {/* New password */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant ml-4">
                                    Nueva contraseña
                                </label>
                                <input
                                    name="password"
                                    required
                                    minLength={6}
                                    autoComplete="new-password"
                                    className="w-full bg-surface-container-low border border-surface-container-high rounded-full px-6 py-4 text-on-surface placeholder:text-outline focus:ring-2 focus:ring-primary-container outline-none transition"
                                    placeholder="Mínimo 6 caracteres"
                                    type="password"
                                />
                            </div>

                            {/* Confirm password */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant ml-4">
                                    Confirmar contraseña
                                </label>
                                <input
                                    name="confirmPassword"
                                    required
                                    minLength={6}
                                    autoComplete="new-password"
                                    className="w-full bg-surface-container-low border border-surface-container-high rounded-full px-6 py-4 text-on-surface placeholder:text-outline focus:ring-2 focus:ring-primary-container outline-none transition"
                                    placeholder="Repite tu contraseña"
                                    type="password"
                                />
                            </div>

                            {/* Password requirements hint */}
                            <ul className="text-xs text-on-surface-variant space-y-1 ml-2">
                                <li className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-xs">check_circle</span>
                                    Mínimo 6 caracteres
                                </li>
                            </ul>

                            <button
                                disabled={state === 'loading'}
                                type="submit"
                                className="w-full bg-primary-container text-white py-5 rounded-full font-bold text-lg shadow-[0_8px_16px_rgba(234,112,52,0.2)] active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2 transition-all"
                            >
                                {state === 'loading' ? (
                                    <>
                                        <span className="inline-block w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Actualizando...
                                    </>
                                ) : 'Actualizar contraseña'}
                            </button>
                        </form>
                    </section>
                </div>
            </main>
            <footer className="h-12 w-full flex items-center justify-center bg-white">
                <div className="w-32 h-1 bg-surface-container-high rounded-full opacity-50" />
            </footer>
        </PageTransition>
    );
}
