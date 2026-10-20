'use server';

import { createAdminClient } from '@/utils/supabase/admin';

export interface AdminTransaction {
    id: string;
    wompi_reference: string;
    wompi_transaction_id: string | null;
    member_name: string;
    member_email: string;
    purpose: 'star_purchase' | 'class_booking';
    status: 'pending' | 'approved' | 'declined' | 'voided' | 'error' | 'expired';
    amount_in_cents: number;
    currency: string;
    stars_to_credit: number | null;
    stars_delivered: number;
    coupon: {
        id: string;
        code: string;
        title: string;
        discount_type: '2_for_1' | 'percentage' | 'fixed_amount';
        discount_value: number;
    } | null;
    created_at: string;
    fulfilled_at: string | null;
}

export async function getAdminTransactions(): Promise<AdminTransaction[]> {
    const admin = createAdminClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (admin as any)
        .from('payments')
        .select(`
            id,
            wompi_reference,
            wompi_transaction_id,
            purpose,
            status,
            amount_in_cents,
            currency,
            stars_to_credit,
            coupon_id,
            created_at,
            fulfilled_at,
            profiles:member_id (full_name, email)
        `)
        .order('created_at', { ascending: false });

    if (error || !data) {
        console.error('[getAdminTransactions] Error:', error);
        return [];
    }

    const payments = data as any[];
    const paymentIds = payments.map((p: any) => p.id);
    const couponIds = Array.from(new Set(payments.map((p: any) => p.coupon_id).filter(Boolean)));

    // Fetch associated coupons and credited star_transactions in parallel
    const [couponsRes, starTxRes] = await Promise.all([
        couponIds.length > 0
            ? (admin as any).from('coupons').select('id, code, title, discount_type, discount_value').in('id', couponIds)
            : Promise.resolve({ data: [] }),
        paymentIds.length > 0
            ? (admin as any).from('star_transactions').select('payment_id, amount').in('payment_id', paymentIds)
            : Promise.resolve({ data: [] }),
    ]);

    const couponMap = new Map<string, any>((couponsRes.data || []).map((c: any) => [c.id, c]));
    const starTxMap = new Map<string, number>();

    (starTxRes.data || []).forEach((st: any) => {
        if (st.payment_id) {
            const current = starTxMap.get(st.payment_id) || 0;
            starTxMap.set(st.payment_id, current + Number(st.amount || 0));
        }
    });

    return payments.map((p: any) => {
        const rawCoupon = p.coupon_id ? (couponMap.get(p.coupon_id) ?? null) : null;
        const starsDelivered = starTxMap.get(p.id) || 0;

        return {
            id:                   p.id,
            wompi_reference:      p.wompi_reference,
            wompi_transaction_id: p.wompi_transaction_id,
            member_name:          p.profiles?.full_name  ?? 'Desconocido',
            member_email:         p.profiles?.email       ?? '—',
            purpose:              p.purpose,
            status:               p.status,
            amount_in_cents:      p.amount_in_cents,
            currency:             p.currency,
            stars_to_credit:      p.stars_to_credit,
            stars_delivered:      starsDelivered,
            coupon: rawCoupon ? {
                id:             rawCoupon.id,
                code:           rawCoupon.code,
                title:          rawCoupon.title,
                discount_type:  rawCoupon.discount_type,
                discount_value: Number(rawCoupon.discount_value || 0),
            } : null,
            created_at:           p.created_at,
            fulfilled_at:         p.fulfilled_at,
        };
    });
}
