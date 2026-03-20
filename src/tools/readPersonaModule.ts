// READ_PERSONA_MODULE — LangChain tool for agent self-loading of cognition modules

import { tool } from "@langchain/core/tools";
import { z } from "zod";
import {
  CognitionLoader,
  MODULE_REGISTRY,
} from "../cognition/loader.js";

/**
 * LangChain tool that allows agents to lazy-load cognition modules on demand.
 *
 * The agent calls this tool when it needs persona context (goals, skills,
 * autonomy rules, past experience, etc.) rather than having everything
 * loaded into the system prompt at boot time.
 */
export const readPersonaModuleTool = tool(
  async (input: { moduleName: string }): Promise<string> => {
    const { moduleName } = input;

    try {
      // Case 1: Episode file path
      if (moduleName.startsWith("episodes/")) {
        const content = await CognitionLoader.loadEpisode(moduleName);
        if (!content) {
          return `Episode '${moduleName}' could not be loaded or is empty.`;
        }
        return `=== EXPERIENCE EPISODE ===\n\n${content}`;
      }

      // Case 2: EXPERIENCE_INDEX — load index and suggest matching episodes
      if (moduleName.toUpperCase() === "EXPERIENCE_INDEX") {
        const loaded = await CognitionLoader.loadModule("EXPERIENCE_INDEX");
        let result = `=== EXPERIENCE_INDEX MODULE ===\n\n${loaded.body}`;

        // Note: We cannot access the last user message from within the tool,
        // but we include instructions for the agent to do keyword matching
        result +=
          "\n\n---\nTo find relevant episodes, scan your current task description " +
          "for keywords that match the index above, then call read_persona_module " +
          "with the episode filename (e.g. 'episodes/ep_023.md').";

        return result;
      }

      // Case 3: Named module from MODULE_REGISTRY
      const key = moduleName.toUpperCase();
      if (key in MODULE_REGISTRY) {
        const loaded = await CognitionLoader.loadModule(key);
        return `=== ${key} MODULE ===\n\n${loaded.body}`;
      }

      // Case 4: Unknown module
      return (
        `Module '${moduleName}' is not recognized.\n` +
        `Available modules: ${Object.keys(MODULE_REGISTRY).join(", ")}\n` +
        `You can also load episode files with paths like 'episodes/ep_023.md'.`
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return (
        `Module '${moduleName}' could not be loaded: ${message}.\n` +
        `Available modules: ${Object.keys(MODULE_REGISTRY).join(", ")}`
      );
    }
  },
  {
    name: "read_persona_module",
    description: `Load a specific cognition module into your context when you need it.
Available modules: GOAL, SKILLS, SOCIAL, AUTONOMY, EXPERIENCE_CORE, EXPERIENCE_INDEX.

When to call each:
- GOAL: before starting any new task or picking from the backlog
- SKILLS: when deciding which tool to use for a task
- SOCIAL: when you need to escalate, collaborate, or identify a reviewer
- AUTONOMY: when your confidence is low or the decision feels high-stakes
- EXPERIENCE_CORE: when facing a novel situation with no clear pattern
- EXPERIENCE_INDEX: when task keywords remind you of past work — use this first,
  then load specific episodes by calling read_persona_module with the episode filename

Input: the module name (e.g. 'GOAL') or an episode filename (e.g. 'episodes/ep_012.md')
Output: the full content of that module, formatted for your context`,
    schema: z.object({
      moduleName: z
        .string()
        .describe(
          "The module name (e.g. 'GOAL', 'SKILLS') or episode path (e.g. 'episodes/ep_012.md')",
        ),
    }),
  },
);
