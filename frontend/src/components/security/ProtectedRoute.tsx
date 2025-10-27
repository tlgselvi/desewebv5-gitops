"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getUserRole } from "../../lib/auth";

export default function ProtectedRoute({ role, children }: { role: string; children: React.ReactNode }) {
  const router = useRouter();
  useEffect(() => {
    const userRole = getUserRole();
    if (!userRole || userRole !== role) router.push("/login");
  }, [router]);
  return <>{children}</>;
}
