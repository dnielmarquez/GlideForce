import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

// This Root Admin Utility completely overrides all RLS checks natively.
// Only execute this within trusted Server Actions!
export const createAdminClient = () => {
    return createClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
};
