param(
  [string]$ProjectRoot = (Get-Location).Path,
  [string]$OutDir = ".local/docker-images",
  [string]$UiImage = "cvat/ui:dev",
  [string]$ServerImage = "cvat/server:dev"
)

$ErrorActionPreference = "Stop"

$ProjectRoot = (Resolve-Path -LiteralPath $ProjectRoot).Path
Push-Location $ProjectRoot
try {
  if (-not (Test-Path -LiteralPath $OutDir)) {
    New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
  }

  $outAbs = (Resolve-Path -LiteralPath $OutDir).Path
  $uiTar = Join-Path $outAbs "cvat-ui-dev.tar"
  $serverTar = Join-Path $outAbs "cvat-server-dev.tar"

  Write-Host "Exporting images to:"
  Write-Host "- $uiTar"
  Write-Host "- $serverTar"

  docker save -o "$uiTar" $UiImage
  if ($LASTEXITCODE -ne 0) { throw "docker save failed for $UiImage (exit=$LASTEXITCODE)" }

  docker save -o "$serverTar" $ServerImage
  if ($LASTEXITCODE -ne 0) { throw "docker save failed for $ServerImage (exit=$LASTEXITCODE)" }

  Get-Item "$uiTar","$serverTar" | Select-Object FullName,Length,LastWriteTime | Format-Table -AutoSize | Out-String | Write-Host
  Write-Host "DONE"
} finally {
  Pop-Location
}

