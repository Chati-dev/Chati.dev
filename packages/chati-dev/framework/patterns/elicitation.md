# Elicitation Patterns

Agents use structured elicitation patterns to collect data from users. These patterns are baked into Protocol 5.8 (Interaction Model).

> **Full Library**: See `chati.dev/patterns/elicitation-library.yaml` for the complete catalog of 24 methods with triggers, steps, agent mapping, and context-based auto-selection rules.

---

## Pattern Types

### 1. Open Discovery
**Purpose**: Get broad, unfiltered information from the user
**When**: Early pipeline stages (WU, Brief)
**Technique**: Ask open-ended questions, let the user talk freely
**Example prompts**:
- "Tell me about..."
- "Walk me through how this currently works..."
- "What's the biggest challenge you face with..."
- "Describe your ideal outcome..."

**Rules**:
- Do NOT interrupt the user's flow
- Capture everything, filter later
- Ask "what else?" at least once
- Note emotional cues (frustration, excitement)

---

### 2. Guided Choice
**Purpose**: Help the user decide between options at decision points
**When**: Architecture decisions, tech stack selection, design choices
**Technique**: Present options with trade-offs, recommend one
**Example prompts**:
- "Option A vs Option B, considering {constraint}..."
- "I recommend {X} because {reason}. Here are the alternatives..."
- "Given your requirements, these are the three approaches..."

**Rules**:
- Always present at least 2 options
- Include trade-offs for each option
- Lead with a recommendation
- Respect user's final decision

---

### 3. Confirmation
**Purpose**: Validate understanding before proceeding
**When**: After each extraction phase, before finalizing documents
**Technique**: Restate what was understood, ask for correction
**Example prompts**:
- "I understood {X}. Is that correct?"
- "Let me summarize what I've captured so far..."
- "Before I move on, let me confirm: {statement}"
- "Is there anything I'm missing or got wrong?"

**Rules**:
- Be specific in what you're confirming
- Accept corrections gracefully (no justification)
- Update artifacts immediately on correction
- Re-confirm if the correction was significant

---

### 4. Deep Dive
**Purpose**: Extract detailed information about a specific topic
**When**: After Open Discovery reveals areas needing more detail
**Technique**: Focused follow-up questions on a specific area
**Example prompts**:
- "You mentioned {X}. Can you elaborate on..."
- "Tell me more about how {specific process} works..."
- "What happens when {edge case}?"
- "Who is responsible for {specific step}?"

**Rules**:
- Reference what the user already said
- Go deeper, not wider
- Stop when you have enough detail for the current pipeline stage
- Flag items for next agent if they're out of current scope

---

### 5. Constraint Check
**Purpose**: Identify boundaries and limitations
**When**: Before making decisions that have constraints
**Technique**: Ask about limitations, budgets, timelines, must-haves
**Example prompts**:
- "Are there any limitations regarding {area}?"
- "What's the budget/timeline constraint for this?"
- "Are there any technologies you must use or cannot use?"
- "What are the non-negotiable requirements?"

**Rules**:
- Ask about both hard constraints (must/cannot) and soft preferences
- Document constraints explicitly in artifacts
- Verify constraints haven't changed since Brief phase
- Flag constraint conflicts immediately

---

## Recommended Sequences per Agent

| Agent | Sequence | Rationale |
|-------|----------|-----------|
| **greenfield-wu** | Open Discovery -> Deep Dive -> Confirmation | Broad operational understanding first |
| **brownfield-wu** | Deep Dive -> Confirmation -> Constraint Check | Technical details + operational gaps |
| **Brief** | Open Discovery -> Deep Dive -> Confirmation | Brain dump then structure |
| **Detail** | Confirmation -> Guided Choice -> Deep Dive | Validate Brief, then refine |
| **Architect** | Constraint Check -> Guided Choice -> Confirmation | Boundaries first, then decisions |
| **UX** | Open Discovery -> Guided Choice -> Deep Dive | Understand users, then design |
| **Phases** | Confirmation -> Guided Choice | Validate scope, then prioritize |
| **Tasks** | Confirmation -> Constraint Check | Mostly automated, verify edge cases |

---

## User Level Adaptation

### Vibecoder (more guidance)
- Use more Open Discovery and Confirmation
- Explain why each question matters
- Provide examples with every question
- Break complex choices into simpler ones
- Use analogies and everyday language

### Power User (less hand-holding)
- Use more Constraint Check and Guided Choice
- Be concise, skip explanations
- Present trade-offs directly
- Accept technical shorthand
- Move faster through confirmations

---

## Anti-Patterns (NEVER do these)

- **Leading questions**: "Don't you think we should use React?" (biased)
- **Assumption questions**: "You want a REST API, right?" (presumes answer)
- **Multiple questions at once**: "What's the budget, timeline, and team size?" (overload)
- **Jargon with vibecoder**: "Should we use CQRS or event sourcing?" (alienating)
- **Ignoring corrections**: Moving on without updating after user corrects you
