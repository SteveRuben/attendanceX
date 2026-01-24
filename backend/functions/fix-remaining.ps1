# Fix remaining TypeScript errors by adding type assertions

$files = @(
    "src/controllers/user/team.controller.ts",
    "src/middleware/presence-security.middleware.ts",
    "src/webhooks/billing.webhooks.ts"
)

foreach ($file in $files) {
    if (Test-Path $file) {
        $content = Get-Content $file -Raw
        
        # Add type assertion to organizationId from query
        $content = $content -replace '(const organizationId = req\.query\.organizationId);', '$1 as string;'
        
        # Add type assertion to teamId from params
        $content = $content -replace '(const teamId = req\.params\.teamId);', '$1 as string;'
        
        # Add type assertion to userId from params/query
        $content = $content -replace '(const userId = req\.(params|query)\.userId);', '$1 as string;'
        
        # Add type assertion to employeeId
        $content = $content -replace '(employeeId: req\.(params|query|body)\.employeeId),', 'employeeId: req.$2.employeeId as string,'
        
        # Add type assertion to partnerId
        $content = $content -replace '(const partnerId = req\.(params|query|headers)\.partnerId);', '$1 as string;'
        $content = $content -replace '(partnerId: req\.(params|query|headers)\.partnerId),', 'partnerId: req.$2.partnerId as string,'
        
        Set-Content -Path $file -Value $content -NoNewline
        Write-Host "Fixed: $file" -ForegroundColor Green
    }
}

Write-Host "Done!" -ForegroundColor Green
