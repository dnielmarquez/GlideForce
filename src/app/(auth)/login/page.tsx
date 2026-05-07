'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import LogoHeader from '@/components/LogoHeader';
import PageTransition from '@/components/PageTransition';
import { login } from '@/app/actions/auth';

export default function LoginPage() {
    const [error, setError] = useState<string | null>(null);
    const [info, setInfo] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const searchParams = useSearchParams();

    useEffect(() => {
        // Show messages passed via query params (e.g., after password reset or callback error)
        const errorParam = searchParams.get('error');
        const messageParam = searchParams.get('message');
        if (errorParam === 'auth_callback_failed') {
            setError('El enlace de verificación expiró o no es válido. Por favor intenta de nuevo.');
        }
        if (messageParam === 'password_reset_success') {
            setInfo('Tu contraseña fue actualizada. Ahora puedes iniciar sesión.');
        }
        if (messageParam === 'email_confirmed') {
            setInfo('¡Correo verificado! Ya puedes iniciar sesión.');
        }
    }, [searchParams]);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError(null);
        setInfo(null);
        setIsLoading(true);
        const formData = new FormData(e.currentTarget);
        const res = await login(formData);
        if (res?.error) {
            setError(res.error);
            setIsLoading(false);
        }
    };

    return (
        <PageTransition className="min-h-screen flex flex-col bg-white max-w-md mx-auto relative shadow-2xl overflow-hidden">
            <LogoHeader subtitle="Bienvenido de vuelta" />
            <main className="flex-grow px-8 pb-12">
                <div className="max-w-md mx-auto space-y-8">
                    <section className="bg-white p-8 rounded-2xl ios-shadow space-y-6 border border-surface-container">

                        {/* Info banner */}
                        {info && (
                            <div className="flex items-start gap-3 bg-green-50 text-green-700 text-sm p-4 rounded-xl border border-green-200 animate-in fade-in">
                                <span className="material-symbols-outlined text-green-500 text-xl leading-none mt-0.5">check_circle</span>
                                <p>{info}</p>
                            </div>
                        )}

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

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant ml-4">
                                    Contraseña
                                </label>
                                <input
                                    name="password"
                                    required
                                    autoComplete="current-password"
                                    className="w-full bg-surface-container-low border border-surface-container-high rounded-full px-6 py-4 text-on-surface placeholder:text-outline focus:ring-2 focus:ring-primary-container outline-none transition"
                                    placeholder="••••••••"
                                    type="password"
                                />
                            </div>

                            {/* Forgot password link */}
                            <div className="flex justify-end -mt-1">
                                <Link
                                    href="/forgot-password"
                                    className="text-xs font-semibold text-primary-container hover:underline"
                                >
                                    ¿Olvidaste tu contraseña?
                                </Link>
                            </div>

                            <button
                                disabled={isLoading}
                                type="submit"
                                className="w-full bg-primary-container text-white py-5 rounded-full font-bold text-lg shadow-[0_8px_16px_rgba(234,112,52,0.2)] active:scale-[0.98] transition-all disabled:opacity-60 mt-2 flex items-center justify-center gap-2"
                            >
                                {isLoading ? (
                                    <>
                                        <span className="inline-block w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Iniciando sesión...
                                    </>
                                ) : 'Iniciar Sesión'}
                            </button>
                        </form>
                    </section>

                    <div className="text-center">
                        <p className="text-on-surface-variant font-medium text-sm">
                            ¿No tienes cuenta?{' '}
                            <Link className="text-primary-container font-bold hover:underline ml-1" href="/register">
                                Regístrate
                            </Link>
                        </p>
                    </div>
                </div>
            </main>
            <footer className="h-12 w-full flex items-center justify-center bg-white">
                <div className="w-32 h-1 bg-surface-container-high rounded-full opacity-50" />
            </footer>
        </PageTransition>
    );
}
