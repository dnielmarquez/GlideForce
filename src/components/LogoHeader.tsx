interface LogoHeaderProps {
    title?: string;
    subtitle?: string;
    className?: string;
}

export default function LogoHeader({ title = "Glideforce", subtitle = "Eleva tu rendimiento", className }: LogoHeaderProps) {
    return (
        <header className={`bg-white pt-8 md:pt-16 ${className ? className : 'pb-8 md:pb-12'} flex flex-col items-center`}>
            <div className="mb-4 md:mb-6 flex justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    alt="Glideforce Logo"
                    className="h-16 md:h-20 w-auto object-contain"
                    src="/logoFixed.jpeg"
                />
            </div>
            <h1 className="text-3xl font-black tracking-tighter text-on-surface">{title}</h1>
            <p className="text-on-surface-variant mt-2 font-medium">{subtitle}</p>
        </header>
    );
}

