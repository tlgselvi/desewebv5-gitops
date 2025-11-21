"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const token = searchParams.get("token");
    const error = searchParams.get("error");

    if (error) {
      toast.error("Authentication Failed", {
        description: error === "oauth_cancelled" 
          ? "Google sign-in was cancelled." 
          : error === "oauth_invalid"
          ? "Invalid authentication request."
          : error,
      });
      router.push("/login");
      return;
    }

    if (token) {
      // Store token in localStorage
      localStorage.setItem("token", token);

      toast.success("Welcome!", {
        description: "You have been successfully signed in with Google.",
      });

      // Redirect to home page (dashboard)
      router.push("/");
    } else {
      toast.error("Authentication Failed", {
        description: "No authentication token received.",
      });
      router.push("/login");
    }
  }, [searchParams, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-white dark:bg-slate-950">
      <div className="text-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600 dark:text-blue-400" />
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Completing sign in...
        </p>
      </div>
    </div>
  );
}

