'use client';

import { useState } from 'react';
import Link from 'next/link';
import LogoHeader from '@/components/LogoHeader';
import PageTransition from '@/components/PageTransition';
import { signup } from '@/app/actions/auth';

type FormState = 'idle' | 'loading' | 'success' | 'error';

export default function RegisterPage() {
    const [state, setState] = useState<FormState>('idle');
    const [error, setError] = useState<string | null>(null);
    const [registeredEmail, setRegisteredEmail] = useState('');
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError(null);
        setState('loading');

        const form = e.currentTarget;
        const formData = new FormData(form);

        const password = formData.get('password') as string;
        const confirmPassword = formData.get('confirmPassword') as string;

        if (password !== confirmPassword) {
            setError('Las contraseñas no coinciden.');
            setState('error');
            return;
        }

        const email = formData.get('email') as string;
        setRegisteredEmail(email);

        const avatarFile = formData.get('avatar_file') as File | null;
        if (avatarFile && avatarFile.size > 5 * 1024 * 1024) {
            setError('La foto de perfil no debe superar los 5MB.');
            setState('error');
            return;
        }

        try {
            const res = await signup(formData);
            if (res?.error) {
                setError(res.error);
                setState('error');
            } else if (res?.success) {
                setState('success');
            }
        } catch (err: any) {
            if (err.message?.includes('Body exceeded 1 MB limit') || err.message?.includes('payload too large') || err.message?.includes('413')) {
                setError('La imagen es demasiado grande. Por favor elige una de menor tamaño (máximo 5MB).');
            } else {
                setError('Ocurrió un error inesperado al intentar crear tu cuenta.');
            }
            setState('error');
        }
    };

    // ── Email confirmation screen ──────────────────────────────────────────────
    if (state === 'success') {
        return (
            <PageTransition className="min-h-screen flex flex-col md:grid md:grid-cols-2 bg-white w-full max-w-md md:max-w-5xl lg:max-w-6xl mx-auto relative shadow-2xl overflow-hidden md:my-8 md:min-h-[80vh] md:rounded-3xl">
                {/* Desktop Left Column */}
                <div className="hidden md:flex flex-col items-center justify-center bg-primary-container p-12 text-white relative overflow-hidden">
                    <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-white via-transparent to-transparent"></div>
                    <h1 className="text-5xl font-black mb-6 tracking-tighter relative z-10">GlideForce</h1>
                    <p className="text-xl font-medium opacity-90 text-center max-w-sm relative z-10">
                        Únete a nuestra comunidad.
                    </p>
                </div>

                {/* Mobile Header & Main Area */}
                <div className="flex flex-col flex-grow bg-white">
                    <div className="md:hidden">
                        <LogoHeader subtitle="Verifica tu correo" />
                    </div>
                    <main className="flex-grow px-8 pb-12 flex flex-col justify-center">
                        <div className="hidden md:block text-center mb-8 mt-8">
                            <h2 className="text-3xl font-black text-on-surface">Verifica tu correo</h2>
                        </div>
                        <div className="w-full max-w-md mx-auto space-y-6 text-center">
                            <div className="bg-primary-container/10 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-8 animate-in zoom-in duration-500">
                                <span className="material-symbols-outlined text-primary-container text-5xl">mark_email_unread</span>
                            </div>
                            <h2 className="text-2xl font-black text-on-surface">Revisa tu bandeja</h2>
                            <p className="text-on-surface-variant font-medium leading-relaxed">
                                Hemos enviado un enlace de confirmación a <span className="font-bold text-on-surface">{registeredEmail}</span>. Por favor, haz clic en él para activar tu cuenta.
                            </p>
                            <div className="pt-8">
                                <Link
                                    href="/login"
                                    className="inline-flex items-center gap-2 text-primary-container font-bold text-sm hover:underline"
                                >
                                    <span className="material-symbols-outlined text-sm">arrow_back</span>
                                    Volver al inicio de sesión
                                </Link>
                            </div>
                        </div>
                    </main>
                    <footer className="md:hidden h-12 w-full flex items-center justify-center bg-white mt-auto shrink-0">
                        <div className="w-32 h-1 bg-surface-container-high rounded-full opacity-50" />
                    </footer>
                </div>
            </PageTransition>
        );
    }

    // ── Registration form ──────────────────────────────────────────────────────
    return (
        <PageTransition className="min-h-screen flex flex-col md:grid md:grid-cols-2 bg-white w-full max-w-md md:max-w-5xl lg:max-w-6xl mx-auto relative shadow-2xl overflow-hidden md:my-8 md:min-h-[80vh] md:rounded-3xl">
            {/* Desktop Left Column */}
            <div className="hidden md:flex flex-col items-center justify-center bg-primary-container p-12 text-white relative overflow-hidden">
                <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-white via-transparent to-transparent"></div>
                <h1 className="text-5xl font-black mb-6 tracking-tighter relative z-10">GlideForce</h1>
                <p className="text-xl font-medium opacity-90 text-center max-w-sm relative z-10">
                    Crea tu cuenta y comienza a reservar tus clases hoy mismo.
                </p>
            </div>

            {/* Mobile Header & Main Form Area */}
            <div className="flex flex-col flex-grow bg-white max-h-screen overflow-y-auto">
                <div className="md:hidden">
                    <LogoHeader subtitle="Crea tu cuenta" />
                </div>
                <main className="flex-grow px-8 pb-12 flex flex-col justify-center">
                    <div className="w-full max-w-md mx-auto space-y-8 mt-8 md:mt-0">
                        {/* Title for desktop only */}
                        <div className="hidden md:block text-center mb-8">
                            <h2 className="text-3xl font-black text-on-surface">Registrarse</h2>
                            <p className="text-on-surface-variant font-medium mt-2">Crea tu cuenta en GlideForce</p>
                        </div>

                        <section className="bg-white p-8 rounded-2xl ios-shadow space-y-5 border border-surface-container">

                        {/* Error banner */}
                        {error && (
                            <div className="flex items-start gap-3 bg-red-50 text-red-600 text-sm p-4 rounded-xl border border-red-200 animate-in fade-in">
                                <span className="material-symbols-outlined text-red-500 text-xl leading-none mt-0.5">error</span>
                                <p>{error}</p>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-5">
                            {/* Profile Picture (Optional) */}
                            <div className="flex flex-col items-center space-y-3 pb-2 pt-2">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                                    Foto de Perfil (Opcional)
                                </label>
                                <label className="relative flex items-center justify-center w-24 h-24 rounded-full bg-surface-container border-2 border-dashed border-primary-container/50 cursor-pointer overflow-hidden group hover:border-primary-container transition-colors">
                                    {avatarPreview ? (
                                        <img src={avatarPreview} alt="Preview" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="flex flex-col items-center text-primary-container/60 group-hover:text-primary-container transition-colors">
                                            <span className="material-symbols-outlined text-3xl">add_a_photo</span>
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <span className="material-symbols-outlined text-white">edit</span>
                                    </div>
                                    <input
                                        type="file"
                                        name="avatar_file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                if (file.size > 5 * 1024 * 1024) {
                                                    setError('La foto de perfil no debe superar los 5MB.');
                                                } else {
                                                    setError(null);
                                                    setAvatarPreview(URL.createObjectURL(file));
                                                }
                                            } else {
                                                setAvatarPreview(null);
                                            }
                                        }}
                                    />
                                </label>
                            </div>

                            {/* Full name */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant ml-4">
                                    Nombre Completo
                                </label>
                                <input
                                    name="full_name"
                                    required
                                    minLength={2}
                                    autoComplete="name"
                                    className="w-full bg-surface-container-low border border-surface-container-high rounded-full px-6 py-4 text-on-surface outline-none focus:ring-2 focus:ring-primary-container transition"
                                    placeholder="Tu nombre"
                                    type="text"
                                />
                            </div>

                            {/* Phone */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant ml-4">
                                    Teléfono
                                </label>
                                <input
                                    name="phone"
                                    required
                                    autoComplete="tel"
                                    className="w-full bg-surface-container-low border border-surface-container-high rounded-full px-6 py-4 text-on-surface outline-none focus:ring-2 focus:ring-primary-container transition"
                                    placeholder="Tu número de celular"
                                    type="tel"
                                />
                            </div>

                            {/* Email */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant ml-4">
                                    Correo electrónico
                                </label>
                                <input
                                    name="email"
                                    required
                                    autoComplete="email"
                                    className="w-full bg-surface-container-low border border-surface-container-high rounded-full px-6 py-4 text-on-surface outline-none focus:ring-2 focus:ring-primary-container transition"
                                    placeholder="nombre@ejemplo.com"
                                    type="email"
                                />
                            </div>

                            {/* Password */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant ml-4">
                                    Contraseña
                                </label>
                                <input
                                    name="password"
                                    required
                                    minLength={6}
                                    autoComplete="new-password"
                                    className="w-full bg-surface-container-low border border-surface-container-high rounded-full px-6 py-4 text-on-surface outline-none focus:ring-2 focus:ring-primary-container transition"
                                    placeholder="Mínimo 6 caracteres"
                                    type="password"
                                />
                            </div>

                            {/* Confirm password */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant ml-4">
                                    Confirmar Contraseña
                                </label>
                                <input
                                    name="confirmPassword"
                                    required
                                    minLength={6}
                                    autoComplete="new-password"
                                    className="w-full bg-surface-container-low border border-surface-container-high rounded-full px-6 py-4 text-on-surface outline-none focus:ring-2 focus:ring-primary-container transition"
                                    placeholder="Repite tu contraseña"
                                    type="password"
                                />
                            </div>

                            <button
                                disabled={state === 'loading'}
                                type="submit"
                                className="w-full bg-primary-container text-white py-5 rounded-full font-bold text-lg shadow-[0_8px_16px_rgba(234,112,52,0.2)] active:scale-[0.98] mt-2 disabled:opacity-60 flex items-center justify-center gap-2 transition-all"
                            >
                                {state === 'loading' ? (
                                    <>
                                        <span className="inline-block w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Creando cuenta...
                                    </>
                                ) : 'Crear Cuenta'}
                            </button>
                        </form>
                    </section>

                        <div className="text-center">
                            <p className="text-on-surface-variant font-medium text-sm">
                                ¿Ya tienes cuenta?{' '}
                                <Link className="text-primary-container font-bold hover:underline ml-1" href="/login">
                                    Inicia Sesión
                                </Link>
                            </p>
                        </div>
                    </div>
                </main>
                <footer className="md:hidden h-12 w-full flex items-center justify-center bg-white mt-auto shrink-0">
                    <div className="w-32 h-1 bg-surface-container-high rounded-full opacity-50" />
                </footer>
            </div>
        </PageTransition>
    );
}
