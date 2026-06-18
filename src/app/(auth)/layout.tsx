export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 py-12">
      <div className="mb-10 text-center">
        <div className="inline-flex items-center justify-center size-16 rounded-2xl bg-red-600 mb-4">
          <span className="text-2xl font-black text-white">NG</span>
        </div>
        <h1 className="text-2xl font-black tracking-tight text-zinc-100">
          NENE&apos;S GYM
        </h1>
        <p className="text-sm text-zinc-500 mt-1">Sistema de gestión</p>
      </div>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  )
}
