import AdminIcon from '@/components/admin/AdminIcon';

export default function InstructorsPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '65vh', gap: 20, textAlign: 'center' }}>
      <div style={{ width: 96, height: 96, borderRadius: 24, background: 'var(--orange-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <AdminIcon name="monitor" size={44} />
      </div>
      <div>
        <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.5px', color: 'var(--text)' }}>
          En construcción
        </div>
        <div style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 8, fontWeight: 500, maxWidth: 340 }}>
          La gestión de profesoras estará disponible muy pronto. Aquí podrás agregar, editar y administrar el equipo de instructoras del estudio.
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', background: 'var(--orange-light)', borderRadius: 99, fontSize: 13, fontWeight: 700, color: 'var(--orange)' }}>
        <AdminIcon name="repeat" size={13} /> Próximamente
      </div>
    </div>
  );
}
