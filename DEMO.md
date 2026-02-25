# Toast MX — Demo Script

**Audience**: Restaurant owner in Mexico City
**Duration**: 5-7 minutes
**Device**: Phone (375px width) or laptop

---

## Setup (before demo)

1. Ensure the app is seeded with demo data (`npx prisma db seed`)
2. Open the app URL and paste the restaurant ID
3. Have a real invoice photo ready (or use any photo — mock extraction will work)

---

## The Story

> "Imagina que eres dueño de La Terraza Roma. Cada semana recibes facturas de 4 proveedores. Hoy te llegó una nueva factura de tu proveedor de carnes y necesitas saber: ¿subieron los precios? ¿Me afecta?"

---

## Demo Flow

### 1. Escáner de Facturas (30 sec)

**Navigate to**: `/scanner`

**Say**: "Tomamos una foto de la factura y la IA extrae todo automáticamente."

- Upload an invoice photo
- Point out: supplier name, line items, quantities, prices — all extracted
- Edit a price to show the review flow
- Click **"Confirmar factura"**

### 2. Impacto en tus Platillos (60 sec) ⭐ KEY MOMENT

**Auto-navigates to**: `/impact/[invoiceId]`

**Say**: "Aquí es donde Toast se diferencia. Inmediatamente después de confirmar, te mostramos el impacto real en tus platillos."

Point out:
- **Ingredient price changes**: "La pechuga subió 12% esta semana"
- **Recipe impacts**: "Tus Tacos al Pastor pasaron de 28% a 33% costo de MP"
- **Margin badges**: "Empeoró" / "Mejoró" per dish
- **Actionable suggestions**: "Te recomendamos subir el precio de los tacos a $195"
- **Copy summary**: Click "Copiar resumen" — "Esto lo puedes compartir por WhatsApp con tu socio o contador"

### 3. Dashboard (30 sec)

**Navigate to**: `/dashboard`

**Say**: "Todo se consolida aquí. Tu gasto semanal, tus platillos más y menos rentables, alertas de precios."

Point out:
- Weekly spend KPI
- Top/bottom recipes by margin
- Price alerts

### 4. Ingredientes (20 sec)

**Navigate to**: `/ingredients`

**Say**: "Cada ingrediente tiene su historial de precios con tendencia."

- Click on "Pechuga de pollo"
- Show price history chart
- Show which recipes use it

### 5. Inventario (20 sec)

**Navigate to**: `/inventory`

**Say**: "Sabes exactamente cuánto tienes de cada cosa. Status pills: OK, Bajo, Crítico."

- Point out status pills
- Show "Inicializar" for new ingredients

### 6. Qué Pedir (30 sec)

**Navigate to**: `/ordering`

**Say**: "Y la joya: tu lista de pedido semanal, agrupada por proveedor, lista para mandar por WhatsApp."

- Show supplier cards
- Click **"Copiar para WhatsApp"**
- Click **"Abrir WhatsApp"** (shows wa.me link)
- **Say**: "Un click y tu pedido está mandado."

---

## Key Metrics to Mention

- "Cada semana procesas 4-5 facturas en 2 minutos total"
- "Antes tardabas 2 horas capturando precios en Excel"
- "Detectas automáticamente cuándo un proveedor te está cobrando de más"
- "Nunca más vendes un plato que te está costando más de lo que cobras"

---

## Handling Questions

**"¿Funciona con mis proveedores?"**
> "La IA lee cualquier factura en español. Funciona con foto del celular."

**"¿Es exacto?"**
> "La IA tiene 90%+ precisión. Siempre revisas antes de confirmar — tú tienes el control."

**"¿Cuánto cuesta?"**
> "Estamos en beta. Los primeros restaurantes entran gratis."

**"¿Y si quiero ver ventas?"**
> "Fase 2 incluye integración con tu POS. Hoy nos enfocamos en que sepas tu costo real — que es lo que la mayoría de restaurantes no conoce."

---

## Routes Reference

| Route | What it shows |
|---|---|
| `/scanner` | Invoice upload + AI extraction |
| `/impact/[id]` | Post-confirm impact analysis |
| `/invoices` | Invoice history |
| `/invoices/[id]` | Invoice detail |
| `/ingredients` | Ingredients list |
| `/ingredients/[id]` | Ingredient detail + price chart |
| `/recipes` | Recipes + food cost % |
| `/recipes/new` | Create recipe |
| `/inventory` | Inventory levels |
| `/inventory/[id]` | Inventory detail + movements |
| `/ordering` | Purchase suggestions by supplier |
| `/suppliers` | Supplier directory |
| `/suppliers/[id]` | Supplier detail |
| `/dashboard` | KPIs + analytics |
| `/api/health` | Health check endpoint |
