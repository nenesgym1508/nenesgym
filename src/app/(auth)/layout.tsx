import Image from "next/image"
import { AuthBackground } from "@/components/layout/auth-background"

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-full flex flex-col items-center justify-center overflow-hidden px-4 py-4 sm:py-12">
      <AuthBackground />
      <div className="relative z-10 mb-2 sm:mb-6 text-center flex flex-col items-center justify-center">
        {/* Glow Radial Gradient Effect from the Center */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -z-10 h-48 w-48 sm:h-80 sm:w-80 rounded-full bg-red-600/20 blur-[50px] sm:blur-[80px] pointer-events-none" />

        <Image
          src="/logo-v3.png"
          alt="NENE'S GYM"
          width={220}
          height={220}
          priority
          className="mx-auto h-44 w-44 sm:h-56 sm:w-56 object-contain drop-shadow-[0_12px_35px_rgba(220,38,38,0.55)] sm:drop-shadow-[0_15px_45px_rgba(220,38,38,0.6)] transition-transform duration-500 hover:scale-105"
        />
        <h1 
          className="text-5xl sm:text-7xl tracking-wider uppercase mt-2 sm:mt-3 font-black whitespace-nowrap drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]"
          style={{ 
            fontFamily: 'var(--font-bebas), Impact, sans-serif',
            background: 'radial-gradient(ellipse at center, #ffffff 30%, #a1a1aa 70%, #52525b 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          NENE&apos;S GYM
        </h1>
      </div>
      <div className="relative z-10 w-full max-w-sm">{children}</div>
    </div>
  )
}
