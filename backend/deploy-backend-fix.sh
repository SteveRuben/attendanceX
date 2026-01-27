#!/bin/bash

# Script de déploiement du fix backend
# Corrige le problème d'authentification sur les routes publiques

echo "🚀 Déploiement du fix backend - Routes publiques"
echo "================================================"
echo ""

# Vérifier qu'on est dans le bon répertoire
if [ ! -f "firebase.json" ]; then
    echo "❌ Erreur: Ce script doit être exécuté depuis le dossier backend/"
    exit 1
fi

# Build du code TypeScript
echo "📦 Build du code TypeScript..."
cd functions
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Erreur lors du build"
    exit 1
fi

echo "✅ Build réussi"
echo ""

# Retour au dossier backend
cd ..

# Déploiement sur Firebase
echo "🚀 Déploiement sur Firebase Functions..."
firebase deploy --only functions

if [ $? -ne 0 ]; then
    echo "❌ Erreur lors du déploiement"
    exit 1
fi

echo ""
echo "✅ Déploiement réussi!"
echo ""
echo "🧪 Test de l'API..."
echo "Attente de 10 secondes pour que les fonctions soient actives..."
sleep 10

# Test de l'API
echo ""
echo "Test: GET /v1/public/events"
curl -s "https://api-rvnxjp7idq-ew.a.run.app/v1/public/events?page=1&limit=5" | jq '.'

echo ""
echo "================================================"
echo "✅ Déploiement terminé!"
echo ""
echo "Prochaines étapes:"
echo "1. Vérifier que l'API retourne des événements (pas d'erreur 401)"
echo "2. Tester sur https://attendance-x.vercel.app/fr/events"
echo "3. Corriger les traductions manquantes"
echo "4. Harmoniser le design avec Evelya.co"
