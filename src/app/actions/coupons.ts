'use server';

import { createAdminClient } from '@/utils/supabase/admin';

export interface AdminCoupon {
  id: string;
  title: string;
  code: string;
  description: string | null;
  discount_type: '2_for_1' | 'percentage' | 'fixed_amount';
  discount_value: number;
  start_date: string | null;
  end_date: string | null;
  max_uses: number;
  max_uses_per_user: number;
  is_active: boolean;
  created_at: string;
  uses_count: number;
}

export async function getAdminCoupons(): Promise<AdminCoupon[]> {
  const admin = createAdminClient();

  const { data, error } = await (admin as any)
    .from('coupons')
    .select('*, coupon_usages(id)')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[getAdminCoupons] Error:', error);
    return [];
  }

  return (data as any[]).map((c: any) => ({
    id: c.id,
    title: c.title,
    code: c.code,
    description: c.description,
    discount_type: c.discount_type,
    discount_value: Number(c.discount_value || 0),
    start_date: c.start_date,
    end_date: c.end_date,
    max_uses: c.max_uses || 0,
    max_uses_per_user: c.max_uses_per_user === null ? 0 : c.max_uses_per_user,
    is_active: c.is_active,
    created_at: c.created_at,
    uses_count: c.coupon_usages ? c.coupon_usages.length : 0,
  }));
}

export async function createAdminCoupon(formData: {
  title: string;
  code: string;
  description?: string;
  discount_type: '2_for_1' | 'percentage' | 'fixed_amount';
  discount_value: number;
  start_date?: string | null;
  end_date?: string | null;
  max_uses: number;
  max_uses_per_user: number;
}) {
  const admin = createAdminClient();
  const cleanCode = formData.code.trim().toUpperCase();

  const { data, error } = await (admin as any)
    .from('coupons')
    .insert({
      title: formData.title.trim(),
      code: cleanCode,
      description: formData.description?.trim() || null,
      discount_type: formData.discount_type,
      discount_value: formData.discount_value,
      start_date: formData.start_date || null,
      end_date: formData.end_date || null,
      max_uses: formData.max_uses,
      max_uses_per_user: formData.max_uses_per_user,
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    console.error('[createAdminCoupon] Error:', error);
    return { success: false, error: error.message };
  }

  return { success: true, data };
}

export async function toggleAdminCouponActive(id: string, is_active: boolean) {
  const admin = createAdminClient();

  const { error } = await (admin as any)
    .from('coupons')
    .update({ is_active })
    .eq('id', id);

  if (error) {
    console.error('[toggleAdminCouponActive] Error:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function deleteAdminCoupon(id: string) {
  const admin = createAdminClient();

  const { error } = await (admin as any)
    .from('coupons')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('[deleteAdminCoupon] Error:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}
