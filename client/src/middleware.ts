import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
    // Get the user's session from the request
    const session = request.cookies.get('session')?.value

    // If the user is not authenticated and trying to access protected routes
    if (!session && (
        request.nextUrl.pathname.startsWith('/instructor') ||
        request.nextUrl.pathname.startsWith('/student')
    )) {
        // Redirect to the login page
        return NextResponse.redirect(new URL('/auth/signin', request.url))
    }

    return NextResponse.next()
}

export const config = {
    matcher: [
        '/instructor/:path*',
        '/student/:path*',
    ],
} 