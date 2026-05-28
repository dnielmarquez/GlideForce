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
            created_at,
            fulfilled_at,
            profiles:member_id (full_name, email)
        `)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('[getAdminTransactions] Error:', error);
        return [];
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data as any[]).map((p: any) => ({
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
        created_at:           p.created_at,
        fulfilled_at:         p.fulfilled_at,
    }));
}
