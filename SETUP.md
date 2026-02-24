# 🚀 Toast MX — Setup Guide

## What You Have

This is the Phase 1 MVP: **AI Invoice Scanner & Cost Intelligence**.

### Project Structure
```
toast-mx/
├── prisma/
│   ├── schema.prisma      ← Database models (restaurants, suppliers, invoices, ingredients)
│   └── seed.ts            ← Demo data for development
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── invoices/
│   │   │   │   ├── route.ts              ← GET /api/invoices (list)
│   │   │   │   ├── upload/route.ts       ← POST /api/invoices/upload (upload + AI extract)
│   │   │   │   └── [id]/
│   │   │   │       ├── route.ts          ← GET /api/invoices/:id
│   │   │   │       └── confirm/route.ts  ← POST /api/invoices/:id/confirm
│   │   │   ├── ingredients/route.ts      ← GET /api/ingredients
│   │   │   └── suppliers/route.ts        ← GET /api/suppliers
│   │   ├── layout.tsx
│   │   ├── page.tsx        ← Main page (upload + review flow)
│   │   └── globals.css
│   ├── components/
│   │   ├── InvoiceUpload.tsx   ← Drag & drop / camera upload
│   │   └── InvoiceReview.tsx   ← Review & edit extracted line items
│   └── lib/
│       ├── prisma.ts       ← Database client singleton
│       ├── extraction.ts   ← AI pipeline (mock stub — plug Claude API later)
│       └── types.ts        ← Shared TypeScript types
└── package.json
```

---

## Step-by-Step Setup

### 1. Install Docker Desktop (for Postgres)
Download from: https://www.docker.com/products/docker-desktop/
Install it, open it, let it start. You'll see a whale icon in your menu bar.

### 2. Start a Postgres database
Open Terminal and run:
```bash
docker run --name toast-db -e POSTGRES_PASSWORD=toast123 -e POSTGRES_DB=toastmx -p 5432:5432 -d postgres:16
```
This creates a Postgres database called `toastmx` running on port 5432.

### 3. Configure your `.env` file
In your `toast-mx` folder, open the `.env` file and set:
```
DATABASE_URL="postgresql://postgres:toast123@localhost:5432/toastmx?schema=public"
```

### 4. Copy the project files
Copy all the files I created into your `toast-mx` project, matching the folder structure above.
Use Cursor to create/replace each file.

### 5. Install dependencies
```bash
cd ~/toast-mx
npm install
```

### 6. Run database migrations
```bash
npx prisma migrate dev --name init
```
This creates all the database tables from the schema.

### 7. Add seed script config
Open `package.json` and add this inside the top-level object:
```json
"prisma": {
  "seed": "npx tsx prisma/seed.ts"
}
```
Then install tsx:
```bash
npm install tsx --save-dev
```

### 8. Seed the database
```bash
npx prisma db seed
```
This creates a demo restaurant with suppliers and ingredients.
**SAVE the Restaurant ID it prints** — you'll need it.

### 9. Run the app
```bash
npm run dev
```
Open http://localhost:3000

### 10. Test it
1. Paste the Restaurant ID into the setup box
2. Upload any image (it will use mock AI extraction for now)
3. Review the extracted line items
4. Edit any fields, then click "Confirmar factura ✓"
5. The data saves to your database with price history

---

## Next Steps (in order)

1. **Plug in Claude API** — Replace the mock in `extraction.ts` with real AI vision
2. **Recipe costing engine** — Input recipes, auto-calculate food cost per dish
3. **Profitability dashboard** — Show which dishes make money, which don't
4. **Invoice history page** — Browse all past invoices and spending trends
5. **Ingredient price tracking** — Charts showing price changes over time

---

## Useful Commands

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server |
| `npx prisma studio` | Visual database browser (opens in browser) |
| `npx prisma migrate dev --name <name>` | Create a new migration after schema changes |
| `npx prisma db seed` | Re-seed the database |
| `docker start toast-db` | Start the Postgres container (after restart) |
| `docker stop toast-db` | Stop the Postgres container |
