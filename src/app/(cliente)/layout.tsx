import { BottomNav } from "@/components/layout/bottom-nav"
import { ClientSidebar } from "@/components/layout/client-sidebar"
import { FocusRefresh } from "@/components/layout/focus-refresh"
import { getAuthenticatedSession } from "@/lib/auth/session"

export default async function ClienteLayout({ children }: { children: React.ReactNode }) {
  const session = await getAuthenticatedSession()
  const fullName = session?.profile?.full_name ?? null

  return (
    <div className="min-h-screen flex bg-background">
      <FocusRefresh />
      <ClientSidebar fullName={fullName} />
      <main className="flex-1 md:ml-64 pb-20 md:pb-10 overflow-y-auto">
        <div className="mx-auto w-full max-w-lg md:max-w-3xl">{children}</div>
      </main>
      <div className="md:hidden">
        <BottomNav role="client" />
      </div>
    </div>
  )
}

