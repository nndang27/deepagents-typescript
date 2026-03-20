# DYOS — Design Your Outsourcing System

> An agentic operating system that instantiates professional roles as executable cognitive identities — not just skill-based task runners.
---
## Roadmap

### Completed
- [x] Design demo cognition behaviour for agent
- [x] Design a complex cognition system and mechanism that can store and learn, acting like an expert

### In Progress / Planned
- [ ] Automatically read task logs on Jira and set KPIs as external goals
- [ ] Agent-to-payment via [x402 protocol](https://x402.org)
- [ ] **Human expert training system** — a mechanism for a human expert to train an agent to copy their exact experience, behaviour, and levels of thinking:
  - *Daily work journal mode* — the agent OS acts as a structured note-taking layer, capturing an expert's daily decisions and reasoning directly as experience episodes
  - *Experience harvesting via Q&A* — start with a guided conversation that extracts tacit knowledge through structured questions, building the agent's `EXPERIENCE_CORE` and `episodes/` from the expert's answers
  - *Continuous screen tracking (Claw)* — a passive observation mode that follows an expert's screen throughout their workday, recording how they handle tasks inside their real company environment and converting those observations directly into experience files
    
---

## What is DYOS?

Most agent systems today give you workers. DYOS gives you a **team**.

The difference: a skill-based agent knows *what it can do*. A DYOS agent knows *who it is* — its responsibilities, its quality bar, its ethical limits, its past mistakes, and its place in an organizational hierarchy. Strip away any one of those layers and you get output that a real professional would recognize as incomplete, overconfident, or procedurally wrong.

DYOS is the operating system kernel for profession-based agents. You define a role once using a set of cognitive files. The system instantiates any number of agents from that definition — Junior, Mid, or Senior — each behaving with the judgment, scope, and experience appropriate to their level.

---

## The Cognition System

Each agent is defined by a layered set of `.md` files. Every file serves a purpose no other file can fulfill.

| File | What it encodes | Without it, the agent... |
|------|----------------|--------------------------|
| `MANIFEST.md` | Identity + module index | Loads everything at boot, wasting context |
| `ROLE.md` | Responsibility + quality standard | Produces correct data with no professional framing |
| `ETHICS.md` | Hard limits + proactive flags | Shares PII, presents correlation as causation |
| `GOAL.md` | Internal drives + professional stance | Optimizes locally, ignores business impact |
| `SKILLS.md` | Capability + tool philosophy | Uses the wrong tool, ignores craft standards |
| `AUTONOMY.md` | Confidence calibration matrix | Always escalates or always acts — no judgment |
| `SOCIAL.md` | Collaboration + escalation graph | Works in isolation, ships without review |
| `EXPERIENCE_CORE.md` | Self-awareness + known gaps | Applies patterns without knowing their failure modes |
| `EXPERIENCE_INDEX.md` | Memory index (keyword → episode) | Repeats the same mistake every sprint |
| `episodes/` | Specific lessons learned | Has no institutional memory — permanently junior |

Removing any single file creates a specific, predictable **behavioral gap** — not a crash. The agent still runs. It just produces the kind of output that gets flagged in a human code review.

---

## Architecture

```
Agent OS
├── cognition/
│   ├── MANIFEST.md           ← always loaded at boot
│   ├── ROLE.md               ← always loaded at boot
│   ├── ETHICS.md             ← always loaded at boot
│   ├── GOAL.md               ← lazy-loaded on task start
│   ├── SKILLS.md             ← lazy-loaded on tool decision
│   ├── AUTONOMY.md           ← lazy-loaded on uncertainty
│   ├── SOCIAL.md             ← lazy-loaded on escalation
│   ├── EXPERIENCE_CORE.md    ← lazy-loaded on novel situation
│   ├── EXPERIENCE_INDEX.md   ← lazy-loaded on keyword match
│   └── episodes/             ← loaded individually by index
├── middleware/
│   ├── memory.ts             ← injects always-on modules
│   ├── verify.ts             ← quality gate + stuck detection + experience writer
│   ├── summarize.ts          ← task summarization
│   └── fs.ts                 ← filesystem tools
└── tools/
    └── notebook_mode/        ← Python notebook execution
```

**Key design principle:** only 3 files are injected into the prompt at boot (MANIFEST, ROLE, ETHICS). Everything else is loaded by the agent itself via `read_persona_module()` when the trigger condition applies. This keeps the context window lean while giving the agent full situational awareness.

---

## Roles & Experience Levels

Any profession can be defined using the same cognitive file set. Experience level gates both autonomy and tool access:

| Level | Behavior |
|-------|----------|
| Junior | Narrow scope, frequent escalation, limited tool access |
| Mid | Independent on familiar patterns, consults on novel ones |
| Senior | Shapes the brief, pushes back, owns outcomes end-to-end |
| Staff | Cross-domain influence, defines standards for others |

---

---

## Getting Started

```bash
# Clone the repo
git clone https://github.com/your-org/dyos
cd dyos

# Install dependencies
npm install

# Run the Data Analyst demo
npx ts-node test_coding_agent.ts
```

---

## Philosophy

> A résumé is a static description of a professional.  
> DYOS is the operating system that executes one.

The goal is not to make agents that *have* skills. It is to make agents that *are* professionals — with the judgment, accountability, and institutional memory that the word implies.

---

## License

MIT
