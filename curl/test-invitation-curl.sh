#!/bin/bash

# Script pour tester l'API d'invitation avec curl
# Usage: ./test-invitation-curl.sh

echo "🧪 Testing Invitation API with curl..."
echo "URL: http://127.0.0.1:5001/attendance-management-syst/europe-west1/api/v1/user-invitations/invite"
echo ""

# Variables (à remplacer par vos vraies valeurs)
API_URL="http://127.0.0.1:5001/attendance-management-syst/europe-west1/api/v1/user-invitations/invite"
AUTH_TOKEN="YOUR_AUTH_TOKEN_HERE"  # Remplacer par un vrai token
TENANT_ID="YOUR_TENANT_ID_HERE"    # Remplacer par un vrai tenant ID

# Données de test
TIMESTAMP=$(date +%s)
EMAIL="test-${TIMESTAMP}@example.com"

# Payload JSON
PAYLOAD=$(cat <<EOF
{
  "email": "${EMAIL}",
  "firstName": "Test",
  "lastName": "User",
  "tenantRole": "member",
  "department": "Engineering",
  "message": "Welcome to our test!"
}
EOF
)

echo "📤 Sending invitation request..."
echo "Email: ${EMAIL}"
echo "Payload: ${PAYLOAD}"
echo ""

# Mesurer le temps de réponse
START_TIME=$(date +%s.%N)

# Faire la requête
RESPONSE=$(curl -w "\n%{http_code}\n%{time_total}" -s \
  -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -H "X-Tenant-ID: ${TENANT_ID}" \
  -d "${PAYLOAD}" \
  "${API_URL}")

END_TIME=$(date +%s.%N)

# Extraire les informations de la réponse
RESPONSE_BODY=$(echo "$RESPONSE" | head -n -2)
HTTP_CODE=$(echo "$RESPONSE" | tail -n 2 | head -n 1)
CURL_TIME=$(echo "$RESPONSE" | tail -n 1)

# Calculer le temps total
TOTAL_TIME=$(echo "$END_TIME - $START_TIME" | bc)

echo "📥 Response received:"
echo "HTTP Status: ${HTTP_CODE}"
echo "Response Time (curl): ${CURL_TIME}s"
echo "Total Time: ${TOTAL_TIME}s"
echo ""
echo "Response Body:"
echo "${RESPONSE_BODY}" | jq . 2>/dev/null || echo "${RESPONSE_BODY}"
echo ""

# Analyser les résultats
if [ "$HTTP_CODE" = "201" ]; then
    echo "✅ Invitation sent successfully!"
    
    # Vérifier la performance
    TIME_MS=$(echo "$CURL_TIME * 1000" | bc)
    TIME_MS_INT=${TIME_MS%.*}
    
    if [ "$TIME_MS_INT" -lt 2000 ]; then
        echo "🚀 Excellent performance: ${TIME_MS_INT}ms"
    elif [ "$TIME_MS_INT" -lt 5000 ]; then
        echo "⚡ Good performance: ${TIME_MS_INT}ms"
    elif [ "$TIME_MS_INT" -lt 10000 ]; then
        echo "⚠️  Slow performance: ${TIME_MS_INT}ms"
    else
        echo "🐌 Very slow performance: ${TIME_MS_INT}ms"
    fi
    
elif [ "$HTTP_CODE" = "401" ]; then
    echo "🔐 Authentication failed - please update AUTH_TOKEN"
elif [ "$HTTP_CODE" = "403" ]; then
    echo "🚫 Authorization failed - check permissions"
elif [ "$HTTP_CODE" = "400" ]; then
    echo "📝 Validation error - check request data"
else
    echo "❌ Request failed with HTTP ${HTTP_CODE}"
fi

echo ""
echo "🔧 To use this script:"
echo "1. Replace AUTH_TOKEN with a valid JWT token"
echo "2. Replace TENANT_ID with your tenant ID"
echo "3. Make sure the Firebase emulators are running"
echo "4. Run: chmod +x test-invitation-curl.sh && ./test-invitation-curl.sh"