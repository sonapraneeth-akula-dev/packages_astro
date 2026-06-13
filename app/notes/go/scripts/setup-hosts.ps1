<#
.SYNOPSIS
  Adds (or removes) the Go Notes site hostnames to the Windows hosts file so the
  Caddy-routed environments resolve to localhost for local testing.

.DESCRIPTION
  Writes a clearly-marked, idempotent block to %SystemRoot%\System32\drivers\etc\hosts.
  Re-running is safe: the managed block is replaced, never duplicated.
  Requires an elevated (Administrator) PowerShell session.

.PARAMETER Remove
  Removes the managed block instead of adding it.

.EXAMPLE
  bun run hosts:setup
  bun run hosts:setup -- -Remove
#>
[CmdletBinding()]
param(
  [switch]$Remove
)

$ErrorActionPreference = 'Stop'

$hostsPath = Join-Path $env:SystemRoot 'System32\drivers\etc\hosts'
$beginMarker = '# >>> grihasetu go-notes (managed) >>>'
$endMarker = '# <<< grihasetu go-notes (managed) <<<'

$hostnames = @(
  'dev.go-notes.sonapraneeth.in',
  'test.go-notes.sonapraneeth.in',
  'ppe.go-notes.sonapraneeth.in',
  'go-notes.sonapraneeth.in'
)

# Require elevation — editing the hosts file needs Administrator rights.
$isAdmin = ([Security.Principal.WindowsPrincipal] `
    [Security.Principal.WindowsIdentity]::GetCurrent()
).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
  Write-Error 'This script must run in an elevated (Administrator) PowerShell session.'
  Write-Host  'Tip: right-click PowerShell > "Run as administrator", then re-run "bun run hosts:setup".'
  exit 1
}

# Read existing content and strip any previous managed block.
$content = if (Test-Path $hostsPath) { Get-Content $hostsPath -Raw } else { '' }
$pattern = "(?s)\r?\n?$([regex]::Escape($beginMarker)).*?$([regex]::Escape($endMarker))\r?\n?"
$content = [regex]::Replace($content, $pattern, '')

if ($Remove) {
  Set-Content -Path $hostsPath -Value $content.TrimEnd() -Encoding ascii
  Write-Host "Removed managed hosts entries from $hostsPath" -ForegroundColor Green
  exit 0
}

# Build a fresh managed block.
$lines = $hostnames | ForEach-Object { "127.0.1.3`t$_" }
$block = @($beginMarker) + $lines + @($endMarker)
$newContent = ($content.TrimEnd() + "`r`n`r`n" + ($block -join "`r`n") + "`r`n")

Set-Content -Path $hostsPath -Value $newContent -Encoding ascii

Write-Host "Updated $hostsPath with:" -ForegroundColor Green
$hostnames | ForEach-Object { Write-Host "  127.0.1.3  $_" }
Write-Host ''
Write-Host 'You can now reach the environments (once the containers are up):'
Write-Host '  https://dev.go-notes.sonapraneeth.in   https://test.go-notes.sonapraneeth.in'
Write-Host '  https://ppe.go-notes.sonapraneeth.in   https://go-notes.sonapraneeth.in'
