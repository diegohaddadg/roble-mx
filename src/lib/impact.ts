// Pure functions for Impact Engine calculations.
// No DB access — all data passed in.

export interface PriceChange {
  ingredientId: string;
  ingredientName: string;
  unit: string;
  oldPrice: number;
  newPrice: number;
}

export interface RecipeInput {
  recipeId: string;
  recipeName: string;
  sellPrice: number;
  yield: number;
  items: {
    ingredientId: string;
    quantity: number;
    currentPrice: number;
  }[];
}

export interface RecipeImpactResult {
  recipeId: string;
  recipeName: string;
  sellPrice: number;
  oldFoodCost: number;
  newFoodCost: number;
  oldFoodCostPercent: number;
  newFoodCostPercent: number;
  oldMarginPercent: number;
  newMarginPercent: number;
  status: "worsened" | "improved" | "unchanged";
}

export interface Suggestion {
  recipeId: string;
  recipeName: string;
  type: "raise_price" | "review_portion" | "find_supplier";
  message: string;
  suggestedPrice?: number;
}

export function computePriceChange(oldPrice: number, newPrice: number) {
  if (oldPrice === 0) return { delta: 0, percent: 0 };
  const delta = newPrice - oldPrice;
  const percent = Math.round(((newPrice - oldPrice) / oldPrice) * 1000) / 10;
  return { delta, percent };
}

export function computeRecipeCost(
  recipe: RecipeInput,
  priceOverrides: Map<string, number>
): number {
  let total = 0;
  for (const item of recipe.items) {
    const price = priceOverrides.get(item.ingredientId) ?? item.currentPrice;
    total += item.quantity * price;
  }
  return recipe.yield > 0 ? total / recipe.yield : total;
}

export function computeRecipeImpact(
  recipe: RecipeInput,
  priceChanges: PriceChange[]
): RecipeImpactResult {
  const oldPrices = new Map<string, number>();
  const newPrices = new Map<string, number>();
  for (const pc of priceChanges) {
    oldPrices.set(pc.ingredientId, pc.oldPrice);
    newPrices.set(pc.ingredientId, pc.newPrice);
  }

  const oldCost = computeRecipeCost(recipe, oldPrices);
  const newCost = computeRecipeCost(recipe, newPrices);
  const sell = recipe.sellPrice;

  const oldFoodCostPct = sell > 0 ? Math.round((oldCost / sell) * 1000) / 10 : 0;
  const newFoodCostPct = sell > 0 ? Math.round((newCost / sell) * 1000) / 10 : 0;
  const oldMargin = sell > 0 ? Math.round(((sell - oldCost) / sell) * 1000) / 10 : 0;
  const newMargin = sell > 0 ? Math.round(((sell - newCost) / sell) * 1000) / 10 : 0;

  let status: "worsened" | "improved" | "unchanged" = "unchanged";
  if (newMargin < oldMargin - 0.1) status = "worsened";
  else if (newMargin > oldMargin + 0.1) status = "improved";

  return {
    recipeId: recipe.recipeId,
    recipeName: recipe.recipeName,
    sellPrice: sell,
    oldFoodCost: Math.round(oldCost * 100) / 100,
    newFoodCost: Math.round(newCost * 100) / 100,
    oldFoodCostPercent: oldFoodCostPct,
    newFoodCostPercent: newFoodCostPct,
    oldMarginPercent: oldMargin,
    newMarginPercent: newMargin,
    status,
  };
}

const TARGET_FOOD_COST_PCT = 30;

export function generateSuggestions(
  impacts: RecipeImpactResult[]
): Suggestion[] {
  const suggestions: Suggestion[] = [];

  for (const r of impacts) {
    if (r.status !== "worsened") continue;

    if (r.newFoodCostPercent > 35 && r.sellPrice > 0) {
      const targetSell = r.newFoodCost / (TARGET_FOOD_COST_PCT / 100);
      const rounded = Math.ceil(targetSell / 5) * 5;
      suggestions.push({
        recipeId: r.recipeId,
        recipeName: r.recipeName,
        type: "raise_price",
        message: `Subir precio de $${r.sellPrice.toFixed(0)} a $${rounded.toFixed(0)} para restaurar margen a ~${TARGET_FOOD_COST_PCT}% costo MP`,
        suggestedPrice: rounded,
      });
    }

    if (r.newFoodCostPercent > 30 && r.newFoodCostPercent <= 35) {
      suggestions.push({
        recipeId: r.recipeId,
        recipeName: r.recipeName,
        type: "review_portion",
        message: "Revisar tamaño de porción y merma para optimizar costo",
      });
    }

    if (r.newMarginPercent < r.oldMarginPercent - 3) {
      suggestions.push({
        recipeId: r.recipeId,
        recipeName: r.recipeName,
        type: "find_supplier",
        message: "Cotizar con proveedor alterno para los ingredientes que subieron",
      });
    }
  }

  return suggestions;
}

export function buildWhatsAppSummary(
  ingredientChanges: { name: string; oldPrice: number; newPrice: number; changePercent: number; unit: string }[],
  recipeImpacts: RecipeImpactResult[],
  suggestions: Suggestion[]
): string {
  const lines: string[] = [];
  lines.push("📊 *Reporte de impacto — Roble*\n");

  lines.push(`*${ingredientChanges.length} ingrediente${ingredientChanges.length !== 1 ? "s" : ""} con cambio de precio:*`);
  for (const ic of ingredientChanges) {
    const arrow = ic.changePercent > 0 ? "📈" : "📉";
    lines.push(
      `${arrow} ${ic.name}: $${ic.oldPrice.toFixed(2)} → $${ic.newPrice.toFixed(2)} (${ic.changePercent > 0 ? "+" : ""}${ic.changePercent}%)`
    );
  }

  if (recipeImpacts.length > 0) {
    lines.push(`\n*${recipeImpacts.length} platillo${recipeImpacts.length !== 1 ? "s" : ""} afectado${recipeImpacts.length !== 1 ? "s" : ""}:*`);
    for (const r of recipeImpacts) {
      const emoji = r.status === "worsened" ? "🔴" : r.status === "improved" ? "🟢" : "⚪";
      lines.push(
        `${emoji} ${r.recipeName}: costo ${r.oldFoodCostPercent}% → ${r.newFoodCostPercent}% | margen ${r.oldMarginPercent}% → ${r.newMarginPercent}%`
      );
    }
  }

  if (suggestions.length > 0) {
    lines.push("\n*Acciones sugeridas:*");
    for (const s of suggestions) {
      lines.push(`💡 ${s.recipeName}: ${s.message}`);
    }
  }

  return lines.join("\n");
}
