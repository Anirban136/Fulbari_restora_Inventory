// Seed script for Supabase PostgreSQL - creates users and outlets
import { PrismaClient } from '@prisma/client'
import * as dotenv from 'dotenv'
dotenv.config()

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Check if already seeded
  const existingUser = await prisma.user.findFirst()
  if (existingUser) {
    console.log('⚠️  Users already exist. Skipping user creation.')
    console.log('Existing user:', existingUser.name, '- PIN:', existingUser.pin, '- Role:', existingUser.role)
    await prisma.$disconnect()
    return
  }

  // Create Outlets
  const restaurant = await prisma.outlet.upsert({
    where: { id: 'outlet_restaurant' },
    update: {},
    create: { id: 'outlet_restaurant', name: 'Restaurant', type: 'RESTAURANT' },
  })
  const cafe = await prisma.outlet.upsert({
    where: { id: 'outlet_cafe' },
    update: {},
    create: { id: 'outlet_cafe', name: 'Cafe', type: 'CAFE' },
  })
  const chaiJoint = await prisma.outlet.upsert({
    where: { id: 'outlet_chai' },
    update: {},
    create: { id: 'outlet_chai', name: 'Chai Joint', type: 'CHAI_JOINT' },
  })

  console.log('✅ Outlets created:', restaurant.name, cafe.name, chaiJoint.name)

  // Create Users
  const users = [
    { name: 'Admin Owner',        email: 'owner@fulbari.com', pin: '1234', role: 'OWNER' },
    { name: 'Inventory Manager',  pin: '2222', role: 'INV_MANAGER' },
    { name: 'Restaurant Staff',   pin: '3333', role: 'REST_STAFF' },
    { name: 'Cafe Staff',         pin: '4444', role: 'CAFE_STAFF' },
    { name: 'Chai Staff',         pin: '5555', role: 'CHAI_STAFF' },
  ]

  for (const userData of users) {
    const user = await prisma.user.create({ data: userData })
    console.log(`✅ Created user: ${user.name} | PIN: ${user.pin} | Role: ${user.role}`)
  }

  console.log('\n🎉 Seeding complete! Login with these PINs:')
  console.log('  Owner (full access):        PIN 1234')
  console.log('  Inventory Manager:          PIN 2222')
  console.log('  Restaurant Staff:           PIN 3333')
  console.log('  Cafe Staff:                 PIN 4444')
  console.log('  Chai Staff:                 PIN 5555')
}

main().catch((e) => {
  console.error('❌ Seed failed:', e.message)
  process.exit(1)
}).finally(() => prisma.$disconnect())
