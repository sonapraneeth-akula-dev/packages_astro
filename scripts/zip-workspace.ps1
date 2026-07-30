param(
  [string]$OutputPath
)

$ErrorActionPreference = "Stop"

$repoRoot = (& git rev-parse --show-toplevel).Trim()
if (-not $repoRoot) {
  throw "Not inside a git repository."
}

$repoName = Split-Path -Leaf $repoRoot
if (-not $OutputPath) {
  $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
  $OutputPath = Join-Path $repoRoot ("{0}-{1}.zip" -f $repoName, $timestamp)
}
elseif (-not [System.IO.Path]::IsPathRooted($OutputPath)) {
  $OutputPath = Join-Path $repoRoot $OutputPath
}

$outputDir = Split-Path -Parent $OutputPath
if ($outputDir -and -not (Test-Path -LiteralPath $outputDir)) {
  New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
}

$filesToZip = New-Object "System.Collections.Generic.HashSet[string]" ([System.StringComparer]::OrdinalIgnoreCase)

# Include tracked and unignored files according to gitignore.
$gitFiles = & git -C $repoRoot ls-files --cached --others --exclude-standard
foreach ($file in $gitFiles) {
  if ($file) {
    $normalized = $file -replace "\\", "/"
    $filesToZip.Add($normalized) | Out-Null
  }
}

# Explicitly include chats/ even if it is gitignored.
$chatsPath = Join-Path $repoRoot "chats"
if (Test-Path -LiteralPath $chatsPath -PathType Container) {
  Get-ChildItem -LiteralPath $chatsPath -Recurse -File | ForEach-Object {
    $relativePath = [System.IO.Path]::GetRelativePath($repoRoot, $_.FullName) -replace "\\", "/"
    $filesToZip.Add($relativePath) | Out-Null
  }
}

if ($filesToZip.Count -eq 0) {
  throw "No files found to zip."
}

if (Test-Path -LiteralPath $OutputPath) {
  Remove-Item -LiteralPath $OutputPath -Force
}

Add-Type -AssemblyName "System.IO.Compression"
Add-Type -AssemblyName "System.IO.Compression.FileSystem"

$fileStream = [System.IO.File]::Open($OutputPath, [System.IO.FileMode]::Create)
try {
  $zip = New-Object System.IO.Compression.ZipArchive($fileStream, [System.IO.Compression.ZipArchiveMode]::Create, $false)
  try {
    foreach ($relativePath in ($filesToZip | Sort-Object)) {
      $fullPath = Join-Path $repoRoot ($relativePath -replace "/", [System.IO.Path]::DirectorySeparatorChar)
      if (Test-Path -LiteralPath $fullPath -PathType Leaf) {
        [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
          $zip,
          $fullPath,
          $relativePath,
          [System.IO.Compression.CompressionLevel]::Optimal
        ) | Out-Null
      }
    }
  }
  finally {
    $zip.Dispose()
  }
}
finally {
  $fileStream.Dispose()
}

Write-Host ("Created zip: {0}" -f $OutputPath)
