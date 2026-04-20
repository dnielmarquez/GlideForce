import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/utils/supabase/middleware';

export async function middleware(request: NextRequest) {
    const { response, user } = await updateSession(request);

    const isAuthRoute = request.nextUrl.pathname.startsWith('/login') || request.nextUrl.pathname.startsWith('/register');
    const isPublicRoute = request.nextUrl.pathname === '/';

    // If perfectly authenticated, push them off the login page so they don't get trapped.
    if (user && isAuthRoute) {
        return NextResponse.redirect(new URL('/classes', request.url));
    }

    // If completely logged out, bounce them back to login (unless they are on the root homepage or auth pages)
    if (!user && !isAuthRoute && !isPublicRoute) {
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
