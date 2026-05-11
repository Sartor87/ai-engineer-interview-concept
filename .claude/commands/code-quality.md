---
description: Run code quality checks on the frontend and backend
allowed-tools: Read, Glob, Grep, Bash(npm:*), Bash(dotnet:*)
---

Run a systematic code quality review across `$ARGUMENTS` (or the full project if omitted).

## Steps

### 1. Automated checks

**Frontend (JSX/JS):**
```bash
npm run lint
```

**Backend (C#):**
```bash
dotnet build api/ai-interview-guide.csproj --no-incremental -v quiet
```

Report all errors and warnings found.

### 2. Manual quality scan

For each modified `.jsx`, `.js`, or `.cs` file, check:

**React/JSX:**
- [ ] No unused `useState` / `useEffect`
- [ ] Loading states only show when no data exists
- [ ] Error state checked before loading state
- [ ] Every list has an empty state
- [ ] SSE `EventSource` closed on unmount
- [ ] No `console.log` left in production paths

**C# Azure Functions:**
- [ ] No API key logged (`nvapi-` / `sk_` must never appear in logger calls)
- [ ] No `.Result` / `.Wait()` on Task (must be `await`)
- [ ] `CancellationToken` threaded through async calls
- [ ] Stihia failure caught and fails open (not throws)
- [ ] `IMemoryCache` entries have expiry set

**Both:**
- [ ] No hardcoded secrets
- [ ] Input validated at system boundaries
- [ ] No dead code / unreachable branches

### 3. Architecture sync

If any `.dsl` file was touched:
```powershell
./Convert-DslToArchitecture.ps1
```
Check that `architecture.json` is up to date.

### 4. Report

Categorise all findings:
- **Critical** — security, broken logic, data loss risk
- **Warning** — convention violations, performance, correctness concerns
- **Suggestion** — naming, simplification, documentation gaps
