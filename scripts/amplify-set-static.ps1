# Run this once to switch all 3 Amplify apps to static hosting (fix required-server-files.json error).
# Requires: AWS CLI installed and configured (aws configure).
# Usage: .\scripts\amplify-set-static.ps1
# Or with custom region: $env:AWS_REGION="us-east-1"; .\scripts\amplify-set-static.ps1

$Region = if ($env:AWS_REGION) { $env:AWS_REGION } else { "ap-south-1" }
$Branch = "main"

$Apps = @(
    @{ Name = "Web";   AppId = "dvoml5jtqtva7" },
    @{ Name = "Admin"; AppId = "dpf37cxmd5zcb" },
    @{ Name = "Seller"; AppId = "d12w7f3sixeqq1" }
)

foreach ($app in $Apps) {
    Write-Host "Setting $($app.Name) (app-id: $($app.AppId)) to platform WEB and framework Next.js - SSG..." -ForegroundColor Cyan
    aws amplify update-app --app-id $app.AppId --platform WEB --region $Region
    if ($LASTEXITCODE -ne 0) { Write-Host "  update-app failed" -ForegroundColor Red; continue }
    aws amplify update-branch --app-id $app.AppId --branch-name $Branch --framework "Next.js - SSG" --region $Region
    if ($LASTEXITCODE -ne 0) { Write-Host "  update-branch failed" -ForegroundColor Red } else { Write-Host "  OK" -ForegroundColor Green }
}

Write-Host "`nDone. Trigger a redeploy for each app in Amplify Console (or push a commit)." -ForegroundColor Yellow
