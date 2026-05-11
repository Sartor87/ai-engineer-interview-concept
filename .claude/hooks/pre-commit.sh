#!/usr/bin/env bash
# Pre-commit hook for Claude Code.
# Triggered on every Bash tool call — exits 0 immediately unless it's a git commit.
# On git commit: runs secret scan + frontend lint + dotnet build.
# Exit 2 blocks the commit and surfaces the message to Claude.

set -euo pipefail

# ── Read tool input from stdin ────────────────────────────────────────────────
INPUT=$(cat)

# Extract the bash command — works with python3 or jq, falls back to grep
if command -v python3 &>/dev/null; then
    COMMAND=$(printf '%s' "$INPUT" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    print(d.get('tool_input', {}).get('command', ''))
except Exception:
    pass
" 2>/dev/null)
elif command -v jq &>/dev/null; then
    COMMAND=$(printf '%s' "$INPUT" | jq -r '.tool_input.command // ""' 2>/dev/null)
else
    COMMAND=$(printf '%s' "$INPUT" | grep -o '"command":"[^"]*"' | cut -d'"' -f4)
fi

# Only intercept git commit invocations
echo "$COMMAND" | grep -qE 'git\s+commit' || exit 0

echo "=== Pre-commit checks ==="

FAILED=0

# ── 1. Secret scan ────────────────────────────────────────────────────────────
echo "Scanning staged files for secrets..."

if command -v gitleaks &>/dev/null; then
    if ! gitleaks protect --staged --no-banner 2>&1; then
        echo "ERROR: gitleaks found potential secrets in staged changes."
        FAILED=1
    fi
else
    # Dependency-free fallback: grep staged diff for known secret patterns
    STAGED_DIFF=$(git diff --cached 2>/dev/null || true)

    SECRET_PATTERNS=(
        'nvapi-[A-Za-z0-9_-]{20,}'       # NVIDIA NIM API key
        'sk_[A-Za-z0-9_-]{20,}'           # Stihia / Stripe-style key
        'AKIA[A-Z0-9]{16}'                # AWS access key
        'ghp_[A-Za-z0-9]{36}'             # GitHub PAT
        'password\s*[:=]\s*\S+'           # Generic password assignment
        'AccountKey=[A-Za-z0-9+/=]{20,}'  # Azure storage key
    )

    for pattern in "${SECRET_PATTERNS[@]}"; do
        # Only flag added lines (starting with +), ignore comments and examples
        if echo "$STAGED_DIFF" | grep -E "^\+" | grep -v "^+++" | grep -qE "$pattern"; then
            echo "ERROR: Potential secret matched pattern: $pattern"
            echo "       Review staged changes with: git diff --cached"
            FAILED=1
        fi
    done

    # Explicitly block known secret files if staged
    BLOCKED_FILES=("local.settings.json" ".env" ".env.local" ".env.production" "terraform.tfvars")
    for f in "${BLOCKED_FILES[@]}"; do
        if git diff --cached --name-only | grep -qF "$f"; then
            echo "ERROR: Staged file '$f' may contain secrets and must not be committed."
            FAILED=1
        fi
    done
fi

# ── 2. Frontend lint ──────────────────────────────────────────────────────────
if [ -f "package.json" ] && grep -q '"lint"' package.json; then
    echo "Running frontend lint..."
    if ! npm run lint --silent 2>&1; then
        echo "ERROR: ESLint failed. Fix lint errors before committing."
        FAILED=1
    fi
fi

# ── 3. .NET build ─────────────────────────────────────────────────────────────
if [ -f "api/ai-interview-guide.csproj" ]; then
    echo "Building .NET project..."
    if ! dotnet build api/ai-interview-guide.csproj --no-incremental -v quiet 2>&1; then
        echo "ERROR: dotnet build failed. Fix errors before committing."
        FAILED=1
    fi
fi

# ── Result ────────────────────────────────────────────────────────────────────
if [ "$FAILED" -eq 1 ]; then
    echo ""
    echo "Pre-commit checks FAILED. Commit blocked."
    echo "Fix the issues above, then retry."
    exit 2
fi

echo "Pre-commit checks passed."
exit 0
