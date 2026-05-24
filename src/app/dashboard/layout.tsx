import { redirect } from "next/navigation"
import AppLayout from "@/components/layouts/app-layout"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const role = session.user?.role
  if (role === "CAFE_STAFF") redirect('/cafe')
  if (role === "CHAI_STAFF") redirect('/chai')
  if (role === "REST_STAFF") redirect('/restaurant')

  return (
    <AppLayout user={session?.user}>
      <div className="p-4 sm:p-6 lg:p-10">
        {children}
      </div>
    </AppLayout>
  )
}
