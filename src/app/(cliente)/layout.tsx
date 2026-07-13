import { BottomNav } from "@/components/layout/bottom-nav"
import { ClientSidebar } from "@/components/layout/client-sidebar"
import { createClient } from "@/lib/supabase/server"

export default async function ClienteLayout({ children }: { children: React.ReactNode }) {
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
