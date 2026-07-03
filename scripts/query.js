const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const items = await prisma.item.findMany({
    where: { name: { contains: 'GOLD FLAKE LITE' } }
  });
  console.log("ITEMS:", items);

  const stock = await prisma.outletStock.findMany({
    where: { Item: { name: { contains: 'GOLD FLAKE LITE' } } },
    include: { Item: true, Outlet: true }
  });
  console.log("STOCK:", stock.map(s => ({ outlet: s.Outlet.name, item: s.Item.name, qty: s.quantity })));
}

main().finally(() => prisma.$disconnect());
