import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const allProperties = await prisma.properties.findMany({
    include: {
      property_images: true
    }
  });
  
  const viProperties = allProperties.filter(p => 
    p.city.toLowerCase().includes('victoria island') ||
    p.address.toLowerCase().includes('victoria island') ||
    p.title.toLowerCase().includes('victoria island') ||
    p.description.toLowerCase().includes('victoria island')
  );

  console.log('--- ALL PROPERTIES ---');
  console.log(JSON.stringify(allProperties.map(p => ({
    id: p.id,
    title: p.title,
    city: p.city,
    price: p.price,
    approval_status: p.approval_status
  })), null, 2));

  console.log('--- VICTORIA ISLAND PROPERTIES ---');
  console.log(JSON.stringify(viProperties, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
