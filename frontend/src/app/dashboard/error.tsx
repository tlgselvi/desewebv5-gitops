"use client"

import { useEffect } from "react"
import { AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Dashboard Error:", error)
  }, [error])

  return (
    <div className="flex h-[calc(100vh-4rem)] items-center justify-center flex-col gap-4 p-4">
      <AlertTriangle className="h-12 w-12 text-destructive" />
      <h2 className="text-2xl font-bold">Bir şeyler yanlış gitti!</h2>
      <p className="text-muted-foreground max-w-md text-center">
        {error.message || "Beklenmeyen bir hata oluştu"}
      </p>
      {error.digest && (
        <p className="text-xs text-muted-foreground">
          Hata ID: {error.digest}
        </p>
      )}
      <Button onClick={reset} variant="outline">
        Tekrar Dene
      </Button>
    </div>
  )
}

