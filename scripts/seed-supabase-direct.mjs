import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing from .env')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function seed() {
  console.log('🌱 Directly seeding Supabase via REST API...')

  try {
    const now = new Date().toISOString()

    // 1. Create Outlets
    console.log('Creating outlets...')
    const outlets = [
      { id: 'outlet_restaurant', name: 'Restaurant', type: 'RESTAURANT', createdAt: now },
      { id: 'outlet_cafe', name: 'Cafe', type: 'CAFE', createdAt: now },
      { id: 'outlet_chai', name: 'Chai Joint', type: 'CHAI_JOINT', createdAt: now },
    ]

    for (const outlet of outlets) {
      const { data, error } = await supabase
        .from('Outlet')
        .upsert(outlet, { onConflict: 'id' })
      
      if (error) throw error
      console.log(`✅ Outlet ${outlet.name} created/updated.`)
    }

    // 2. Create Users
    console.log('Creating users...')
    const users = [
      { id: 'user_owner', name: 'Admin Owner', email: 'owner@fulbari.com', pin: '1234', role: 'OWNER', createdAt: now, updatedAt: now },
      { id: 'user_inv_manager', name: 'Inventory Manager', pin: '2222', role: 'INV_MANAGER', createdAt: now, updatedAt: now },
      { id: 'user_rest_staff', name: 'Restaurant Staff', pin: '3333', role: 'REST_STAFF', createdAt: now, updatedAt: now },
      { id: 'user_cafe_staff', name: 'Cafe Staff', pin: '4444', role: 'CAFE_STAFF', createdAt: now, updatedAt: now },
      { id: 'user_chai_staff', name: 'Chai Staff', pin: '5555', role: 'CHAI_STAFF', createdAt: now, updatedAt: now },
    ]

    for (const user of users) {
      const { data, error } = await supabase
        .from('User')
        .upsert(user, { onConflict: 'id' })
      
      if (error) throw error
      console.log(`✅ User ${user.name} created/updated with PIN: ${user.pin}`)
    }

    console.log('\n🎉 Supabase seeding complete!')
    console.log('Login with these PINs on https://fulbari-inventory-pos.vercel.app')
    console.log('  Admin Owner: 1234')
    console.log('  Cafe Staff: 4444')
    
  } catch (err) {
    console.error('❌ Seeding failed:', err.message)
    console.error(err)
  }
}

seed()
