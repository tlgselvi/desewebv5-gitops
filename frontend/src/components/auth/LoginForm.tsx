"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useStore } from "@/store/useStore"
import { getToken } from "@/lib/auth"

const formSchema = z.object({
  email: z.string().email({ message: "Geçerli bir e-posta adresi giriniz." }),
  password: z.string().min(6, { message: "Şifre en az 6 karakter olmalıdır." }),
})

export function LoginForm() {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const login = useStore((state) => state.login)
  const isAuthenticated = useStore((state) => state.isAuthenticated)

  // Redirect if already authenticated
  useEffect(() => {
    const token = getToken()
    if (token && isAuthenticated) {
      router.push("/dashboard")
    }
  }, [router, isAuthenticated])

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true)
    
    try {
      // Call backend API for login
      const response = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: values.email,
          password: values.password,
        }),
      });

      // Check if response is JSON
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text();
        throw new Error(`Sunucu hatası: ${response.status} ${response.statusText}. ${text.substring(0, 100)}`);
      }

      const data = await response.json();

      if (!response.ok || !data.success) {
        // Handle specific error cases
        if (data.error === "mock_login_disabled") {
          // Show Google OAuth option when mock login is disabled
          toast.error("Mock login devre dışı", {
            description: "Lütfen Google OAuth ile giriş yapın veya .env dosyanızda ENABLE_MOCK_LOGIN=true olduğundan emin olun.",
            duration: 5000,
          });
          // Optionally redirect to Google OAuth
          if (data.googleOAuthUrl) {
            window.location.href = data.googleOAuthUrl;
            return;
          }
        }
        throw new Error(data.message || data.error || "Giriş başarısız");
      }

      // Save token to localStorage
      if (data.token) {
        localStorage.setItem("token", data.token);
      } else {
        throw new Error("Token alınamadı");
      }

      // Update store with user info
      if (data.user) {
        login({
          id: data.user.id,
          email: data.user.email,
          name: data.user.email, // Backend doesn't return name, use email
          role: data.user.role,
          organizationId: data.user.organizationId,
        });
      }

      toast.success("Giriş başarılı!", {
        description: "Yönetim paneline yönlendiriliyorsunuz.",
      });
      
      // Redirect to dashboard
      router.push("/dashboard");
    } catch (error) {
      console.error("Login error:", error);
      toast.error("Giriş başarısız", {
        description: error instanceof Error ? error.message : "Bir hata oluştu",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-2xl">Giriş Yap</CardTitle>
        <CardDescription>
          Devam etmek için e-posta ve şifrenizi giriniz.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form 
          onSubmit={form.handleSubmit(onSubmit)} 
          className="space-y-4"
          aria-label="Giriş formu"
          noValidate
        >
          <div className="space-y-2">
            <Label htmlFor="email">E-posta</Label>
            <Input
              id="email"
              type="email"
              placeholder="ornek@dese.ai"
              aria-label="E-posta adresi"
              aria-required="true"
              aria-invalid={form.formState.errors.email ? "true" : "false"}
              aria-describedby={form.formState.errors.email ? "email-error" : undefined}
              {...form.register("email")}
            />
            {form.formState.errors.email && (
              <p 
                id="email-error" 
                className="text-sm text-destructive text-red-500"
                role="alert"
                aria-live="polite"
              >
                {form.formState.errors.email.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Şifre</Label>
            <Input
              id="password"
              type="password"
              aria-label="Şifre"
              aria-required="true"
              aria-invalid={form.formState.errors.password ? "true" : "false"}
              aria-describedby={form.formState.errors.password ? "password-error" : undefined}
              {...form.register("password")}
            />
            {form.formState.errors.password && (
              <p 
                id="password-error"
                className="text-sm text-destructive text-red-500"
                role="alert"
                aria-live="polite"
              >
                {form.formState.errors.password.message}
              </p>
            )}
          </div>
          <Button 
            className="w-full" 
            type="submit" 
            disabled={isLoading}
            aria-busy={isLoading}
            aria-label={isLoading ? "Giriş yapılıyor..." : "Giriş yap"}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
            Giriş Yap
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex flex-col items-center gap-2">
        <p className="text-sm text-muted-foreground">
          Demo: admin@dese.ai / 123456
        </p>
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => {
            window.location.href = "/api/v1/auth/google";
          }}
        >
          Google ile Giriş Yap
        </Button>
      </CardFooter>
    </Card>
  )
}

