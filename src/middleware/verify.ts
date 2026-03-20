/**
 * Verify middleware — checks agent output against ROLE.md quality standard.
 *
 * This middleware loads the quality standard from ROLE.md at verification time
 * and appends it to the verification prompt. It also exposes the verification
 * result to downstream middleware (e.g. SummarizeMiddleware for episode writing).
 */

import { z } from "zod";
import {
  createMiddleware,
  SystemMessage,
  type AgentMiddleware as _AgentMiddleware,
} from "langchain";
import { CognitionLoader } from "../cognition/loader.js";

/**
 * State schema for verification results.
 */
const VerifyStateSchema = z.object({
  // [COGNITION-QUALITY-GATE] START
  verificationResult: z
    .object({
      status: z.enum(["pass", "fail"]),
      reason: z.string(),
    })
    .optional(),
  // [COGNITION-QUALITY-GATE] END
});

/**
 * Extract the "## Quality standard" section from ROLE.md body content.
 *
 * @param roleBody - The body content of ROLE.md
 * @returns The quality standard section text, or null if not found
 */
function extractQualityStandard(roleBody: string): string | null {
  // Case-insensitive match for ## Quality standard header
  const headerRegex = /^##\s+quality\s+standard.*$/im;
  const match = headerRegex.exec(roleBody);
  if (!match) return null;

  const startIndex = match.index + match[0].length;
  const remaining = roleBody.substring(startIndex);

  // Find the next ## header or end of content
  const nextHeaderMatch = /^##\s+/m.exec(remaining);
  const section = nextHeaderMatch
    ? remaining.substring(0, nextHeaderMatch.index)
    : remaining;

  return section.trim();
}

/**
 * Create middleware that checks agent output against ROLE.md quality standard.
 *
 * The quality standard is loaded from ROLE.md at verify time and appended
 * to the system prompt. The verification result (pass/fail) is stored in
 * context for SummarizeMiddleware to use when writing experience episodes.
 *
 * @returns AgentMiddleware for quality gate verification
 */
export function createVerifyMiddleware() {
  return createMiddleware({
    name: "VerifyMiddleware",
    stateSchema: VerifyStateSchema,

    // [COGNITION-QUALITY-GATE] START — added by cognition system refactor
    async wrapModelCall(request, handler) {
      let qualityStandard: string | null = null;

      try {
        const roleModule = await CognitionLoader.loadModule("ROLE");
        // ROLE is not in MODULE_REGISTRY, load it directly
        qualityStandard = extractQualityStandard(roleModule.body);
      } catch {
        // If ROLE.md is not a registered module, try loading directly
        try {
          const raw = await CognitionLoader.readCognitionFile("ROLE.md");
          const parsed = CognitionLoader.parseFrontmatter(raw);
          qualityStandard = extractQualityStandard(parsed.body);
        } catch (err) {
          // eslint-disable-next-line no-console
          console.warn(
            "[VerifyMiddleware] Could not load ROLE.md for quality check:",
            err instanceof Error ? err.message : err,
          );
        }
      }

      if (qualityStandard) {
        const qualityBlock =
          `\n\n---\n## Quality standard for this role\n` +
          `The output must satisfy the following criteria before it can be considered complete:\n\n` +
          `${qualityStandard}\n\n` +
          `If any criterion is NOT met, return verification status: FAIL and list which criteria failed.`;

        const existingContent = request.systemMessage.content;
        const existingBlocks =
          typeof existingContent === "string"
            ? [{ type: "text" as const, text: existingContent }]
            : Array.isArray(existingContent)
              ? existingContent
              : [];

        const newSystemMessage = new SystemMessage({
          content: [
            ...existingBlocks,
            { type: "text" as const, text: qualityBlock },
          ],
        });

        return handler({
          ...request,
          systemMessage: newSystemMessage,
        });
      }

      return handler(request);
    },
    // [COGNITION-QUALITY-GATE] END
  });
}
