'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { headers } from 'next/headers'
import { sendRegistrationNotificationToAdmin } from '@/lib/email'

// Maps raw Supabase error messages to user-friendly Spanish messages
function mapAuthError(message: string): string {
  const msg = message.toLowerCase()
  if (msg.includes('invalid login credentials') || msg.includes('invalid credentials')) {
    return 'Correo electrónico o contraseña incorrectos.'
  }
  if (msg.includes('email not confirmed')) {
    return 'Debes verificar tu correo electrónico antes de iniciar sesión. Revisa tu bandeja de entrada.'
  }
  if (msg.includes('user already registered') || msg.includes('already been registered')) {
    return 'Ya existe una cuenta con este correo electrónico. Intenta iniciar sesión.'
  }
  if (msg.includes('password should be at least')) {
    return 'La contraseña debe tener al menos 6 caracteres.'
  }
  if (msg.includes('unable to validate email address') || msg.includes('invalid email')) {
    return 'El correo electrónico ingresado no es válido.'
  }
  if (msg.includes('email rate limit exceeded') || msg.includes('too many requests')) {
    return 'Demasiados intentos. Espera unos minutos antes de intentar de nuevo.'
  }
  if (msg.includes('for security purposes') || msg.includes('after')) {
    return 'Por seguridad, espera unos segundos antes de intentarlo de nuevo.'
  }
  if (msg.includes('user not found')) {
    return 'No encontramos una cuenta con ese correo electrónico.'
  }
  // Fallback: return original message
  return message
}

export async function login(formData: FormData) {
  const supabase = await createClient()

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const { error } = await supabase.auth.signInWithPassword(data)

  if (error) {
    if (error.message.toLowerCase().includes('email not confirmed')) {
      const headersList = await headers()
      const origin = headersList.get('origin') ?? ''
      
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email: data.email,
        options: {
          emailRedirectTo: `${origin}/auth/callback`,
        }
      })
      
      if (resendError) {
        console.error('Failed to resend confirmation email:', resendError)
        return { error: 'Debes verificar tu correo electrónico antes de iniciar sesión. Intentamos reenviar el correo de verificación pero falló. Espera unos minutos.' }
      }
      
      return { emailNotConfirmed: true, email: data.email }
    }
    return { error: mapAuthError(error.message) }
  }

  revalidatePath('/', 'layout')
  redirect('/classes')
}

export async function signup(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const full_name = formData.get('full_name') as string
  const phone = formData.get('phone') as string

  const { createClient: createSupabaseClient } = await import('@supabase/supabase-js')
  const supabaseAdmin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  let finalAvatarUrl: string | null = null
  const avatarFile = formData.get('avatar_file') as File | null
  if (avatarFile && avatarFile.size > 0) {
    const ext = avatarFile.name.split('.').pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`
    
    const { error: uploadError } = await supabaseAdmin.storage
      .from('avatars')
      .upload(fileName, avatarFile, { cacheControl: '3600', upsert: false })
      
    if (!uploadError) {
      const { data: publicUrlData } = supabaseAdmin.storage.from('avatars').getPublicUrl(fileName)
      finalAvatarUrl = publicUrlData.publicUrl
    } else {
      console.error('Error uploading avatar:', uploadError)
      return { error: 'Ocurrió un error al subir la foto de perfil. Inténtalo de nuevo.' }
    }
  }

  // Basic client-side-style validation on server
  if (!full_name || full_name.trim().length < 2) {
    return { error: 'Por favor ingresa tu nombre completo.' }
  }
  if (password.length < 6) {
    return { error: 'La contraseña debe tener al menos 6 caracteres.' }
  }

  const headersList = await headers()
  const origin = headersList.get('origin') ?? ''

  const { data: authData, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { 
        full_name: full_name.trim(),
        phone: phone ? phone.trim() : null,
        avatar_url: finalAvatarUrl
      },
      emailRedirectTo: `${origin}/auth/callback`,
    },
  })

  if (error) {
    return { error: mapAuthError(error.message) }
  }

  // Ensure profiles table is updated (in case the trigger doesn't map phone or avatar automatically)
  if (authData?.user) {
    await supabaseAdmin
      .from('profiles')
      .update({
        phone: phone ? phone.trim() : null,
        avatar_url: finalAvatarUrl
      })
      .eq('id', authData.user.id)
      
    // Trigger registration email notification to admin asynchronously
    sendRegistrationNotificationToAdmin({
      full_name: full_name.trim(),
      email,
      phone: phone ? phone.trim() : null
    });
  }

  // Return success — the UI will show the "check your email" screen
  return { success: true }
}

export async function forgotPassword(formData: FormData) {
  const supabase = await createClient()
  const email = formData.get('email') as string

  if (!email) {
    return { error: 'Por favor ingresa tu correo electrónico.' }
  }

  const headersList = await headers()
  const origin = headersList.get('origin') ?? ''

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/reset-password`,
  })

  if (error) {
    return { error: mapAuthError(error.message) }
  }

  return { success: true }
}

export async function resetPassword(formData: FormData) {
  const supabase = await createClient()

  const password = formData.get('password') as string
  const confirmPassword = formData.get('confirmPassword') as string

  if (!password || password.length < 6) {
    return { error: 'La contraseña debe tener al menos 6 caracteres.' }
  }
  if (password !== confirmPassword) {
    return { error: 'Las contraseñas no coinciden.' }
  }

  const { error } = await supabase.auth.updateUser({ password })

  if (error) {
    return { error: mapAuthError(error.message) }
  }

  revalidatePath('/', 'layout')
  redirect('/classes')
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}
