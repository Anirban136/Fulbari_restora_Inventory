const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const user = await prisma.user.findFirst({
    where: { role: 'OWNER' }
  })
  if (user) {
    console.log(`User found: ${user.name}, PIN: ${user.pin}`)
  } else {
    console.log('No OWNER user found')
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
