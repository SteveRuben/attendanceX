# 🔧 Guide d'Intégration des Modèles - Système de Billetterie

**Date :** 15 janvier 2026  
**Objectif :** Intégrer les modèles BaseModel dans le service de billetterie

---

## 📋 Vue d'Ensemble

Les modèles suivants ont été créés et doivent être intégrés dans le service :
- `TicketTypeModel` - Gestion des types de billets
- `PromoCodeModel` - Gestion des codes promo
- `TicketingSettingsModel` - Gestion des paramètres de billetterie

---

## 🔄 Modifications à Apporter au Service

### 1. Imports à Ajouter

```typescript
// Au début de ticket-config.service.ts
import { TicketTypeModel } from "../../models/ticketing/ticket-type.model";
import { PromoCodeModel } from "../../models/ticketing/promo-code.model";
import { TicketingSettingsModel } from "../../models/ticketing/ticketing-settings.model";
```

### 2. Méthode `createTicketType` - AVANT/APRÈS

#### ❌ AVANT (Validation manuelle)

```typescript
async createTicketType(
  request: CreateTicketTypeRequest,
  tenantId: string,
  userId: string
): Promise<TicketTypeConfig> {
  try {
    // Validation des données
    this.validateCreateTicketTypeRequest(request);

    // Vérifier l'unicité du nom dans l'événement
    await this.checkTicketTypeNameUniqueness(request.eventId, request.name, tenantId);

    // Créer le document
    const ticketTypeData: Omit<TicketTypeConfig, 'id'> = {
      eventId: request.eventId,
      tenantId,
      name: request.name,
      description: request.description,
      price: request.price,
      currency: request.currency || 'EUR',
      quantity: request.quantity,
      quantitySold: 0,
      quantityReserved: 0,
      salesStartDate: request.salesStartDate,
      salesEndDate: request.salesEndDate,
      visibility: request.visibility || TicketVisibility.PUBLIC,
      order: request.order || 0,
      isActive: true,
      metadata: request.metadata || {},
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: userId
    };

    const ticketTypeRef = collections.ticket_types.doc();
    await ticketTypeRef.set(ticketTypeData);

    logger.info(`✅ Ticket type created: ${ticketTypeRef.id}`);

    return {
      id: ticketTypeRef.id,
      ...ticketTypeData
    };

  } catch (error: any) {
    logger.error('❌ Error creating ticket type:', error);
    throw error;
  }
}
```

#### ✅ APRÈS (Avec modèle)

```typescript
async createTicketType(
  request: CreateTicketTypeRequest,
  tenantId: string,
  userId: string
): Promise<TicketTypeConfig> {
  try {
    // Vérifier l'unicité du nom dans l'événement
    await this.checkTicketTypeNameUniqueness(request.eventId, request.name, tenantId);

    // Créer le modèle depuis la requête
    const ticketTypeModel = TicketTypeModel.fromCreateRequest({
      ...request,
      tenantId,
      createdBy: userId
    });

    // Valider automatiquement (lance ValidationError si invalide)
    await ticketTypeModel.validate();

    // Sauvegarder avec conversion automatique
    const ticketTypeRef = collections.ticket_types.doc();
    await ticketTypeRef.set(ticketTypeModel.toFirestore());

    logger.info(`✅ Ticket type created: ${ticketTypeRef.id}`, {
      ticketTypeId: ticketTypeRef.id,
      eventId: request.eventId,
      tenantId,
      userId
    });

    // Retourner la version API (sans champs sensibles)
    return {
      id: ticketTypeRef.id,
      ...ticketTypeModel.toAPI()
    } as TicketTypeConfig;

  } catch (error: any) {
    logger.error('❌ Error creating ticket type:', error);
    throw error;
  }
}
```

**Avantages :**
- ✅ Validation centralisée dans le modèle
- ✅ Conversion Firestore automatique
- ✅ Gestion des timestamps automatique
- ✅ Moins de code répétitif
- ✅ Conformité avec les standards du projet

---

### 3. Méthode `getTicketType` - AVANT/APRÈS

#### ❌ AVANT

```typescript
async getTicketType(
  ticketTypeId: string,
  tenantId: string
): Promise<TicketTypeConfig | null> {
  const doc = await collections.ticket_types.doc(ticketTypeId).get();

  if (!doc.exists) {
    return null;
  }

  const data = doc.data() as TicketTypeConfig;

  // Vérifier le contexte tenant
  if (data.tenantId !== tenantId) {
    return null;
  }

  return {
    id: doc.id,
    ...data
  };
}
```

#### ✅ APRÈS

```typescript
async getTicketType(
  ticketTypeId: string,
  tenantId: string
): Promise<TicketTypeConfig | null> {
  const doc = await collections.ticket_types.doc(ticketTypeId).get();

  if (!doc.exists) {
    return null;
  }

  // Utiliser le modèle pour la conversion
  const ticketTypeModel = TicketTypeModel.fromFirestore(doc);

  if (!ticketTypeModel || ticketTypeModel.data.tenantId !== tenantId) {
    return null;
  }

  // Retourner la version API
  return {
    id: doc.id,
    ...ticketTypeModel.toAPI()
  } as TicketTypeConfig;
}
```

---

### 4. Méthode `updateTicketType` - AVANT/APRÈS

#### ❌ AVANT

```typescript
async updateTicketType(
  ticketTypeId: string,
  updates: UpdateTicketTypeRequest,
  tenantId: string
): Promise<TicketTypeConfig> {
  const existing = await this.getTicketType(ticketTypeId, tenantId);

  if (!existing) {
    throw new NotFoundError('Ticket type not found');
  }

  // Vérifier l'unicité du nom si modifié
  if (updates.name && updates.name !== existing.name) {
    await this.checkTicketTypeNameUniqueness(existing.eventId, updates.name, tenantId, ticketTypeId);
  }

  const updatedData = {
    ...updates,
    updatedAt: new Date()
  };

  await collections.ticket_types.doc(ticketTypeId).update(updatedData);

  logger.info(`✅ Ticket type updated: ${ticketTypeId}`);

  return {
    ...existing,
    ...updatedData
  };
}
```

#### ✅ APRÈS

```typescript
async updateTicketType(
  ticketTypeId: string,
  updates: UpdateTicketTypeRequest,
  tenantId: string
): Promise<TicketTypeConfig> {
  // Récupérer le document existant
  const doc = await collections.ticket_types.doc(ticketTypeId).get();

  if (!doc.exists) {
    throw new NotFoundError('Ticket type not found');
  }

  // Créer le modèle depuis Firestore
  const ticketTypeModel = TicketTypeModel.fromFirestore(doc);

  if (!ticketTypeModel || ticketTypeModel.data.tenantId !== tenantId) {
    throw new NotFoundError('Ticket type not found');
  }

  // Vérifier l'unicité du nom si modifié
  if (updates.name && updates.name !== ticketTypeModel.data.name) {
    await this.checkTicketTypeNameUniqueness(
      ticketTypeModel.data.eventId,
      updates.name,
      tenantId,
      ticketTypeId
    );
  }

  // Appliquer les mises à jour via le modèle
  ticketTypeModel.update(updates);

  // Valider les données mises à jour
  await ticketTypeModel.validate();

  // Sauvegarder
  await collections.ticket_types.doc(ticketTypeId).update(ticketTypeModel.toFirestore());

  logger.info(`✅ Ticket type updated: ${ticketTypeId}`, {
    ticketTypeId,
    tenantId
  });

  // Retourner la version API
  return {
    id: ticketTypeId,
    ...ticketTypeModel.toAPI()
  } as TicketTypeConfig;
}
```

---

### 5. Méthode `createPromoCode` - AVANT/APRÈS

#### ❌ AVANT

```typescript
async createPromoCode(
  request: CreatePromoCodeRequest,
  tenantId: string,
  userId: string
): Promise<PromoCode> {
  try {
    // Validation
    this.validateCreatePromoCodeRequest(request);

    // Vérifier l'unicité du code
    await this.checkPromoCodeUniqueness(request.eventId, request.code, tenantId);

    const promoCodeData: Omit<PromoCode, 'id'> = {
      eventId: request.eventId,
      tenantId,
      code: request.code.toUpperCase(),
      type: request.type,
      value: request.value,
      maxUses: request.maxUses,
      usedCount: 0,
      validFrom: request.validFrom,
      validUntil: request.validUntil,
      applicableTicketTypes: request.applicableTicketTypes,
      minimumPurchaseAmount: request.minimumPurchaseAmount,
      isActive: true,
      metadata: request.metadata || {},
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: userId
    };

    const promoCodeRef = collections.promo_codes.doc();
    await promoCodeRef.set(promoCodeData);

    logger.info(`✅ Promo code created: ${promoCodeRef.id}`);

    return {
      id: promoCodeRef.id,
      ...promoCodeData
    };

  } catch (error: any) {
    logger.error('❌ Error creating promo code:', error);
    throw error;
  }
}
```

#### ✅ APRÈS

```typescript
async createPromoCode(
  request: CreatePromoCodeRequest,
  tenantId: string,
  userId: string
): Promise<PromoCode> {
  try {
    // Vérifier l'unicité du code
    await this.checkPromoCodeUniqueness(request.eventId, request.code, tenantId);

    // Créer le modèle depuis la requête
    const promoCodeModel = PromoCodeModel.fromCreateRequest({
      ...request,
      tenantId,
      createdBy: userId
    });

    // Valider automatiquement
    await promoCodeModel.validate();

    // Sauvegarder
    const promoCodeRef = collections.promo_codes.doc();
    await promoCodeRef.set(promoCodeModel.toFirestore());

    logger.info(`✅ Promo code created: ${promoCodeRef.id}`, {
      promoCodeId: promoCodeRef.id,
      code: request.code,
      eventId: request.eventId,
      tenantId
    });

    // Retourner la version API
    return {
      id: promoCodeRef.id,
      ...promoCodeModel.toAPI()
    } as PromoCode;

  } catch (error: any) {
    logger.error('❌ Error creating promo code:', error);
    throw error;
  }
}
```

---

### 6. Méthode `upsertTicketingSettings` - AVANT/APRÈS

#### ❌ AVANT

```typescript
async upsertTicketingSettings(
  request: (CreateTicketingSettingsRequest | UpdateTicketingSettingsRequest) & { eventId: string },
  tenantId: string
): Promise<TicketingSettings> {
  try {
    // Vérifier si les paramètres existent déjà
    const existing = await this.getTicketingSettings(request.eventId, tenantId);

    if (existing) {
      // Mise à jour
      const updatedData = {
        ...request,
        updatedAt: new Date()
      };

      await collections.ticketing_settings.doc(existing.id).update(updatedData);

      return {
        ...existing,
        ...updatedData
      };
    } else {
      // Création
      const settingsData: Omit<TicketingSettings, 'id'> = {
        eventId: request.eventId,
        tenantId,
        enabled: request.enabled !== undefined ? request.enabled : true,
        currency: request.currency || 'EUR',
        taxRate: request.taxRate,
        serviceFeeType: request.serviceFeeType || 'none' as any,
        serviceFeeValue: request.serviceFeeValue || 0,
        serviceFeePayedBy: request.serviceFeePayedBy || 'participant' as any,
        refundPolicy: request.refundPolicy,
        customQuestions: request.customQuestions || [],
        maxTicketsPerOrder: request.maxTicketsPerOrder,
        requiresApproval: request.requiresApproval || false,
        waitlistEnabled: request.waitlistEnabled || false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const settingsRef = collections.ticketing_settings.doc();
      await settingsRef.set(settingsData);

      return {
        id: settingsRef.id,
        ...settingsData
      };
    }
  } catch (error: any) {
    logger.error('❌ Error upserting ticketing settings:', error);
    throw error;
  }
}
```

#### ✅ APRÈS

```typescript
async upsertTicketingSettings(
  request: (CreateTicketingSettingsRequest | UpdateTicketingSettingsRequest) & { eventId: string },
  tenantId: string
): Promise<TicketingSettings> {
  try {
    // Vérifier si les paramètres existent déjà
    const existingDoc = await collections.ticketing_settings
      .where('eventId', '==', request.eventId)
      .where('tenantId', '==', tenantId)
      .limit(1)
      .get();

    if (!existingDoc.empty) {
      // Mise à jour
      const doc = existingDoc.docs[0];
      const settingsModel = TicketingSettingsModel.fromFirestore(doc);

      if (!settingsModel) {
        throw new Error('Failed to load existing settings');
      }

      // Appliquer les mises à jour
      settingsModel.update(request);

      // Valider
      await settingsModel.validate();

      // Sauvegarder
      await collections.ticketing_settings.doc(doc.id).update(settingsModel.toFirestore());

      return {
        id: doc.id,
        ...settingsModel.toAPI()
      } as TicketingSettings;

    } else {
      // Création
      const settingsModel = TicketingSettingsModel.fromCreateRequest({
        ...request,
        tenantId
      });

      // Valider
      await settingsModel.validate();

      // Sauvegarder
      const settingsRef = collections.ticketing_settings.doc();
      await settingsRef.set(settingsModel.toFirestore());

      return {
        id: settingsRef.id,
        ...settingsModel.toAPI()
      } as TicketingSettings;
    }
  } catch (error: any) {
    logger.error('❌ Error upserting ticketing settings:', error);
    throw error;
  }
}
```

---

## 🗑️ Méthodes à Supprimer

Une fois les modèles intégrés, ces méthodes de validation manuelle peuvent être supprimées :

```typescript
// ❌ À SUPPRIMER
private validateCreateTicketTypeRequest(request: CreateTicketTypeRequest): void {
  // Validation maintenant dans TicketTypeModel.validate()
}

// ❌ À SUPPRIMER
private validateCreatePromoCodeRequest(request: CreatePromoCodeRequest): void {
  // Validation maintenant dans PromoCodeModel.validate()
}
```

**Garder uniquement :**
- `checkTicketTypeNameUniqueness()` - Validation métier (unicité en base)
- `checkPromoCodeUniqueness()` - Validation métier (unicité en base)

---

## ✅ Checklist d'Intégration

### Imports
- [ ] Ajouter `import { TicketTypeModel } from "../../models/ticketing/ticket-type.model"`
- [ ] Ajouter `import { PromoCodeModel } from "../../models/ticketing/promo-code.model"`
- [ ] Ajouter `import { TicketingSettingsModel } from "../../models/ticketing/ticketing-settings.model"`

### Méthodes Ticket Types
- [ ] Modifier `createTicketType()` pour utiliser `TicketTypeModel`
- [ ] Modifier `getTicketType()` pour utiliser `TicketTypeModel.fromFirestore()`
- [ ] Modifier `getTicketTypesByEvent()` pour utiliser `TicketTypeModel.fromFirestore()`
- [ ] Modifier `updateTicketType()` pour utiliser `TicketTypeModel`
- [ ] Supprimer `validateCreateTicketTypeRequest()`

### Méthodes Promo Codes
- [ ] Modifier `createPromoCode()` pour utiliser `PromoCodeModel`
- [ ] Modifier `validatePromoCode()` pour utiliser `PromoCodeModel.fromFirestore()`
- [ ] Supprimer `validateCreatePromoCodeRequest()`

### Méthodes Settings
- [ ] Modifier `upsertTicketingSettings()` pour utiliser `TicketingSettingsModel`
- [ ] Modifier `getTicketingSettings()` pour utiliser `TicketingSettingsModel.fromFirestore()`

### Tests
- [ ] Tester `createTicketType()` avec données valides
- [ ] Tester `createTicketType()` avec données invalides (doit lancer ValidationError)
- [ ] Tester `updateTicketType()` avec données valides
- [ ] Tester `createPromoCode()` avec données valides
- [ ] Tester `createPromoCode()` avec données invalides
- [ ] Tester `upsertTicketingSettings()` création
- [ ] Tester `upsertTicketingSettings()` mise à jour

---

## 🚀 Commandes de Test

```bash
# Build du backend
cd backend/functions
npm run build

# Vérifier les erreurs TypeScript
npm run type-check

# Lancer les tests
npm run test:unit

# Démarrer les émulateurs pour tester
cd ../..
npm run dev:backend
```

---

## 📝 Notes Importantes

1. **Gestion des Erreurs** : Les modèles lancent `ValidationError` automatiquement. Pas besoin de try/catch supplémentaire dans le service.

2. **Conversion Firestore** : Les modèles gèrent automatiquement :
   - Conversion des dates (Date ↔ Timestamp)
   - Suppression des champs `undefined`
   - Filtrage des champs sensibles (via `toAPI()`)

3. **Timestamps** : Les modèles gèrent automatiquement `createdAt` et `updatedAt`.

4. **Validation** : Toujours appeler `await model.validate()` avant la sauvegarde.

5. **API Response** : Toujours utiliser `model.toAPI()` pour les réponses API (exclut les champs sensibles).

---

## 🎯 Résultat Attendu

Après l'intégration :
- ✅ Code plus propre et maintenable
- ✅ Validation centralisée
- ✅ Moins de code répétitif
- ✅ Conformité avec les standards du projet
- ✅ Meilleure gestion des erreurs
- ✅ Conversion Firestore automatique

---

**Créé par :** Kiro AI  
**Date :** 15 janvier 2026  
**Statut :** Prêt pour l'intégration
