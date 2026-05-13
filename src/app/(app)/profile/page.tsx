import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import PageTransition from '@/components/PageTransition';
import { getProfile } from '@/app/actions/profile';
import ProfileForm from './ProfileForm';

// ── Skeleton shown instantly while server fetches the profile ──────────────
function ProfileSkeleton() {
    return (
        <div className="animate-pulse space-y-6 pt-16 pb-32 px-6 max-w-md mx-auto">
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
                <div className="w-16 h-16 rounded-full bg-surface-container-high" />
                <div className="space-y-2">
                    <div className="h-5 w-36 bg-surface-container-high rounded-full" />
                    <div className="h-3 w-24 bg-surface-container-high rounded-full" />
                </div>
            </div>
            {/* Fields */}
            {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-2">
                    <div className="h-3 w-20 bg-surface-container-high rounded-full" />
                    <div className="h-12 w-full bg-surface-container-high rounded-xl" />
                </div>
            ))}
            <div className="h-14 w-full bg-surface-container-high rounded-full mt-4" />
        </div>
    );
}

// ── Async inner component — fetches data, renders form ─────────────────────
async function ProfileContent() {
    const profile = await getProfile();
    if (!profile) redirect('/login');
    return <ProfileForm profile={profile} />;
}

// ── Page — shell renders immediately, content streams in ───────────────────
export default function ProfilePage() {
    return (
        <PageTransition className="bg-[#fcf9f8] min-h-screen pb-24 text-[#1c1b1b] w-full max-w-md md:max-w-5xl lg:max-w-6xl mx-auto relative overflow-hidden">
            <main className="pt-16 pb-32 px-6 md:px-12 w-full max-w-md md:max-w-2xl mx-auto">
                <Suspense fallback={<ProfileSkeleton />}>
                    <ProfileContent />
                </Suspense>
            </main>
        </PageTransition>
    );
}
