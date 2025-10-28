import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function middleware(req: NextRequest) {
	const token = await getToken({ req, secret: process.env.JWT_SECRET })
	const { pathname } = req.nextUrl

	if (!token && pathname.startsWith('/aiops')) {
		const loginUrl = new URL('/login', req.url)
		return NextResponse.redirect(loginUrl)
	}

	return NextResponse.next()
}

export const config = {
	matcher: ['/aiops/:path*', '/anomalies/:path*', '/feedback/:path*'],
}
