import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  if (!adminUser) throw new Error("No admin user found");

  const materialOrders = await prisma.materialOrder.findMany({
    include: {
      vendor: true,
      project: true,
    }
  });

  let count = 0;
  for (const order of materialOrders) {
    // Check if an expense with this description already exists
    const desc = `Material Order: ${order.orderNumber}`;
    const existing = await prisma.expense.findFirst({
      where: { description: desc }
    });

    if (!existing) {
      await prisma.expense.create({
        data: {
          vendorId: order.vendorId,
          projectId: order.projectId,
          type: 'MATERIAL',
          amount: order.totalAmount,
          paymentDate: order.deliveryDate ? new Date(order.deliveryDate) : new Date(order.createdAt),
          paymentMethod: 'ACCRUED',
          description: desc,
          remarks: order.notes,
          createdById: adminUser.id,
        }
      });
      count++;
    }
  }

  console.log(`Backfilled ${count} material orders as expenses.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
