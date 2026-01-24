# Script pour nettoyer complètement le build Next.js

Write-Host "🧹 Nettoyage du build Next.js..." -ForegroundColor Cyan

# Supprimer .next
if (Test-Path ".next") {
    Write-Host "Suppression de .next..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force ".next"
    Write-Host "✅ .next supprimé" -ForegroundColor Green
}

# Supprimer node_modules/.cache
if (Test-Path "node_modules/.cache") {
    Write-Host "Suppression du cache node_modules..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force "node_modules/.cache"
    Write-Host "✅ Cache supprimé" -ForegroundColor Green
}

# Supprimer .vercel
if (Test-Path ".vercel") {
    Write-Host "Suppression de .vercel..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force ".vercel"
    Write-Host "✅ .vercel supprimé" -ForegroundColor Green
}

Write-Host "`n✅ Nettoyage terminé!" -ForegroundColor Green
Write-Host "Vous pouvez maintenant faire un nouveau build avec: npm run build" -ForegroundColor Cyan
