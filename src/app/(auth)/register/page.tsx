'use client';

import { useState } from 'react';
import Link from 'next/link';
import LogoHeader from '@/components/LogoHeader';
import PageTransition from '@/components/PageTransition';
import { signup } from '@/app/actions/auth';

export default function RegisterPage() {
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);
        const formData = new FormData(e.currentTarget);
        const res = await signup(formData);
        if (res?.error) {
            setError(res.error);
            setIsLoading(false);
        }
    };

    return (
        <PageTransition className="min-h-screen flex flex-col bg-white max-w-md mx-auto relative shadow-2xl overflow-hidden">
            <LogoHeader />
            <main className="flex-grow px-8 pb-12">
                <div className="max-w-md mx-auto space-y-8">
                    <section className="bg-white p-8 rounded-lg ios-shadow space-y-5 border border-surface-container">
                        {error && (
                            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-200">
                                {error}
                            </div>
                        )}
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant ml-4">Nombre Completo</label>
                                <input name="full_name" required className="w-full bg-surface-container-low border border-surface-container-high rounded-full px-6 py-4 text-on-surface outline-none focus:ring-2 focus:ring-primary-container" placeholder="Tu nombre" type="text" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant ml-4">Correo electrónico</label>
                                <input name="email" required className="w-full bg-surface-container-low border border-surface-container-high rounded-full px-6 py-4 text-on-surface outline-none focus:ring-2 focus:ring-primary-container" placeholder="nombre@ejemplo.com" type="email" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant ml-4">Contraseña</label>
                                <input name="password" required className="w-full bg-surface-container-low border border-surface-container-high rounded-full px-6 py-4 text-on-surface outline-none focus:ring-2 focus:ring-primary-container" placeholder="••••••••" type="password" />
                            </div>
                            <button disabled={isLoading} type="submit" className="w-full bg-primary-container text-white py-5 rounded-full font-bold text-lg shadow-[0_8px_16px_rgba(234,112,52,0.2)] active:scale-[0.98] mt-4 disabled:opacity-50">
                                {isLoading ? 'Creando cuenta...' : 'Crear Cuenta'}
                            </button>
                        </form>
                    </section>
                    <div className="text-center">
                        <p className="text-on-surface-variant font-medium text-sm">¿Ya tienes cuenta? <Link className="text-primary-container font-bold hover:underline ml-1" href="/login">Inicia Sesión</Link></p>
                    </div>
                </div>
            </main>
        </PageTransition>
    );
}
