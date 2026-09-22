[CmdletBinding()]
param(
    [string]$Root,
    [string]$CanonicalRepo,
    [string]$OutputPath,
    [switch]$IncludeSize
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if (-not $Root) {
    $Root = Join-Path ([Environment]::GetFolderPath("MyDocuments")) "Codex"
}
if (-not $CanonicalRepo) {
    $CanonicalRepo = Split-Path -Parent $PSScriptRoot
}

$Root = (Resolve-Path -LiteralPath $Root).Path
$CanonicalRepo = (Resolve-Path -LiteralPath $CanonicalRepo).Path
$ErrorActionPreference = "Continue"
$canonicalRemoteOutput = @(& git -C $CanonicalRepo remote get-url origin 2>$null)
$canonicalRemoteExitCode = $LASTEXITCODE
$canonicalRemote = ($canonicalRemoteOutput | Select-Object -First 1)
if ($canonicalRemoteExitCode -ne 0 -or -not $canonicalRemote) {
    throw "Canonical repository has no readable origin remote: $CanonicalRepo"
}

$markers = @(Get-ChildItem -LiteralPath $Root -Recurse -Force -Filter ".git" -ErrorAction SilentlyContinue)
$repoPaths = @($markers | ForEach-Object {
    if ($_.PSIsContainer) { $_.Parent.FullName } else { $_.DirectoryName }
} | Sort-Object -Unique)

$rows = @()
foreach ($repoPath in $repoPaths) {
    $safeDirectory = "safe.directory=$($repoPath -replace '\\', '/')"
    $remoteOutput = @(& git -c $safeDirectory -C $repoPath remote get-url origin 2>$null)
    $remoteExitCode = $LASTEXITCODE
    $remote = ($remoteOutput | Select-Object -First 1)
    if ($remoteExitCode -ne 0 -or $remote -ne $canonicalRemote) { continue }

    $branch = (& git -c $safeDirectory -C $repoPath branch --show-current 2>$null | Select-Object -First 1)
    $status = @(& git -c $safeDirectory -C $repoPath status --porcelain=v1 2>$null)
    $localOnly = @(& git -c $safeDirectory -C $repoPath log --branches --not --remotes --format="%H" 2>$null)
    $absentFromCanonical = @()

    foreach ($commit in $localOnly) {
        & git -C $CanonicalRepo cat-file -e "$commit`^{commit}" 2>$null
        if ($LASTEXITCODE -ne 0) {
            $absentFromCanonical += $commit
            continue
        }

        $containingRemote = @(& git -C $CanonicalRepo for-each-ref "--contains=$commit" --format="%(refname:short)" refs/remotes/origin 2>$null)
        if (-not $containingRemote) { $absentFromCanonical += $commit }
    }

    $sizeBytes = $null
    if ($IncludeSize) {
        $measurement = Get-ChildItem -LiteralPath $repoPath -Recurse -Force -File -ErrorAction SilentlyContinue |
            Measure-Object -Property Length -Sum
        $sizeBytes = [int64]$measurement.Sum
    }

    $untrackedCount = @($status | Where-Object { $_ -like "??*" }).Count
    $trackedCount = $status.Count - $untrackedCount
    $reviewRequired = $status.Count -gt 0 -or $absentFromCanonical.Count -gt 0
    $rows += [pscustomobject]@{
        Path = $repoPath
        Branch = $branch
        RemoteUrl = $remote
        StatusEntries = $status.Count
        TrackedChanges = $trackedCount
        UntrackedFiles = $untrackedCount
        LocalOnlyVsStoredRemotes = $localOnly.Count
        CommitsAbsentFromCanonical = $absentFromCanonical.Count
        AbsentCommitIds = ($absentFromCanonical -join ";")
        ApproximateSizeBytes = $sizeBytes
        ReviewRequired = $reviewRequired
        CleanupCandidate = -not $reviewRequired
    }
}

$rows = @($rows | Sort-Object Path)
$ErrorActionPreference = "Stop"
if ($OutputPath) {
    $resolvedOutput = if ([IO.Path]::IsPathRooted($OutputPath)) { $OutputPath } else { Join-Path $CanonicalRepo $OutputPath }
    $outputDirectory = Split-Path -Parent $resolvedOutput
    if ($outputDirectory -and -not (Test-Path -LiteralPath $outputDirectory)) {
        New-Item -ItemType Directory -Path $outputDirectory -Force | Out-Null
    }
    $rows | Export-Csv -LiteralPath $resolvedOutput -NoTypeInformation -Encoding UTF8
    Write-Host "Audit report: $resolvedOutput"
}

$reviewCount = @($rows | Where-Object ReviewRequired).Count
Write-Host "BoxThisLap repositories: $($rows.Count); review required: $reviewCount; cleanup candidates: $($rows.Count - $reviewCount)."
$rows
