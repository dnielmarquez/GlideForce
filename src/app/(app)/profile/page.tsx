import { redirect } from 'next/navigation';
import PageTransition from '@/components/PageTransition';
import { getProfile } from '@/app/actions/profile';
import ProfileForm from './ProfileForm';

export default async function ProfilePage() {
    const profile = await getProfile();

    if (!profile) {
        redirect('/login');
    }

    return (
        <PageTransition className="bg-[#fcf9f8] min-h-screen pb-24 text-[#1c1b1b] max-w-md mx-auto relative shadow-2xl overflow-hidden">
            <main className="pt-16 pb-32 px-6 max-w-md mx-auto">
                <ProfileForm profile={profile} />
            </main>
        </PageTransition>
    );
}
