---
description: Check if documentation is in sync with recent code changes
allowed-tools: Read, Glob, Grep, Bash(git:*)
---

Verify that project documentation reflects the current state of the codebase.

## Steps

### 1. Identify recent code changes

```bash
git log --since="30 days ago" --oneline --name-only -- src/ api/ infra/ architecture/
```

### 2. Check each documentation target

**README.md**
- Stack table matches current `package.json` deps and `api/ai-interview-guide.csproj`
- Project structure tree matches actual files/folders
- Local dev commands still work (ports, tool versions)
- Environment variables table matches what the Function actually reads
- CI/CD section matches `.github/workflows/azure-static-web-apps.yml` jobs

**architecture/docs/**
- NIM setup guide matches model name and endpoint in `ChatFunction.cs`
- Stihia setup guide matches the integration in `StihiaService.cs`

**architecture/ADRs/**
- ADR statuses reflect current decisions (Proposed → Accepted if implemented)
- Links between ADRs valid (file exists, `## Status` section format correct)
- No ADR references a component/container that no longer exists in `workspace.dsl`

**CLAUDE.md**
- Stack table accurate
- Key commands still work
- Session flow matches `ChatFunction.cs` + `SessionFunction.cs` logic
- Critical rules still relevant

### 3. Report

List only genuine discrepancies — not gaps. Do not suggest adding docs for things that don't need them.

Format:
```
[File] — [What's wrong] — [What it should say]
```

Flag with severity:
- **Stale** — documented fact is now wrong
- **Missing** — documented thing no longer exists
- **Outdated** — approximately right but needs refresh
