const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const user = await prisma.user.findFirst({
    where: { role: { in: ['CAFE_STAFF', 'CHAI_STAFF'] } }
  })
  if (user) {
    console.log(`Staff found: ${user.name}, Role: ${user.role}, PIN: ${user.pin}`)
  } else {
    console.log('No staff user found')
  }
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
