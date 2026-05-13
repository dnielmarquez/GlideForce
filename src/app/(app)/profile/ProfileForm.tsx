'use client';

import { useState } from 'react';
import { logout } from '@/app/actions/auth';
import { updateProfile, uploadProfileAvatar } from '@/app/actions/profile';
import type { Database } from '@/types/database.types';
import { createClient } from '@/utils/supabase/client';

type Profile = Database['public']['Tables']['profiles']['Row'];

interface ProfileFormProps {
    profile: Profile;
}

const ROLE_LABELS: Record<string, string> = {
    admin: 'Administrador',
    instructor: 'Instructor',
    member: 'Socio',
};

function getInitials(name: string) {
    return name
        .split(' ')
        .slice(0, 2)
        .map((n) => n[0])
        .join('')
        .toUpperCase();
}

function formatDate(isoString: string) {
    return new Date(isoString).toLocaleDateString('es-MX', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });
}

export default function ProfileForm({ profile }: ProfileFormProps) {
    const [fullName, setFullName] = useState(profile.full_name);
    const [phone, setPhone] = useState(profile.phone ?? '');
    const [isSaving, setIsSaving] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    const supabase = createClient();

    const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setFeedback(null);
        setIsSaving(true);

        const formData = new FormData(e.currentTarget);
        const res = await updateProfile(formData);

        if (res?.error) {
            setFeedback({ type: 'error', message: res.error });
        } else {
            setFeedback({ type: 'success', message: 'Perfil actualizado correctamente.' });
        }
        setIsSaving(false);
    };

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setFeedback(null);
        setIsUploadingAvatar(true);

        try {
            const formData = new FormData();
            formData.append('avatar_file', file);
            
            const res = await uploadProfileAvatar(formData);
            
            if (res?.error) {
                setFeedback({ type: 'error', message: res.error });
            } else {
                setFeedback({ type: 'success', message: 'Foto actualizada.' });
            }
        } catch (error: any) {
            setFeedback({ type: 'error', message: 'Error al subir la imagen.' });
            console.error('Upload error:', error);
        } finally {
            setIsUploadingAvatar(false);
        }
    };

    const handleLogout = async () => {
        setIsLoggingOut(true);
        await logout();
    };

    const initials = getInitials(profile.full_name);

    return (
        <form onSubmit={handleSave}>
            {/* Avatar */}
            <div className="flex flex-col items-center mb-10">
                <div className="relative group">
                    <div className="w-28 h-28 rounded-full bg-primary-container flex items-center justify-center shadow-lg border-4 border-white overflow-hidden relative">
                        {profile.avatar_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                            <span className="text-white text-3xl font-black tracking-tight">{initials}</span>
                        )}
                        
                        {/* Upload overlay */}
                        <label className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                            <span className="material-symbols-outlined text-white">photo_camera</span>
                            <input 
                                type="file" 
                                className="hidden" 
                                accept="image/*"
                                disabled={isUploadingAvatar}
                                onChange={handleAvatarUpload}
                            />
                        </label>
                    </div>
                    {isUploadingAvatar && (
                        <div className="absolute inset-0 bg-white/70 flex items-center justify-center rounded-full">
                             <span className="inline-block w-6 h-6 border-2 border-primary-container/30 border-t-primary-container rounded-full animate-spin" />
                        </div>
                    )}
                </div>
                <div className="mt-3 flex items-center gap-2">
                    <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                        profile.role === 'admin'
                            ? 'bg-orange-100 text-orange-700'
                            : profile.role === 'instructor'
                            ? 'bg-teal-100 text-teal-700'
                            : 'bg-surface-container text-on-surface-variant'
                    }`}>
                        {ROLE_LABELS[profile.role] ?? profile.role}
                    </span>
                    <span className="text-on-surface-variant text-xs font-medium opacity-60">
                        ⭐ {profile.stars_balance} estrellas
                    </span>
                </div>
            </div>

            {/* Feedback banner */}
            {feedback && (
                <div className={`flex items-start gap-3 text-sm p-4 rounded-xl border mb-6 animate-in fade-in ${
                    feedback.type === 'success'
                        ? 'bg-green-50 text-green-700 border-green-200'
                        : 'bg-red-50 text-red-600 border-red-200'
                }`}>
                    <span className="material-symbols-outlined text-xl leading-none mt-0.5">
                        {feedback.type === 'success' ? 'check_circle' : 'error'}
                    </span>
                    <p>{feedback.message}</p>
                </div>
            )}

            {/* Fields */}
            <div className="space-y-5 md:grid md:grid-cols-2 md:gap-6 md:space-y-0">

                {/* Editable: Full Name */}
                <div className="space-y-1.5 md:col-span-1">
                    <label className="block text-[0.6875rem] font-bold uppercase tracking-widest text-on-surface-variant ml-1">
                        Nombre Completo
                    </label>
                    <input
                        name="full_name"
                        type="text"
                        required
                        minLength={2}
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full bg-white border border-surface-container-high rounded-2xl px-5 py-4 text-on-surface font-medium focus:ring-2 focus:ring-primary-container outline-none shadow-sm transition"
                        placeholder="Tu nombre"
                    />
                </div>

                {/* Editable: Phone */}
                <div className="space-y-1.5 md:col-span-1">
                    <label className="block text-[0.6875rem] font-bold uppercase tracking-widest text-on-surface-variant ml-1">
                        Celular
                    </label>
                    <input
                        name="phone"
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full bg-white border border-surface-container-high rounded-2xl px-5 py-4 text-on-surface font-medium focus:ring-2 focus:ring-primary-container outline-none shadow-sm transition"
                        placeholder="+52 55 1234 5678"
                    />
                </div>

                {/* Read-only: Email */}
                <ReadOnlyField
                    label="Correo Electrónico"
                    value={profile.email ?? '—'}
                    icon="lock"
                />

                {/* Read-only: Member since */}
                <ReadOnlyField
                    label="Miembro desde"
                    value={formatDate(profile.created_at)}
                    icon="calendar_today"
                />

                {/* Read-only: Status */}
                <div className="md:col-span-2">
                    <ReadOnlyField
                        label="Estado de cuenta"
                        value={profile.status === 'active' ? 'Activo' : 'Inactivo'}
                        icon="verified_user"
                    />
                </div>
            </div>

            {/* Actions */}
            <div className="mt-10 space-y-3">
                <button
                    type="submit"
                    disabled={isSaving}
                    className="w-full py-5 bg-primary-container text-white rounded-full font-bold text-base shadow-[0_8px_16px_rgba(234,112,52,0.2)] active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2 transition-all"
                >
                    {isSaving ? (
                        <>
                            <span className="inline-block w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Guardando...
                        </>
                    ) : 'Guardar Cambios'}
                </button>

                <button
                    type="button"
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className="w-full py-4 text-error font-medium disabled:opacity-50 flex items-center justify-center gap-2 transition-opacity"
                >
                    {isLoggingOut ? (
                        <>
                            <span className="inline-block w-4 h-4 border-2 border-error/30 border-t-error rounded-full animate-spin" />
                            Cerrando sesión...
                        </>
                    ) : 'Cerrar Sesión'}
                </button>
            </div>
        </form>
    );
}

function ReadOnlyField({ label, value, icon }: { label: string; value: string; icon: string }) {
    return (
        <div className="space-y-1.5">
            <label className="block text-[0.6875rem] font-bold uppercase tracking-widest text-on-surface-variant ml-1">
                {label}
            </label>
            <div className="w-full bg-surface-container-low border border-surface-container rounded-2xl px-5 py-4 flex justify-between items-center">
                <span className="text-on-surface font-medium">{value}</span>
                <span className="material-symbols-outlined text-outline opacity-40 text-[20px]">{icon}</span>
            </div>
        </div>
    );
}
