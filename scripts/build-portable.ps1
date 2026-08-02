param(
  [string]$OutputDirectory = "artifacts\desktop"
)

$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

npm run build
npx tauri build --no-bundle --ci

$binary = Join-Path $repoRoot "src-tauri\target\release\tuoyue-poster-studio.exe"
if (-not (Test-Path -LiteralPath $binary)) {
  throw "没有找到 Tauri release 可执行文件：$binary"
}

$output = Join-Path $repoRoot $OutputDirectory
New-Item -ItemType Directory -Path $output -Force | Out-Null
$portable = Join-Path $output "tuoyue-poster-studio-portable.exe"
Copy-Item -LiteralPath $binary -Destination $portable -Force
Write-Host "Portable build created: $portable"
