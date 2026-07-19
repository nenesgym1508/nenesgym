import { BottomNav } from "@/components/layout/bottom-nav"
import { AdminSidebar } from "@/components/layout/admin-sidebar"
import { FocusRefresh } from "@/components/layout/focus-refresh"
import { getAuthenticatedSession } from "@/lib/auth/session"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getAuthenticatedSession()
  const fullName = session?.profile?.full_name ?? null

  return (
    <div className="min-h-screen flex bg-background">
      <FocusRefresh />
      <AdminSidebar fullName={fullName} />
      <main className="flex-1 md:ml-64 pb-20 md:pb-0 overflow-y-auto">{children}</main>
      <div className="md:hidden">
        <BottomNav role="admin" />
      </div>
    </div>
  )
}

