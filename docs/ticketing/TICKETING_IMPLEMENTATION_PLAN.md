# 🎫 Plan d'Implémentation - Système de Billetterie

**Branche :** `feature/ticketing-system`  
**Date :** Janvier 2025  
**Durée estimée :** 6-8 semaines

---

## 📊 État Actuel

### ✅ Ce qui existe déjà

#### 1. Infrastructure Backend (30%)
- ✅ Types et modèles de billets (`ticket.types.ts`, `ticket.model.ts`)
- ✅ Service de base (`ticket.service.ts`)
- ✅ Routes API (`ticket.routes.ts`)
- ✅ **Système de paiement Stripe complet** (`stripe-payment.service.ts`)
  - `createPaymentIntent()` - Paiements one-time
  - `createStripeCustomer()` - Gestion clients
  - Webhooks Stripe configurés
  - Gestion des erreurs et retry

#### 2. Frontend (10%)
- ✅ Types TypeScript (`ticket.types.ts`)
- ✅ Hook statistiques (`useTicketStatistics.ts`)

### ❌ Ce qui manque (70%)

#### Backend
- ❌ Configuration billetterie par événement
- ❌ Service d'achat de billets (utilisant Stripe existant)
- ❌ Gestion des codes promo
- ❌ Génération PDF billets
- ❌ Emails automatiques

#### Frontend
- ❌ Interface configuration billetterie (organisateur)
- ❌ Page achat publique (participants)
- ❌ Dashboard ventes
- ❌ Gestion remboursements

---

## 🎯 Architecture Technique

### Utilisation du Système Stripe Existant

```typescript
// Service existant à utiliser
import { stripePaymentService } from '../services/billing/stripe-payment.service';

// Pour les paiements de billets
const paymentIntent = await stripePaymentService.createPaymentIntent({
  amount: totalAmount * 100, // en centimes
  currency: 'eur',
  customerId: stripeCustomerId,
  paymentMethodId: paymentMethodId,
  confirm: true,
  metadata: {
    eventId: eventId,
    ticketTypes: JSON.stringify(ticketTypes),
    tenantId: tenantId
  }
});
```

### Nouvelle Structure à Créer

```
backend/functions/src/
├── services/ticketing/
│   ├── ticket-config.service.ts      (NEW)
│   ├── ticket-purchase.service.ts    (NEW)
│   ├── ticket-promo.service.ts       (NEW)
│   └── ticket-pdf.service.ts         (NEW)
├── controllers/ticketing/
│   ├── ticket-config.controller.ts   (NEW)
│   └── ticket-purchase.controller.ts (NEW)
├── routes/ticketing/
│   ├── ticket-config.routes.ts       (NEW)
│   └── ticket-purchase.routes.ts     (NEW)
└── types/ticketing/
    └── ticket-config.types.ts        (NEW)

frontend-v2/src/
├── pages/app/events/[id]/
│   └── ticketing.tsx                 (NEW)
├── pages/public/events/[id]/
│   └── tickets.tsx                   (NEW)
├── components/ticketing/
│   ├── TicketTypeConfig.tsx          (NEW)
│   ├── TicketSelection.tsx           (NEW)
│   ├── CheckoutForm.tsx              (NEW)
│   └── PaymentForm.tsx               (NEW)
└── services/
    └── ticketingService.ts           (NEW)
```

---

## 📅 Plan d'Exécution

### Phase 1 : Configuration Billetterie (Semaine 1-2)

#### Backend

**1.1 Types et Modèles**
```typescript
// types/ticketing/ticket-config.types.ts
export interface TicketTypeConfig {
  id: string;
  eventId: string;
  tenantId: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  quantity: number;
  quantitySold: number;
  salesStartDate?: Date;
  salesEndDate?: Date;
  visibility: 'public' | 'private';
  order: number;
  metadata?: Record<string, any>;
}

export interface DynamicPricing {
  enabled: boolean;
  earlyBird?: {
    price: number;
    endDate: Date;
    quantity?: number;
  };
  lastMinute?: {
    price: number;
    startDate: Date;
  };
}

export interface PromoCode {
  id: string;
  eventId: string;
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  maxUses?: number;
  usedCount: number;
  validFrom?: Date;
  validUntil?: Date;
  applicableTicketTypes?: string[];
}
```

**1.2 Service Configuration**
```typescript
// services/ticketing/ticket-config.service.ts
export class TicketConfigService {
  
  async createTicketType(
    config: CreateTicketTypeRequest,
    tenantId: string
  ): Promise<TicketTypeConfig> {
    // Validation
    // Sauvegarde en base
    // Retour config
  }
  
  async updateTicketType(
    ticketTypeId: string,
    updates: UpdateTicketTypeRequest,
    tenantId: string
  ): Promise<TicketTypeConfig> {
    // Mise à jour
  }
  
  async getTicketTypesByEvent(
    eventId: string,
    tenantId: string
  ): Promise<TicketTypeConfig[]> {
    // Récupération
  }
  
  async deleteTicketType(
    ticketTypeId: string,
    tenantId: string
  ): Promise<void> {
    // Vérifier qu'aucun billet n'est vendu
    // Suppression
  }
}
```

**1.3 Routes API**
```typescript
// routes/ticketing/ticket-config.routes.ts
router.post('/events/:eventId/ticket-types', TicketConfigController.createTicketType);
router.get('/events/:eventId/ticket-types', TicketConfigController.getTicketTypes);
router.put('/ticket-types/:ticketTypeId', TicketConfigController.updateTicketType);
router.delete('/ticket-types/:ticketTypeId', TicketConfigController.deleteTicketType);
```

#### Frontend

**1.4 Interface Configuration**
```typescript
// pages/app/events/[id]/ticketing.tsx
export default function EventTicketingPage() {
  return (
    <AppShell title="Configuration Billetterie">
      <TicketTypesList />
      <AddTicketTypeButton />
      <DynamicPricingConfig />
      <PromoCodesManager />
    </AppShell>
  );
}
```

---

### Phase 2 : Achat de Billets (Semaine 3-4)

#### Backend

**2.1 Service d'Achat**
```typescript
// services/ticketing/ticket-purchase.service.ts
export class TicketPurchaseService {
  
  async initiatePurchase(
    request: InitiatePurchaseRequest,
    tenantId: string
  ): Promise<PurchaseSession> {
    // 1. Valider disponibilité billets
    // 2. Calculer prix total (avec promo si applicable)
    // 3. Créer session d'achat temporaire
    // 4. Retourner session
  }
  
  async completePurchase(
    sessionId: string,
    paymentMethodId: string,
    tenantId: string
  ): Promise<PurchaseResult> {
    // 1. Récupérer session
    // 2. Vérifier disponibilité (encore)
    // 3. Créer/récupérer client Stripe
    const customer = await this.getOrCreateStripeCustomer(tenantId, email);
    
    // 4. Créer PaymentIntent avec Stripe existant
    const paymentIntent = await stripePaymentService.createPaymentIntent({
      amount: totalAmount * 100,
      currency: 'eur',
      customerId: customer.stripeCustomerId,
      paymentMethodId: paymentMethodId,
      confirm: true,
      metadata: {
        eventId: session.eventId,
        sessionId: sessionId,
        tenantId: tenantId
      }
    });
    
    // 5. Si paiement réussi, créer les billets
    if (paymentIntent.status === 'succeeded') {
      const tickets = await this.createTicketsFromPurchase(session);
      
      // 6. Envoyer emails
      await this.sendTicketEmails(tickets);
      
      return {
        success: true,
        tickets: tickets,
        paymentIntentId: paymentIntent.id
      };
    }
    
    throw new Error('Payment failed');
  }
  
  private async getOrCreateStripeCustomer(
    tenantId: string,
    email: string
  ): Promise<StripeCustomer> {
    // Utiliser le service existant
    let customer = await stripePaymentService.getStripeCustomerByTenant(tenantId);
    
    if (!customer) {
      customer = await stripePaymentService.createStripeCustomer({
        tenantId: tenantId,
        email: email,
        name: email
      });
    }
    
    return customer;
  }
}
```

**2.2 Webhooks Stripe**
```typescript
// Ajouter dans webhooks/billing.webhooks.ts
case 'payment_intent.succeeded':
  await this.handleTicketPaymentSuccess(event.data.object);
  break;

private async handleTicketPaymentSuccess(paymentIntent: Stripe.PaymentIntent) {
  const { eventId, sessionId, tenantId } = paymentIntent.metadata;
  
  // Marquer la session comme payée
  // Créer les billets si pas déjà fait
  // Envoyer confirmation
}
```

#### Frontend

**2.3 Page Achat Publique**
```typescript
// pages/public/events/[id]/tickets.tsx
export default function PublicTicketPurchasePage() {
  const [selectedTickets, setSelectedTickets] = useState({});
  const [purchaseSession, setPurchaseSession] = useState(null);
  
  return (
    <div className="max-w-4xl mx-auto p-6">
      <EventHeader event={event} />
      
      {step === 'selection' && (
        <TicketSelection
          ticketTypes={ticketTypes}
          selected={selectedTickets}
          onChange={setSelectedTickets}
          onContinue={handleInitiatePurchase}
        />
      )}
      
      {step === 'information' && (
        <ParticipantInformation
          tickets={selectedTickets}
          onContinue={handleSubmitInfo}
        />
      )}
      
      {step === 'payment' && (
        <PaymentForm
          session={purchaseSession}
          onSuccess={handlePaymentSuccess}
        />
      )}
      
      {step === 'confirmation' && (
        <PurchaseConfirmation
          tickets={purchasedTickets}
        />
      )}
    </div>
  );
}
```

**2.4 Composant Paiement**
```typescript
// components/ticketing/PaymentForm.tsx
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

export function PaymentForm({ session, onSuccess }) {
  const stripe = useStripe();
  const elements = useElements();
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!stripe || !elements) return;
    
    const cardElement = elements.getElement(CardElement);
    
    // Créer PaymentMethod
    const { error, paymentMethod } = await stripe.createPaymentMethod({
      type: 'card',
      card: cardElement,
    });
    
    if (error) {
      setError(error.message);
      return;
    }
    
    // Compléter l'achat
    const result = await ticketingService.completePurchase(
      session.id,
      paymentMethod.id
    );
    
    if (result.success) {
      onSuccess(result.tickets);
    }
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <CardElement />
      <button type="submit" disabled={!stripe}>
        Payer {session.totalAmount}€
      </button>
    </form>
  );
}
```

---

### Phase 3 : Fonctionnalités Avancées (Semaine 5-6)

#### 3.1 Codes Promo
```typescript
// services/ticketing/ticket-promo.service.ts
export class TicketPromoService {
  async validatePromoCode(
    code: string,
    eventId: string,
    ticketTypes: string[]
  ): Promise<PromoCodeValidation> {
    // Vérifier existence
    // Vérifier validité (dates, usages)
    // Vérifier applicabilité aux billets
    // Calculer réduction
  }
  
  async applyPromoCode(
    sessionId: string,
    code: string
  ): Promise<PurchaseSession> {
    // Appliquer la réduction
    // Mettre à jour session
  }
}
```

#### 3.2 Génération PDF
```typescript
// services/ticketing/ticket-pdf.service.ts
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';

export class TicketPDFService {
  async generateTicketPDF(ticket: EventTicket): Promise<Buffer> {
    const doc = new PDFDocument();
    const chunks: Buffer[] = [];
    
    doc.on('data', (chunk) => chunks.push(chunk));
    
    // Header
    doc.fontSize(20).text(ticket.eventTitle, { align: 'center' });
    
    // QR Code
    const qrCodeDataUrl = await QRCode.toDataURL(ticket.qrCode);
    doc.image(qrCodeDataUrl, { width: 200, align: 'center' });
    
    // Informations
    doc.fontSize(12)
       .text(`Participant: ${ticket.participantName}`)
       .text(`Type: ${ticket.type}`)
       .text(`Numéro: ${ticket.ticketNumber}`);
    
    doc.end();
    
    return Buffer.concat(chunks);
  }
}
```

#### 3.3 Emails Automatiques
```typescript
// Utiliser le système d'email existant
import { emailService } from '../email/email.service';

async sendTicketEmail(ticket: EventTicket): Promise<void> {
  const pdfBuffer = await ticketPDFService.generateTicketPDF(ticket);
  
  await emailService.sendEmail({
    to: ticket.participantEmail,
    subject: `Votre billet pour ${ticket.eventTitle}`,
    template: 'ticket-confirmation',
    data: {
      participantName: ticket.participantName,
      eventTitle: ticket.eventTitle,
      eventDate: ticket.eventDate,
      ticketNumber: ticket.ticketNumber
    },
    attachments: [{
      filename: `ticket-${ticket.ticketNumber}.pdf`,
      content: pdfBuffer
    }]
  });
}
```

---

### Phase 4 : Dashboard Ventes (Semaine 7-8)

#### 4.1 Backend Analytics
```typescript
// services/ticketing/ticket-analytics.service.ts
export class TicketAnalyticsService {
  async getSalesAnalytics(
    eventId: string,
    tenantId: string
  ): Promise<SalesAnalytics> {
    // Revenus totaux
    // Billets vendus par type
    // Évolution des ventes
    // Taux de conversion
    // Codes promo utilisés
  }
}
```

#### 4.2 Frontend Dashboard
```typescript
// pages/app/events/[id]/sales.tsx
export default function EventSalesPage() {
  return (
    <AppShell title="Gestion des Ventes">
      <SalesMetrics />
      <SalesChart />
      <OrdersList />
      <RefundManager />
    </AppShell>
  );
}
```

---

## 🔧 Configuration Requise

### Variables d'Environnement

```env
# Déjà configuré
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# À ajouter
FRONTEND_URL=http://localhost:3000
TICKET_PDF_LOGO_URL=https://...
```

### Dépendances à Ajouter

```json
{
  "dependencies": {
    "pdfkit": "^0.13.0",
    "qrcode": "^1.5.3",
    "@stripe/react-stripe-js": "^2.4.0",
    "@stripe/stripe-js": "^2.2.0"
  }
}
```

---

## 📊 Métriques de Succès

### Technique
- [ ] Temps de réponse API < 500ms
- [ ] Taux d'erreur paiement < 1%
- [ ] Génération PDF < 2s
- [ ] Email envoyé < 5s après paiement

### Business
- [ ] Taux de conversion > 15%
- [ ] Taux d'abandon panier < 30%
- [ ] Temps moyen achat < 3 minutes
- [ ] Satisfaction utilisateur > 4.5/5

---

## 🚀 Prochaines Étapes Immédiates

1. **Créer les types de configuration** (1h)
2. **Implémenter le service de configuration** (1 jour)
3. **Créer les routes API** (0.5 jour)
4. **Tester avec Postman** (0.5 jour)
5. **Créer l'interface frontend** (2 jours)

**Commencer par :** Types et service de configuration billetterie

---

**Document maintenu par:** Dev Team  
**Dernière mise à jour:** Janvier 2025
