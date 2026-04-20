'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import LogoHeader from '@/components/LogoHeader';
import PageTransition from '@/components/PageTransition';

export default function LoginPage() {
    const router = useRouter();
    return (
        <PageTransition className="min-h-screen flex flex-col bg-white max-w-md mx-auto relative shadow-2xl overflow-hidden">
            <LogoHeader />
            <main className="flex-grow px-8 pb-12">
                <div className="max-w-md mx-auto space-y-8">
                    <section className="bg-white p-8 rounded-lg ios-shadow space-y-6 border border-surface-container">
                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant ml-4">Correo electrónico</label>
                                <input className="w-full bg-surface-container-low border border-surface-container-high rounded-full px-6 py-4 text-on-surface placeholder:text-outline focus:ring-2 focus:ring-primary-container outline-none" placeholder="nombre@ejemplo.com" type="email" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant ml-4">Contraseña</label>
                                <div className="relative">
                                    <input className="w-full bg-surface-container-low border border-surface-container-high rounded-full px-6 py-4 text-on-surface placeholder:text-outline focus:ring-2 focus:ring-primary-container outline-none" placeholder="••••••••" type="password" />
                                    <button className="absolute right-6 top-1/2 -translate-y-1/2 text-on-surface-variant">
                                        <span className="material-symbols-outlined text-xl">visibility</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                        <button onClick={() => router.push('/classes')} className="w-full bg-primary-container text-white py-5 rounded-full font-bold text-lg shadow-[0_8px_16px_rgba(234,112,52,0.2)] active:scale-[0.98] transition-transform">
                            Iniciar Sesión
                        </button>
                        <div className="flex items-center gap-4 py-2">
                            <div className="h-[1px] flex-grow bg-surface-container-high"></div>
                            <span className="text-xs font-bold text-outline uppercase tracking-wider">o</span>
                            <div className="h-[1px] flex-grow bg-surface-container-high"></div>
                        </div>
                        <button className="w-full bg-white border border-surface-container-high hover:bg-surface-container-low flex items-center justify-center gap-3 py-4 rounded-full transition-colors active:scale-[0.98]">
                            <svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"></path><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"></path><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"></path><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 12-4.53z" fill="#EA4335"></path></svg>
                            <span className="text-on-surface font-semibold">Continuar con Google</span>
                        </button>
                    </section>
                    <div className="text-center">
                        <p className="text-on-surface-variant font-medium text-sm">
                            ¿No tienes cuenta? 
                            <Link className="text-primary-container font-bold hover:underline ml-1" href="/register">Regístrate</Link>
                        </p>
                    </div>
                </div>
            </main>
            <footer className="h-12 w-full flex items-center justify-center bg-white">
                <div className="w-32 h-1 bg-surface-container-high rounded-full opacity-50"></div>
            </footer>
        </PageTransition>
    );
}
