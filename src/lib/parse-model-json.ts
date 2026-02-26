/**
 * Robust JSON extraction from LLM model output.
 *
 * Handles: ```json fences, trailing/leading prose, multiple fences,
 * and other common model formatting noise.
 */

function sanitizeModelJson(raw: string): string {
  if (!raw) return "";
  return raw
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();
}

function extractFirstJsonObject(text: string): string {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("No JSON object found in model output");
  }
  return text.slice(start, end + 1);
}

export function safeParseModelJson(rawText: string): unknown {
  const cleaned = sanitizeModelJson(rawText);

  try {
    return JSON.parse(cleaned);
  } catch {
    // Fallback: extract the first { ... } block and try again
    const sliced = extractFirstJsonObject(cleaned);
    try {
      return JSON.parse(sliced);
    } catch (e2) {
      console.error("Invoice AI parse failed", {
        raw: rawText.slice(0, 1000),
        cleaned: cleaned.slice(0, 1000),
        sliced: sliced.slice(0, 1000),
        err: e2,
      });
      throw new Error(
        "No pude leer la factura. Intenta con otra foto más clara o recorta la tabla."
      );
    }
  }
}
