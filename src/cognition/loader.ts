// COGNITION_LOADER — Core utility for reading, parsing, and lazy-loading cognition .md modules

import * as fs from "fs/promises";
import * as path from "path";

/**
 * Directory containing all cognition .md modules.
 * Resolved relative to the project's src/cognition directory.
 */
export const COGNITION_DIR = path.resolve(
  process.cwd(),
  "src",
  "cognition",
);

/**
 * Registry entry describing a cognition module.
 */
export interface ModuleRegistryEntry {
  file: string;
  trigger: string;
}

/**
 * Registry of all on-demand cognition modules with their load triggers.
 */
export const MODULE_REGISTRY: Record<string, ModuleRegistryEntry> = {
  GOAL: { file: "GOAL.md", trigger: "on task start" },
  SKILLS: { file: "SKILLS.md", trigger: "on tool decision" },
  SOCIAL: { file: "SOCIAL.md", trigger: "on escalation or collaboration" },
  AUTONOMY: { file: "AUTONOMY.md", trigger: "on uncertainty or high stakes" },
  EXPERIENCE_CORE: {
    file: "EXPERIENCE_CORE.md",
    trigger: "on novel situation",
  },
  EXPERIENCE_INDEX: {
    file: "EXPERIENCE_INDEX.md",
    trigger: "on keyword pattern match",
  },
};

/**
 * Parsed frontmatter result.
 */
export interface ParsedModule {
  meta: Record<string, string>;
  body: string;
}

/**
 * Full loaded module result.
 */
export interface LoadedModule extends ParsedModule {
  raw: string;
}

/**
 * Read a single .md file from the cognition directory.
 *
 * @param filename - Name of the file to read (e.g. "GOAL.md")
 * @returns The raw string content of the file
 * @throws Error if the file is not found
 */
export async function readCognitionFile(filename: string): Promise<string> {
  const filePath = path.join(COGNITION_DIR, filename);
  try {
    return await fs.readFile(filePath, "utf-8");
  } catch (err: unknown) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENOENT") {
      throw new Error(`Cognition module not found: ${filename}`);
    }
    throw err;
  }
}

/**
 * Parse YAML-style frontmatter from markdown content.
 * Splits content between --- delimiters into key-value metadata and body.
 *
 * @param content - Raw markdown string, possibly with frontmatter
 * @returns Parsed meta (key-value pairs) and body (remaining markdown)
 */
export function parseFrontmatter(content: string): ParsedModule {
  const lines = content.split("\n");

  // Check if content starts with frontmatter delimiter
  if (lines[0]?.trim() !== "---") {
    return { meta: {}, body: content };
  }

  // Find closing delimiter
  let closingIndex = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === "---") {
      closingIndex = i;
      break;
    }
  }

  if (closingIndex === -1) {
    return { meta: {}, body: content };
  }

  // Parse frontmatter key-value pairs
  const meta: Record<string, string> = {};
  for (let i = 1; i < closingIndex; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const colonIndex = line.indexOf(":");
    if (colonIndex > 0) {
      const key = line.substring(0, colonIndex).trim();
      const value = line.substring(colonIndex + 1).trim();
      meta[key] = value;
    }
  }

  const body = lines.slice(closingIndex + 1).join("\n").trimStart();
  return { meta, body };
}

/**
 * Load a named cognition module by looking it up in MODULE_REGISTRY.
 *
 * @param moduleName - Module name (e.g. "GOAL"), case-insensitive
 * @returns Parsed module with meta, body, and raw content
 * @throws Error if moduleName is not in MODULE_REGISTRY
 */
export async function loadModule(moduleName: string): Promise<LoadedModule> {
  const key = moduleName.toUpperCase();
  const entry = MODULE_REGISTRY[key];
  if (!entry) {
    throw new Error(
      `Unknown cognition module: '${moduleName}'. Available: ${Object.keys(MODULE_REGISTRY).join(", ")}`,
    );
  }

  const raw = await readCognitionFile(entry.file);
  const { meta, body } = parseFrontmatter(raw);
  return { meta, body, raw };
}

/**
 * Load the always-on cognition modules (MANIFEST, ROLE, ETHICS) and
 * concatenate them with clear separators for system prompt injection.
 *
 * Individual file errors are caught and logged — a missing file
 * does not crash agent boot.
 *
 * @returns Combined string ready for system prompt injection
 */
export async function loadAlwaysOnModules(): Promise<string> {
  const alwaysOnFiles = ["MANIFEST.md", "ROLE.md", "ETHICS.md"];
  const sections: string[] = [];

  for (const filename of alwaysOnFiles) {
    try {
      const content = await readCognitionFile(filename);
      sections.push(`\n\n---\n# ${filename}\n\n${content}`);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn(
        `[CognitionLoader] Warning: could not load always-on module ${filename}:`,
        err instanceof Error ? err.message : err,
      );
    }
  }

  return sections.join("");
}

/**
 * Confidence level ordering for sorting experience episodes.
 */
const CONFIDENCE_ORDER: Record<string, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

/**
 * Match experience episodes from EXPERIENCE_INDEX.md against a task description.
 * Returns episode file paths where any keyword appears in the task description.
 *
 * @param taskDescription - The task text to match keywords against
 * @returns Array of episode file paths (max 3, sorted by confidence)
 */
export async function matchExperienceEpisodes(
  taskDescription: string,
): Promise<string[]> {
  let indexContent: string;
  try {
    indexContent = await readCognitionFile("EXPERIENCE_INDEX.md");
  } catch {
    return [];
  }

  const taskLower = taskDescription.toLowerCase();
  const matches: Array<{ file: string; confidence: number }> = [];

  const lines = indexContent.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    // Skip headers, empty lines, and non-data lines
    if (
      !trimmed ||
      trimmed.startsWith("#") ||
      trimmed.startsWith("|") ||
      trimmed.startsWith("-")
    ) {
      continue;
    }

    const parts = trimmed.split("|").map((p) => p.trim());
    if (parts.length < 4) continue;

    const keywords = parts[0].split(",").map((k) => k.trim().toLowerCase());
    const episodeFile = parts[1];
    const confidenceStr = parts[3]?.toLowerCase() || "low";
    const confidence = CONFIDENCE_ORDER[confidenceStr] ?? 0;

    const hasMatch = keywords.some((kw) => kw && taskLower.includes(kw));
    if (hasMatch) {
      matches.push({ file: episodeFile, confidence });
    }
  }

  // Sort by confidence descending, limit to 3
  matches.sort((a, b) => b.confidence - a.confidence);
  return matches.slice(0, 3).map((m) => m.file);
}

/**
 * Load an experience episode file from the episodes subdirectory.
 *
 * @param episodeFile - Episode file path (e.g. "episodes/ep_023.md")
 * @returns Raw episode content, or empty string if not found
 */
export async function loadEpisode(episodeFile: string): Promise<string> {
  const filePath = path.join(COGNITION_DIR, episodeFile);
  try {
    return await fs.readFile(filePath, "utf-8");
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn(
      `[CognitionLoader] Warning: episode not found: ${episodeFile}`,
      err instanceof Error ? err.message : err,
    );
    return "";
  }
}

/**
 * Build a complete persona system prompt by prepending always-on modules
 * and appending the lazy-load instruction table.
 *
 * @param basePrompt - The agent's base system prompt
 * @param options - Configuration options
 * @returns Assembled system prompt string
 */
export async function buildPersonaSystemPrompt(
  basePrompt: string,
  options?: { includeAlwaysOn?: boolean },
): Promise<string> {
  const { includeAlwaysOn = true } = options ?? {};

  let result = basePrompt;

  if (includeAlwaysOn) {
    const alwaysOnContent = await loadAlwaysOnModules();
    result = alwaysOnContent + "\n\n" + result;
  }

  result += LAZY_LOAD_TABLE;

  return result;
}

/**
 * Lazy-load instruction table appended to system prompts.
 * Tells the agent which modules are available on demand.
 */
export const LAZY_LOAD_TABLE = `

---
## Cognition modules available on demand

The following modules are available but NOT loaded yet. Load them yourself
using the read_persona_module tool when the trigger condition applies.

| Module | Load when |
|--------|-----------|
| GOAL | before starting a new task |
| SKILLS | when deciding which tool to use |
| SOCIAL | when escalating or collaborating |
| AUTONOMY | when confidence is low or stakes are high |
| EXPERIENCE_CORE | when facing a novel situation |
| EXPERIENCE_INDEX | when task keywords match past work |
`;

/**
 * Aggregated CognitionLoader object providing all loader functions
 * and constants for convenient single-import usage.
 */
export const CognitionLoader = {
  COGNITION_DIR,
  MODULE_REGISTRY,
  LAZY_LOAD_TABLE,
  readCognitionFile,
  parseFrontmatter,
  loadModule,
  loadAlwaysOnModules,
  matchExperienceEpisodes,
  loadEpisode,
  buildPersonaSystemPrompt,
} as const;

export default CognitionLoader;
