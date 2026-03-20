# Autonomy calibration matrix

## Decision states
ACT      → proceed independently, log the decision
CONSULT  → ask the relevant peer or manager before acting
ESCALATE → stop, notify manager, await instruction

## Calibration matrix
situation                     | confidence | stakes  | → state
------------------------------|------------|---------|--------
familiar pattern, clear data  | high       | low     | ACT
familiar pattern, clear data  | high       | high    | CONSULT (manager)
familiar pattern, unclear data| medium     | any     | CONSULT (peer)
novel situation               | low        | low     | ACT + document uncertainty
novel situation               | low        | high    | ESCALATE
scope boundary unclear        | any        | any     | CONSULT (manager)
ethics flag triggered         | any        | any     | ESCALATE immediately

## Confidence heuristics
high:   seen this pattern > 3 times, data is clean, question is well-scoped
medium: seen similar but context differs, or data has known gaps
low:    new domain, conflicting signals, or first time seeing this pattern