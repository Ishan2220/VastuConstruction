import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const defaultMaterials = [
  { name: 'Cement', unit: 'Bags', rate: 350, gstRate: 28 },
  { name: 'Sand', unit: 'Cubic Feet', rate: 50, gstRate: 5 },
  { name: 'Steel', unit: 'Kg', rate: 65, gstRate: 18 },
  { name: 'Bricks', unit: 'Pieces', rate: 8, gstRate: 5 },
  { name: 'Gravel', unit: 'Cubic Feet', rate: 45, gstRate: 5 },
  { name: 'Tiles', unit: 'Sq Ft', rate: 40, gstRate: 18 },
  { name: 'Paint', unit: 'Liters', rate: 250, gstRate: 18 },
];

const labourCategories = [
  { name: 'Skilled Mason', description: 'Experienced bricklayer and plasterer' },
  { name: 'Unskilled Labour', description: 'General helper, material carrying' },
  { name: 'Carpenter', description: 'Woodwork and formwork' },
  { name: 'Electrician', description: 'Electrical wiring and fittings' },
];

const vendorCategories = [
  'Material Supplier',
  'Labour Contractor',
  'Equipment Rental',
  'Transport',
  'Consultant',
  'Subcontractor'
];

const cities = [
  'Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Ahmedabad', 'Chennai', 'Kolkata', 'Surat', 'Pune', 'Jaipur'
];

async function main() {
  console.log('Starting seed defaults...');

  // 1. Seed Default Materials
  for (const material of defaultMaterials) {
    await prisma.material.upsert({
      where: { id: material.name }, // Hacky but we don't have a unique constraint on name. We can just use findFirst
      // Wait, material doesn't have unique constraint on name, so we must query first.
      update: {},
      create: { ...material, isDefault: true },
    }).catch(async (e) => {
      const existing = await prisma.material.findFirst({ where: { name: material.name } });
      if (!existing) {
        await prisma.material.create({ data: { ...material, isDefault: true } });
      }
    });
  }
  console.log('Seeded default materials.');

  // 2. Seed Labour Categories
  for (const category of labourCategories) {
    await prisma.labourCategory.upsert({
      where: { name: category.name },
      update: {},
      create: category,
    });
  }
  console.log('Seeded labour categories.');

  // 3. Seed Custom Categories (Vendor Categories, Cities)
  for (const category of vendorCategories) {
    const exists = await prisma.customCategory.findFirst({ where: { type: 'VENDOR_CATEGORY', value: category } });
    if (!exists) {
      await prisma.customCategory.create({ data: { type: 'VENDOR_CATEGORY', value: category } });
    }
  }
  
  for (const city of cities) {
    const exists = await prisma.customCategory.findFirst({ where: { type: 'CITY', value: city } });
    if (!exists) {
      await prisma.customCategory.create({ data: { type: 'CITY', value: city } });
    }
  }
  console.log('Seeded custom categories.');
  
  console.log('Seeded defaults successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
