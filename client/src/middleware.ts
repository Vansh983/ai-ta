import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { userTokens } from '@/lib/auth/tokens.config'

export function middleware(request: NextRequest) {
    // Get the user's session token from the request
    const sessionToken = request.cookies.get('session')?.value

    // If no session token and trying to access protected routes
    if (!sessionToken && (
        request.nextUrl.pathname.startsWith('/instructor') ||
        request.nextUrl.pathname.startsWith('/student')
    )) {
        // Redirect to the login page
        return NextResponse.redirect(new URL('/auth/signin', request.url))
    }

    // If there is a session token, verify the user's role
    if (sessionToken) {
        const userToken = userTokens.find(ut => ut.token === sessionToken)

        if (!userToken) {
            // Invalid token, redirect to login
            return NextResponse.redirect(new URL('/auth/signin', request.url))
        }

        // Check role-based access
        if (request.nextUrl.pathname.startsWith('/instructor') &&
            userToken.role !== 'instructor' &&
            userToken.role !== 'admin') {
            // Not an instructor or admin, redirect to home
            return NextResponse.redirect(new URL('/', request.url))
        }

        if (request.nextUrl.pathname.startsWith('/student') &&
            userToken.role !== 'student' &&
            userToken.role !== 'admin') {
            // Not a student or admin, redirect to home
            return NextResponse.redirect(new URL('/', request.url))
        }
    }

    return NextResponse.next()
}

export const config = {
    matcher: [
        '/instructor/:path*',
        '/student/:path*',
    ],
} 