import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import PageTransition from '../components/PageTransition';

export default function BookingScreen() {
    const navigate = useNavigate();
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [showDisclaimerModal, setShowDisclaimerModal] = useState(false);
    const [showPolicyModal, setShowPolicyModal] = useState(false);
    const [selected, setSelected] = useState(1);

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    return (
        <PageTransition className="bg-surface-container-low text-on-surface min-h-screen pb-32 max-w-md mx-auto relative shadow-2xl overflow-hidden">
            <AnimatePresence>
                {showPolicyModal && (
                    <motion.div 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-y-0 w-full z-[120] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm max-w-md mx-auto left-1/2 -translate-x-1/2"
                    >
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            transition={{ type: "spring", duration: 0.5, bounce: 0.4 }}
                            className="bg-white w-full rounded-[2.5rem] p-8 flex flex-col items-center text-center shadow-2xl"
                        >
                        <h2 className="text-2xl font-black text-on-surface mb-4 tracking-tight">Políticas de Cancelación</h2>
                        <p className="text-on-surface-variant text-sm leading-relaxed mb-8 text-left">
                            Puedes cancelar tu lugar de forma gratuita hasta <strong className="text-on-surface">12 horas antes</strong> del inicio de la clase.<br/><br/>
                            Si cancelas después de este plazo o no te presentas, <strong className="text-on-surface">no habrá reembolsos ni devoluciones de estrellitas</strong>.
                        </p>
                        <button className="w-full py-4 bg-surface-container-high hover:bg-surface-container-highest text-on-surface rounded-2xl font-bold tracking-wide transition-colors" onClick={() => setShowPolicyModal(false)}>
                            Entendido
                        </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showDisclaimerModal && (
                    <motion.div 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-y-0 w-full z-[110] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm max-w-md mx-auto left-1/2 -translate-x-1/2"
                    >
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            transition={{ type: "spring", duration: 0.5, bounce: 0.4 }}
                            className="bg-white w-full rounded-[2.5rem] p-8 flex flex-col items-center text-center shadow-2xl"
                        >
                        <div className="w-20 h-20 bg-surface-container-high rounded-full flex items-center justify-center mb-6">
                            <span className="material-symbols-outlined text-4xl text-on-surface-variant">info</span>
                        </div>
                        <h2 className="text-2xl font-black text-on-surface mb-3 tracking-tight">Casi listo</h2>
                        <p className="text-on-surface-variant text-sm leading-relaxed mb-8">
                            Al continuar, aceptas las <br/>
                            <button onClick={() => setShowPolicyModal(true)} className="text-primary-container font-black underline decoration-primary-container/30 hover:decoration-primary-container underline-offset-4 mt-1 transition-all">políticas de cancelación</button>
                        </p>
                        <div className="w-full space-y-3">
                            <button className="w-full py-4 bg-primary-container text-white rounded-2xl font-bold text-lg shadow-lg shadow-primary-container/20 active:scale-95 transition-transform" onClick={() => {
                                setShowDisclaimerModal(false);
                                setShowSuccessModal(true);
                            }}>
                                Confirmar y Pagar
                            </button>
                            <button className="w-full py-4 bg-transparent text-on-surface-variant font-bold transition-colors" onClick={() => setShowDisclaimerModal(false)}>
                                Cancelar
                            </button>
                        </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showSuccessModal && (
                    <motion.div 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-y-0 w-full z-[100] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm max-w-md mx-auto left-1/2 -translate-x-1/2"
                    >
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            transition={{ type: "spring", duration: 0.5, bounce: 0.4 }}
                            className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 flex flex-col items-center text-center shadow-2xl"
                        >
                        <div className="w-20 h-20 bg-primary-container/10 rounded-full flex items-center justify-center mb-6">
                            <span className="material-symbols-outlined text-primary-container text-5xl" style={{fontVariationSettings: "'FILL' 1, 'wght' 700"}}>check_circle</span>
                        </div>
                        <h2 className="text-2xl font-black text-on-surface mb-3 tracking-tight">¡Reserva Confirmada!</h2>
                        <p className="text-on-surface-variant text-base leading-relaxed mb-8">Tu clase ha sido reservada correctamente.<br/>¡Te esperamos!</p>
                        <button className="w-full py-4 bg-primary-container text-white rounded-2xl font-bold text-lg shadow-lg active:scale-95 transition-transform" onClick={() => navigate('/classes')}>
                            Volver al Inicio
                        </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <main className="pt-20 pb-28 px-6 space-y-8 max-w-md mx-auto">
                <section className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-3xl font-extrabold tracking-tight">Yoga Flow</h2>
                            <p className="text-primary font-semibold text-lg">Tania Janek</p>
                        </div>
                        <div className="bg-primary-container/10 px-4 py-2 rounded-full">
                            <span className="text-primary font-bold text-sm">En Vivo</span>
                        </div>
                    </div>
                    <div className="relative w-full h-48 rounded-lg overflow-hidden shadow-sm">
                        <img className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBR3C6tI9SIy4U9LyiTlSRMpAvpuHF8aifvNgLZuFVf0Mc9xAA9cOBQFl-CwhrLs77J8bbLsFB8Le6QExFsg-BPTnUNHjB18yxLGhPS1BXAkTGujY6alT8g94SlQozuDXb2eKR8XPqSZAnksyR0_6QDHAKDPbJyExHf_m9ZQFhuOPr5jUMsxiwzXcuGPEIvlww1I77uVLtEoseDYwy9aUbdKojsmTFBGAfldPHd2q2oMw9iUQtw70-qeVQfQlWxlxhxu3_X_4LKTuI" alt="Class preview" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
                    </div>
                </section>

                <section className="space-y-4">
                    <div className="flex justify-between items-end">
                        <h3 className="text-xl font-bold tracking-tight">Selecciona tu Máquina</h3>
                        <span className="text-xs text-on-surface-variant font-medium">5 disponibles hoy</span>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        {[1, 2, 3, 4, 5].map(m => (
                            <button 
                                key={m}
                                onClick={() => setSelected(m)}
                                className={`flex flex-col items-center justify-center p-6 rounded-lg shadow-sm transition-all ${selected === m ? 'border-2 border-primary-container bg-white' : 'border-2 border-transparent bg-surface-container-lowest'}`}
                            >
                                <span className="material-symbols-outlined text-3xl mb-2" style={{fontVariationSettings: selected === m ? "'FILL' 1" : "'FILL' 0"}}>fitness_center</span>
                                <span className="text-[11px] font-bold">M-0{m}</span>
                                <span className="text-[9px] uppercase tracking-wider text-primary font-black mt-1">Disponible</span>
                            </button>
                        ))}
                    </div>
                </section>

                <section className="bg-surface-container-high/50 p-6 rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="bg-primary-container text-white p-2 rounded-full"><span className="material-symbols-outlined text-xl" style={{fontVariationSettings: "'FILL' 1"}}>star</span></div>
                        <div><p className="font-bold text-lg leading-tight">Tienes 15 Estrellitas</p></div>
                    </div>
                </section>

                <section className="space-y-4 pb-12">
                    <button onClick={() => setShowDisclaimerModal(true)} className="w-full h-16 bg-primary-container text-white rounded-xl font-bold text-lg shadow-lg flex items-center justify-center gap-2">
                        <span className="material-symbols-outlined">payments</span> Pagar en Línea
                    </button>
                    <button onClick={() => setShowDisclaimerModal(true)} className="w-full h-16 bg-primary-container/15 text-on-primary-container rounded-xl font-bold text-lg flex items-center justify-center gap-2">
                        <span className="material-symbols-outlined" style={{fontVariationSettings: "'FILL' 1"}}>stars</span> Usar Estrellitas
                    </button>
                </section>
            </main>
        </PageTransition>
    );
}
