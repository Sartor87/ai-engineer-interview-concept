---
description: Work on a ticket from start to finished PR
allowed-tools: Read, Glob, Grep, Bash(git:*), Bash(gh:*), Bash(npm:*), Bash(dotnet:*)
---

Work on ticket: $ARGUMENTS

## Instructions

### 1. Read the ticket

Fetch ticket details using available MCP tools or `gh issue view $ARGUMENTS`:
- Title and description
- Acceptance criteria
- Linked issues or PRs
- Comments

Summarize:
- What needs to be done
- Acceptance criteria
- Blockers or dependencies

### 2. Explore the codebase

Before coding, understand current state:
- Search for related code with Grep/Glob
- Read relevant files (`ChatFunction.cs`, `App.jsx`, `workspace.dsl` as appropriate)
- Check recent git log for context

```bash
git log --oneline -20
```

### 3. Create a branch

```bash
git checkout -b {initials}/{ticket-id}-{brief-description}
```

Example: `ki/123-add-pdf-export`

### 4. Implement

- Follow patterns in CLAUDE.md and `.claude/agents/code-reviewer.md`
- Write tests or manual test plan first
- Make incremental commits using Conventional Commits format
- Run `npm run lint` and `dotnet build api/ai-interview-guide.csproj` before each commit

**After editing `workspace.dsl`:**
```powershell
./Convert-DslToArchitecture.ps1
```

### 5. Create PR

```bash
gh pr create --title "type(scope): description" --body "$(cat <<'EOF'
## Summary
- [What changed]

## Test Plan
- [ ] Pre-commit checks pass
- [ ] Manual test performed
- [ ] Architecture sync verified (if DSL changed)

Closes #$ARGUMENTS
EOF
)"
```

### 6. If you find an unrelated bug

1. Create a new issue with `gh issue create`
2. Note it in the PR description
3. Continue with the original task

## Example

```
/ticket 42

Claude:
1. Reading issue #42...
   Title: Add score threshold config for Aftersales agent
   Criteria: threshold must be read from env var, not hardcoded

2. Searching codebase...
   Relevant: api/TopicData.cs, architecture/ADRs/0008-agent-count-and-boundaries.md

3. Creating branch: ki/42-aftersales-score-threshold

4. [Implements feature]

5. Creating PR: feat(api): read Aftersales score threshold from env
   Closes #42
```
