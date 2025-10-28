"use client";

import { useSession } from "next-auth/react";

export function Protected({ role, children }: { role: string; children: React.ReactNode }) {
	const { data } = useSession();
	if (role && data?.user && (data.user as any).role !== role) return null;
	return <>{children}</>;
}
