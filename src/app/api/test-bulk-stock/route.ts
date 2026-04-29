import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    console.log("Test API called")
    
    const session = await getServerSession(authOptions)
    console.log("Session data:", JSON.stringify(session, null, 2))
    
    if (!session) {
      return NextResponse.json({ 
        error: "No session found",
        debug: "User is not logged in"
      }, { status: 401 })
    }
    
    return NextResponse.json({ 
      message: "Session found",
      user: session.user,
      role: session.user.role,
      debug: "Authentication working"
    })
    
  } catch (error) {
    console.error("Test API error:", error)
    return NextResponse.json({ 
      error: "Test API failed",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
