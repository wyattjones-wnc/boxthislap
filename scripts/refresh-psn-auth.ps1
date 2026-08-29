[CmdletBinding()]
param(
  [switch]$SkipBrowser,
  [switch]$UseStoredNpsso,
  [switch]$ValidateOnly
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$wranglerConfig = Join-Path $projectRoot 'workers\psn-trophies\wrangler.toml'
$workerOrigin = 'https://box-this-lap-psn.boxthislap.workers.dev'
$playStationLogin = 'https://www.playstation.com/'
$npssoEndpoint = 'https://ca.account.sony.com/api/v1/ssocookie'

function Invoke-WranglerSecretPut {
  param(
    [Parameter(Mandatory)]
    [string]$Name,
    [Parameter(Mandatory)]
    [string]$Value
  )

  $Value | & npx.cmd wrangler secret put $Name --config $wranglerConfig
  if ($LASTEXITCODE -ne 0) {
    throw "Cloudflare rejected the $Name secret update."
  }
}

function ConvertFrom-SecureValue {
  param(
    [Parameter(Mandatory)]
    [Security.SecureString]$Value
  )

  $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($Value)
  try {
    return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
  }
  finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
  }
}

function New-SyncSecret {
  $bytes = [byte[]]::new(32)
  $generator = [Security.Cryptography.RandomNumberGenerator]::Create()
  try {
    $generator.GetBytes($bytes)
  }
  finally {
    $generator.Dispose()
  }
  return [Convert]::ToBase64String($bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_')
}

function Invoke-PsnSync {
  param(
    [Parameter(Mandatory)]
    [string]$Secret
  )

  for ($attempt = 1; $attempt -le 6; $attempt += 1) {
    try {
      return Invoke-RestMethod `
        -Method Post `
        -Uri "$workerOrigin/internal/psn/sync" `
        -Headers @{ Authorization = "Bearer $Secret" } `
        -ContentType 'application/json' `
        -TimeoutSec 300
    }
    catch {
      if ($attempt -eq 6) {
        throw
      }

      $delaySeconds = $attempt * 2
      Write-Host "The new secret is still propagating; retrying in $delaySeconds seconds..."
      Start-Sleep -Seconds $delaySeconds
    }
  }
}

if (-not (Test-Path -LiteralPath $wranglerConfig)) {
  throw "Wrangler configuration was not found at $wranglerConfig"
}

if ($ValidateOnly) {
  Write-Host 'PSN authentication renewal script is valid.' -ForegroundColor Green
  exit 0
}

Write-Host ''
Write-Host 'Box This Lap - renew PSN trophy access' -ForegroundColor Cyan
Write-Host 'Your PSN password and two-factor code stay in the PlayStation browser.'
Write-Host 'Only the NPSSO session token will be sent directly to Cloudflare as an encrypted Worker secret.'
Write-Host ''

if ($UseStoredNpsso) {
  Write-Host 'Using the NPSSO already stored in Cloudflare.'
}
else {
  if (-not $SkipBrowser) {
    Start-Process $playStationLogin
    [void](Read-Host 'Finish signing in to PlayStation in the browser, then press Enter here')
    Start-Process $npssoEndpoint
    Write-Host 'Sony should display JSON containing an "npsso" value.'
  }

  $secureNpsso = Read-Host 'Copy only the npsso value, paste it here, and press Enter' -AsSecureString
  $npsso = ConvertFrom-SecureValue $secureNpsso

  try {
    if ($npsso -notmatch '^[A-Za-z0-9_-]{64}$') {
      throw 'The NPSSO must be the 64-character value inside Sony''s JSON response.'
    }

    Write-Host 'Updating the encrypted Cloudflare PSN secret...'
    Invoke-WranglerSecretPut -Name 'PSN_NPSSO' -Value $npsso
  }
  finally {
    $npsso = $null
    $secureNpsso.Dispose()
  }
}

$syncSecret = New-SyncSecret
try {
  Write-Host 'Rotating the private manual-sync secret...'
  Invoke-WranglerSecretPut -Name 'SYNC_SECRET' -Value $syncSecret

  Write-Host 'Starting the PSN trophy import...'
  $result = Invoke-PsnSync -Secret $syncSecret

  Write-Host ''
  Write-Host "PSN access renewed. Imported $($result.trophiesUpdated) trophies for $($result.gameId)." -ForegroundColor Green
  Write-Host "Status: $workerOrigin/api/psn/status"
}
finally {
  $syncSecret = $null
}
