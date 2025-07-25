// src/lib/parseAICodePatch.ts
export type FileChange = { path: string; content: string };

export function parseAICodePatch(rawPatch: any): FileChange[] {
  // Ensure we have a string
  const raw = typeof rawPatch === "string" ? rawPatch : JSON.stringify(rawPatch, null, 2);
  const cleaned = raw.replace(/```json|```/g, "").trim();

  try {
    const parsed = JSON.parse(cleaned);
    if (parsed.files && Array.isArray(parsed.files)) {
      return parsed.files.map((f: any, i: number) => ({
        path: typeof f?.path === "string" ? f.path : `ai-file-${i}.txt`,
        content:
          typeof f?.content === "string"
            ? f.content
            : JSON.stringify(f?.content ?? "", null, 2),
      }));
    }
    if (Array.isArray(parsed) && parsed.every((x: any) => typeof x?.path === "string")) {
      return parsed.map((f: any, i: number) => ({
        path: f.path,
        content:
          typeof f.content === "string"
            ? f.content
            : JSON.stringify(f.content ?? "", null, 2),
      }));
    }
  } catch (err) {
    console.warn("parseAICodePatch: JSON parse failed, falling back to raw content", err);
  }

  // Fallback
  return [{ path: "ai-output.txt", content: cleaned }];
}
