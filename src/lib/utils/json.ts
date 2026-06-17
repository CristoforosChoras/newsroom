// Tolerant JSON extractor — kept for the next iteration, when the AI service
// layer (lib/services/agents.ts with USE_BACKEND = true) parses real model
// responses that may be wrapped in prose or ```json fences. Unused today.
export function parseJSON<T = unknown>(text: string): T {
  const clean = text.replace(/```json|```/g, "").trim();
  const s = clean.indexOf("{");
  const a = clean.indexOf("[");
  const start = a !== -1 && (a < s || s === -1) ? a : s;
  const end = Math.max(clean.lastIndexOf("}"), clean.lastIndexOf("]"));
  return JSON.parse(clean.slice(start, end + 1)) as T;
}
