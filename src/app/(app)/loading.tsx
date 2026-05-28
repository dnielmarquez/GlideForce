export default function AppLoading() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-3 text-on-surface-variant bg-surface-container-low">
            <span className="material-symbols-outlined text-4xl animate-spin text-primary-container">progress_activity</span>
            <p className="text-sm font-semibold tracking-widest uppercase">Cargando...</p>
        </div>
    );
}
