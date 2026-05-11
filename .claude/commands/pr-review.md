---
description: Review a pull request against project standards
allowed-tools: Read, Glob, Grep, Bash(git:*), Bash(gh:*)
---

Review PR: $ARGUMENTS

## Steps

### 1. Fetch PR details

```bash
gh pr view $ARGUMENTS
gh pr diff $ARGUMENTS
```

### 2. Load review standards

Read `.claude/agents/code-reviewer.md` for the full checklist.

### 3. Evaluate changes

For each modified file, check against:

**React/JSX (`src/`):**
- [ ] Loading/error/empty state order correct
- [ ] No hooks called conditionally
- [ ] SSE `EventSource` closed on unmount
- [ ] No `console.log` in production paths
- [ ] No hardcoded secrets

**C# (`api/`):**
- [ ] API key never logged
- [ ] No `.Result` / `.Wait()` — all async awaited
- [ ] `CancellationToken` propagated
- [ ] Stihia failures caught and fail open
- [ ] `IMemoryCache` entries have expiry

**Architecture (`architecture/`):**
- [ ] If `workspace.dsl` changed, `architecture.json` was regenerated
- [ ] ADR links use `## Status` section format

**CI (`\.github/workflows/`):**
- [ ] No secrets hardcoded in YAML
- [ ] Drift check step still present in `azure-static-web-apps.yml`

### 4. Post feedback

```bash
gh pr comment $ARGUMENTS --body "$(cat <<'EOF'
## Code Review

### Critical
[Issues that must be fixed before merge]

### Warnings
[Issues that should be fixed]

### Suggestions
[Optional improvements]

### Approved
[What looks good]
EOF
)"
```

Post inline comments for specific line issues:
```bash
gh api repos/:owner/:repo/pulls/$ARGUMENTS/comments \
  --method POST \
  -f body="..." \
  -f commit_id="..." \
  -f path="..." \
  -F line=...
```
