import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
	try {
		const res = await fetch('http://localhost:8000/api/v1/health', {
			headers: {
				'Content-Type': 'application/json',
			},
			cache: 'no-store',
		})
		const data = await res.json()
		return NextResponse.json(data, { status: res.status })
	} catch (error) {
		return NextResponse.json({ error: 'Health proxy failed' }, { status: 502 })
	}
}
