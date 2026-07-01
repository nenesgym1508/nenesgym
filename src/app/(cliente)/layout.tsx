import { BottomNav } from "@/components/layout/bottom-nav"

export default function ClienteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <main className="flex-1 pb-20 overflow-y-auto">
        <div className="mx-auto w-full max-w-lg">{children}</div>
      </main>
      <BottomNav role="client" />
    </div>
  )
}
