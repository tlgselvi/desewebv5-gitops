"use client"

import { useState } from "react"
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

const formSchema = z.object({
  email: z.string().email({ message: "Geçerli bir e-posta adresi giriniz." }),
  password: z.string().min(6, { message: "Şifre en az 6 karakter olmalıdır." }),
})

export function LoginForm() {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const login = useStore((state) => state.login)

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
      // Simulating API call
      await new Promise((resolve) => setTimeout(resolve, 1000))
      
      if (values.email === "admin@dese.ai" && values.password === "123456") {
        login({
          id: "1",
          email: values.email,
          name: "Admin User",
          role: "admin",
        })
        toast.success("Giriş başarılı!", {
          description: "Yönetim paneline yönlendiriliyorsunuz.",
        })
        router.push("/dashboard")
      } else {
        throw new Error("Hatalı e-posta veya şifre")
      }
    } catch (error) {
      toast.error("Giriş başarısız", {
        description: error instanceof Error ? error.message : "Bir hata oluştu",
      })
    } finally {
      setIsLoading(false)
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
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">E-posta</Label>
            <Input
              id="email"
              type="email"
              placeholder="ornek@dese.ai"
              {...form.register("email")}
            />
            {form.formState.errors.email && (
              <p className="text-sm text-destructive text-red-500">
                {form.formState.errors.email.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Şifre</Label>
            <Input
              id="password"
              type="password"
              {...form.register("password")}
            />
            {form.formState.errors.password && (
              <p className="text-sm text-destructive text-red-500">
                {form.formState.errors.password.message}
              </p>
            )}
          </div>
          <Button className="w-full" type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Giriş Yap
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex justify-center">
        <p className="text-sm text-muted-foreground">
          Demo: admin@dese.ai / 123456
        </p>
      </CardFooter>
    </Card>
  )
}

