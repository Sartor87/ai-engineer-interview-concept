---
description: Onboard to a new task with codebase exploration and documented context
allowed-tools: Read, Glob, Grep, Bash(git:*)
---

Onboard to this task: $ARGUMENTS

## Instructions

AI models start fresh on every task. Before writing any code, build a complete picture of the relevant context.

### 1. Understand the task

Restate in your own words:
- What needs to be done
- What acceptance criteria exist
- What constraints apply (security rules from CLAUDE.md, architecture from workspace.dsl)

### 2. Explore the codebase

Use extended thinking. Explore relevant areas:

**Frontend (`src/`)**: `App.jsx`, topic data, chat panel, SSE handling
**Backend (`api/`)**: `ChatFunction.cs`, `SessionFunction.cs`, `StihiaService.cs`, `TopicData.cs`
**Architecture**: `architecture/workspace.dsl`, relevant ADRs in `architecture/ADRs/`
**CI/CD**: `.github/workflows/` if the task touches deployment or pipeline
**IaC**: `infra/main.tf` if the task touches infrastructure

```bash
git log --oneline -20
git diff main...HEAD --stat
```

### 3. Ask clarifying questions

List any blockers before starting. Do not assume — ask.

Examples:
- "Should the new agent follow ADR-0007's Azure AI Foundry pattern, or is this a local prototype?"
- "Is the `topicId` range validated server-side or should I add it?"

### 4. Document findings

Create `.claude/tasks/$ARGUMENTS/onboarding.md` with:

```markdown
# Onboarding: $ARGUMENTS

## Task Summary
[What needs to be done, in your own words]

## Relevant Files
[List files that need reading or changing]

## Key Constraints
[Security rules, architecture decisions, CI requirements]

## Questions Asked
[Questions + answers received]

## Plan
[High-level steps before writing any code]
```

### 5. Confirm before implementing

Show the onboarding doc summary. Wait for explicit approval before writing any code.
