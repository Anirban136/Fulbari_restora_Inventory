import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const chaiJoint = await prisma.outlet.findFirst({
    where: { type: "CHAI_JOINT" },
  });
  console.log("CHAI JOINT:", chaiJoint);
  
  if (!chaiJoint) {
    console.log("No chai joint found");
    return;
  }
  
  const menuItems = await prisma.menuItem.findMany({
    where: { outletId: chaiJoint.id },
    select: { name: true, itemId: true }
  });
  console.log("MENU ITEMS (CHAI):", menuItems);
}

main().catch(console.error).finally(() => prisma.$disconnect());
