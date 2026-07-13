import { BottomNav } from "@/components/layout/bottom-nav"
import { AdminSidebar } from "@/components/layout/admin-sidebar"
import { createClient } from "@/lib/supabase/server"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let fullName: string | null = null
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single()
    fullName = profile?.full_name ?? null
  }

  return (
    <div className="min-h-screen flex bg-background">
      <AdminSidebar fullName={fullName} />
      <main className="flex-1 md:ml-64 pb-20 md:pb-0 overflow-y-auto">{children}</main>
      <div className="md:hidden">
        <BottomNav role="admin" />
      </div>
    </div>
  )
}
