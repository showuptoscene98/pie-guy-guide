# Upload Pie Guy Guide installer as a GitHub Release asset.
# Requires: $env:GITHUB_TOKEN set to a token with repo scope.
# Run: .\scripts\upload-release-asset.ps1

$ErrorActionPreference = "Stop"
$repo = "showuptoscene98/pie-guy-guide"
$version = "3.1.33"
$tag = "v$version"
$exeName = "Pie Guy Guide-Setup-$version.exe"
$exePath = "dist/$exeName"

if (-not $env:GITHUB_TOKEN) {
  Write-Host "Set GITHUB_TOKEN first (GitHub -> Settings -> Developer settings -> Personal access tokens, scope: repo)"
  exit 1
}

if (-not (Test-Path $exePath)) {
  Write-Host "Installer not found: $exePath"
  exit 1
}

$headers = @{
  "Authorization" = "token $env:GITHUB_TOKEN"
  "Accept"        = "application/vnd.github.v3+json"
}

$releaseBody = "Pie Guy Guide $version - Casino daily rotation fix: correct order (Winter Nexus → Yeti Caves → Wolf Caves → Dark Chapel) and current day shows Winter Nexus. Download the installer below; in-app updater will also offer this version."

# Get or create release
$releasesUrl = "https://api.github.com/repos/$repo/releases"
$releases = Invoke-RestMethod -Uri $releasesUrl -Headers $headers -Method Get
$release = $releases | Where-Object { $_.tag_name -eq $tag } | Select-Object -First 1

if (-not $release) {
  Write-Host "Creating release $tag..."
  $body = @{ tag_name = $tag; name = $version; body = $releaseBody } | ConvertTo-Json
  $release = Invoke-RestMethod -Uri $releasesUrl -Headers $headers -Method Post -Body $body -ContentType "application/json; charset=utf-8"
} else {
  Write-Host "Using existing release $tag"
}

# Upload asset (use ?name= to avoid spaces in URL)
$uploadUrl = $release.upload_url -replace "\{\?name,label\}", "?name=$([uri]::EscapeDataString($exeName))"
$headers["Content-Type"] = "application/octet-stream"
$fullPath = (Resolve-Path $exePath).Path

Write-Host "Uploading $exePath..."
Invoke-RestMethod -Uri $uploadUrl -Headers $headers -Method Post -InFile $fullPath

Write-Host "Done. See: https://github.com/$repo/releases/tag/$tag"
