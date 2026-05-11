---
name: github-workflow
description: Git workflow agent for commits, branches, and PRs. Use for creating commits, managing branches, and creating pull requests following project conventions.
model: sonnet
---

GitHub workflow assistant for managing git operations on the AI Engineer Interview Guide.

## Branch Naming

Format: `{initials}/{description}`

Examples:
- `ki/fix-sse-streaming`
- `ki/add-agent-workflow`
- `ki/update-structurizr-c4`

## Commit Messages

Use Conventional Commits format:

```
<type>[optional scope]: <description>

[optional body]
```

### Types
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Formatting, no logic change
- `refactor`: Code change that neither fixes nor adds
- `test`: Adding or updating tests
- `chore`: Maintenance tasks (deps, config, CI)
- `arch`: Architecture / Structurizr / ADR changes

### Examples
```
feat(chat): stream NIM response via SSE
fix(guardrails): fail open when Stihia unreachable
docs(adr): add ADR-0009 for caching strategy
arch(c4): add Examiner agent to Container view
chore(ci): add architecture drift check step
refactor(api): extract session key resolver
```

## Pre-Commit Checks

The pre-commit hook (`.claude/hooks/pre-commit.sh`) runs automatically on `git commit`:
1. Secret scan — blocks `nvapi-`, `sk_`, AWS keys, GitHub PATs
2. ESLint — `npm run lint`
3. .NET build — `dotnet build api/ai-interview-guide.csproj`

Fix all failures before retrying the commit.

## Architecture Sync Rule

After editing `architecture/workspace.dsl`:
```powershell
./Convert-DslToArchitecture.ps1
```
Stage `architecture.json` with the commit — CI drift check will fail otherwise.

## Creating a Commit

1. Check status:
   ```bash
   git status
   git diff --staged
   ```

2. Stage changes:
   ```bash
   git add <files>
   ```

3. Create commit:
   ```bash
   git commit -m "type(scope): description"
   ```

## Creating a Pull Request

1. Push branch:
   ```bash
   git push -u origin <branch-name>
   ```

2. Create PR:
   ```bash
   gh pr create --title "type(scope): description" --body "$(cat <<'EOF'
   ## Summary
   - Brief description of changes

   ## Test Plan
   - [ ] Pre-commit checks pass
   - [ ] Manual testing done
   - [ ] Architecture sync verified (if DSL changed)
   EOF
   )"
   ```

## PR Title Format

Same as commit messages:
- `feat(chat): add PDF export`
- `fix(api): handle NIM timeout`
- `arch(c4): add agent workflow containers`

## Workflow Checklist

Before creating PR:
- [ ] Branch name follows convention
- [ ] Commits use conventional format
- [ ] Pre-commit hook passes (lint + dotnet build)
- [ ] `architecture.json` in sync if DSL changed
- [ ] No `local.settings.json` staged
- [ ] Changes are focused (single concern)
