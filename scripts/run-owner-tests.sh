#!/bin/bash

echo "🔐 Lancement des tests de permissions Owner"
echo "=========================================="

# Aller dans le dossier tests
cd tests

echo ""
echo "📋 Tests unitaires des permissions Owner..."
npm test backend/unit/owner-permissions.test.ts

echo ""
echo "🔗 Tests d'intégration des permissions Owner..."
npm test backend/integration/owner-permissions-integration.test.ts

echo ""
echo "✅ Tests terminés !"
echo ""
echo "💡 Pour tester manuellement, lancez:"
echo "   node scripts/test-owner-permissions.js"