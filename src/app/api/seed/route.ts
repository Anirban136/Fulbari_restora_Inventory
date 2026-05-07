import { NextResponse } from "next/server";
export const dynamic = 'force-dynamic'
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    console.log("Starting database seed...");
    const existingOwner = await prisma.user.findFirst({ where: { role: 'OWNER' }});
    if (existingOwner) {
      console.log("Database already seeded. Found owner:", existingOwner.name);
      return NextResponse.json({ message: "Database already seeded." });
    }

    console.log("Creating outlets...");
    // Create Outlets using upsert with fixed IDs to prevent duplicates
    await prisma.outlet.upsert({
      where: { id: 'outlet_restaurant' },
      update: {},
      create: { id: 'outlet_restaurant', name: 'Restaurant', type: 'RESTAURANT' }
    })
    await prisma.outlet.upsert({
      where: { id: 'outlet_cafe' },
      update: {},
      create: { id: 'outlet_cafe', name: 'Cafe', type: 'CAFE' }
    })
    await prisma.outlet.upsert({
      where: { id: 'outlet_chai' },
      update: {},
      create: { id: 'outlet_chai', name: 'Chai Joint', type: 'CHAI_JOINT' }
    })

    console.log("Creating users...");
    // Create Users
    await prisma.user.create({ data: { name: 'Admin Owner', email: 'owner@fulbari.com', pin: '1234', role: 'OWNER' }})
    await prisma.user.create({ data: { name: 'Inventory Manager', pin: '2222', role: 'INV_MANAGER' }})
    await prisma.user.create({ data: { name: 'Restaurant Staff', pin: '3333', role: 'REST_STAFF' }})
    await prisma.user.create({ data: { name: 'Cafe Staff', pin: '4444', role: 'CAFE_STAFF' }})
    await prisma.user.create({ data: { name: 'Chai Staff', pin: '5555', role: 'CHAI_STAFF' }})

    console.log("Seeding finished successfully!");
    return NextResponse.json({ message: "Seeding finished successfully!" })
  } catch (error: any) {
    console.error("Seeding error:", error);
    return NextResponse.json({ 
      error: error.message,
      stack: error.stack,
      hint: "Check if the database is reachable and migrations have been run."
    }, { status: 500 })
  }
}
