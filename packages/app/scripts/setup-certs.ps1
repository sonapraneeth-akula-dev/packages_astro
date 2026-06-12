<#
.SYNOPSIS
  Generates and trusts the local HTTPS certificate authority used by the
  Caddy-routed Go Notes environments (https://*.go-notes.sonapraneeth.in).

.DESCRIPTION
  The Docker Caddy service issues certificates with its own internal CA
  (`tls internal`). Browsers don't trust that CA by default, so local HTTPS URLs
  show a warning. This script:
    1. Ensures the Caddy container is running (it mints the root CA on first start).
    2. Exports Caddy's root CA certificate out of the container.
    3. Installs it into the Windows "Trusted Root Certification Authorities" store.
  Re-running is safe: importing the same certificate is idempotent.
  Requires an elevated (Administrator) PowerShell session.

.PARAMETER Remove
  Removes the Caddy local CA from the trust store instead of installing it.

.EXAMPLE
  bun run certs:setup
  bun run certs:remove
#>
[CmdletBinding()]
param(
  [switch]$Remove
)

$ErrorActionPreference = 'Stop'

$caddyContainer = 'go-notes-caddy'
# Caddy stores its `tls internal` root CA here inside the data volume.
$caddyRootInContainer = '/data/caddy/pki/authorities/local/root.crt'
$storeLocation = 'Cert:\LocalMachine\Root'
# Subject substring used to find the cert in the store for removal.
$caddySubjectMatch = 'Caddy Local Authority'

# Require elevation — writing to the machine trust store needs Administrator.
$isAdmin = ([Security.Principal.WindowsPrincipal] `
    [Security.Principal.WindowsIdentity]::GetCurrent()
).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
  Write-Error 'This script must run in an elevated (Administrator) PowerShell session.'
  Write-Host  'Tip: right-click PowerShell > "Run as administrator", then re-run "bun run certs:setup".'
  exit 1
}

if ($Remove) {
  $certs = Get-ChildItem $storeLocation | Where-Object { $_.Subject -like "*$caddySubjectMatch*" }
  if (-not $certs) {
    Write-Host "No Caddy local CA found in $storeLocation — nothing to remove." -ForegroundColor Yellow
    exit 0
  }
  foreach ($c in $certs) {
    Remove-Item -Path $c.PSPath -Force
    Write-Host "Removed: $($c.Subject) [$($c.Thumbprint)]" -ForegroundColor Green
  }
  exit 0
}

# Ensure Docker is available.
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  Write-Error 'Docker is not installed or not on PATH. Start Docker Desktop and try again.'
  exit 1
}

# Start the Caddy container if it isn't already running. Caddy generates the
# root CA on its first start, so it must be up before we can export it.
$running = (docker ps --filter "name=$caddyContainer" --filter 'status=running' --format '{{.Names}}')
if ($running -notcontains $caddyContainer) {
  Write-Host "Starting the Caddy container ($caddyContainer)..." -ForegroundColor Cyan
  docker compose up -d caddy
}

# Wait for the root CA to be minted inside the container (first boot can lag).
Write-Host 'Waiting for Caddy to generate its root CA...' -ForegroundColor Cyan
$found = $false
for ($i = 0; $i -lt 30; $i++) {
  docker exec $caddyContainer test -f $caddyRootInContainer 2>$null
  if ($LASTEXITCODE -eq 0) { $found = $true; break }
  Start-Sleep -Seconds 1
}
if (-not $found) {
  Write-Error "Caddy root CA not found at $caddyRootInContainer after 30s. Is the caddy service healthy? Try 'bun run docker:logs'."
  exit 1
}

# Copy the root CA out of the container and import it into the trust store.
$tmp = Join-Path $env:TEMP 'go-notes-caddy-root.crt'
docker cp "${caddyContainer}:$caddyRootInContainer" $tmp | Out-Null

$imported = Import-Certificate -FilePath $tmp -CertStoreLocation $storeLocation
Remove-Item $tmp -Force -ErrorAction SilentlyContinue

Write-Host ''
Write-Host 'Installed Caddy local CA into the Trusted Root store:' -ForegroundColor Green
Write-Host "  $($imported.Subject)"
Write-Host "  Thumbprint: $($imported.Thumbprint)"
Write-Host ''
Write-Host 'Local HTTPS URLs are now trusted (restart the browser if it was open):'
Write-Host '  https://dev.go-notes.sonapraneeth.in   https://test.go-notes.sonapraneeth.in'
Write-Host '  https://ppe.go-notes.sonapraneeth.in   https://go-notes.sonapraneeth.in'
