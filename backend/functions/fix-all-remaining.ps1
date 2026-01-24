# Fix all remaining TypeScript param errors

Write-Host "Fixing all remaining TypeScript errors..." -ForegroundColor Cyan

$files = @(
    "src/controllers/appointment/appointment.controller.ts",
    "src/controllers/attendance/attendance.controller.ts",
    "src/controllers/attendance/presence-report.controller.ts",
    "src/controllers/attendance/presence.controller.ts",
    "src/controllers/auth/api-key.controller.ts",
    "src/controllers/event/event.controller.ts",
    "src/controllers/project/minimal-project.controller.ts",
    "src/controllers/resolution/resolution.controller.ts",
    "src/controllers/tenant/tenant.controller.ts",
    "src/controllers/timesheet/activity-code.controller.ts",
    "src/controllers/user/team.controller.ts"
)

foreach ($file in $files) {
    if (Test-Path $file) {
        $content = Get-Content $file -Raw
        
        # Pattern: variable used in function calls that comes from params/query
        # Add type assertions for common param names
        $content = $content -replace '(\s+)(appointmentId)(,|\))', '$1$2 as string$3'
        $content = $content -replace '(\s+)(organizationId)(,|\))', '$1$2 as string$3'
        $content = $content -replace '(\s+)(employeeId)(,|\))', '$1$2 as string$3'
        $content = $content -replace '(\s+)(reportId)(,|\))', '$1$2 as string$3'
        $content = $content -replace '(\s+)(entryId)(,|\))', '$1$2 as string$3'
        $content = $content -replace '(\s+)(keyId)(,|\))', '$1$2 as string$3'
        $content = $content -replace '(\s+)(projectId)(,|\))', '$1$2 as string$3'
        $content = $content -replace '(\s+)(teamId)(,|\))', '$1$2 as string$3'
        $content = $content -replace '(\s+)(objectiveId)(,|\))', '$1$2 as string$3'
        $content = $content -replace '(\s+)(invitationId)(,|\))', '$1$2 as string$3'
        $content = $content -replace '(\s+)(stepId)(,|\))', '$1$2 as string$3'
        
        # Fix eventId in object literals
        $content = $content -replace '({ \.\.\.createRequest, )(eventId)( })', '$1$2 as string$3'
        
        # Fix .trim() calls
        $content = $content -replace '(eventId)\.trim\(\)', '($1 as string).trim()'
        
        Set-Content -Path $file -Value $content -NoNewline
        Write-Host "Fixed: $file" -ForegroundColor Green
    }
}

Write-Host "Done! Fixed all files." -ForegroundColor Green
