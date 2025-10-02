import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
    // Since we're using localStorage-based authentication,
    // we can't check auth state in middleware (runs on server)
    // Let the client-side AuthContext and RequireAuth components handle protection
    
    return NextResponse.next()
}

export const config = {
    matcher: [
        '/instructor/:path*',
        '/student/:path*',
    ],
} 