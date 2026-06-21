<#
.SYNOPSIS
  Adds (or removes) a site's environment hostnames to the Windows hosts file so
  the Caddy-routed environments resolve to a loopback IP for local testing.

.DESCRIPTION
  Project-agnostic. The caller supplies the site's brand, base domain and Caddy
  loopback IP; the script derives the per-environment hostnames
  (`<env>.<domain>` for each environment, plus the bare `<domain>` for prod) and
  writes a clearly-marked, idempotent managed block to
  %SystemRoot%\System32\drivers\etc\hosts. Re-running is safe: the managed block
  (keyed by brand) is replaced, never duplicated. Requires an elevated
  (Administrator) PowerShell session.

.PARAMETER Brand
  Short site identifier used to key the managed hosts block and in messages
  (e.g. "books", "docs", "papers").

.PARAMETER Domain
  Base domain for the site, e.g. "books.sonapraneeth.in". The bare domain maps
  to production; each environment becomes a subdomain of it.

.PARAMETER LoopbackIp
  Loopback IP the hostnames should resolve to (the Caddy bind IP), e.g.
  "127.0.1.3".

.PARAMETER Environments
  Non-production environment names to add as subdomains. Default: dev, test, ppe.

.PARAMETER Remove
  Removes the managed block instead of adding it.

.EXAMPLE
  bun run hosts:setup
  bun run hosts:remove
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)][string]$Brand,
  [Parameter(Mandatory = $true)][string]$Domain,
  [Parameter(Mandatory = $true)][string]$LoopbackIp,
  [string[]]$Environments = @('dev', 'test', 'ppe'),
  [switch]$Remove
)

$ErrorActionPreference = 'Stop'

$hostsPath = Join-Path $env:SystemRoot 'System32\drivers\etc\hosts'
$beginMarker = "# >>> grihasetu $Brand (managed) >>>"
$endMarker = "# <<< grihasetu $Brand (managed) <<<"

# Per-environment subdomains plus the bare domain (production), in that order.
$hostnames = @($Environments | ForEach-Object { "$_.$Domain" }) + @($Domain)

# Require elevation — editing the hosts file needs Administrator rights.
$isAdmin = ([Security.Principal.WindowsPrincipal] `
    [Security.Principal.WindowsIdentity]::GetCurrent()
).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
  Write-Error 'This script must run in an elevated (Administrator) PowerShell session.'
  Write-Host  'Tip: right-click PowerShell > "Run as administrator", then re-run "bun run hosts:setup".'
  exit 1
}

# Read existing content and strip any previous managed block for this brand.
$content = if (Test-Path $hostsPath) { Get-Content $hostsPath -Raw } else { '' }
$pattern = "(?s)\r?\n?$([regex]::Escape($beginMarker)).*?$([regex]::Escape($endMarker))\r?\n?"
$content = [regex]::Replace($content, $pattern, '')

if ($Remove) {
  Set-Content -Path $hostsPath -Value $content.TrimEnd() -Encoding ascii
  Write-Host "Removed managed hosts entries for '$Brand' from $hostsPath" -ForegroundColor Green
  exit 0
}

# Build a fresh managed block.
$lines = $hostnames | ForEach-Object { "$LoopbackIp`t$_" }
$block = @($beginMarker) + $lines + @($endMarker)
$newContent = ($content.TrimEnd() + "`r`n`r`n" + ($block -join "`r`n") + "`r`n")

Set-Content -Path $hostsPath -Value $newContent -Encoding ascii

Write-Host "Updated $hostsPath with:" -ForegroundColor Green
$hostnames | ForEach-Object { Write-Host "  $LoopbackIp  $_" }
Write-Host ''
Write-Host 'You can now reach the environments (once the containers are up):'
$hostnames | ForEach-Object { Write-Host "  https://$_" }
