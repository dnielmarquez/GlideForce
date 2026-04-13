import { useNavigate } from 'react-router-dom';
import PageTransition from '../components/PageTransition';

export default function ProfileScreen() {
    const navigate = useNavigate();
    return (
        <PageTransition className="bg-[#fcf9f8] min-h-screen pb-24 font-body text-[#1c1b1b] max-w-md mx-auto relative shadow-2xl overflow-hidden">
            <main className="pt-24 pb-32 px-6 max-w-md mx-auto">
                <div className="flex flex-col items-center mb-10">
                    <div className="relative group">
                        <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-surface-container shadow-lg">
                            <img alt="Profile" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuC_A049m-ggHX1Vt2CDPoeJbb81T8p-I094qTMn20Tot8x8yo2DpqY5Vfi-NLiTcdPq_m5_qWsyC3Cx2Pum-5fJ2iGAwEIamcq3NDp8DifLdFL_N9jweDYZB86Nhng7pf92zQA0-wqse6iIauU6Fq1jzPjaAfWzKfZUP8b6qn2YE0Z_S5ni5RfzNFTkZraN0iFMtgkmNSFfLLRFqw5PLrOjR4TlPDis9eefdQIUGSEHF89ZA-ZGvnIA0MWIKh6NSVQmgPqBSZHc6tQ"/>
                        </div>
                        <button className="absolute bottom-0 right-0 bg-primary-container text-white p-2.5 rounded-full shadow-lg"><span className="material-symbols-outlined text-[20px]">edit</span></button>
                    </div>
                    <p className="mt-4 text-on-surface-variant font-medium opacity-70">Socio #GF-9920</p>
                </div>
                <div className="space-y-6">
                    {[
                        { label: "Nombre Completo", value: "Carolina Herrera Martínez", icon: "chevron_right" },
                        { label: "Correo Electrónico", value: "c.herrera@glideforce.com", icon: "lock" },
                        { label: "Celular", value: "+52 55 1234 5678", icon: "edit" },
                        { label: "Fecha de Nacimiento", value: "14 de Agosto, 1994", icon: "calendar_today" }
                    ].map((field, i) => (
                        <div key={i} className="group">
                            <label className="block text-[0.6875rem] font-semibold text-on-surface-variant uppercase tracking-wider mb-2 ml-4">{field.label}</label>
                            <div className="bg-white p-5 rounded-lg flex justify-between items-center shadow-sm border border-transparent">
                                <span className="font-medium text-on-surface">{field.value}</span>
                                <span className="material-symbols-outlined text-primary-container opacity-40">{field.icon}</span>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="mt-12 px-2">
                    <button className="w-full py-4 bg-primary-container text-white rounded-xl font-semibold shadow-lg">Guardar Cambios</button>
                    <button onClick={() => navigate('/')} className="w-full mt-4 py-4 text-error font-medium">Cerrar Sesión</button>
                </div>
            </main>
        </PageTransition>
    );
}
