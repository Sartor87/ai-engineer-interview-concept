---
description: Generate a pull request summary for the current branch
allowed-tools: Bash(git:*)
---

Generate a pull request summary for the current branch.

## Steps

### 1. Analyze changes

```bash
git log main..HEAD --oneline
git diff main...HEAD --stat
```

### 2. Generate summary with

- What changed and why
- Files modified (grouped by area: frontend / backend / architecture / CI / infra)
- Breaking changes (if any)
- Architecture sync note (if `workspace.dsl` changed)
- Testing notes

### 3. Format as PR body

```markdown
## Summary
[1-3 bullet points describing the changes]

## Changes

**Frontend (`src/`)**
- [Changes]

**Backend (`api/`)**
- [Changes]

**Architecture / ADRs**
- [Changes — note if `architecture.json` was regenerated]

**CI / Infra**
- [Changes]

## Test Plan
- [ ] Pre-commit checks pass (lint + dotnet build)
- [ ] Manual smoke test: start `func start` + `swa start`, test affected flow
- [ ] Architecture sync verified (`./Convert-DslToArchitecture.ps1` run if DSL changed)
- [ ] No secrets in staged files
```
