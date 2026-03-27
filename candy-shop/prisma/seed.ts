import { PrismaClient } from "../src/generated/prisma";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Seed super admin
  const adminEmail = process.env.ADMIN_EMAIL || "admin@candyshop.com";
  const adminPassword = process.env.ADMIN_PASSWORD || "admin123";

  const existing = await prisma.admin.findUnique({ where: { email: adminEmail } });
  if (!existing) {
    const hashed = await bcrypt.hash(adminPassword, 12);
    await prisma.admin.create({
      data: {
        name: "Super Admin",
        email: adminEmail,
        password: hashed,
        isSuperAdmin: true,
      },
    });
    console.log(`✓ Admin created: ${adminEmail} / ${adminPassword}`);
  }

  // Seed sample candies
  const candies = [
    {
      name: "Haribo Goldbears",
      description: "Classic gummy bears in assorted fruit flavors — a timeless treat loved by all.",
      price: 12.5,
      category: "gummy",
      image: "https://images.unsplash.com/photo-1581798459219-318b9b9e8b22?w=400&q=80",
    },
    {
      name: "Cadbury Dairy Milk",
      description: "Smooth and creamy milk chocolate that melts in your mouth.",
      price: 18.0,
      category: "chocolate",
      image: "https://images.unsplash.com/photo-1606312619070-d48b4c652a52?w=400&q=80",
    },
    {
      name: "Chupa Chups Lollipops",
      description: "Iconic round lollipops in strawberry, orange, and cola flavors.",
      price: 8.0,
      category: "lollipop",
      image: "https://images.unsplash.com/photo-1599490659213-e2b9527bd087?w=400&q=80",
    },
    {
      name: "Skittles Rainbow",
      description: "Taste the rainbow with these fruity chewy candies.",
      price: 10.0,
      category: "chewy",
      image: "https://images.unsplash.com/photo-1633113216120-53ca91d9d5c0?w=400&q=80",
    },
    {
      name: "Sour Patch Kids",
      description: "First sour, then sweet — the perfect candy experience.",
      price: 11.0,
      category: "sour",
      image: "https://images.unsplash.com/photo-1582058091597-5258877d39e9?w=400&q=80",
    },
    {
      name: "M&M's Milk Chocolate",
      description: "Colorful candy-coated chocolate pieces in a shareable bag.",
      price: 15.0,
      category: "chocolate",
      image: "https://images.unsplash.com/photo-1525385133512-2f3bdd039054?w=400&q=80",
    },
    {
      name: "Twizzlers Strawberry",
      description: "Chewy strawberry-flavored licorice twists.",
      price: 9.5,
      category: "chewy",
      image: "https://images.unsplash.com/photo-1599490659213-e2b9527bd087?w=400&q=80",
    },
    {
      name: "Reese's Peanut Butter Cups",
      description: "Creamy peanut butter wrapped in smooth milk chocolate.",
      price: 20.0,
      category: "chocolate",
      image: "https://images.unsplash.com/photo-1606312619070-d48b4c652a52?w=400&q=80",
    },
  ];

  for (const candy of candies) {
    const existing = await prisma.product.findFirst({ where: { name: candy.name } });
    if (!existing) {
      await prisma.product.create({ data: { ...candy, stock: 50 } });
      console.log(`✓ Product: ${candy.name}`);
    }
  }

  console.log("\n🍬 Seed complete!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
