# Tests Postman - Système de Billetterie

Ce document contient les requêtes Postman pour tester le système de billetterie.

## Configuration Préalable

### Variables d'Environnement
```json
{
  "base_url": "http://localhost:5001/attendance-x-dev/us-central1/api",
  "auth_token": "YOUR_JWT_TOKEN",
  "tenant_id": "YOUR_TENANT_ID",
  "event_id": "YOUR_EVENT_ID",
  "ticket_type_id": "",
  "promo_code_id": ""
}
```

### Headers Communs
Tous les endpoints nécessitent :
```
Authorization: Bearer {{auth_token}}
Content-Type: application/json
```

## 1. Types de Billets

### 1.1 Créer un Type de Billet

**Endpoint** : `POST {{base_url}}/ticket-config/ticket-types`

**Body** :
```json
{
  "eventId": "{{event_id}}",
  "name": "Billet Standard",
  "description": "Accès complet à l'événement",
  "price": 50.00,
  "currency": "EUR",
  "quantity": 100,
  "salesStartDate": "2026-01-20T00:00:00Z",
  "salesEndDate": "2026-03-15T23:59:59Z",
  "visibility": "public",
  "order": 1,
  "metadata": {
    "category": "standard",
    "benefits": ["Accès général", "Certificat de participation"]
  }
}
```

**Réponse Attendue** (201) :
```json
{
  "success": true,
  "message": "Ticket type created successfully",
  "data": {
    "id": "ticket_type_abc123",
    "eventId": "event_xyz",
    "tenantId": "tenant_123",
    "name": "Billet Standard",
    "price": 50.00,
    "quantity": 100,
    "quantitySold": 0,
    "quantityReserved": 0,
    "isActive": true,
    "createdAt": "2026-01-15T10:00:00Z",
    ...
  }
}
```

**Tests à Effectuer** :
- ✅ Création réussie avec données valides
- ❌ Échec si `eventId` manquant (400)
- ❌ Échec si `name` manquant (400)
- ❌ Échec si `price` négatif (400)
- ❌ Échec si `quantity` < 1 (400)
- ❌ Échec si nom déjà existant pour cet événement (409)

### 1.2 Récupérer les Types de Billets d'un Événement

**Endpoint** : `GET {{base_url}}/ticket-config/events/{{event_id}}/ticket-types`

**Réponse Attendue** (200) :
```json
{
  "success": true,
  "data": [
    {
      "id": "ticket_type_abc123",
      "name": "Billet Standard",
      "price": 50.00,
      "quantity": 100,
      "quantitySold": 15,
      "quantityReserved": 3,
      "availableQuantity": 82,
      "currentPrice": 50.00,
      "isActive": true,
      ...
    },
    {
      "id": "ticket_type_def456",
      "name": "Billet VIP",
      "price": 150.00,
      "availableQuantity": 20,
      "currentPrice": 120.00,
      "dynamicPricing": {
        "enabled": true,
        "earlyBird": {
          "price": 120.00,
          "endDate": "2026-02-01T00:00:00Z"
        }
      },
      ...
    }
  ]
}
```

### 1.3 Récupérer un Type de Billet Spécifique

**Endpoint** : `GET {{base_url}}/ticket-config/ticket-types/{{ticket_type_id}}`

**Réponse Attendue** (200) :
```json
{
  "success": true,
  "data": {
    "id": "ticket_type_abc123",
    "eventId": "event_xyz",
    "name": "Billet Standard",
    ...
  }
}
```

**Tests à Effectuer** :
- ✅ Récupération réussie avec ID valide
- ❌ Échec si ID inexistant (404)
- ❌ Échec si billet d'un autre tenant (404)

### 1.4 Mettre à Jour un Type de Billet

**Endpoint** : `PUT {{base_url}}/ticket-config/ticket-types/{{ticket_type_id}}`

**Body** :
```json
{
  "name": "Billet Standard - Mise à jour",
  "price": 55.00,
  "quantity": 120,
  "description": "Description mise à jour"
}
```

**Réponse Attendue** (200) :
```json
{
  "success": true,
  "message": "Ticket type updated successfully",
  "data": {
    "id": "ticket_type_abc123",
    "name": "Billet Standard - Mise à jour",
    "price": 55.00,
    "quantity": 120,
    "updatedAt": "2026-01-15T11:00:00Z",
    ...
  }
}
```

**Tests à Effectuer** :
- ✅ Mise à jour réussie
- ❌ Échec si nouveau nom déjà existant (409)
- ❌ Échec si ID inexistant (404)

### 1.5 Supprimer un Type de Billet

**Endpoint** : `DELETE {{base_url}}/ticket-config/ticket-types/{{ticket_type_id}}`

**Réponse Attendue** (200) :
```json
{
  "success": true,
  "message": "Ticket type deleted successfully"
}
```

**Tests à Effectuer** :
- ✅ Suppression réussie si aucun billet vendu
- ❌ Échec si billets déjà vendus (409)
- ❌ Échec si ID inexistant (404)

## 2. Codes Promo

### 2.1 Créer un Code Promo

**Endpoint** : `POST {{base_url}}/ticket-config/promo-codes`

**Body - Pourcentage** :
```json
{
  "eventId": "{{event_id}}",
  "code": "EARLY2026",
  "type": "percentage",
  "value": 20,
  "maxUses": 50,
  "validFrom": "2026-01-15T00:00:00Z",
  "validUntil": "2026-02-01T23:59:59Z",
  "minimumPurchaseAmount": 30,
  "metadata": {
    "campaign": "early_bird",
    "description": "Réduction early bird 20%"
  }
}
```

**Body - Montant Fixe** :
```json
{
  "eventId": "{{event_id}}",
  "code": "WELCOME10",
  "type": "fixed_amount",
  "value": 10,
  "maxUses": 100,
  "validFrom": "2026-01-15T00:00:00Z",
  "validUntil": "2026-03-15T23:59:59Z",
  "applicableTicketTypes": ["ticket_type_abc123"],
  "metadata": {
    "campaign": "welcome",
    "description": "10€ de réduction"
  }
}
```

**Réponse Attendue** (201) :
```json
{
  "success": true,
  "message": "Promo code created successfully",
  "data": {
    "id": "promo_code_xyz789",
    "eventId": "event_xyz",
    "code": "EARLY2026",
    "type": "percentage",
    "value": 20,
    "usedCount": 0,
    "isActive": true,
    ...
  }
}
```

**Tests à Effectuer** :
- ✅ Création réussie avec type pourcentage
- ✅ Création réussie avec type montant fixe
- ❌ Échec si code déjà existant (409)
- ❌ Échec si pourcentage > 100 (400)
- ❌ Échec si montant fixe négatif (400)
- ❌ Échec si code < 3 caractères (400)

### 2.2 Valider un Code Promo

**Endpoint** : `POST {{base_url}}/ticket-config/promo-codes/validate`

**Body** :
```json
{
  "code": "EARLY2026",
  "eventId": "{{event_id}}",
  "ticketTypes": [
    {
      "ticketTypeId": "ticket_type_abc123",
      "quantity": 2,
      "price": 50.00
    },
    {
      "ticketTypeId": "ticket_type_def456",
      "quantity": 1,
      "price": 150.00
    }
  ]
}
```

**Réponse Attendue - Code Valide** (200) :
```json
{
  "success": true,
  "data": {
    "isValid": true,
    "promoCode": {
      "id": "promo_code_xyz789",
      "code": "EARLY2026",
      "type": "percentage",
      "value": 20,
      ...
    },
    "discountAmount": 50.00,
    "message": "Promo code is valid"
  }
}
```

**Réponse Attendue - Code Invalide** (200) :
```json
{
  "success": true,
  "data": {
    "isValid": false,
    "discountAmount": 0,
    "message": "Promo code has expired"
  }
}
```

**Tests à Effectuer** :
- ✅ Validation réussie avec code actif
- ✅ Calcul correct de la réduction (pourcentage)
- ✅ Calcul correct de la réduction (montant fixe)
- ❌ Échec si code inexistant
- ❌ Échec si code expiré
- ❌ Échec si code pas encore valide
- ❌ Échec si limite d'utilisation atteinte
- ❌ Échec si montant minimum non atteint

## 3. Paramètres de Billetterie

### 3.1 Créer/Mettre à Jour les Paramètres

**Endpoint** : `PUT {{base_url}}/ticket-config/events/{{event_id}}/settings`

**Body** :
```json
{
  "enabled": true,
  "currency": "EUR",
  "taxRate": 20,
  "serviceFeeType": "percentage",
  "serviceFeeValue": 5,
  "serviceFeePayedBy": "participant",
  "refundPolicy": {
    "enabled": true,
    "fullRefundUntil": "2026-03-01T00:00:00Z",
    "partialRefundPercentage": 50,
    "noRefundAfter": "2026-03-10T00:00:00Z",
    "customPolicy": "Remboursement complet jusqu'au 1er mars, 50% jusqu'au 10 mars, aucun remboursement après."
  },
  "customQuestions": [
    {
      "id": "q1",
      "question": "Régime alimentaire",
      "type": "select",
      "required": false,
      "options": ["Aucun", "Végétarien", "Végétalien", "Sans gluten"],
      "order": 1
    },
    {
      "id": "q2",
      "question": "Nom de l'entreprise",
      "type": "text",
      "required": true,
      "order": 2
    }
  ],
  "maxTicketsPerOrder": 10,
  "requiresApproval": false,
  "waitlistEnabled": true
}
```

**Réponse Attendue** (200) :
```json
{
  "success": true,
  "message": "Ticketing settings updated successfully",
  "data": {
    "id": "settings_abc123",
    "eventId": "event_xyz",
    "enabled": true,
    "currency": "EUR",
    "taxRate": 20,
    ...
  }
}
```

**Tests à Effectuer** :
- ✅ Création réussie des paramètres
- ✅ Mise à jour réussie des paramètres existants
- ✅ Validation des types de frais
- ✅ Validation des questions personnalisées

### 3.2 Récupérer les Paramètres

**Endpoint** : `GET {{base_url}}/ticket-config/events/{{event_id}}/settings`

**Réponse Attendue** (200) :
```json
{
  "success": true,
  "data": {
    "id": "settings_abc123",
    "eventId": "event_xyz",
    "enabled": true,
    "currency": "EUR",
    ...
  }
}
```

### 3.3 Récupérer le Résumé Complet

**Endpoint** : `GET {{base_url}}/ticket-config/events/{{event_id}}/summary`

**Réponse Attendue** (200) :
```json
{
  "success": true,
  "data": {
    "settings": {
      "id": "settings_abc123",
      "enabled": true,
      ...
    },
    "ticketTypes": [
      {
        "id": "ticket_type_abc123",
        "name": "Billet Standard",
        "availableQuantity": 82,
        ...
      }
    ],
    "promoCodes": [
      {
        "id": "promo_code_xyz789",
        "code": "EARLY2026",
        ...
      }
    ],
    "totalRevenue": 750.00,
    "totalTicketsSold": 15,
    "totalTicketsAvailable": 100
  }
}
```

**Tests à Effectuer** :
- ✅ Récupération complète de la configuration
- ✅ Calcul correct des statistiques
- ✅ Inclusion de tous les éléments (settings, types, promos)

## 4. Tests d'Isolation Tenant

### 4.1 Tenter d'Accéder aux Billets d'un Autre Tenant

**Setup** :
1. Créer un type de billet avec tenant A
2. Obtenir un token pour tenant B
3. Tenter d'accéder au billet avec le token de tenant B

**Résultat Attendu** : 404 Not Found

### 4.2 Tenter de Créer un Billet pour un Événement d'un Autre Tenant

**Setup** :
1. Utiliser un `eventId` d'un autre tenant
2. Tenter de créer un type de billet

**Résultat Attendu** : Échec (le service devrait vérifier que l'événement appartient au tenant)

## 5. Tests de Performance

### 5.1 Rate Limiting

**Test** :
1. Envoyer 100 requêtes rapidement au même endpoint
2. Vérifier que le rate limiting s'active

**Résultat Attendu** : 429 Too Many Requests après un certain nombre de requêtes

### 5.2 Charge

**Test** :
1. Créer 50 types de billets pour un événement
2. Récupérer la liste complète
3. Mesurer le temps de réponse

**Résultat Attendu** : Temps de réponse < 500ms

## 6. Scénarios Complets

### Scénario 1 : Configuration Complète d'un Événement

1. **Créer les paramètres de billetterie**
   - PUT `/api/ticket-config/events/{{event_id}}/settings`

2. **Créer 3 types de billets**
   - POST `/api/ticket-config/ticket-types` (Standard)
   - POST `/api/ticket-config/ticket-types` (VIP)
   - POST `/api/ticket-config/ticket-types` (Étudiant)

3. **Créer 2 codes promo**
   - POST `/api/ticket-config/promo-codes` (EARLY2026 - 20%)
   - POST `/api/ticket-config/promo-codes` (STUDENT10 - 10€)

4. **Récupérer le résumé complet**
   - GET `/api/ticket-config/events/{{event_id}}/summary`

5. **Vérifier que tout est configuré correctement**

### Scénario 2 : Validation de Code Promo

1. **Créer un code promo avec conditions**
   - Montant minimum : 50€
   - Limite d'utilisation : 10
   - Valide jusqu'au 31/01/2026

2. **Tester la validation avec différents montants**
   - Montant < 50€ → Invalide
   - Montant >= 50€ → Valide

3. **Simuler 10 utilisations**
   - 11ème tentative → Invalide (limite atteinte)

4. **Tester après la date d'expiration**
   - Après 31/01/2026 → Invalide (expiré)

## 7. Collection Postman

Pour importer dans Postman, créer une collection avec toutes ces requêtes organisées en dossiers :

```
📁 Ticketing System
  📁 1. Ticket Types
    - Create Ticket Type
    - Get Ticket Types by Event
    - Get Ticket Type by ID
    - Update Ticket Type
    - Delete Ticket Type
  📁 2. Promo Codes
    - Create Promo Code (Percentage)
    - Create Promo Code (Fixed Amount)
    - Validate Promo Code
  📁 3. Settings
    - Upsert Ticketing Settings
    - Get Ticketing Settings
    - Get Config Summary
  📁 4. Integration Tests
    - Complete Event Setup
    - Promo Code Validation Flow
  📁 5. Security Tests
    - Tenant Isolation Test
    - Rate Limiting Test
```

## Notes

- Remplacer `{{event_id}}`, `{{ticket_type_id}}`, etc. par des valeurs réelles
- S'assurer d'avoir un token JWT valide dans `{{auth_token}}`
- Tester d'abord sur l'environnement de développement
- Vérifier les logs Firebase Functions pour le debugging
