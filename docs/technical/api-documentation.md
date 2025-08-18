# Documentation API - AttendanceX

## Table des matières
1. [Introduction](#introduction)
2. [Authentification](#authentification)
3. [Endpoints de présence](#endpoints-de-présence)
4. [Endpoints de congés](#endpoints-de-congés)
5. [Endpoints de planification](#endpoints-de-planification)
6. [Endpoints de rapports](#endpoints-de-rapports)
7. [Webhooks](#webhooks)
8. [Codes d'erreur](#codes-derreur)
9. [Exemples d'intégration](#exemples-dintégration)
10. [SDK et bibliothèques](#sdk-et-bibliothèques)

## Introduction

L'API AttendanceX permet d'intégrer le système de gestion de présence avec vos applications existantes. Cette API RESTful utilise JSON pour les échanges de données et suit les standards HTTP.

### URL de base
```
Production: https://api.attendancex.com/v1
Staging: https://staging-api.attendancex.com/v1
```

### Versioning
L'API utilise un versioning par URL. La version actuelle est `v1`.

### Format des réponses
Toutes les réponses sont au format JSON avec la structure suivante :
```json
{
  "success": true,
  "data": {},
  "message": "Success",
  "timestamp": "2024-01-15T10:30:00Z",
  "version": "1.0"
}
```

## Authentification

### JWT Token
L'API utilise l'authentification par JWT (JSON Web Token).

#### Obtenir un token
```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@company.com",
  "password": "password123"
}
```

**Réponse :**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "refresh_token_here",
    "expiresIn": 3600,
    "user": {
      "id": "user123",
      "email": "user@company.com",
      "role": "employee"
    }
  }
}
```

#### Utiliser le token
Incluez le token dans l'en-tête Authorization :
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Renouveler le token
```http
POST /auth/refresh
Content-Type: application/json

{
  "refreshToken": "refresh_token_here"
}
```

### API Key (pour les intégrations système)
Pour les intégrations serveur-à-serveur, utilisez une clé API :
```http
X-API-Key: your_api_key_here
```

## Endpoints de présence

### Pointer l'arrivée
```http
POST /presence/clock-in
Authorization: Bearer {token}
Content-Type: application/json

{
  "employeeId": "emp123",
  "timestamp": "2024-01-15T09:00:00Z",
  "location": {
    "latitude": 48.8566,
    "longitude": 2.3522,
    "accuracy": 10
  },
  "notes": "Arrivée normale"
}
```

**Réponse :**
```json
{
  "success": true,
  "data": {
    "id": "presence123",
    "employeeId": "emp123",
    "clockInTime": "2024-01-15T09:00:00Z",
    "location": {
      "latitude": 48.8566,
      "longitude": 2.3522,
      "accuracy": 10
    },
    "status": "present",
    "notes": "Arrivée normale"
  }
}
```

### Pointer le départ
```http
POST /presence/clock-out
Authorization: Bearer {token}
Content-Type: application/json

{
  "employeeId": "emp123",
  "timestamp": "2024-01-15T17:30:00Z",
  "location": {
    "latitude": 48.8566,
    "longitude": 2.3522,
    "accuracy": 15
  }
}
```

### Commencer une pause
```http
POST /presence/start-break
Authorization: Bearer {token}
Content-Type: application/json

{
  "employeeId": "emp123",
  "breakType": "lunch",
  "timestamp": "2024-01-15T12:00:00Z"
}
```

### Terminer une pause
```http
POST /presence/end-break
Authorization: Bearer {token}
Content-Type: application/json

{
  "employeeId": "emp123",
  "timestamp": "2024-01-15T13:00:00Z"
}
```

### Obtenir la présence actuelle
```http
GET /presence/current/{employeeId}
Authorization: Bearer {token}
```

**Réponse :**
```json
{
  "success": true,
  "data": {
    "id": "presence123",
    "employeeId": "emp123",
    "clockInTime": "2024-01-15T09:00:00Z",
    "clockOutTime": null,
    "status": "present",
    "onBreak": false,
    "totalWorkTime": 28800000,
    "breaks": [
      {
        "startTime": "2024-01-15T12:00:00Z",
        "endTime": "2024-01-15T13:00:00Z",
        "duration": 3600000,
        "type": "lunch"
      }
    ]
  }
}
```

### Obtenir l'historique de présence
```http
GET /presence/history/{employeeId}?startDate=2024-01-01&endDate=2024-01-31
Authorization: Bearer {token}
```

**Paramètres de requête :**
- `startDate` (required): Date de début (ISO 8601)
- `endDate` (required): Date de fin (ISO 8601)
- `page` (optional): Numéro de page (défaut: 1)
- `limit` (optional): Nombre d'éléments par page (défaut: 50)

### Synchroniser les données hors ligne
```http
POST /presence/sync
Authorization: Bearer {token}
Content-Type: application/json

{
  "entries": [
    {
      "id": "offline123",
      "type": "clock-in",
      "employeeId": "emp123",
      "timestamp": 1705312800000,
      "location": {
        "latitude": 48.8566,
        "longitude": 2.3522
      }
    }
  ]
}
```

## Endpoints de congés

### Créer une demande de congé
```http
POST /leaves/request
Authorization: Bearer {token}
Content-Type: application/json

{
  "employeeId": "emp123",
  "type": "vacation",
  "startDate": "2024-02-01",
  "endDate": "2024-02-05",
  "isHalfDay": false,
  "halfDayPeriod": null,
  "reason": "Vacances d'hiver",
  "attachments": ["document1.pdf"]
}
```

**Types de congé disponibles :**
- `vacation`: Congés payés
- `sick`: Congé maladie
- `personal`: Congé personnel
- `maternity`: Congé maternité
- `paternity`: Congé paternité
- `other`: Autre

### Obtenir les demandes de congé
```http
GET /leaves?employeeId=emp123&status=pending
Authorization: Bearer {token}
```

**Paramètres de requête :**
- `employeeId` (optional): Filtrer par employé
- `status` (optional): Filtrer par statut (pending, approved, rejected, cancelled)
- `type` (optional): Filtrer par type
- `startDate` (optional): Date de début de période
- `endDate` (optional): Date de fin de période

### Approuver/Rejeter une demande
```http
POST /leaves/{requestId}/process
Authorization: Bearer {token}
Content-Type: application/json

{
  "action": "approve",
  "notes": "Demande approuvée",
  "managerId": "mgr123"
}
```

**Actions disponibles :**
- `approve`: Approuver
- `reject`: Rejeter

### Obtenir le solde de congés
```http
GET /leaves/balance/{employeeId}
Authorization: Bearer {token}
```

**Réponse :**
```json
{
  "success": true,
  "data": {
    "employeeId": "emp123",
    "year": 2024,
    "balances": {
      "vacation": {
        "earned": 25,
        "taken": 10,
        "pending": 3,
        "remaining": 12
      },
      "sick": {
        "earned": 10,
        "taken": 2,
        "pending": 0,
        "remaining": 8
      }
    }
  }
}
```

## Endpoints de planification

### Obtenir le planning d'un employé
```http
GET /schedules/employee/{employeeId}?date=2024-01-15
Authorization: Bearer {token}
```

### Créer/Modifier un planning
```http
PUT /schedules
Authorization: Bearer {token}
Content-Type: application/json

{
  "employeeId": "emp123",
  "effectiveDate": "2024-01-15",
  "schedule": {
    "monday": {
      "enabled": true,
      "startTime": "09:00",
      "endTime": "17:00",
      "breakDuration": 60
    },
    "tuesday": {
      "enabled": true,
      "startTime": "09:00",
      "endTime": "17:00",
      "breakDuration": 60
    }
  }
}
```

### Obtenir le planning d'équipe
```http
GET /schedules/team/{managerId}?week=2024-W03
Authorization: Bearer {token}
```

## Endpoints de rapports

### Générer un rapport de présence
```http
POST /reports/presence/generate
Authorization: Bearer {token}
Content-Type: application/json

{
  "employeeIds": ["emp123", "emp456"],
  "startDate": "2024-01-01",
  "endDate": "2024-01-31",
  "format": "pdf",
  "includeDetails": true,
  "groupBy": "employee"
}
```

**Formats disponibles :**
- `pdf`: Document PDF
- `excel`: Fichier Excel
- `csv`: Fichier CSV
- `json`: Données JSON

### Obtenir le statut d'un rapport
```http
GET /reports/status/{reportId}
Authorization: Bearer {token}
```

### Télécharger un rapport
```http
GET /reports/download/{reportId}
Authorization: Bearer {token}
```

### Obtenir les statistiques d'équipe
```http
GET /reports/team-stats/{managerId}?period=month
Authorization: Bearer {token}
```

## Webhooks

Les webhooks permettent de recevoir des notifications en temps réel lors d'événements spécifiques.

### Configuration
```http
POST /webhooks
Authorization: Bearer {token}
Content-Type: application/json

{
  "url": "https://your-app.com/webhook",
  "events": ["presence.clock_in", "presence.clock_out", "leave.requested"],
  "secret": "your_webhook_secret"
}
```

### Événements disponibles

**Présence :**
- `presence.clock_in`: Pointage d'arrivée
- `presence.clock_out`: Pointage de départ
- `presence.break_start`: Début de pause
- `presence.break_end`: Fin de pause
- `presence.anomaly_detected`: Anomalie détectée

**Congés :**
- `leave.requested`: Demande créée
- `leave.approved`: Demande approuvée
- `leave.rejected`: Demande rejetée
- `leave.cancelled`: Demande annulée

**Planification :**
- `schedule.updated`: Planning modifié
- `schedule.conflict`: Conflit détecté

### Format des webhooks
```json
{
  "event": "presence.clock_in",
  "timestamp": "2024-01-15T09:00:00Z",
  "data": {
    "employeeId": "emp123",
    "presenceId": "presence123",
    "clockInTime": "2024-01-15T09:00:00Z",
    "location": {
      "latitude": 48.8566,
      "longitude": 2.3522
    }
  },
  "signature": "sha256=hash_of_payload"
}
```

### Vérification de signature
```javascript
const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const expectedSignature = 'sha256=' + crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}
```

## Codes d'erreur

### Codes HTTP standards
- `200`: Succès
- `201`: Créé avec succès
- `400`: Requête invalide
- `401`: Non authentifié
- `403`: Accès refusé
- `404`: Ressource non trouvée
- `409`: Conflit
- `422`: Données non valides
- `429`: Trop de requêtes
- `500`: Erreur serveur

### Codes d'erreur spécifiques

| Code | Description | Solution |
|------|-------------|----------|
| `INVALID_EMPLOYEE_ID` | ID employé invalide | Vérifier l'ID employé |
| `ALREADY_CLOCKED_IN` | Déjà pointé | Pointer la sortie d'abord |
| `NOT_CLOCKED_IN` | Pas encore pointé | Pointer l'arrivée d'abord |
| `INVALID_LOCATION` | Position invalide | Vérifier les coordonnées |
| `OUTSIDE_WORK_ZONE` | Hors zone de travail | Se rapprocher du lieu de travail |
| `INSUFFICIENT_LEAVE_BALANCE` | Solde insuffisant | Vérifier le solde de congés |
| `LEAVE_CONFLICT` | Conflit de congés | Choisir d'autres dates |
| `INVALID_DATE_RANGE` | Période invalide | Vérifier les dates |

### Format des erreurs
```json
{
  "success": false,
  "error": {
    "code": "INVALID_EMPLOYEE_ID",
    "message": "Employee ID is required and must be valid",
    "details": {
      "field": "employeeId",
      "value": "invalid_id"
    }
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## Exemples d'intégration

### JavaScript/Node.js
```javascript
const axios = require('axios');

class AttendanceXAPI {
  constructor(apiKey, baseURL = 'https://api.attendancex.com/v1') {
    this.apiKey = apiKey;
    this.baseURL = baseURL;
    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      }
    });
  }

  async clockIn(employeeId, location) {
    try {
      const response = await this.client.post('/presence/clock-in', {
        employeeId,
        timestamp: new Date().toISOString(),
        location
      });
      return response.data;
    } catch (error) {
      throw new Error(`Clock in failed: ${error.response.data.error.message}`);
    }
  }

  async getPresenceHistory(employeeId, startDate, endDate) {
    try {
      const response = await this.client.get(`/presence/history/${employeeId}`, {
        params: { startDate, endDate }
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get history: ${error.response.data.error.message}`);
    }
  }
}

// Utilisation
const api = new AttendanceXAPI('your_api_key');

api.clockIn('emp123', { latitude: 48.8566, longitude: 2.3522 })
  .then(result => console.log('Clock in successful:', result))
  .catch(error => console.error('Error:', error.message));
```

### Python
```python
import requests
from datetime import datetime

class AttendanceXAPI:
    def __init__(self, api_key, base_url='https://api.attendancex.com/v1'):
        self.api_key = api_key
        self.base_url = base_url
        self.headers = {
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json'
        }

    def clock_in(self, employee_id, location=None):
        data = {
            'employeeId': employee_id,
            'timestamp': datetime.utcnow().isoformat() + 'Z'
        }
        if location:
            data['location'] = location

        response = requests.post(
            f'{self.base_url}/presence/clock-in',
            json=data,
            headers=self.headers
        )
        
        if response.status_code == 200:
            return response.json()
        else:
            raise Exception(f"Clock in failed: {response.json()['error']['message']}")

    def get_team_presence(self, manager_id):
        response = requests.get(
            f'{self.base_url}/presence/team/{manager_id}',
            headers=self.headers
        )
        
        if response.status_code == 200:
            return response.json()
        else:
            raise Exception(f"Failed to get team presence: {response.json()['error']['message']}")

# Utilisation
api = AttendanceXAPI('your_api_key')

try:
    result = api.clock_in('emp123', {'latitude': 48.8566, 'longitude': 2.3522})
    print('Clock in successful:', result)
except Exception as e:
    print('Error:', str(e))
```

### PHP
```php
<?php

class AttendanceXAPI {
    private $apiKey;
    private $baseURL;

    public function __construct($apiKey, $baseURL = 'https://api.attendancex.com/v1') {
        $this->apiKey = $apiKey;
        $this->baseURL = $baseURL;
    }

    private function makeRequest($method, $endpoint, $data = null) {
        $url = $this->baseURL . $endpoint;
        
        $headers = [
            'Authorization: Bearer ' . $this->apiKey,
            'Content-Type: application/json'
        ];

        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);

        if ($data) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
        }

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        $result = json_decode($response, true);

        if ($httpCode >= 400) {
            throw new Exception($result['error']['message']);
        }

        return $result;
    }

    public function clockIn($employeeId, $location = null) {
        $data = [
            'employeeId' => $employeeId,
            'timestamp' => date('c')
        ];

        if ($location) {
            $data['location'] = $location;
        }

        return $this->makeRequest('POST', '/presence/clock-in', $data);
    }

    public function createLeaveRequest($employeeId, $type, $startDate, $endDate, $reason) {
        $data = [
            'employeeId' => $employeeId,
            'type' => $type,
            'startDate' => $startDate,
            'endDate' => $endDate,
            'reason' => $reason
        ];

        return $this->makeRequest('POST', '/leaves/request', $data);
    }
}

// Utilisation
$api = new AttendanceXAPI('your_api_key');

try {
    $result = $api->clockIn('emp123', ['latitude' => 48.8566, 'longitude' => 2.3522]);
    echo 'Clock in successful: ' . json_encode($result);
} catch (Exception $e) {
    echo 'Error: ' . $e->getMessage();
}
?>
```

## SDK et bibliothèques

### SDK officiels
- **JavaScript/TypeScript**: `@attendancex/sdk-js`
- **Python**: `attendancex-python`
- **PHP**: `attendancex/sdk-php`
- **C#/.NET**: `AttendanceX.SDK`

### Installation

**JavaScript/Node.js:**
```bash
npm install @attendancex/sdk-js
```

**Python:**
```bash
pip install attendancex-python
```

**PHP:**
```bash
composer require attendancex/sdk-php
```

### Exemples avec SDK

**JavaScript:**
```javascript
import { AttendanceXClient } from '@attendancex/sdk-js';

const client = new AttendanceXClient({
  apiKey: 'your_api_key',
  environment: 'production' // ou 'staging'
});

// Pointage simple
await client.presence.clockIn('emp123');

// Avec géolocalisation
await client.presence.clockIn('emp123', {
  location: { latitude: 48.8566, longitude: 2.3522 }
});

// Demande de congé
await client.leaves.create({
  employeeId: 'emp123',
  type: 'vacation',
  startDate: '2024-02-01',
  endDate: '2024-02-05',
  reason: 'Vacances d\'hiver'
});
```

### Limites de taux

- **Authentification**: 10 requêtes/minute
- **Présence**: 100 requêtes/minute/employé
- **Congés**: 50 requêtes/minute
- **Rapports**: 10 requêtes/minute
- **Webhooks**: 1000 événements/minute

### Support et communauté

- **Documentation**: [docs.attendancex.com](https://docs.attendancex.com)
- **GitHub**: [github.com/attendancex](https://github.com/attendancex)
- **Support**: [support@attendancex.com](mailto:support@attendancex.com)
- **Communauté**: [community.attendancex.com](https://community.attendancex.com)

---

*Documentation API - Version 1.0 - Janvier 2024*