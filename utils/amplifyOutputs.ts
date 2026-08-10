import { readFileSync } from "fs";
import { join } from "path";

// read at runtime instead of a static import: amplify_outputs.json is gitignored and
// absent on a fresh clone, where a static import would fail the build.
let cached: Record<string, any> | null | undefined;

export const getAmplifyOutputs = (): Record<string, any> | null => {
  if (cached !== undefined) return cached;
  try {
    cached = JSON.parse(readFileSync(join(process.cwd(), "amplify_outputs.json"), "utf-8"));
  } catch {
    cached = null;
  }
  return cached ?? null;
};
