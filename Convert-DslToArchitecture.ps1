<#
.SYNOPSIS
    Converts a Structurizr workspace.dsl to a SonarQube architecture.json.
.DESCRIPTION
    Parses containers and components from the Structurizr DSL.
    Infers source file patterns from technology strings + filesystem scan.
    Derives deny constraints from relationships declared in the model:
      - All cross-container source imports → deny
      - Component pairs with no DSL relationship → deny (Infrastructure groups excluded)
    Supports explicit overrides via DSL properties block:
      properties { "sonar.patterns" "src/**,src/*.jsx" }
.PARAMETER DslPath
    Path to workspace.dsl. Default: architecture\workspace.dsl
.PARAMETER OutputPath
    Output path for architecture.json. Default: architecture.json
.EXAMPLE
    .\Convert-DslToArchitecture.ps1
    .\Convert-DslToArchitecture.ps1 -DslPath arch\workspace.dsl -OutputPath sonar\arch.json
#>
#Requires -Version 7.0
param(
    [string] $DslPath    = 'architecture\workspace.dsl',
    [string] $OutputPath = 'architecture.json'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# Anchor CWD to the project root (the directory containing this script).
# Without this, Find-SourceRoot searches from wherever the caller launched,
# producing wrong or empty relative paths.
if ($PSScriptRoot) { Set-Location $PSScriptRoot }

# ── Technology → file extension table ────────────────────────────────────────
$TechExtensions = @(
    [pscustomobject]@{ Regex = 'React|Vite|Vue|Angular|Svelte|Next\.js';      Exts = @('jsx','tsx','js','ts') }
    [pscustomobject]@{ Regex = '\.NET|C#|dotnet|Azure.*Function|Isolated';    Exts = @('cs') }
    [pscustomobject]@{ Regex = 'Python|FastAPI|Flask|Django';                  Exts = @('py') }
    [pscustomobject]@{ Regex = 'Node\.?js|Express|NestJS';                    Exts = @('js','ts') }
    [pscustomobject]@{ Regex = 'Java|Spring|Micronaut|Quarkus';               Exts = @('java') }
    [pscustomobject]@{ Regex = '\bGo\b|Golang';                               Exts = @('go') }
    [pscustomobject]@{ Regex = 'Ruby|Rails';                                   Exts = @('rb') }
    [pscustomobject]@{ Regex = 'Rust';                                         Exts = @('rs') }
)

# Directories excluded from source root detection
$SkipDirs = [System.Collections.Generic.HashSet[string]] @(
    'obj','bin','node_modules','dist','.git','.vs','coverage',
    'test','tests','spec','__pycache__','out','build','publish'
)

# Component groups whose DI/host role means they wire everything —
# excluded from constraint generation to avoid false positives.
$InfraLabels = [System.Collections.Generic.HashSet[string]] @(
    'Infrastructure','Host','Bootstrap','Startup','Program'
)

function Get-ExtForTech([string] $tech) {
    foreach ($row in $TechExtensions) {
        if ($tech -match $row.Regex) { return [string[]] $row.Exts }
    }
    return [string[]] @()
}

# Walk the tree and return the shallowest folder containing files
# with the given extensions, skipping build/vendor directories.
function Find-SourceRoot([string[]] $exts) {
    $seen = @{}
    foreach ($ext in $exts) {
        Get-ChildItem -Path '.' -Filter "*.$ext" -Recurse -File -ErrorAction SilentlyContinue |
        Where-Object {
            $skip = $false
            foreach ($part in ($_.FullName -split [regex]::Escape([IO.Path]::DirectorySeparatorChar))) {
                if ($SkipDirs.Contains($part)) { $skip = $true; break }
            }
            -not $skip
        } | ForEach-Object {
            $rel = [IO.Path]::GetRelativePath($PWD.Path, $_.DirectoryName).Replace('\', '/')
            if ($rel -eq '.') { $rel = '' }
            if (-not $seen.ContainsKey($rel)) { $seen[$rel] = ($rel -split '/').Count }
        }
    }
    if ($seen.Count -eq 0) { return $null }
    return ($seen.GetEnumerator() | Sort-Object Value | Select-Object -First 1).Key
}

# ── DSL parser helpers ────────────────────────────────────────────────────────

# Extract content of the balanced-brace block starting at $start.
function Get-BracedBlock([string] $text, [int] $start) {
    $depth = 0
    for ($i = $start; $i -lt $text.Length; $i++) {
        if     ($text[$i] -eq '{') { $depth++ }
        elseif ($text[$i] -eq '}') {
            $depth--
            if ($depth -eq 0) { return $text.Substring($start, $i - $start + 1) }
        }
    }
    throw "Unbalanced braces in DSL at offset $start"
}

# Return the first quoted value for a DSL keyword, e.g. description "foo" → "foo".
function Get-Field([string] $block, [string] $keyword) {
    if ($block -match "(?m)^\s*$keyword\s+`"([^`"]+)`"") { return $Matches[1] }
    return $null
}

# Return sonar.patterns from a DSL properties block, or $null if absent.
function Get-SonarPatterns([string] $block) {
    if ($block -match '(?s)properties\s*\{[^}]*"sonar\.patterns"\s+"([^"]+)"') {
        return [string[]] ($Matches[1] -split '\s*,\s*' | ForEach-Object { $_.Trim() } | Where-Object { $_ })
    }
    return $null
}

# ── Parse the DSL ─────────────────────────────────────────────────────────────
Write-Host "Parsing  : $DslPath"
$dsl = (Get-Content $DslPath -Raw) -replace '(?m)^\s*#.*$', ''   # strip line comments

# Locate the model { ... } block
if ($dsl -notmatch '(?m)\bmodel\b') { throw "No 'model' block found in $DslPath" }
$modelStart = [regex]::Match($dsl, '(?m)\bmodel\s*\{').Index
$modelBrace = $dsl.IndexOf('{', $modelStart)
$modelBlock = Get-BracedBlock $dsl $modelBrace

$containers = [System.Collections.Generic.List[hashtable]] @()

$containerRx = [regex] '(?m)(\w+)\s*=\s*container\s+"([^"]+)"'
foreach ($cm in $containerRx.Matches($modelBlock)) {
    $varName = $cm.Groups[1].Value
    $label   = $cm.Groups[2].Value
    $brace   = $modelBlock.IndexOf('{', $cm.Index + $cm.Length)
    $block   = Get-BracedBlock $modelBlock $brace

    $tech     = Get-Field $block 'technology'
    $desc     = Get-Field $block 'description'
    $tags     = (Get-Field $block 'tags') ?? ''
    $sonarPat = Get-SonarPatterns $block

    # Resolve container-level file patterns
    $patterns = $sonarPat
    if (-not $patterns -and $tech) {
        $exts = Get-ExtForTech $tech
        if ($exts) {
            $root = Find-SourceRoot $exts
            $patterns = if ($root) { [string[]] @("$root/**") }
                        else       { [string[]] ($exts | ForEach-Object { "**/*.$_" }) }
        }
    }

    # Parse components inside this container
    $components = [System.Collections.Generic.List[hashtable]] @()
    $compRx = [regex] '(?m)(\w+)\s*=\s*component\s+"([^"]+)"'
    foreach ($comp in $compRx.Matches($block)) {
        $cVar   = $comp.Groups[1].Value
        $cLabel = $comp.Groups[2].Value
        $cBrace = $block.IndexOf('{', $comp.Index + $comp.Length)
        $cBlock = Get-BracedBlock $block $cBrace

        $cTech     = Get-Field $cBlock 'technology'
        $cDesc     = Get-Field $cBlock 'description'
        $cTags     = (Get-Field $cBlock 'tags') ?? ''
        $cSonarPat = Get-SonarPatterns $cBlock

        $cPatterns = $cSonarPat
        if (-not $cPatterns -and $cTags -notmatch 'DataStore') {
            $exts = if ($tech) { Get-ExtForTech $tech } else { @() }
            if ($exts) {
                # Search the tree directly by filename — robust regardless of CWD or container root.
                $found = $false
                foreach ($ext in $exts) {
                    $hits = Get-ChildItem -Path '.' -Filter "$cLabel.$ext" -Recurse -File -ErrorAction SilentlyContinue |
                        Where-Object {
                            $skip = $false
                            foreach ($part in ($_.FullName -split [regex]::Escape([IO.Path]::DirectorySeparatorChar))) {
                                if ($SkipDirs.Contains($part)) { $skip = $true; break }
                            }
                            -not $skip
                        }
                    if ($hits) {
                        $cPatterns = [string[]] @($hits | ForEach-Object {
                            [IO.Path]::GetRelativePath($PWD.Path, $_.FullName).Replace('\', '/')
                        })
                        $found = $true
                        break
                    }
                }
                if (-not $found) {
                    # File not on disk yet — emit a glob pattern under the container root.
                    $root = if ($patterns) { $patterns[0] -replace '/\*\*.*$', '' } else { '' }
                    $cPatterns = [string[]] ($exts | ForEach-Object {
                        if ($root) { "$root/**/$cLabel.$_" } else { "**/$cLabel.$_" }
                    })
                }
            } elseif ($patterns) {
                $cPatterns = $patterns
            }
        }

        $components.Add(@{
            VarName  = $cVar
            Label    = $cLabel
            Desc     = $cDesc
            Tech     = $cTech
            Tags     = $cTags
            Patterns = $cPatterns
        }) | Out-Null
    }

    $containers.Add(@{
        VarName    = $varName
        Label      = $label
        Desc       = $desc
        Tech       = $tech
        Tags       = $tags
        Patterns   = $patterns
        Components = $components
    }) | Out-Null
}

# Build component var → { Comp, Container } lookup
$compVarMap = @{}
foreach ($ctr in $containers) {
    foreach ($comp in $ctr.Components) {
        $compVarMap[$comp.VarName] = @{ Comp = $comp; Container = $ctr }
    }
}

# Collect allowed intra-container component relationships from DSL
$allowedRels = [System.Collections.Generic.HashSet[string]] @()
$relRx = [regex] '(?m)^\s*(\w+)\s*->\s*(\w+)'
foreach ($m in $relRx.Matches($modelBlock)) {
    $from = $m.Groups[1].Value
    $to   = $m.Groups[2].Value
    if ($compVarMap.ContainsKey($from) -and $compVarMap.ContainsKey($to)) {
        $fc = $compVarMap[$from].Container
        $tc = $compVarMap[$to].Container
        if ($fc -and $tc -and $fc.VarName -eq $tc.VarName) {
            $allowedRels.Add("$from->$to") | Out-Null
        }
    }
}

# ── Build perspectives ────────────────────────────────────────────────────────

function New-Group([hashtable] $elem) {
    $g = [ordered] @{ label = $elem.Label }
    if ($elem.Desc)     { $g['description'] = $elem.Desc }
    if ($elem.Patterns) { $g['patterns']    = [array] $elem.Patterns }
    return $g
}

$perspectives = [System.Collections.Generic.List[object]] @()

# ── Perspective: Containers ───────────────────────────────────────────────────
$visibleContainers = @($containers | Where-Object { $_.Tags -notmatch 'External' -and $_.Patterns })
if ($visibleContainers.Count -ge 1) {
    $cGroups = @($visibleContainers | ForEach-Object { New-Group $_ })

    $cConstraints = @(
        foreach ($from in $cGroups) {
            foreach ($to in $cGroups) {
                if ($from.label -eq $to.label) { continue }
                [ordered] @{
                    from     = [array] @($from.label)
                    to       = [array] @($to.label)
                    relation = 'deny'
                    message  = "$($from.label) must not import $($to.label) source — cross-container communication is over HTTP only."
                }
            }
        }
    )

    $p = [ordered] @{
        label       = 'Containers'
        description = 'Deployable units from the C4 Container model. Source-level imports between containers are forbidden; all cross-container communication is over HTTP.'
        groups      = $cGroups
    }
    if ($cConstraints.Count) { $p['constraints'] = $cConstraints }
    $perspectives.Add($p) | Out-Null
}

# ── One perspective per container that has components ─────────────────────────
foreach ($ctr in ($containers | Where-Object { $_.Tags -notmatch 'External' -and $_.Components.Count -gt 0 })) {

    $eligibleComps = @($ctr.Components | Where-Object { $_.Tags -notmatch 'DataStore' -and $_.Patterns })
    if ($eligibleComps.Count -lt 2) { continue }

    $compGroups = @($eligibleComps | ForEach-Object { New-Group $_ })

    # Constraint source excludes Infrastructure groups (they wire DI and know all types)
    $constrainableGroups = @($compGroups | Where-Object { $_.label -notin $InfraLabels })

    $compConstraints = @(
        foreach ($from in $constrainableGroups) {
            foreach ($to in $constrainableGroups) {
                if ($from.label -eq $to.label) { continue }
                $fromVar = ($ctr.Components | Where-Object { $_.Label -eq $from.label } | Select-Object -First 1).VarName
                $toVar   = ($ctr.Components | Where-Object { $_.Label -eq $to.label   } | Select-Object -First 1).VarName
                if (-not $fromVar -or -not $toVar) { continue }
                if ($allowedRels.Contains("$fromVar->$toVar")) { continue }
                [ordered] @{
                    from     = [array] @($from.label)
                    to       = [array] @($to.label)
                    relation = 'deny'
                    message  = "$($from.label) → $($to.label) dependency not declared in C4 model (workspace.dsl)."
                }
            }
        }
    )

    $p = [ordered] @{
        label       = "$($ctr.Label) — Components"
        description = "Internal component structure of '$($ctr.Label)' from the C4 Component model."
        groups      = $compGroups
    }
    if ($compConstraints.Count) { $p['constraints'] = $compConstraints }
    $perspectives.Add($p) | Out-Null
}

# ── Write output ──────────────────────────────────────────────────────────────
$result = [ordered] @{ perspectives = [array] $perspectives }
$json   = $result | ConvertTo-Json -Depth 12
Set-Content -Path $OutputPath -Value $json -Encoding UTF8

$totalComps = ($containers | ForEach-Object { $_.Components.Count } | Measure-Object -Sum).Sum
Write-Host "Written  : $OutputPath"
Write-Host "  Perspectives : $($perspectives.Count)"
Write-Host "  Containers   : $($containers.Count) ($($visibleContainers.Count) with source patterns)"
Write-Host "  Components   : $totalComps"
Write-Host "  Allowed rels : $($allowedRels.Count)"
