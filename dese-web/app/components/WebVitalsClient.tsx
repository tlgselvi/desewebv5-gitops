'use client'

import { useEffect } from 'react'
import { registerWebVitals } from '../../lib/metrics/webVitals'

export function WebVitalsClient() {
	useEffect(() => {
		registerWebVitals()
	}, [])
	return null
}
