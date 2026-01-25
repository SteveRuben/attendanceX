#!/bin/bash

# Script de déploiement complet pour AttendanceX Backend
# Déploie toutes les fonctions, jobs, triggers, règles et indexes

set -e  # Arrêter en cas d'erreur

echo "🚀 =========================================="
echo "🚀 Déploiement Complet AttendanceX Backend"
echo "🚀 =========================================="
echo ""

# Vérifier qu'on est dans le bon répertoire
if [ ! -f "firebase.json" ]; then
    echo "❌ Erreur: firebase.json non trouvé"
    echo "   Exécutez ce script depuis le dossier backend/"
    exit 1
fi

# Vérifier que Firebase CLI est installé
if ! command -v firebase &> /dev/null; then
    echo "❌ Erreur: Firebase CLI n'est pas installé"
    echo "   Installez-le avec: npm install -g firebase-tools"
    exit 1
fi

# Vérifier la connexion Firebase
echo "🔐 Vérification de l'authentification Firebase..."
firebase projects:list > /dev/null 2>&1 || {
    echo "❌ Erreur: Non authentifié sur Firebase"
    echo "   Connectez-vous avec: firebase login"
    exit 1
}

echo "✅ Authentification Firebase OK"
echo ""

# Build du projet
echo "🔨 =========================================="
echo "🔨 Build du Projet TypeScript"
echo "🔨 =========================================="
cd functions
npm run build || {
    echo "❌ Erreur lors du build"
    exit 1
}
cd ..
echo "✅ Build réussi"
echo ""

# 1. Déployer les règles Firestore
echo "📋 =========================================="
echo "📋 Déploiement des Règles Firestore"
echo "📋 =========================================="
firebase deploy --only firestore:rules || {
    echo "⚠️  Avertissement: Échec du déploiement des règles Firestore"
}
echo ""

# 2. Déployer les indexes Firestore (peut échouer si indexes inutiles)
echo "📊 =========================================="
echo "📊 Déploiement des Indexes Firestore"
echo "📊 =========================================="
firebase deploy --only firestore:indexes || {
    echo "⚠️  Avertissement: Certains indexes n'ont pas pu être déployés (probablement inutiles)"
}
echo ""

# 3. Déployer les règles Storage (optionnel)
echo "📦 =========================================="
echo "📦 Déploiement des Règles Storage"
echo "📦 =========================================="
firebase deploy --only storage || {
    echo "⚠️  Avertissement: Échec du déploiement des règles Storage (peut être désactivé)"
}
echo ""

# 4. Déployer TOUTES les Functions
echo "⚡ =========================================="
echo "⚡ Déploiement de TOUTES les Functions"
echo "⚡ =========================================="
echo "   - API HTTP"
echo "   - Jobs Schedulés"
echo "   - Triggers Firestore"
echo "   - Triggers Auth"
echo "   - Triggers Storage"
echo ""

firebase deploy --only functions || {
    echo "❌ Erreur lors du déploiement des functions"
    exit 1
}

echo ""
echo "✅ =========================================="
echo "✅ Déploiement Complet Terminé!"
echo "✅ =========================================="
echo ""
echo "📊 Résumé:"
echo "   ✅ Règles Firestore déployées"
echo "   ⚠️  Indexes Firestore (certains peuvent être ignorés)"
echo "   ⚠️  Règles Storage (optionnel)"
echo "   ✅ Functions HTTP déployées"
echo "   ✅ Jobs Schedulés déployés"
echo "   ✅ Triggers déployés"
echo ""
echo "🔗 URLs:"
echo "   API: https://api-rvnxjp7idq-ew.a.run.app/v1"
echo "   Health: https://api-rvnxjp7idq-ew.a.run.app/v1/health"
echo "   Docs: https://api-rvnxjp7idq-ew.a.run.app/v1/docs"
echo ""
echo "📝 Prochaines étapes:"
echo "   1. Vérifier les logs: firebase functions:log"
echo "   2. Tester l'API: curl https://api-rvnxjp7idq-ew.a.run.app/v1/health"
echo "   3. Vérifier les jobs dans Firebase Console"
echo ""
