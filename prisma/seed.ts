// prisma/seed.ts — v2
// Creates demo restaurant with suppliers, ingredients, invoices, and recipes

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...\n");

  // Clean existing data
  await prisma.inventoryMovement.deleteMany();
  await prisma.inventoryLevel.deleteMany();
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

  // ─── INVENTORY LEVELS + MOVEMENTS ──────────────────────
  // Create varied inventory states: OK, Bajo, Crítico
  const inventoryConfig: {
    key: keyof typeof ing;
    onHand: number;
    low: number;
    critical: number;
    movements: { delta: number; source: string; notes: string | null; daysAgo: number }[];
  }[] = [
    {
      key: "pollo",
      onHand: 8.5,
      low: 5,
      critical: 2,
      movements: [
        { delta: 15, source: "INVOICE", notes: null, daysAgo: 9 },
        { delta: -3.5, source: "MANUAL_ADJUST", notes: "Uso diario cocina", daysAgo: 7 },
        { delta: 12, source: "INVOICE", notes: null, daysAgo: 2 },
        { delta: -5, source: "MANUAL_ADJUST", notes: "Uso fin de semana", daysAgo: 1 },
        { delta: -10, source: "MANUAL_ADJUST", notes: "Consumo semanal", daysAgo: 0 },
      ],
    },
    {
      key: "arrachera",
      onHand: 2.5,
      low: 3,
      critical: 1,
      movements: [
        { delta: 6, source: "INVOICE", notes: null, daysAgo: 9 },
        { delta: -2, source: "MANUAL_ADJUST", notes: "Consumo viernes", daysAgo: 5 },
        { delta: 8, source: "INVOICE", notes: null, daysAgo: 2 },
        { delta: -4, source: "MANUAL_ADJUST", notes: "Evento privado", daysAgo: 1 },
        { delta: -5.5, source: "MANUAL_ADJUST", notes: "Fin de semana alto", daysAgo: 0 },
      ],
    },
    {
      key: "cerdo",
      onHand: 7,
      low: 4,
      critical: 1.5,
      movements: [
        { delta: 10, source: "INVOICE", notes: null, daysAgo: 9 },
        { delta: -3, source: "MANUAL_ADJUST", notes: "Prep tacos al pastor", daysAgo: 4 },
        { delta: 10, source: "INVOICE", notes: null, daysAgo: 2 },
        { delta: -10, source: "MANUAL_ADJUST", notes: "Consumo semanal", daysAgo: 0 },
      ],
    },
    {
      key: "camaron",
      onHand: 0.8,
      low: 2,
      critical: 1,
      movements: [
        { delta: 4, source: "INVOICE", notes: null, daysAgo: 9 },
        { delta: -1.5, source: "MANUAL_ADJUST", notes: "Tacos de camarón", daysAgo: 5 },
        { delta: -1.7, source: "MANUAL_ADJUST", notes: "Pedido especial", daysAgo: 2 },
      ],
    },
    {
      key: "tomate",
      onHand: 4,
      low: 4,
      critical: 2,
      movements: [
        { delta: 10, source: "INVOICE", notes: null, daysAgo: 3 },
        { delta: -3, source: "MANUAL_ADJUST", notes: "Salsas del día", daysAgo: 2 },
        { delta: -3, source: "MANUAL_ADJUST", notes: "Consumo diario", daysAgo: 0 },
      ],
    },
    {
      key: "cebolla",
      onHand: 5,
      low: 3,
      critical: 1,
      movements: [
        { delta: 8, source: "INVOICE", notes: null, daysAgo: 3 },
        { delta: -3, source: "MANUAL_ADJUST", notes: "Prep general", daysAgo: 1 },
      ],
    },
    {
      key: "aguacate",
      onHand: 1.2,
      low: 2,
      critical: 1,
      movements: [
        { delta: 5, source: "INVOICE", notes: null, daysAgo: 3 },
        { delta: -2, source: "MANUAL_ADJUST", notes: "Guacamole", daysAgo: 2 },
        { delta: -1.8, source: "MANUAL_ADJUST", notes: "Tacos camarón", daysAgo: 0 },
      ],
    },
    {
      key: "limon",
      onHand: 1.5,
      low: 1.5,
      critical: 0.5,
      movements: [
        { delta: 3, source: "INVOICE", notes: null, daysAgo: 3 },
        { delta: -1.5, source: "MANUAL_ADJUST", notes: "Aguas + tacos", daysAgo: 0 },
      ],
    },
    {
      key: "chile",
      onHand: 2.5,
      low: 1.5,
      critical: 0.5,
      movements: [
        { delta: 3, source: "INVOICE", notes: null, daysAgo: 5 },
        { delta: -0.5, source: "MANUAL_ADJUST", notes: "Salsas", daysAgo: 2 },
      ],
    },
    {
      key: "cilantro",
      onHand: 3,
      low: 4,
      critical: 2,
      movements: [
        { delta: 8, source: "INVOICE", notes: null, daysAgo: 4 },
        { delta: -5, source: "MANUAL_ADJUST", notes: "Se marchitó parte", daysAgo: 1 },
      ],
    },
    {
      key: "quesoOaxaca",
      onHand: 2,
      low: 2,
      critical: 1,
      movements: [
        { delta: 5, source: "INVOICE", notes: null, daysAgo: 4 },
        { delta: -3, source: "MANUAL_ADJUST", notes: "Quesadillas alto volumen", daysAgo: 1 },
      ],
    },
    {
      key: "crema",
      onHand: 2.5,
      low: 2,
      critical: 0.5,
      movements: [
        { delta: 4, source: "INVOICE", notes: null, daysAgo: 4 },
        { delta: -1.5, source: "MANUAL_ADJUST", notes: "Guarniciones", daysAgo: 1 },
      ],
    },
    {
      key: "aceite",
      onHand: 6,
      low: 3,
      critical: 1,
      movements: [
        { delta: 10, source: "INVOICE", notes: null, daysAgo: 10 },
        { delta: -4, source: "MANUAL_ADJUST", notes: "Freído semanal", daysAgo: 3 },
      ],
    },
    {
      key: "tortillaMaiz",
      onHand: 3,
      low: 5,
      critical: 2,
      movements: [
        { delta: 10, source: "INVOICE", notes: null, daysAgo: 5 },
        { delta: -4, source: "MANUAL_ADJUST", notes: "Tacos miércoles", daysAgo: 3 },
        { delta: -3, source: "MANUAL_ADJUST", notes: "Tacos viernes", daysAgo: 0 },
      ],
    },
    {
      key: "tortillaHarina",
      onHand: 4,
      low: 3,
      critical: 1,
      movements: [
        { delta: 8, source: "INVOICE", notes: null, daysAgo: 6 },
        { delta: -4, source: "MANUAL_ADJUST", notes: "Quesadillas semana", daysAgo: 1 },
      ],
    },
    {
      key: "arroz",
      onHand: 8,
      low: 4,
      critical: 2,
      movements: [
        { delta: 10, source: "INVOICE", notes: null, daysAgo: 10 },
        { delta: -2, source: "MANUAL_ADJUST", notes: "Arroz con pollo", daysAgo: 3 },
      ],
    },
    {
      key: "frijol",
      onHand: 5,
      low: 3,
      critical: 1,
      movements: [
        { delta: 8, source: "INVOICE", notes: null, daysAgo: 10 },
        { delta: -3, source: "MANUAL_ADJUST", notes: "Charros + refritos", daysAgo: 2 },
      ],
    },
    {
      key: "pina",
      onHand: 1,
      low: 2,
      critical: 1,
      movements: [
        { delta: 4, source: "INVOICE", notes: null, daysAgo: 7 },
        { delta: -3, source: "MANUAL_ADJUST", notes: "Tacos al pastor", daysAgo: 1 },
      ],
    },
  ];

  for (const cfg of inventoryConfig) {
    const ingredient = ing[cfg.key];

    await prisma.inventoryLevel.create({
      data: {
        ingredientId: ingredient.id,
        onHand: cfg.onHand,
        lowThreshold: cfg.low,
        criticalThreshold: cfg.critical,
      },
    });

    // Build movement trail that ends at onHand
    let running = 0;
    for (const mv of cfg.movements) {
      running = Math.max(0, running + mv.delta);
      const mvDate = new Date(now);
      mvDate.setDate(mvDate.getDate() - mv.daysAgo);
      mvDate.setHours(7 + Math.floor(Math.random() * 10), Math.floor(Math.random() * 60));

      await prisma.inventoryMovement.create({
        data: {
          ingredientId: ingredient.id,
          delta: mv.delta,
          newOnHand: running,
          source: mv.source,
          notes: mv.notes,
          createdAt: mvDate,
        },
      });
    }
  }
  console.log(`✅ ${inventoryConfig.length} inventory levels + movements seeded`);

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
