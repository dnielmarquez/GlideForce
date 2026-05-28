'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import LogoHeader from '@/components/LogoHeader';
import PageTransition from '@/components/PageTransition';
import { login } from '@/app/actions/auth';
import { Suspense } from 'react';

function LoginParamsHandler({
    setError,
    setInfo
}: {
    setError: (v: string | null) => void;
    setInfo: (v: string | null) => void;
}) {
    const searchParams = useSearchParams();

    useEffect(() => {
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
    }, [searchParams, setError, setInfo]);

    return null;
}

export default function LoginPage() {
    const [error, setError] = useState<string | null>(null);
    const [info, setInfo] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [resentEmail, setResentEmail] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError(null);
        setInfo(null);
        setIsLoading(true);
        const formData = new FormData(e.currentTarget);
        const res = await login(formData);
        if (res?.emailNotConfirmed) {
            setResentEmail(res.email);
            setIsLoading(false);
        } else if (res?.error) {
            setError(res.error);
            setIsLoading(false);
        }
    };

    return (
        <PageTransition className="min-h-screen flex flex-col md:grid md:grid-cols-2 bg-white w-full max-w-md md:max-w-5xl lg:max-w-6xl mx-auto relative shadow-2xl overflow-hidden md:my-8 md:min-h-[80vh] md:rounded-3xl">
            <Suspense fallback={null}>
                <LoginParamsHandler setError={setError} setInfo={setInfo} />
            </Suspense>
            {/* Desktop Left Column */}
            <div className="hidden md:flex flex-col items-center justify-center bg-primary-container p-12 text-white relative overflow-hidden">
                <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-white via-transparent to-transparent"></div>
                <h1 className="text-5xl font-black mb-6 tracking-tighter relative z-10">GlideForce</h1>
                <p className="text-xl font-medium opacity-90 text-center max-w-sm relative z-10">
                    Bienvenido de vuelta. Reserva tus clases y gestiona tu membresía en un solo lugar.
                </p>
            </div>

            {/* Mobile Header & Main Form Area */}
            <div className="flex flex-col flex-grow bg-white">
                <div className="md:hidden">
                    <LogoHeader subtitle={resentEmail ? "Verifica tu correo" : "Bienvenido de vuelta"} />
                </div>
                <main className="flex-grow px-8 pb-12 flex flex-col justify-center">
                    <div className="w-full max-w-md mx-auto space-y-8 mt-8 md:mt-0">
                        {/* Title for desktop only since LogoHeader is hidden */}
                        <div className="hidden md:block text-center mb-8">
                            <h2 className="text-3xl font-black text-on-surface">
                                {resentEmail ? 'Verifica tu Cuenta' : 'Iniciar Sesión'}
                            </h2>
                            <p className="text-on-surface-variant font-medium mt-2">
                                {resentEmail ? 'Confirma tu dirección de correo' : 'Bienvenido de vuelta a GlideForce'}
                            </p>
                        </div>

                        {resentEmail ? (
                            <section className="bg-white p-8 rounded-2xl ios-shadow space-y-6 border border-surface-container text-center">
                                <div className="w-16 h-16 bg-primary-container/10 rounded-full flex items-center justify-center mx-auto">
                                    <span className="material-symbols-outlined text-primary-container text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                                        mark_email_unread
                                    </span>
                                </div>
                                <h3 className="text-xl font-extrabold text-on-surface">Activa tu cuenta</h3>
                                <p className="text-on-surface-variant text-sm leading-relaxed font-medium">
                                    Hemos detectado que tu correo aún no ha sido verificado. Enviamos un nuevo enlace a:<br />
                                    <strong className="text-on-surface text-base">{resentEmail}</strong>
                                </p>
                                <p className="text-on-surface-variant/80 text-xs leading-relaxed">
                                    Por favor revisa tu bandeja de entrada (y la carpeta de spam o correo no deseado) y haz clic en el enlace para activar tu cuenta antes de iniciar sesión.
                                </p>
                                <button
                                    onClick={() => setResentEmail(null)}
                                    className="w-full bg-primary-container text-white py-4 rounded-full font-bold text-base active:scale-[0.98] transition-all mt-2 shadow-[0_8px_16px_rgba(234,112,52,0.15)]"
                                >
                                    Volver al Inicio de Sesión
                                </button>
                            </section>
                        ) : (
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
                                        <div className="relative">
                                            <input
                                                name="password"
                                                required
                                                autoComplete="current-password"
                                                className="w-full bg-surface-container-low border border-surface-container-high rounded-full pl-6 pr-14 py-4 text-on-surface placeholder:text-outline focus:ring-2 focus:ring-primary-container outline-none transition"
                                                placeholder="••••••••"
                                                type={showPassword ? 'text' : 'password'}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-5 top-1/2 -translate-y-1/2 flex items-center justify-center text-on-surface-variant hover:text-on-surface focus:outline-none select-none transition-colors"
                                                tabIndex={-1}
                                            >
                                                <span className="material-symbols-outlined select-none text-xl">
                                                    {showPassword ? 'visibility_off' : 'visibility'}
                                                </span>
                                            </button>
                                        </div>
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
                        )}

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
                <footer className="md:hidden h-12 w-full flex items-center justify-center bg-white">
                    <div className="w-32 h-1 bg-surface-container-high rounded-full opacity-50" />
                </footer>
            </div>
        </PageTransition>
    );
}
