# change.md — Agent OS Cognition System Refactor

## Summary

Implemented a lazy-loading cognition system that injects always-on persona modules (MANIFEST, ROLE, ETHICS) into the agent's system prompt at boot, while making all other modules (GOAL, SKILLS, SOCIAL, AUTONOMY, EXPERIENCE_CORE, EXPERIENCE_INDEX) available on-demand via a `read_persona_module` tool. The system also writes experience episodes after task summarization and gates output quality against the ROLE.md quality standard.

## Files created (new)

### src/cognition/loader.ts
- **Purpose**: Core utility for reading, parsing, and lazy-loading cognition .md modules
- **Key exports**:
  - `CognitionLoader` — aggregated object with all functions
  - `readCognitionFile(filename)` — reads a single .md file from COGNITION_DIR
  - `parseFrontmatter(content)` — splits YAML frontmatter from body
  - `loadModule(moduleName)` — loads a named module from MODULE_REGISTRY
  - `loadAlwaysOnModules()` — loads MANIFEST + ROLE + ETHICS concatenated
  - `matchExperienceEpisodes(taskDescription)` — keyword-matches task to episodes
  - `loadEpisode(episodeFile)` — loads an episode from episodes/ subdirectory
  - `buildPersonaSystemPrompt(basePrompt, options?)` — builds full persona prompt
  - `MODULE_REGISTRY` — registry of on-demand modules with triggers
  - `LAZY_LOAD_TABLE` — markdown table for system prompt injection
  - `COGNITION_DIR` — resolved path to cognition directory

### src/tools/readPersonaModule.ts
- **Purpose**: LangChain tool for agent self-loading of cognition modules
- **Key exports**:
  - `readPersonaModuleTool` — LangChain `tool()` instance with name "read_persona_module"
  - Accepts module names (GOAL, SKILLS, etc.) or episode paths (episodes/ep_023.md)
  - Returns formatted module content with clear headers

### src/middleware/verify.ts
- **Purpose**: Quality gate middleware that checks output against ROLE.md quality standard
- **Key exports**:
  - `createVerifyMiddleware()` — creates middleware that:
    - Loads ROLE.md and extracts "## Quality standard" section
    - Appends quality criteria to the system prompt during model calls
    - Exposes `verificationResult` in state schema for downstream middleware

## Files modified

### src/middleware/memory.ts
- **What changed**:
  - `[COGNITION-LAZY-LOAD]` — Added imports for CognitionLoader and readPersonaModuleTool
  - `[COGNITION-LAZY-LOAD]` — Modified `wrapModelCall` to:
    1. Load always-on cognition modules (MANIFEST + ROLE + ETHICS) via `CognitionLoader.loadAlwaysOnModules()`
    2. Inject the lazy-load instruction table (`LAZY_LOAD_TABLE`) into system prompt
    3. Register `readPersonaModuleTool` in the tools array
  - Changed `wrapModelCall` from sync to async to support await on cognition loading
- **Why**: Previously MemoryMiddleware only injected agent memory files. Now it also serves as the entry point for cognition system injection, placing always-on modules in the system prompt and making on-demand modules accessible via the tool.

### src/middleware/summarization.ts
- **What changed**:
  - `[COGNITION-EXPERIENCE-WRITER]` — Added imports for fs/promises, path, and CognitionLoader
  - `[COGNITION-EXPERIENCE-WRITER]` — Added helper functions:
    - `extractKeywords(taskDescription)` — extracts significant words from task text
    - `getNextEpisodeNumber()` — scans episodes/ directory for next number
    - `writeExperienceEpisode(taskDescription, toolsUsed, outcome, keyInsights)` — writes episode file and updates EXPERIENCE_INDEX.md
  - `[COGNITION-EXPERIENCE-WRITER]` — Added episode writing call in `performSummarization()`, triggered after summarization completes, wrapped in try/catch to never crash the main flow
- **Why**: After task completion and summarization, the agent now writes an experience episode capturing what happened, what tools were used, and whether the outcome was good/partial/failed. This builds the agent's experiential memory over time.

### src/middleware/verify.ts (new file, changes described above)
- **What changed**: `[COGNITION-QUALITY-GATE]` — New middleware that loads ROLE.md quality standard section and appends it to the verification prompt
- **Why**: Ensures agent output meets the role-specific quality criteria defined in ROLE.md

### src/middleware/index.ts
- **What changed**: Added export for `createVerifyMiddleware` from verify.js
- **Why**: Make the new middleware available through the standard middleware barrel export

### src/agent.ts
- **What changed**:
  - `[COGNITION-SUBAGENT-PERSONA]` — Added imports for buildPersonaSystemPrompt and readPersonaModuleTool
  - `[COGNITION-SUBAGENT-PERSONA]` — Modified `processedSubagents` to include `readPersonaModuleTool` in every subagent's tools array, giving subagents access to on-demand cognition modules
- **Why**: Subagents need access to cognition modules (especially GOAL and SKILLS) to make informed decisions. By including the tool in their toolkit, they can load persona context on demand.

## Architecture overview

The cognition system load sequence:

1. **Agent boots** → MemoryMiddleware's `wrapModelCall` loads MANIFEST.md + ROLE.md + ETHICS.md via `CognitionLoader.loadAlwaysOnModules()` and injects them into the system prompt. The lazy-load instruction table is also appended, telling the agent which modules are available on demand.

2. **Agent picks task** → The agent reads the lazy-load table and autonomously calls `read_persona_module("GOAL")` to load goal context before starting work.

3. **Agent hits uncertainty** → The agent calls `read_persona_module("AUTONOMY")` to load decision-making rules (ACT/CONSULT/ESCALATE framework).

4. **Task keywords match past work** → The agent calls `read_persona_module("EXPERIENCE_INDEX")` to scan the index, then calls `read_persona_module("episodes/ep_023.md")` to load matched episodes for relevant past experience.

5. **Task completes** → When conversation is summarized by SummarizationMiddleware, the experience writer:
   - Creates a new episode file (`episodes/ep_NNN.md`) with situation, tools used, outcome, and reuse advice
   - Updates EXPERIENCE_INDEX.md with a new row for the episode

6. **Output verified** → VerifyMiddleware loads the "## Quality standard" section from ROLE.md and appends it to the system prompt, ensuring the agent checks its output against role-specific quality criteria.

## How to add a new profession (e.g. HR Manager)

1. **Edit `src/cognition/MANIFEST.md`** — Change `role:` and `level:` to match the new role.

2. **Edit `src/cognition/ROLE.md`** — Update:
   - Identity (title, domain)
   - Responsibility (owns, does_not_own)
   - Quality standard (definition of "done" for this role)

3. **Edit `src/cognition/ETHICS.md`** — Update reactive blocks, proactive flags, and domain ethics to match the profession's ethical considerations.

4. **Edit `src/cognition/GOAL.md`** — Set new KPIs, internal drives, and professional stance.

5. **Edit `src/cognition/SKILLS.md`** — List the tools and capabilities relevant to the new role.

6. **Edit `src/cognition/SOCIAL.md`** — Define reporting line, peer agents, and escalation conditions.

7. **Edit `src/cognition/AUTONOMY.md`** — Calibrate decision states and confidence thresholds for the new role.

8. **Edit `src/cognition/EXPERIENCE_CORE.md`** — Set seniority profile and epistemic rules.

9. **Clear or update `src/cognition/EXPERIENCE_INDEX.md`** — Remove old episodes or keep relevant ones. Update pattern keywords in MANIFEST.md.

10. **Clear `src/cognition/episodes/`** — Remove profession-specific episodes that don't apply.

No code changes are needed — the cognition system reads these .md files dynamically.

## Known limitations & future work

- **Keyword extraction is naive**: Uses simple stop-word removal and first-5-words selection. A proper NLP approach (TF-IDF, embeddings) would improve episode matching.
- **No semantic search for episodes**: Matching is keyword-based only. Future work could use vector embeddings for semantic similarity matching.
- **COGNITION_DIR is cwd-relative**: Uses `process.cwd()` to resolve the cognition directory. This works for development but may need configuration for deployment.
- **No episode pruning**: Episodes accumulate indefinitely. A future pruning mechanism (keep top N per keyword cluster, archive old ones) would be needed for long-running agents.
- **VerifyMiddleware doesn't actively verify**: It appends quality criteria to the prompt but doesn't separately invoke verification. A more robust approach would use a separate LLM call for explicit pass/fail verification.
- **Experience writing only on summarization**: Episodes are only written when summarization triggers, not on every task completion. For short conversations that don't trigger summarization, no episode is written.
- **ROLE module not in MODULE_REGISTRY**: ROLE.md is loaded directly by VerifyMiddleware since it's also part of the always-on set. The loader falls back to direct file read.

## Testing

### Verify system prompt injection
After agent boot, check the system prompt content. It should contain:
- `# MANIFEST.md` section with role and module registry
- `# ROLE.md` section with identity, responsibility, and quality standard
- `# ETHICS.md` section with reactive/proactive rules
- `## Cognition modules available on demand` table listing 6 modules

### Confirm lazy-loading
Run the agent with a task and check tool call logs. You should see:
- `read_persona_module` calls with module names like "GOAL", "SKILLS", etc.
- The tool returning formatted content with `=== MODULE NAME MODULE ===` headers

### Confirm episode writing
After a conversation triggers summarization:
1. Check `src/cognition/episodes/` for new `ep_NNN.md` files
2. Verify the episode contains: date, task_type, keywords, outcome, situation, tools used, outcome summary, and reuse advice
3. Check `src/cognition/EXPERIENCE_INDEX.md` for a new row with the episode's keywords

### Quick verification commands
```bash
# Find all cognition system changes
grep -rn "COGNITION-" src/

# Check episode directory
ls -la src/cognition/episodes/

# Check EXPERIENCE_INDEX for new entries
cat src/cognition/EXPERIENCE_INDEX.md

# Run TypeScript check (expect zero new errors from cognition changes)
npx tsc --noEmit 2>&1 | grep -E "src/(cognition|tools|middleware/verify)"
```
