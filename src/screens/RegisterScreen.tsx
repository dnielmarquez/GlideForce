import { Link, useNavigate } from 'react-router-dom';
import LogoHeader from '../components/LogoHeader';
import PageTransition from '../components/PageTransition';

export default function RegisterScreen() {
    const navigate = useNavigate();
    return (
        <PageTransition className="min-h-screen flex flex-col bg-white max-w-md mx-auto relative shadow-2xl overflow-hidden">
            <LogoHeader />
            <main className="flex-grow px-8 pb-12">
                <div className="max-w-md mx-auto space-y-8">
                    <section className="bg-white p-8 rounded-lg ios-shadow space-y-5 border border-surface-container">
                        <form className="space-y-4" onSubmit={(e) => {e.preventDefault(); navigate('/classes')}}>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant ml-4">Nombre Completo</label>
                                <input className="w-full bg-surface-container-low border border-surface-container-high rounded-full px-6 py-4 text-on-surface outline-none" placeholder="Tu nombre" type="text" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant ml-4">Correo electrónico</label>
                                <input className="w-full bg-surface-container-low border border-surface-container-high rounded-full px-6 py-4 text-on-surface outline-none" placeholder="nombre@ejemplo.com" type="email" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant ml-4">Contraseña</label>
                                <input className="w-full bg-surface-container-low border border-surface-container-high rounded-full px-6 py-4 text-on-surface outline-none" placeholder="••••••••" type="password" />
                            </div>
                            <button type="submit" className="w-full bg-primary-container text-white py-5 rounded-full font-bold text-lg shadow-[0_8px_16px_rgba(234,112,52,0.2)] active:scale-[0.98] mt-2">
                                Crear Cuenta
                            </button>
                        </form>
                    </section>
                    <div className="text-center">
                        <p className="text-on-surface-variant font-medium text-sm">¿Ya tienes cuenta? <Link className="text-primary-container font-bold hover:underline ml-1" to="/">Inicia Sesión</Link></p>
                    </div>
                </div>
            </main>
        </PageTransition>
    );
}
