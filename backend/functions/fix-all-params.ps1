# PowerShell script to add type assertions to req.params usage

Write-Host "Fixing TypeScript param type errors..." -ForegroundColor Cyan

$folders = @("src/controllers", "src/routes", "src/middleware", "src/webhooks")
$filesFixed = 0

foreach ($folder in $folders) {
    if (Test-Path $folder) {
        Get-ChildItem -Path $folder -Filter "*.ts" -Recurse | ForEach-Object {
            $file = $_.FullName
            $content = Get-Content $file -Raw
            $originalContent = $content
            
            # Pattern: const { paramName } = req.params;
            # Replace with: const paramName = req.params.paramName as string;
            $content = $content -replace 'const\s+{\s*(\w+)\s*}\s*=\s*req\.params;', 'const $1 = req.params.$1 as string;'
            
            if ($content -ne $originalContent) {
                Set-Content -Path $file -Value $content -NoNewline
                Write-Host "Fixed: $($_.Name)" -ForegroundColor Green
                $filesFixed++
            }
        }
    }
}

Write-Host "Done! Fixed $filesFixed files." -ForegroundColor Green
