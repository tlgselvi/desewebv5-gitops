import { LoginForm } from "@/components/auth/LoginForm"

export default function LoginPage() {
  return (
    <div className="container relative min-h-screen flex flex-col items-center justify-center md:grid lg:max-w-none lg:grid-cols-2 lg:px-0">
      {/* Left Panel - Brand/Info (hidden on mobile) */}
      <div className="relative hidden h-full flex-col bg-muted p-10 text-white dark:border-r lg:flex">
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900" />
        
        {/* Logo */}
        <div className="relative z-20 flex items-center text-lg font-medium">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mr-2 h-6 w-6"
          >
            <path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3" />
          </svg>
          Dese EA Plan v7
        </div>
        
        {/* Tagline */}
        <div className="relative z-20 mt-auto">
          <blockquote className="space-y-2">
            <p className="text-lg leading-relaxed">
              &ldquo;CPT Optimizasyonu ve AIOps desteği ile kurumsal planlamada
              yeni bir çağ.&rdquo;
            </p>
            <footer className="text-sm text-zinc-400">Dese Digital Team</footer>
          </blockquote>
        </div>
      </div>
      
      {/* Right Panel - Login Form */}
      <div className="flex flex-col items-center justify-center p-4 sm:p-8 lg:p-8 w-full">
        <div className="mx-auto flex w-full flex-col justify-center space-y-6 max-w-[350px]">
          {/* Mobile Logo (shown only on mobile) */}
          <div className="flex items-center justify-center lg:hidden mb-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mr-2 h-8 w-8 text-primary"
            >
              <path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3" />
            </svg>
            <span className="text-xl font-semibold">Dese EA Plan</span>
          </div>
          
          {/* Header */}
          <div className="flex flex-col space-y-2 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">
              Hesabınıza Giriş Yapın
            </h1>
            <p className="text-sm text-muted-foreground">
              Hoşgeldiniz, lütfen kimlik bilgilerinizi girin.
            </p>
          </div>
          
          {/* Login Form */}
          <LoginForm />
        </div>
      </div>
    </div>
  )
}
