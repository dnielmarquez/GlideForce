'use server';

import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import type { Package } from '@/types';

/**
 * Public/Member action: Returns all active packages ordered by order_index.
 * Fallback to default packages if DB table is empty.
 */
export async function getPackages(): Promise<Package[]> {
  try {
    const supabase = await createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('packages')
      .select('*')
      .eq('is_active', true)
      .order('order_index', { ascending: true })
      .order('stars_quantity', { ascending: true });

    if (error) {
      console.warn('[getPackages] DB error or table not migrated yet:', error.message);
      return [];
    }

    return (data || []) as Package[];
  } catch (err) {
    console.error('[getPackages] Unexpected error:', err);
    return [];
  }
}

/**
 * Admin action: Returns all packages (active and inactive) ordered by order_index.
 */
export async function getAdminPackages(): Promise<Package[]> {
  try {
    const admin = createAdminClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (admin as any)
      .from('packages')
      .select('*')
      .order('order_index', { ascending: true })
      .order('stars_quantity', { ascending: true });

    if (error) {
      console.error('[getAdminPackages] Error:', error);
      return [];
    }

    return (data || []) as Package[];
  } catch (err) {
    console.error('[getAdminPackages] Unexpected error:', err);
    return [];
  }
}

export interface CreatePackageInput {
  title: string;
  description?: string | null;
  stars_quantity: number;
  original_price_cop: number;
  price_cop: number;
  badge?: string | null;
  order_index?: number;
  is_active?: boolean;
}

/**
 * Admin action: Create a new package.
 */
export async function createAdminPackage(data: CreatePackageInput): Promise<{ success: boolean; data?: Package; error?: string }> {
  try {
    if (!data.title?.trim()) return { success: false, error: 'El título es requerido.' };
    if (!data.stars_quantity || data.stars_quantity < 1) return { success: false, error: 'La cantidad de sesiones debe ser al menos 1.' };
    if (data.original_price_cop < 0 || data.price_cop < 0) return { success: false, error: 'Los precios no pueden ser negativos.' };

    const admin = createAdminClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: created, error } = await (admin as any)
      .from('packages')
      .insert({
        title: data.title.trim(),
        description: data.description?.trim() || null,
        stars_quantity: data.stars_quantity,
        original_price_cop: data.original_price_cop,
        price_cop: data.price_cop,
        badge: data.badge?.trim() || null,
        order_index: data.order_index ?? 0,
        is_active: data.is_active ?? true,
      })
      .select()
      .single();

    if (error) {
      console.error('[createAdminPackage] DB error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: created as Package };
  } catch (err: any) {
    console.error('[createAdminPackage] Unexpected error:', err);
    return { success: false, error: err?.message || 'Error al crear el paquete' };
  }
}

/**
 * Admin action: Update an existing package.
 */
export async function updateAdminPackage(
  id: string,
  data: Partial<CreatePackageInput>
): Promise<{ success: boolean; data?: Package; error?: string }> {
  try {
    if (data.stars_quantity !== undefined && data.stars_quantity < 1) {
      return { success: false, error: 'La cantidad de sesiones debe ser al menos 1.' };
    }
    if ((data.original_price_cop !== undefined && data.original_price_cop < 0) || (data.price_cop !== undefined && data.price_cop < 0)) {
      return { success: false, error: 'Los precios no pueden ser negativos.' };
    }

    const admin = createAdminClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: updated, error } = await (admin as any)
      .from('packages')
      .update({
        ...(data.title !== undefined ? { title: data.title.trim() } : {}),
        ...(data.description !== undefined ? { description: data.description?.trim() || null } : {}),
        ...(data.stars_quantity !== undefined ? { stars_quantity: data.stars_quantity } : {}),
        ...(data.original_price_cop !== undefined ? { original_price_cop: data.original_price_cop } : {}),
        ...(data.price_cop !== undefined ? { price_cop: data.price_cop } : {}),
        ...(data.badge !== undefined ? { badge: data.badge?.trim() || null } : {}),
        ...(data.order_index !== undefined ? { order_index: data.order_index } : {}),
        ...(data.is_active !== undefined ? { is_active: data.is_active } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[updateAdminPackage] DB error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: updated as Package };
  } catch (err: any) {
    console.error('[updateAdminPackage] Unexpected error:', err);
    return { success: false, error: err?.message || 'Error al actualizar el paquete' };
  }
}

/**
 * Admin action: Toggle package active state.
 */
export async function toggleAdminPackageActive(id: string, is_active: boolean): Promise<{ success: boolean; error?: string }> {
  try {
    const admin = createAdminClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (admin as any)
      .from('packages')
      .update({ is_active, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      console.error('[toggleAdminPackageActive] DB error:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error('[toggleAdminPackageActive] Unexpected error:', err);
    return { success: false, error: err?.message || 'Error al cambiar estado' };
  }
}

/**
 * Admin action: Delete a package.
 */
export async function deleteAdminPackage(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const admin = createAdminClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (admin as any)
      .from('packages')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[deleteAdminPackage] DB error:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error('[deleteAdminPackage] Unexpected error:', err);
    return { success: false, error: err?.message || 'Error al eliminar el paquete' };
  }
}
