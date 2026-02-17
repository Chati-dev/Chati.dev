# Chati.dev Quality Standards

## Gate Thresholds
| Agent | Minimum Score |
|-------|--------------|
| qa-planning | 95% |
| qa-implementation | 95% |
| All others | 90% |

## Review Range
Scores within 5 points below threshold trigger REVIEW (human confirmation required even in autonomous mode).

## 5 Pipeline Gates
1. **Planning Complete** — All DISCOVER + PLAN agents finished
2. **QA Planning** — QA-Planning agent validates plan coherence (95% threshold)
3. **Implementation** — Dev agent completes all tasks
4. **QA Implementation** — Tests pass, SAST clean, coverage adequate (95% threshold)
5. **Deploy Ready** — All gates passed, ready for production

## Quality Dimensions
- **Traceability**: Every task traces to a PRD requirement
- **Completeness**: All acceptance criteria have Given-When-Then format
- **Consistency**: No contradictions between artifacts
- **Testability**: Every criterion is objectively verifiable

## Blocker Taxonomy
- **C01-C14**: Code blockers (technical)
- **G01-G08**: General blockers (process, communication, dependency)
