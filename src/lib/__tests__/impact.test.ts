import {
  computePriceChange,
  computeRecipeCost,
  computeRecipeImpact,
  generateSuggestions,
  buildWhatsAppSummary,
  type PriceChange,
  type RecipeInput,
} from "../impact";

describe("computePriceChange", () => {
  it("computes positive change correctly", () => {
    const result = computePriceChange(100, 120);
    expect(result.delta).toBe(20);
    expect(result.percent).toBe(20);
  });

  it("computes negative change correctly", () => {
    const result = computePriceChange(100, 85);
    expect(result.delta).toBe(-15);
    expect(result.percent).toBe(-15);
  });

  it("returns 0 when old price is 0", () => {
    const result = computePriceChange(0, 50);
    expect(result.percent).toBe(0);
  });

  it("handles no change", () => {
    const result = computePriceChange(100, 100);
    expect(result.delta).toBe(0);
    expect(result.percent).toBe(0);
  });

  it("handles fractional changes", () => {
    const result = computePriceChange(89.5, 92.3);
    expect(result.percent).toBe(3.1); // rounded to 1 decimal
  });
});

describe("computeRecipeCost", () => {
  const recipe: RecipeInput = {
    recipeId: "r1",
    recipeName: "Tacos al Pastor",
    sellPrice: 180,
    yield: 4,
    items: [
      { ingredientId: "i1", quantity: 2, currentPrice: 120 },
      { ingredientId: "i2", quantity: 0.5, currentPrice: 80 },
    ],
  };

  it("computes cost with current prices when no overrides", () => {
    const cost = computeRecipeCost(recipe, new Map());
    // (2*120 + 0.5*80) / 4 = 280/4 = 70
    expect(cost).toBe(70);
  });

  it("applies price overrides", () => {
    const overrides = new Map([["i1", 140]]);
    const cost = computeRecipeCost(recipe, overrides);
    // (2*140 + 0.5*80) / 4 = 320/4 = 80
    expect(cost).toBe(80);
  });

  it("handles yield of 1", () => {
    const singleYield = { ...recipe, yield: 1 };
    const cost = computeRecipeCost(singleYield, new Map());
    // (2*120 + 0.5*80) = 280
    expect(cost).toBe(280);
  });
});

describe("computeRecipeImpact", () => {
  const recipe: RecipeInput = {
    recipeId: "r1",
    recipeName: "Tacos al Pastor",
    sellPrice: 180,
    yield: 1,
    items: [
      { ingredientId: "i1", quantity: 2, currentPrice: 60 },
      { ingredientId: "i2", quantity: 1, currentPrice: 30 },
    ],
  };

  it("computes worsened status when margin drops", () => {
    const changes: PriceChange[] = [
      {
        ingredientId: "i1",
        ingredientName: "Pechuga",
        unit: "kg",
        oldPrice: 50,
        newPrice: 60,
      },
    ];

    const result = computeRecipeImpact(recipe, changes);

    // Old: (2*50 + 1*30) / 1 = 130, New: (2*60 + 1*30) / 1 = 150
    expect(result.oldFoodCost).toBe(130);
    expect(result.newFoodCost).toBe(150);
    expect(result.status).toBe("worsened");
    expect(result.oldMarginPercent).toBeGreaterThan(result.newMarginPercent);
  });

  it("computes improved status when margin improves", () => {
    const changes: PriceChange[] = [
      {
        ingredientId: "i1",
        ingredientName: "Pechuga",
        unit: "kg",
        oldPrice: 70,
        newPrice: 60,
      },
    ];

    const result = computeRecipeImpact(recipe, changes);
    expect(result.status).toBe("improved");
    expect(result.newMarginPercent).toBeGreaterThan(result.oldMarginPercent);
  });

  it("returns unchanged when prices don't move", () => {
    const changes: PriceChange[] = [
      {
        ingredientId: "i1",
        ingredientName: "Pechuga",
        unit: "kg",
        oldPrice: 60,
        newPrice: 60,
      },
    ];

    const result = computeRecipeImpact(recipe, changes);
    expect(result.status).toBe("unchanged");
  });

  it("handles zero sell price gracefully", () => {
    const freeRecipe = { ...recipe, sellPrice: 0 };
    const changes: PriceChange[] = [
      {
        ingredientId: "i1",
        ingredientName: "Pechuga",
        unit: "kg",
        oldPrice: 50,
        newPrice: 60,
      },
    ];

    const result = computeRecipeImpact(freeRecipe, changes);
    expect(result.oldMarginPercent).toBe(0);
    expect(result.newMarginPercent).toBe(0);
  });
});

describe("generateSuggestions", () => {
  it("suggests price raise when food cost >35%", () => {
    const impacts = [
      {
        recipeId: "r1",
        recipeName: "Tacos",
        sellPrice: 100,
        oldFoodCost: 30,
        newFoodCost: 40,
        oldFoodCostPercent: 30,
        newFoodCostPercent: 40,
        oldMarginPercent: 70,
        newMarginPercent: 60,
        status: "worsened" as const,
      },
    ];

    const suggestions = generateSuggestions(impacts);
    const priceRaise = suggestions.find((s) => s.type === "raise_price");
    expect(priceRaise).toBeDefined();
    expect(priceRaise!.suggestedPrice).toBeGreaterThan(100);
  });

  it("suggests portion review when food cost 30-35%", () => {
    const impacts = [
      {
        recipeId: "r1",
        recipeName: "Tacos",
        sellPrice: 100,
        oldFoodCost: 28,
        newFoodCost: 33,
        oldFoodCostPercent: 28,
        newFoodCostPercent: 33,
        oldMarginPercent: 72,
        newMarginPercent: 67,
        status: "worsened" as const,
      },
    ];

    const suggestions = generateSuggestions(impacts);
    const portionReview = suggestions.find(
      (s) => s.type === "review_portion"
    );
    expect(portionReview).toBeDefined();
  });

  it("suggests finding alternate supplier on big margin drops", () => {
    const impacts = [
      {
        recipeId: "r1",
        recipeName: "Tacos",
        sellPrice: 100,
        oldFoodCost: 25,
        newFoodCost: 40,
        oldFoodCostPercent: 25,
        newFoodCostPercent: 40,
        oldMarginPercent: 75,
        newMarginPercent: 60,
        status: "worsened" as const,
      },
    ];

    const suggestions = generateSuggestions(impacts);
    const findSupplier = suggestions.find(
      (s) => s.type === "find_supplier"
    );
    expect(findSupplier).toBeDefined();
  });

  it("returns no suggestions for improved recipes", () => {
    const impacts = [
      {
        recipeId: "r1",
        recipeName: "Tacos",
        sellPrice: 100,
        oldFoodCost: 35,
        newFoodCost: 28,
        oldFoodCostPercent: 35,
        newFoodCostPercent: 28,
        oldMarginPercent: 65,
        newMarginPercent: 72,
        status: "improved" as const,
      },
    ];

    const suggestions = generateSuggestions(impacts);
    expect(suggestions).toHaveLength(0);
  });
});

describe("buildWhatsAppSummary", () => {
  it("builds readable WhatsApp text", () => {
    const text = buildWhatsAppSummary(
      [
        {
          name: "Pechuga",
          oldPrice: 120,
          newPrice: 140,
          changePercent: 16.7,
          unit: "kg",
        },
      ],
      [
        {
          recipeId: "r1",
          recipeName: "Tacos al Pastor",
          sellPrice: 180,
          oldFoodCost: 60,
          newFoodCost: 70,
          oldFoodCostPercent: 33.3,
          newFoodCostPercent: 38.9,
          oldMarginPercent: 66.7,
          newMarginPercent: 61.1,
          status: "worsened",
        },
      ],
      [
        {
          recipeId: "r1",
          recipeName: "Tacos al Pastor",
          type: "raise_price",
          message: "Subir precio de $180 a $235",
          suggestedPrice: 235,
        },
      ]
    );

    expect(text).toContain("Reporte de impacto");
    expect(text).toContain("Pechuga");
    expect(text).toContain("Tacos al Pastor");
    expect(text).toContain("Acciones sugeridas");
    expect(text).toContain("$120.00");
    expect(text).toContain("$140.00");
  });

  it("handles empty suggestions gracefully", () => {
    const text = buildWhatsAppSummary(
      [
        {
          name: "Aguacate",
          oldPrice: 80,
          newPrice: 75,
          changePercent: -6.3,
          unit: "kg",
        },
      ],
      [],
      []
    );

    expect(text).toContain("Aguacate");
    expect(text).not.toContain("Acciones sugeridas");
  });
});
