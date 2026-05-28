import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/utils/supabase/middleware';

export async function middleware(request: NextRequest) {
    const { response, user, supabase } = await updateSession(request);
    const pathname = request.nextUrl.pathname;

    const isAuthRoute =
        pathname.startsWith('/login') ||
        pathname.startsWith('/register') ||
        pathname.startsWith('/forgot-password') ||
        pathname.startsWith('/reset-password');

    const isPublicRoute = pathname === '/';
    const isCallbackRoute = pathname.startsWith('/auth/callback');
    const isAdminRoute = pathname.startsWith('/admin');
    // Webhook endpoints must NEVER be redirected — they are called by third-party servers
    const isWebhookRoute = pathname.startsWith('/api/webhooks');

    // Always let Supabase callback routes through
    if (isCallbackRoute) {
        return response;
    }

    // If already authenticated, push them off auth pages
    if (user && isAuthRoute) {
        return NextResponse.redirect(new URL('/classes', request.url));
    }

    // Allow unauthenticated access to /reset-password
    // (user arrives with a valid recovery token, session is set by the callback)
    if (pathname.startsWith('/reset-password')) {
        return response;
    }

    // Admin authorization check
    if (user && isAdminRoute) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profile?.role !== 'admin') {
            return NextResponse.redirect(new URL('/classes', request.url));
        }
    }

    // If logged out, bounce back to login (unless on root, auth pages, or webhook routes)
    if (!user && !isAuthRoute && !isPublicRoute && !isWebhookRoute) {
        return NextResponse.redirect(new URL('/login', request.url));
    }

    return response;
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization)
         * - favicon.ico (favicon file)
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
};
