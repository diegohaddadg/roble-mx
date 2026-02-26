/**
 * Robust JSON extraction from LLM model output.
 *
 * Handles: ```json fences, trailing/leading prose, multiple fences,
 * nested braces in strings, and other common model formatting noise.
 */

export function sanitizeModelText(raw: string): string {
  if (!raw) return "";
  return raw
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();
}

/**
 * Walk char-by-char counting braces while respecting quoted strings.
 * Returns the shortest balanced { ... } substring starting from the first '{'.
 * Falls back to first-'{' .. last-'}' if the walk fails.
 */
export function extractFirstJsonObject(text: string): string {
  const start = text.indexOf("{");
  if (start === -1) throw new Error("No JSON object found in model output");

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < text.length; i++) {
    const ch = text[i];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (ch === "\\") {
      escaped = true;
      continue;
    }

    if (ch === '"') {
      inString = !inString;
      continue;
    }

    if (inString) continue;

    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) {
        return text.slice(start, i + 1);
      }
    }
  }

  // Fallback: first '{' to last '}'
  const end = text.lastIndexOf("}");
  if (end > start) {
    return text.slice(start, end + 1);
  }

  throw new Error("No JSON object found in model output");
}

export function parseModelJson<T = unknown>(raw: string): T {
  const cleaned = sanitizeModelText(raw);

  try {
    return JSON.parse(cleaned) as T;
  } catch {
    // Fallback: extract the first balanced { ... } block
    let jsonStr: string;
    try {
      jsonStr = extractFirstJsonObject(cleaned);
    } catch {
      console.error("AI JSON parse: no object found", {
        rawPreview: cleaned.slice(0, 500),
      });
      throw new Error(
        "No pude leer la factura. Intenta recortar la tabla o subir una foto más clara."
      );
    }

    try {
      return JSON.parse(jsonStr) as T;
    } catch (e2) {
      console.error("AI JSON parse failed after extraction", {
        rawPreview: cleaned.slice(0, 500),
        extractedPreview: jsonStr.slice(0, 500),
        err: e2,
      });
      throw new Error(
        "No pude leer la factura. Intenta recortar la tabla o subir una foto más clara."
      );
    }
  }
}

// Keep backward-compatible alias used by existing call sites
export const safeParseModelJson = parseModelJson;
