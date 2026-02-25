"use client";

import { useState, useEffect, useMemo } from "react";

interface Ingredient {
  id: string;
  name: string;
  category: string | null;
  unit: string;
  currentPrice: number | null;
}

interface RecipeItemInput {
  ingredientId: string;
  ingredientName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  itemCost: number;
}

interface RecipeFormProps {
  restaurantId: string;
  onSaved: () => void;
  onCancel: () => void;
  editRecipe?: {
    id: string;
    name: string;
    category: string | null;
    sellPrice: number;
    yield: number;
    items: RecipeItemInput[];
  } | null;
}

const inputClass =
  "w-full px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded-xl text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[var(--primary-ring)] focus:border-[var(--primary)] transition-colors";

export default function RecipeForm({
  restaurantId,
  onSaved,
  onCancel,
  editRecipe,
}: RecipeFormProps) {
  const [name, setName] = useState(editRecipe?.name || "");
  const [category, setCategory] = useState(editRecipe?.category || "");
  const [sellPrice, setSellPrice] = useState(editRecipe?.sellPrice || 0);
  const [recipeYield, setRecipeYield] = useState(editRecipe?.yield || 1);
  const [items, setItems] = useState<RecipeItemInput[]>(
    editRecipe?.items || []
  );
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/ingredients?restaurantId=${restaurantId}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setIngredients(
            data.map((d: any) => ({
              ...d,
              currentPrice: d.currentPrice ? Number(d.currentPrice) : null,
            }))
          );
        }
      })
      .catch(console.error);
  }, [restaurantId]);

  const totalFoodCost = useMemo(
    () => items.reduce((sum, item) => sum + item.itemCost, 0),
    [items]
  );

  const costPerPortion =
    recipeYield > 0 ? totalFoodCost / recipeYield : totalFoodCost;
  const margin = sellPrice - costPerPortion;
  const marginPercent = sellPrice > 0 ? (margin / sellPrice) * 100 : 0;
  const foodCostPercent =
    sellPrice > 0 ? (costPerPortion / sellPrice) * 100 : 0;

  const getFoodCostColor = (pct: number) => {
    if (pct <= 28) return "text-[var(--success)]";
    if (pct <= 35) return "text-[var(--warning)]";
    return "text-[var(--danger)]";
  };

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      {
        ingredientId: "",
        ingredientName: "",
        quantity: 0,
        unit: "kg",
        unitPrice: 0,
        itemCost: 0,
      },
    ]);
  };

  const updateItem = (index: number, ingredientId: string) => {
    const ingredient = ingredients.find((i) => i.id === ingredientId);
    if (!ingredient) return;

    setItems((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        ingredientId,
        ingredientName: ingredient.name,
        unit: ingredient.unit,
        unitPrice: ingredient.currentPrice || 0,
        itemCost: updated[index].quantity * (ingredient.currentPrice || 0),
      };
      return updated;
    });
  };

  const updateQuantity = (index: number, quantity: number) => {
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        quantity,
        itemCost: quantity * updated[index].unitPrice,
      };
      return updated;
    });
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    setError(null);

    if (!name.trim()) {
      setError("Nombre de receta requerido");
      return;
    }
    if (sellPrice <= 0) {
      setError("Precio de venta debe ser mayor a 0");
      return;
    }
    if (items.length === 0) {
      setError("Agrega al menos un ingrediente");
      return;
    }
    if (items.some((i) => !i.ingredientId)) {
      setError("Selecciona un ingrediente para cada línea");
      return;
    }
    if (items.some((i) => i.quantity <= 0)) {
      setError("Todas las cantidades deben ser mayores a 0");
      return;
    }

    setIsSaving(true);

    try {
      const url = editRecipe
        ? `/api/recipes/${editRecipe.id}`
        : "/api/recipes";

      const response = await fetch(url, {
        method: editRecipe ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          category: category || null,
          sellPrice,
          yield: recipeYield,
          restaurantId,
          items: items.map((item) => ({
            ingredientId: item.ingredientId,
            quantity: item.quantity,
            unit: item.unit,
          })),
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Error al guardar");
      }

      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setIsSaving(false);
    }
  };

  const groupedIngredients = useMemo(() => {
    const groups: Record<string, Ingredient[]> = {};
    ingredients.forEach((ing) => {
      const cat = ing.category || "Sin categoría";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(ing);
    });
    return groups;
  }, [ingredients]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[var(--text)]">
            {editRecipe ? "Editar receta" : "Nueva receta"}
          </h2>
          <p className="text-sm text-[var(--muted)] mt-1">
            Agrega ingredientes y ve el costo en tiempo real
          </p>
        </div>
        <button
          onClick={onCancel}
          className="text-sm text-[var(--muted)] hover:text-[var(--text)] px-3 py-1.5 rounded-lg hover:bg-[var(--border-light)] transition-colors"
        >
          Cancelar
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Form */}
        <div className="lg:col-span-2 space-y-4">
          {/* Recipe info */}
          <div className="bg-[var(--card)] rounded-2xl border border-[var(--border-light)] shadow-sm p-5 space-y-4">
            <h3 className="text-xs font-medium text-[var(--muted)] uppercase tracking-wide">
              Información del platillo
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-xs font-medium text-[var(--muted)] mb-1.5">
                  Nombre del platillo
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={inputClass}
                  placeholder="Tacos al Pastor (orden de 3)"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--muted)] mb-1.5">
                  Categoría
                </label>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className={inputClass}
                  placeholder="Tacos, Bebidas, Postres..."
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--muted)] mb-1.5">
                  Precio de venta (MXN)
                </label>
                <input
                  type="number"
                  step="0.50"
                  value={sellPrice || ""}
                  onChange={(e) =>
                    setSellPrice(parseFloat(e.target.value) || 0)
                  }
                  className={inputClass}
                  placeholder="75.00"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--muted)] mb-1.5">
                  Porciones por receta
                </label>
                <input
                  type="number"
                  min="1"
                  value={recipeYield}
                  onChange={(e) =>
                    setRecipeYield(parseInt(e.target.value) || 1)
                  }
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          {/* Ingredients list */}
          <div className="bg-[var(--card)] rounded-2xl border border-[var(--border-light)] shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-medium text-[var(--muted)] uppercase tracking-wide">
                Ingredientes ({items.length})
              </h3>
              <button
                onClick={addItem}
                className="text-xs font-medium text-[var(--primary)] hover:text-[var(--primary-hover)] px-2.5 py-1 rounded-lg hover:bg-[var(--primary-light)] transition-colors"
              >
                + Agregar
              </button>
            </div>

            {items.length === 0 ? (
              <div className="text-center py-10">
                <div className="w-12 h-12 bg-[var(--border-light)] rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <svg
                    className="w-6 h-6 text-[var(--muted)]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 4.5v15m7.5-7.5h-15"
                    />
                  </svg>
                </div>
                <p className="text-sm text-[var(--muted)] mb-1">
                  Agrega ingredientes para calcular el costo
                </p>
                <button
                  onClick={addItem}
                  className="text-sm text-[var(--primary)] hover:text-[var(--primary-hover)] font-medium"
                >
                  Agregar primer ingrediente
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((item, index) => (
                  <div
                    key={index}
                    className="border border-[var(--border-light)] rounded-xl p-3 group hover:border-[var(--border)] transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <select
                          value={item.ingredientId}
                          onChange={(e) => updateItem(index, e.target.value)}
                          className={inputClass}
                        >
                          <option value="">Seleccionar ingrediente...</option>
                          {Object.entries(groupedIngredients).map(
                            ([cat, ings]) => (
                              <optgroup key={cat} label={cat}>
                                {ings.map((ing) => (
                                  <option key={ing.id} value={ing.id}>
                                    {ing.name} — $
                                    {ing.currentPrice?.toFixed(2) ?? "?"}/
                                    {ing.unit}
                                  </option>
                                ))}
                              </optgroup>
                            )
                          )}
                        </select>
                      </div>

                      <div className="w-24">
                        <input
                          type="number"
                          step="0.001"
                          min="0"
                          value={item.quantity || ""}
                          onChange={(e) =>
                            updateQuantity(
                              index,
                              parseFloat(e.target.value) || 0
                            )
                          }
                          className={`${inputClass} text-center`}
                          placeholder="0.150"
                        />
                      </div>

                      <div className="w-12 text-center text-xs text-[var(--muted)]">
                        {item.unit}
                      </div>

                      <div className="w-20 text-right text-sm font-medium text-[var(--text)] tabular-nums">
                        ${item.itemCost.toFixed(2)}
                      </div>

                      <button
                        onClick={() => removeItem(index)}
                        className="opacity-0 group-hover:opacity-100 text-zinc-300 hover:text-[var(--danger)] transition-all p-1"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Live cost calculator */}
        <div className="space-y-4">
          <div className="bg-[var(--card)] rounded-2xl border border-[var(--border-light)] shadow-sm p-5 space-y-5 sticky top-20">
            <h3 className="text-xs font-medium text-[var(--muted)] uppercase tracking-wide">
              Análisis de costo
            </h3>

            {/* Food cost gauge */}
            <div className="text-center py-3">
              <div
                className={`text-4xl font-bold tabular-nums ${getFoodCostColor(foodCostPercent)}`}
              >
                {foodCostPercent.toFixed(1)}%
              </div>
              <div className="text-xs text-[var(--muted)] mt-1">
                Costo de materia prima
              </div>
              <div className="mt-3 w-full bg-[var(--border-light)] rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${
                    foodCostPercent <= 28
                      ? "bg-[var(--success)]"
                      : foodCostPercent <= 35
                        ? "bg-[var(--warning)]"
                        : "bg-[var(--danger)]"
                  }`}
                  style={{ width: `${Math.min(foodCostPercent, 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-zinc-300 mt-1 px-0.5">
                <span>0%</span>
                <span className="text-[var(--success)]">28%</span>
                <span className="text-[var(--warning)]">35%</span>
                <span>50%+</span>
              </div>
            </div>

            {/* Breakdown */}
            <div className="space-y-0 text-sm divide-y divide-[var(--border-light)]">
              <div className="flex justify-between items-center py-2.5">
                <span className="text-[var(--muted)]">Precio de venta</span>
                <span className="font-semibold text-[var(--text)] tabular-nums">
                  ${sellPrice.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center py-2.5">
                <span className="text-[var(--muted)]">Costo total receta</span>
                <span className="font-medium text-[var(--text)] tabular-nums">
                  ${totalFoodCost.toFixed(2)}
                </span>
              </div>
              {recipeYield > 1 && (
                <div className="flex justify-between items-center py-2.5">
                  <span className="text-[var(--muted)]">
                    Costo por porción (÷{recipeYield})
                  </span>
                  <span className="font-medium text-[var(--text)] tabular-nums">
                    ${costPerPortion.toFixed(2)}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center py-2.5">
                <span className="text-[var(--muted)]">Margen bruto</span>
                <span
                  className={`font-bold text-lg tabular-nums ${
                    margin >= 0 ? "text-[var(--success)]" : "text-[var(--danger)]"
                  }`}
                >
                  ${margin.toFixed(2)}{" "}
                  <span className="text-xs font-medium">
                    ({marginPercent.toFixed(1)}%)
                  </span>
                </span>
              </div>
            </div>

            {/* Health indicator */}
            <div
              className={`rounded-xl p-3 text-xs leading-relaxed ${
                foodCostPercent <= 28
                  ? "bg-[var(--success-light)] text-[var(--success)]"
                  : foodCostPercent <= 35
                    ? "bg-[var(--warning-light)] text-[var(--warning)]"
                    : "bg-[var(--danger-light)] text-[var(--danger)]"
              }`}
            >
              {foodCostPercent <= 28
                ? "Excelente margen. Este platillo es muy rentable."
                : foodCostPercent <= 35
                  ? "Margen aceptable pero hay espacio para optimizar."
                  : "Costo alto. Considera ajustar porciones o precio de venta."}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 px-4 py-3 bg-[var(--danger-light)] border border-[var(--danger)]/20 rounded-xl">
              <svg
                className="w-4 h-4 text-[var(--danger)] shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
                />
              </svg>
              <p className="text-sm text-[var(--danger)]">{error}</p>
            </div>
          )}

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full py-2.5 text-sm font-medium text-white bg-[var(--primary)] hover:bg-[var(--primary-hover)] disabled:bg-zinc-300 rounded-xl transition-all active:scale-[0.98]"
          >
            {isSaving
              ? "Guardando..."
              : editRecipe
                ? "Actualizar receta"
                : "Guardar receta"}
          </button>
        </div>
      </div>
    </div>
  );
}
