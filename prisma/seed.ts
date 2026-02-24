// prisma/seed.ts — v2
// Creates demo restaurant with suppliers, ingredients, invoices, and recipes

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...\n");

  // Clean existing data
  await prisma.priceHistory.deleteMany();
  await prisma.recipeItem.deleteMany();
  await prisma.recipe.deleteMany();
  await prisma.lineItem.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.ingredient.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.restaurant.deleteMany();

  // ─── RESTAURANT ──────────────────────────────────────────
  const restaurant = await prisma.restaurant.create({
    data: {
      name: "La Terraza Roma (Demo)",
      slug: "la-terraza-roma",
      address: "Calle Orizaba 87, Col. Roma Norte",
      city: "CDMX",
      state: "Ciudad de México",
      phone: "+52 55 1234 5678",
      email: "demo@toastmx.com",
    },
  });
  console.log(`✅ Restaurant: ${restaurant.name}`);

  // ─── SUPPLIERS ───────────────────────────────────────────
  const [carnes, verduras, abarrotes, lacteos] = await Promise.all([
    prisma.supplier.create({
      data: {
        name: "Carnes Selectas El Patrón",
        contactName: "Roberto Hernández",
        phone: "+52 55 9876 5432",
        notes: "Entregas Lun/Mié/Vie 7am. Central de Abastos.",
        restaurantId: restaurant.id,
      },
    }),
    prisma.supplier.create({
      data: {
        name: "Verduras Frescas del Campo",
        contactName: "María López",
        phone: "+52 55 5555 1234",
        notes: "Entregas diarias 6am. Producto orgánico disponible.",
        restaurantId: restaurant.id,
      },
    }),
    prisma.supplier.create({
      data: {
        name: "Abarrotes La Esperanza",
        contactName: "Juan Martínez",
        notes: "Pedidos por WhatsApp, entrega en 24h",
        restaurantId: restaurant.id,
      },
    }),
    prisma.supplier.create({
      data: {
        name: "Lácteos Santa Clara",
        contactName: "Ana García",
        phone: "+52 55 3333 4444",
        notes: "Entregas Mar/Jue/Sáb",
        restaurantId: restaurant.id,
      },
    }),
  ]);
  console.log(`✅ 4 suppliers created`);

  // ─── INGREDIENTS ─────────────────────────────────────────
  const ing = {
    pollo: await prisma.ingredient.create({
      data: { name: "Pechuga de pollo s/h", category: "Proteínas", unit: "kg", currentPrice: 89.0, restaurantId: restaurant.id },
    }),
    arrachera: await prisma.ingredient.create({
      data: { name: "Arrachera de res", category: "Proteínas", unit: "kg", currentPrice: 189.0, restaurantId: restaurant.id },
    }),
    cerdo: await prisma.ingredient.create({
      data: { name: "Lomo de cerdo", category: "Proteínas", unit: "kg", currentPrice: 95.0, restaurantId: restaurant.id },
    }),
    camaron: await prisma.ingredient.create({
      data: { name: "Camarón U-15", category: "Proteínas", unit: "kg", currentPrice: 280.0, restaurantId: restaurant.id },
    }),
    tortillaMaiz: await prisma.ingredient.create({
      data: { name: "Tortilla de maíz", category: "Básicos", unit: "kg", currentPrice: 22.0, restaurantId: restaurant.id },
    }),
    tortillaHarina: await prisma.ingredient.create({
      data: { name: "Tortilla de harina", category: "Básicos", unit: "kg", currentPrice: 35.0, restaurantId: restaurant.id },
    }),
    arroz: await prisma.ingredient.create({
      data: { name: "Arroz grano largo", category: "Básicos", unit: "kg", currentPrice: 28.0, restaurantId: restaurant.id },
    }),
    tomate: await prisma.ingredient.create({
      data: { name: "Tomate saladette", category: "Verduras", unit: "kg", currentPrice: 18.5, restaurantId: restaurant.id },
    }),
    cebolla: await prisma.ingredient.create({
      data: { name: "Cebolla blanca", category: "Verduras", unit: "kg", currentPrice: 15.0, restaurantId: restaurant.id },
    }),
    aguacate: await prisma.ingredient.create({
      data: { name: "Aguacate Hass", category: "Verduras", unit: "kg", currentPrice: 65.0, restaurantId: restaurant.id },
    }),
    limon: await prisma.ingredient.create({
      data: { name: "Limón sin semilla", category: "Verduras", unit: "kg", currentPrice: 25.0, restaurantId: restaurant.id },
    }),
    chile: await prisma.ingredient.create({
      data: { name: "Chile serrano", category: "Verduras", unit: "kg", currentPrice: 30.0, restaurantId: restaurant.id },
    }),
    cilantro: await prisma.ingredient.create({
      data: { name: "Cilantro", category: "Verduras", unit: "manojo", currentPrice: 5.0, restaurantId: restaurant.id },
    }),
    quesoOaxaca: await prisma.ingredient.create({
      data: { name: "Queso Oaxaca", category: "Lácteos", unit: "kg", currentPrice: 120.0, restaurantId: restaurant.id },
    }),
    crema: await prisma.ingredient.create({
      data: { name: "Crema ácida", category: "Lácteos", unit: "L", currentPrice: 55.0, restaurantId: restaurant.id },
    }),
    aceite: await prisma.ingredient.create({
      data: { name: "Aceite vegetal", category: "Abarrotes", unit: "L", currentPrice: 38.0, restaurantId: restaurant.id },
    }),
    frijol: await prisma.ingredient.create({
      data: { name: "Frijol negro", category: "Básicos", unit: "kg", currentPrice: 32.0, restaurantId: restaurant.id },
    }),
    pina: await prisma.ingredient.create({
      data: { name: "Piña miel", category: "Frutas", unit: "pza", currentPrice: 35.0, restaurantId: restaurant.id },
    }),
  };
  console.log(`✅ ${Object.keys(ing).length} ingredients created`);

  // ─── PRICE HISTORY (simulate last 4 weeks) ──────────────
  const now = new Date();
  for (const [key, ingredient] of Object.entries(ing)) {
    const basePrice = Number(ingredient.currentPrice);
    for (let week = 3; week >= 0; week--) {
      const date = new Date(now);
      date.setDate(date.getDate() - week * 7);
      const variance = 1 + (Math.random() * 0.1 - 0.05); // ±5%
      await prisma.priceHistory.create({
        data: {
          price: Math.round(basePrice * variance * 100) / 100,
          date,
          ingredientId: ingredient.id,
          supplierId: carnes.id,
        },
      });
    }
  }
  console.log(`✅ Price history seeded (4 weeks)`);

  // ─── RECIPES ─────────────────────────────────────────────
  const recipesData = [
    {
      name: "Tacos al Pastor (orden de 3)",
      category: "Tacos",
      sellPrice: 75.0,
      yield: 1,
      items: [
        { ingredientId: ing.cerdo.id, quantity: 0.15, unit: "kg" },
        { ingredientId: ing.tortillaMaiz.id, quantity: 0.09, unit: "kg" },
        { ingredientId: ing.pina.id, quantity: 0.05, unit: "pza" },
        { ingredientId: ing.cebolla.id, quantity: 0.02, unit: "kg" },
        { ingredientId: ing.cilantro.id, quantity: 0.1, unit: "manojo" },
      ],
    },
    {
      name: "Tacos de Arrachera (orden de 3)",
      category: "Tacos",
      sellPrice: 95.0,
      yield: 1,
      items: [
        { ingredientId: ing.arrachera.id, quantity: 0.15, unit: "kg" },
        { ingredientId: ing.tortillaMaiz.id, quantity: 0.09, unit: "kg" },
        { ingredientId: ing.cebolla.id, quantity: 0.03, unit: "kg" },
        { ingredientId: ing.cilantro.id, quantity: 0.1, unit: "manojo" },
        { ingredientId: ing.limon.id, quantity: 0.02, unit: "kg" },
      ],
    },
    {
      name: "Quesadilla de Queso Oaxaca",
      category: "Quesadillas",
      sellPrice: 55.0,
      yield: 1,
      items: [
        { ingredientId: ing.tortillaHarina.id, quantity: 0.08, unit: "kg" },
        { ingredientId: ing.quesoOaxaca.id, quantity: 0.1, unit: "kg" },
        { ingredientId: ing.aceite.id, quantity: 0.02, unit: "L" },
      ],
    },
    {
      name: "Quesadilla de Arrachera",
      category: "Quesadillas",
      sellPrice: 95.0,
      yield: 1,
      items: [
        { ingredientId: ing.tortillaHarina.id, quantity: 0.08, unit: "kg" },
        { ingredientId: ing.arrachera.id, quantity: 0.12, unit: "kg" },
        { ingredientId: ing.quesoOaxaca.id, quantity: 0.08, unit: "kg" },
        { ingredientId: ing.aceite.id, quantity: 0.02, unit: "L" },
      ],
    },
    {
      name: "Guacamole con Totopos",
      category: "Entradas",
      sellPrice: 85.0,
      yield: 1,
      items: [
        { ingredientId: ing.aguacate.id, quantity: 0.25, unit: "kg" },
        { ingredientId: ing.tomate.id, quantity: 0.05, unit: "kg" },
        { ingredientId: ing.cebolla.id, quantity: 0.03, unit: "kg" },
        { ingredientId: ing.chile.id, quantity: 0.01, unit: "kg" },
        { ingredientId: ing.cilantro.id, quantity: 0.2, unit: "manojo" },
        { ingredientId: ing.limon.id, quantity: 0.02, unit: "kg" },
      ],
    },
    {
      name: "Tacos de Camarón (orden de 3)",
      category: "Tacos",
      sellPrice: 120.0,
      yield: 1,
      items: [
        { ingredientId: ing.camaron.id, quantity: 0.15, unit: "kg" },
        { ingredientId: ing.tortillaMaiz.id, quantity: 0.09, unit: "kg" },
        { ingredientId: ing.aguacate.id, quantity: 0.05, unit: "kg" },
        { ingredientId: ing.cebolla.id, quantity: 0.02, unit: "kg" },
        { ingredientId: ing.aceite.id, quantity: 0.03, unit: "L" },
      ],
    },
    {
      name: "Arroz con Pollo",
      category: "Platos fuertes",
      sellPrice: 110.0,
      yield: 1,
      items: [
        { ingredientId: ing.pollo.id, quantity: 0.25, unit: "kg" },
        { ingredientId: ing.arroz.id, quantity: 0.15, unit: "kg" },
        { ingredientId: ing.tomate.id, quantity: 0.08, unit: "kg" },
        { ingredientId: ing.cebolla.id, quantity: 0.04, unit: "kg" },
        { ingredientId: ing.aceite.id, quantity: 0.03, unit: "L" },
      ],
    },
    {
      name: "Frijoles Charros",
      category: "Acompañamientos",
      sellPrice: 45.0,
      yield: 1,
      items: [
        { ingredientId: ing.frijol.id, quantity: 0.12, unit: "kg" },
        { ingredientId: ing.tomate.id, quantity: 0.05, unit: "kg" },
        { ingredientId: ing.cebolla.id, quantity: 0.03, unit: "kg" },
        { ingredientId: ing.chile.id, quantity: 0.01, unit: "kg" },
        { ingredientId: ing.cilantro.id, quantity: 0.1, unit: "manojo" },
      ],
    },
  ];

  for (const r of recipesData) {
    await prisma.recipe.create({
      data: {
        name: r.name,
        category: r.category,
        sellPrice: r.sellPrice,
        yield: r.yield,
        restaurantId: restaurant.id,
        items: {
          create: r.items.map((item) => ({
            ingredientId: item.ingredientId,
            quantity: item.quantity,
            unit: item.unit,
          })),
        },
      },
    });
  }
  console.log(`✅ ${recipesData.length} recipes created`);

  // ─── SAMPLE CONFIRMED INVOICES ───────────────────────────
  const invoicesData = [
    {
      supplier: carnes,
      invoiceNumber: "F-2026-00121",
      daysAgo: 2,
      items: [
        { desc: "Pechuga de pollo s/h", qty: 15, unit: "kg", price: 89.0, ingredientId: ing.pollo.id },
        { desc: "Arrachera de res", qty: 8, unit: "kg", price: 189.0, ingredientId: ing.arrachera.id },
        { desc: "Lomo de cerdo", qty: 10, unit: "kg", price: 95.0, ingredientId: ing.cerdo.id },
      ],
    },
    {
      supplier: verduras,
      invoiceNumber: "NV-4502",
      daysAgo: 3,
      items: [
        { desc: "Tomate saladette", qty: 10, unit: "kg", price: 18.5, ingredientId: ing.tomate.id },
        { desc: "Cebolla blanca", qty: 8, unit: "kg", price: 15.0, ingredientId: ing.cebolla.id },
        { desc: "Aguacate Hass", qty: 5, unit: "kg", price: 65.0, ingredientId: ing.aguacate.id },
        { desc: "Limón sin semilla", qty: 3, unit: "kg", price: 25.0, ingredientId: ing.limon.id },
      ],
    },
    {
      supplier: lacteos,
      invoiceNumber: "SC-2026-889",
      daysAgo: 4,
      items: [
        { desc: "Queso Oaxaca", qty: 5, unit: "kg", price: 120.0, ingredientId: ing.quesoOaxaca.id },
        { desc: "Crema ácida", qty: 4, unit: "L", price: 55.0, ingredientId: ing.crema.id },
      ],
    },
    {
      supplier: carnes,
      invoiceNumber: "F-2026-00098",
      daysAgo: 9,
      items: [
        { desc: "Pechuga de pollo s/h", qty: 12, unit: "kg", price: 87.0, ingredientId: ing.pollo.id },
        { desc: "Arrachera de res", qty: 6, unit: "kg", price: 185.0, ingredientId: ing.arrachera.id },
        { desc: "Camarón U-15", qty: 4, unit: "kg", price: 280.0, ingredientId: ing.camaron.id },
      ],
    },
  ];

  for (const inv of invoicesData) {
    const invoiceDate = new Date(now);
    invoiceDate.setDate(invoiceDate.getDate() - inv.daysAgo);

    const total = inv.items.reduce((s, i) => s + i.qty * i.price, 0);
    const tax = Math.round(total * 0.16 * 100) / 100;

    await prisma.invoice.create({
      data: {
        restaurantId: restaurant.id,
        supplierId: inv.supplier.id,
        invoiceNumber: inv.invoiceNumber,
        invoiceDate,
        subtotal: total,
        tax,
        total: total + tax,
        status: "CONFIRMED",
        lineItems: {
          create: inv.items.map((item) => ({
            description: item.desc,
            quantity: item.qty,
            unit: item.unit,
            unitPrice: item.price,
            totalPrice: item.qty * item.price,
            ingredientId: item.ingredientId,
          })),
        },
      },
    });
  }
  console.log(`✅ ${invoicesData.length} confirmed invoices created`);

  console.log("\n🎉 Seed complete!");
  console.log(`\n📋 Restaurant ID: ${restaurant.id}`);
  console.log("   Copy this and paste it in the app.\n");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
