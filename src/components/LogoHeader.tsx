interface LogoHeaderProps {
    title?: string;
    subtitle?: string;
}

export default function LogoHeader({ title = "GlideForce", subtitle = "Eleva tu rendimiento" }: LogoHeaderProps) {
    return (
        <header className="bg-white pt-16 pb-12 flex flex-col items-center">
            <div className="mb-6 flex justify-center">
                <img 
                    alt="GlideForce Logo" 
                    className="h-20 w-auto object-contain" 
                    src="https://glideforcefitness.com/cdn/shop/files/LOGO_GLIDE_AND_LIFT.jpg?v=1763609873&width=120"
                />
            </div>
            <h1 className="text-3xl font-black tracking-tighter text-on-surface">{title}</h1>
            <p className="text-on-surface-variant mt-2 font-medium">{subtitle}</p>
        </header>
    );
}
