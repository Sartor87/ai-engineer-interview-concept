#!/usr/bin/env bash
# Builds the static architecture site from:
#   - Mermaid .mmd files exported by structurizr/cli (in architecture/)
#   - ADR markdown files (in architecture/ADRs/)
#   - HTML template (.github/templates/architecture-index.html)
# Output: site/index.html + site/adrs/*.html

set -euo pipefail

TEMPLATE=".github/templates/architecture-index.html"
OUT_DIR="site"
OUT_INDEX="$OUT_DIR/index.html"
ADR_DIR="architecture/ADRs"
MMD_DIR="architecture"

mkdir -p "$OUT_DIR/adrs"

VIEWS_FILE=$(mktemp)
ADRS_FILE=$(mktemp)
trap 'rm -f "$VIEWS_FILE" "$ADRS_FILE"' EXIT

# ── 1. Build VIEWS section from .mmd files ────────────────────────────────────
shopt -s nullglob
for mmd in "$MMD_DIR"/*.mmd; do
    base=$(basename "$mmd" .mmd)
    title=$(echo "$base" \
        | sed -E 's/^structurizr-//; s/-View$//; s/[-_]+/ /g' \
        | sed -E 's/\b(.)/\U\1/g')
    {
        printf '<div class="view">\n'
        printf '  <h3>%s</h3>\n' "$title"
        printf '  <div class="mermaid">\n'
        cat "$mmd"
        printf '\n  </div>\n'
        printf '</div>\n'
    } >> "$VIEWS_FILE"
done
shopt -u nullglob

if [ ! -s "$VIEWS_FILE" ]; then
    echo "ERROR: no .mmd files produced by structurizr/cli." >&2
    exit 1
fi

# ── 2. Build ADR list ─────────────────────────────────────────────────────────
if [ -d "$ADR_DIR" ]; then
    for adr in $(ls "$ADR_DIR"/*.md 2>/dev/null | sort); do
        fname=$(basename "$adr")
        slug="${fname%.md}"
        title=$(grep -m1 '^# ' "$adr" | sed 's/^# //' || true)
        [ -z "$title" ] && title="$fname"
        status=$(awk '
            /^## Status/ { flag=1; next }
            /^## / { flag=0 }
            flag && /^(Proposed|Accepted|Deprecated|Superseded)/ { print; exit }
        ' "$adr")
        [ -z "$status" ] && status="—"
        printf '<li><a href="adrs/%s.html">%s</a> <span style="color:#718096;font-size:0.85em;">— %s</span></li>\n' \
            "$slug" "$title" "$status" >> "$ADRS_FILE"
    done
fi

# ── 3. Inject into template ───────────────────────────────────────────────────
export VIEWS_HTML=$(cat "$VIEWS_FILE")
export ADRS_HTML=$(cat "$ADRS_FILE")
export BUILD_TIME=$(date -u +"%Y-%m-%d %H:%M UTC")
export TEMPLATE OUT_INDEX

python3 <<'PYEOF'
import os, pathlib
tpl = pathlib.Path(os.environ["TEMPLATE"]).read_text(encoding="utf-8")
tpl = tpl.replace("<!-- VIEWS_PLACEHOLDER -->", os.environ["VIEWS_HTML"])
tpl = tpl.replace("<!-- ADRS_PLACEHOLDER -->", os.environ["ADRS_HTML"])
tpl = tpl.replace("<!-- BUILD_TIME -->", os.environ["BUILD_TIME"])
pathlib.Path(os.environ["OUT_INDEX"]).write_text(tpl, encoding="utf-8")
PYEOF

# ── 4. Render ADRs as static HTML via pandoc ──────────────────────────────────
if command -v pandoc &>/dev/null; then
    for adr in "$ADR_DIR"/*.md; do
        [ -f "$adr" ] || continue
        slug=$(basename "$adr" .md)
        pandoc "$adr" \
            --standalone \
            --metadata title="$(basename "$adr")" \
            --css ../adr.css \
            -o "$OUT_DIR/adrs/${slug}.html"
    done
    cat > "$OUT_DIR/adr.css" <<'CSS'
body { font-family: -apple-system, "Segoe UI", Roboto, sans-serif; max-width: 900px; margin: 2rem auto; padding: 0 1rem; line-height: 1.6; color: #1a202c; background: #f7fafc; }
h1, h2, h3 { color: #2b6cb0; }
code { background: #edf2f7; padding: 0.1rem 0.4rem; border-radius: 4px; }
pre code { display: block; padding: 1rem; overflow-x: auto; background: #2d3748; color: #f7fafc; }
a { color: #2b6cb0; }
table { border-collapse: collapse; width: 100%; margin: 1rem 0; }
th, td { border: 1px solid #e2e8f0; padding: 0.5rem; text-align: left; }
th { background: #edf2f7; }
hr { border: none; border-top: 1px solid #e2e8f0; margin: 2rem 0; }
CSS
else
    echo "WARNING: pandoc not installed — skipping ADR HTML rendering." >&2
fi

echo "Site built successfully:"
ls -la "$OUT_DIR"
