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
        <PageTransition className="bg-[#fcf9f8] min-h-screen pb-24 text-[#1c1b1b] w-full max-w-md md:max-w-5xl lg:max-w-6xl mx-auto relative overflow-hidden">
            <main className="pt-16 pb-32 px-6 md:px-12 w-full max-w-md md:max-w-2xl mx-auto">
                <ProfileForm profile={profile} />
            </main>
        </PageTransition>
    );
}
