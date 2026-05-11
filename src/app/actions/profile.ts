'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import type { Database } from '@/types/database.types'

type Profile = Database['public']['Tables']['profiles']['Row']

export async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (supabase as any)
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return profile as Profile | null
}

export async function updateProfile(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No estás autenticado.' }

  const full_name = (formData.get('full_name') as string)?.trim()
  const phone = (formData.get('phone') as string)?.trim() || null

  if (!full_name || full_name.length < 2) {
    return { error: 'El nombre debe tener al menos 2 caracteres.' }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('profiles')
    .update({ full_name, phone })
    .eq('id', user.id)

  if (error) return { error: 'No se pudo guardar. Intenta de nuevo.' }

  revalidatePath('/profile')
  return { success: true }
}

export async function uploadProfileAvatar(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No estás autenticado.' }

  const avatarFile = formData.get('avatar_file') as File | null
  if (!avatarFile || avatarFile.size === 0) return { error: 'No se seleccionó ninguna imagen.' }
  if (avatarFile.size > 5 * 1024 * 1024) return { error: 'La imagen supera los 5MB.' }

  const ext = avatarFile.name.split('.').pop()
  const fileName = `${user.id}-${Date.now()}.${ext}`

  const { createClient: createSupabaseClient } = await import('@supabase/supabase-js')
  const supabaseAdmin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { error: uploadError } = await supabaseAdmin.storage
    .from('avatars')
    .upload(fileName, avatarFile, { cacheControl: '3600', upsert: true })

  if (uploadError) {
    console.error('Error uploading avatar:', uploadError)
    return { error: 'Error al subir la imagen.' }
  }

  const { data: publicUrlData } = supabaseAdmin.storage.from('avatars').getPublicUrl(fileName)
  const finalAvatarUrl = publicUrlData.publicUrl

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('profiles')
    .update({ avatar_url: finalAvatarUrl })
    .eq('id', user.id)

  if (error) return { error: 'No se pudo actualizar la foto.' }

  revalidatePath('/profile')
  return { success: true, avatar_url: finalAvatarUrl }
}
