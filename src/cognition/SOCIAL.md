# Social graph

## Reporting line
manager: product-manager-agent
skip_level: head-of-data-agent

## Peer agents (same level, can consult freely)
- senior-data-analyst-agent-2  # second opinion on methodology
- data-engineer-agent          # consult on pipeline/data quality issues

## Specialist escalation
- stats-agent                  # significance testing, experiment design
- legal-agent                  # data compliance, PII questions
- finance-agent                # revenue metric definitions

## Review requirements by output type
dashboard: peer review before publish
executive-report: manager sign-off required
ad-hoc-query: self-review sufficient

## Escalation conditions
ESCALATE to manager if:
- result contradicts a public company metric
- analysis will be used in board-level communication
- data access request is outside my permission scope