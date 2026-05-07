import { prisma } from "./prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "./auth"

export async function verifyAdminPin(pin: string) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user.role !== "OWNER" && session.user.role !== "ADMIN")) {
    throw new Error("Unauthorized: Administrative authorization required")
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { pin: true }
  })

  if (!user || user.pin !== pin) {
    throw new Error("Invalid Security PIN: Verification failed.")
  }

  return session
}
