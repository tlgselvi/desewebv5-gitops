"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { toast } from "sonner";
import { login } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Shield, Zap, BarChart3 } from "lucide-react";

// Validation schema
const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState<LoginFormData>({
    email: "admin@poolfab.com.tr",
    password: "",
  });

  // Prevent hydration mismatch by only rendering form after mount
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleGoogleLogin = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Force full redirect to the Backend API
    // NEXT_PUBLIC_API_URL should include /api/v1 (e.g., http://localhost:3000/api/v1)
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api/v1";
    const googleAuthUrl = `${apiUrl.replace(/\/$/, "")}/auth/google`;
    
    // Direct redirect - backend will handle errors
    window.location.href = googleAuthUrl;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrors({});
    setIsLoading(true);

    try {
      // Validate form data
      const validatedData = loginSchema.parse(formData);

      // Call login function (uses username field in API)
      await login(validatedData.email, validatedData.password);

      toast.success("Welcome back!", {
        description: "You have been successfully signed in.",
      });

      // Redirect to home page (dashboard)
      router.push("/");
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Handle validation errors
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0].toString()] = err.message;
          }
        });
        setErrors(fieldErrors);
        toast.error("Validation Error", {
          description: "Please check the form fields and try again.",
        });
      } else {
        // Handle API errors
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Invalid email or password. Please try again.";
        toast.error("Sign In Failed", {
          description: errorMessage,
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full grid lg:grid-cols-2">
      {/* Left Column - Branding (Hidden on mobile, visible on large screens) */}
      <div className="hidden lg:flex flex-col justify-between bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 p-12 text-white">
        {/* Top: Logo/Brand */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600">
              <Shield className="h-6 w-6" />
            </div>
            <span className="text-xl font-bold tracking-tight">Dese EA Plan</span>
          </div>
          <p className="text-sm text-zinc-400">v6.8.2</p>
        </div>

        {/* Center: Testimonial/Slogan */}
        <div className="space-y-8 max-w-md">
          <div className="space-y-4">
            <h2 className="text-3xl font-bold tracking-tight leading-tight">
              Manage your GitOps & AIOps in one place.
            </h2>
            <p className="text-lg text-zinc-300 leading-relaxed">
              Enterprise-grade planning and optimization for Kubernetes, GitOps workflows, and AI-powered operations.
            </p>
          </div>

          {/* Feature highlights */}
          <div className="space-y-4 pt-8">
            <div className="flex items-start gap-3">
              <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-600/20">
                <Zap className="h-4 w-4 text-blue-400" />
              </div>
              <div>
                <p className="font-medium">Real-time Monitoring</p>
                <p className="text-sm text-zinc-400">Track metrics and alerts across all MCP modules</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-600/20">
                <BarChart3 className="h-4 w-4 text-blue-400" />
              </div>
              <div>
                <p className="font-medium">Advanced Analytics</p>
                <p className="text-sm text-zinc-400">Get insights from FinBot, MuBot, and Observability data</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-600/20">
                <Shield className="h-4 w-4 text-blue-400" />
              </div>
              <div>
                <p className="font-medium">Enterprise Security</p>
                <p className="text-sm text-zinc-400">Role-based access control and audit logging</p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom: Copyright */}
        <div className="text-sm text-zinc-500">
          <p>© 2025 Dese EA Plan. All rights reserved.</p>
          <p className="mt-1">CPT Optimization Domain</p>
        </div>
      </div>

      {/* Right Column - Login Form */}
      <div className="flex items-center justify-center p-6 lg:p-12 bg-white dark:bg-slate-950">
        <div className="w-full max-w-md space-y-8">
          {/* Header */}
          <div className="space-y-2 text-center lg:text-left">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Welcome back
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Enter your email to sign in to your account
            </p>
          </div>

          {/* Form */}
          {isMounted ? (
            <div className="space-y-6">
              {/* Google Login Button */}
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleGoogleLogin}
                disabled={isLoading}
              >
                <svg
                  className="mr-2 h-4 w-4"
                  aria-hidden="true"
                  focusable="false"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                Continue with Google
              </Button>

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-slate-300 dark:border-slate-700" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-slate-500 dark:bg-slate-950 dark:text-slate-400">
                    Or continue with email
                  </span>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6" suppressHydrationWarning>
                {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="name@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  disabled={isLoading}
                  className={errors.email ? "border-red-500 focus:ring-red-500" : ""}
                  required
                  autoComplete="email"
                />
                {errors.email && (
                  <p className="text-sm text-red-600 dark:text-red-400">{errors.email}</p>
                )}
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <a
                    href="#"
                    className="text-sm text-blue-600 hover:text-blue-700 hover:underline dark:text-blue-400 dark:hover:text-blue-300"
                    onClick={(e) => {
                      e.preventDefault();
                      toast.info("Forgot Password", {
                        description: "Please contact your administrator to reset your password.",
                      });
                    }}
                  >
                    Forgot password?
                  </a>
                </div>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleChange}
                  disabled={isLoading}
                  className={errors.password ? "border-red-500 focus:ring-red-500" : ""}
                  required
                  autoComplete="current-password"
                />
                {errors.password && (
                  <p className="text-sm text-red-600 dark:text-red-400">{errors.password}</p>
                )}
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                variant="primary"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign In with Email"
                )}
              </Button>
              </form>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Loading skeleton to prevent layout shift */}
              <div className="space-y-2">
                <div className="h-4 w-16 bg-slate-200 rounded dark:bg-slate-800 animate-pulse" />
                <div className="h-10 w-full bg-slate-200 rounded-lg dark:bg-slate-800 animate-pulse" />
              </div>
              <div className="space-y-2">
                <div className="h-4 w-20 bg-slate-200 rounded dark:bg-slate-800 animate-pulse" />
                <div className="h-10 w-full bg-slate-200 rounded-lg dark:bg-slate-800 animate-pulse" />
              </div>
              <div className="h-10 w-full bg-slate-200 rounded-lg dark:bg-slate-800 animate-pulse" />
            </div>
          )}

          {/* Footer Note */}
          <div className="text-center">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              By signing in, you agree to our{" "}
              <a href="#" className="text-blue-600 hover:underline dark:text-blue-400">
                Terms of Service
              </a>{" "}
              and{" "}
              <a href="#" className="text-blue-600 hover:underline dark:text-blue-400">
                Privacy Policy
              </a>
              .
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
