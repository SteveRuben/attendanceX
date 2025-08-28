# Implementation Plan - Système de Facturation et Paiement

## Backend Implementation

### 1. Core Data Models and Types

- [ ] 1.1 Create shared payment types and interfaces
  - Define PaymentRequest, PaymentResult, PaymentStatus, PaymentMethodType enums in shared/src/types/
  - Create Invoice, Transaction, RefundTransaction interfaces
  - Add payment-related permissions to role.types.ts
  - _Requirements: 1.1, 2.1, 3.1, 4.1, 5.1_

- [ ] 1.2 Create backend payment models
  - Implement PaymentModel, InvoiceModel, TransactionModel in backend/functions/src/models/
  - Add validation methods for payment data integrity
  - Create RefundModel and PaymentConfigurationModel
  - _Requirements: 1.4, 6.1, 7.3, 10.1_

- [ ] 1.3 Update database configuration for payment collections
  - Add payment-related collections to backend/functions/src/config/database.ts
  - Define collections: invoices, transactions, payment_configurations, refunds
  - Add payment_methods, payment_logs collections
  - _Requirements: 6.1, 6.2, 9.1_

### 2. Payment Gateway Service and Core Business Logic

- [ ] 2.1 Implement PaymentGatewayService
  - Create backend/functions/src/services/payment-gateway.service.ts
  - Implement processPayment, getAvailablePaymentMethods, getPaymentStatus methods
  - Add processRefund method with provider routing logic
  - _Requirements: 2.1, 2.2, 7.1, 7.2_

- [ ] 2.2 Create PaymentProcessor service
  - Implement backend/functions/src/services/payment-processor.service.ts
  - Handle payment orchestration and status management
  - Integrate with InvoiceService and AccountingService
  - _Requirements: 3.4, 4.4, 5.4, 8.4_

- [ ] 2.3 Implement Configuration Service
  - Create backend/functions/src/services/payment-configuration.service.ts
  - Handle payment method configuration and currency settings
  - Implement fee configuration management
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

### 3. Payment Provider Adapters

- [ ] 3.1 Create Stripe Adapter
  - Implement backend/functions/src/services/external/stripe-adapter.service.ts
  - Add createPaymentIntent, confirmPayment, createRefund methods
  - Implement webhook handling for Stripe events
  - _Requirements: 5.1, 5.2, 5.3, 7.1_

- [ ] 3.2 Create Kerry Pay Adapter
  - Implement backend/functions/src/services/external/kerry-pay-adapter.service.ts
  - Add initiateMobileMoneyPayment and initiateOrangeMoneyPayment methods
  - Implement transaction status checking and callback handling
  - _Requirements: 3.1, 3.2, 3.3, 4.1, 4.2, 4.3, 7.2_

- [ ] 3.3 Implement webhook and callback handlers
  - Create backend/functions/src/services/webhook-handler.service.ts
  - Handle Stripe webhooks with signature verification
  - Process Kerry Pay callbacks and status updates
  - _Requirements: 3.3, 4.4, 5.3, 8.4_

### 4. Supporting Services

- [ ] 4.1 Create Invoice Service
  - Implement backend/functions/src/services/invoice.service.ts
  - Add getInvoice, updateInvoicePaymentStatus, generatePaymentLink methods
  - Implement getCustomerInvoices for customer history
  - _Requirements: 2.1, 6.1, 10.1, 10.4_

- [ ] 4.2 Implement Accounting Service
  - Create backend/functions/src/services/accounting.service.ts
  - Add recordPayment, recordRefund methods for transaction logging
  - Implement generatePaymentReport and reconcileTransactions
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 7.3_

- [ ] 4.3 Create Customer History Service
  - Implement backend/functions/src/services/customer-history.service.ts
  - Add getPaymentHistory with filtering capabilities
  - Implement generatePaymentReceipt and downloadReceiptPDF methods
  - _Requirements: 10.1, 10.2, 10.3, 10.4_

- [ ] 4.4 Enhance Notification Service for payments
  - Extend backend/functions/src/services/notification/ for payment notifications
  - Add sendPaymentConfirmation, sendRefundConfirmation methods
  - Implement payment failure alerts and admin notifications
  - _Requirements: 3.4, 4.4, 5.4, 7.4, 8.3, 9.1, 9.2, 9.3, 9.4_

### 5. API Controllers and Routes

- [ ] 5.1 Create Payment Controller
  - Implement backend/functions/src/controllers/payment.controller.ts
  - Add endpoints for payment processing, status checking, refunds
  - Implement payment method configuration endpoints
  - _Requirements: 1.1, 2.4, 7.1, 7.2_

- [ ] 5.2 Create Invoice Controller
  - Implement backend/functions/src/controllers/invoice.controller.ts
  - Add endpoints for invoice management and payment link generation
  - Implement customer invoice history endpoints
  - _Requirements: 2.1, 10.1, 10.4_

- [ ] 5.3 Add Payment Routes
  - Create backend/functions/src/routes/payments.routes.ts
  - Define routes for payment processing, webhooks, and configuration
  - Add invoice and customer history routes
  - _Requirements: 2.4, 3.3, 4.4, 5.3_

- [ ] 5.4 Implement webhook endpoints
  - Add webhook routes for Stripe and Kerry Pay callbacks
  - Implement signature verification and payload processing
  - Add error handling and retry logic for failed webhooks
  - _Requirements: 3.3, 4.4, 5.3, 8.1, 8.2_

### 6. Error Handling and Security

- [ ] 6.1 Implement payment error handling
  - Create backend/functions/src/utils/payment-errors.ts
  - Define PaymentError types and user-friendly error messages
  - Implement retry logic with exponential backoff
  - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [ ] 6.2 Add payment security middleware
  - Create backend/functions/src/middleware/payment-security.ts
  - Implement webhook signature verification
  - Add rate limiting for payment endpoints
  - _Requirements: 5.2, 8.3, 9.3_

- [ ] 6.3 Create payment validation utilities
  - Implement backend/functions/src/utils/payment-validation.ts
  - Add phone number validation for mobile money
  - Implement currency and amount validation
  - _Requirements: 3.2, 4.2, 1.3_

## Frontend Implementation

### 7. Payment UI Components

- [ ] 7.1 Create payment method selection component
  - Implement frontend/src/components/features/payments/PaymentMethodSelector.tsx
  - Display available payment methods based on location and currency
  - Handle payment method selection and validation
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [ ] 7.2 Implement Stripe payment component
  - Create frontend/src/components/features/payments/StripePayment.tsx
  - Integrate Stripe Elements for secure card input
  - Handle payment confirmation and error states
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [ ] 7.3 Create mobile money payment components
  - Implement frontend/src/components/features/payments/MobileMoneyPayment.tsx
  - Add OrangeMoneyPayment and MobileMoneyPayment sub-components
  - Handle operator selection and phone number input
  - _Requirements: 3.1, 3.2, 3.3, 4.1, 4.2, 4.3_

- [ ] 7.4 Implement payment status and confirmation components
  - Create frontend/src/components/features/payments/PaymentStatus.tsx
  - Add PaymentConfirmation and PaymentError components
  - Handle real-time status updates and user feedback
  - _Requirements: 3.4, 4.4, 5.4, 8.4_

### 8. Payment Services and API Integration

- [ ] 8.1 Create payment service
  - Implement frontend/src/services/paymentService.ts
  - Add methods for payment processing, status checking, refunds
  - Implement payment method configuration fetching
  - _Requirements: 2.4, 7.1, 7.2, 8.1_

- [ ] 8.2 Create invoice service
  - Implement frontend/src/services/invoiceService.ts
  - Add methods for invoice fetching and payment link generation
  - Implement customer invoice history retrieval
  - _Requirements: 2.1, 10.1, 10.4_

- [ ] 8.3 Add payment utilities
  - Create frontend/src/utils/payment-utils.ts
  - Implement currency formatting and validation helpers
  - Add payment method availability logic
  - _Requirements: 1.3, 2.2, 2.3_

### 9. Customer Payment History and Management

- [ ] 9.1 Create payment history page
  - Implement frontend/src/pages/Payments/PaymentHistory.tsx
  - Display customer payment history with filtering options
  - Add search and pagination functionality
  - _Requirements: 10.1, 10.2, 10.4_

- [ ] 9.2 Implement payment receipt components
  - Create frontend/src/components/features/payments/PaymentReceipt.tsx
  - Add receipt viewing and PDF download functionality
  - Display transaction details and payment method information
  - _Requirements: 10.2, 10.3_

- [ ] 9.3 Create invoice payment page
  - Implement frontend/src/pages/Payments/InvoicePayment.tsx
  - Display invoice details and available payment methods
  - Handle payment processing flow and confirmation
  - _Requirements: 2.1, 2.4, 3.4, 4.4, 5.4_

### 10. Admin Payment Management

- [ ] 10.1 Create payment configuration page
  - Implement frontend/src/pages/Admin/PaymentConfiguration.tsx
  - Allow configuration of payment methods and currencies
  - Add fee configuration and regional restrictions
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [ ] 10.2 Implement payment monitoring dashboard
  - Create frontend/src/pages/Admin/PaymentDashboard.tsx
  - Display payment metrics, success rates, and error statistics
  - Add real-time payment notifications and alerts
  - _Requirements: 6.2, 6.3, 9.1, 9.2, 9.3_

- [ ] 10.3 Create refund management interface
  - Implement frontend/src/pages/Admin/RefundManagement.tsx
  - Allow processing of refunds for different payment methods
  - Display refund history and status tracking
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

## Testing and Integration

### 11. Unit and Integration Tests

- [ ] 11.1 Create payment service tests
  - Write tests for PaymentGatewayService, PaymentProcessor
  - Mock external API calls to Stripe and Kerry Pay
  - Test error handling and retry logic
  - _Requirements: 8.1, 8.2, 8.3_

- [ ] 11.2 Test payment adapters
  - Create unit tests for StripeAdapter and KerryPayAdapter
  - Test webhook handling and signature verification
  - Mock API responses and error scenarios
  - _Requirements: 3.3, 4.4, 5.3, 8.1, 8.2_

- [ ] 11.3 Test payment UI components
  - Write component tests for payment forms and status displays
  - Test user interactions and form validation
  - Mock payment service calls and test error states
  - _Requirements: 2.4, 3.4, 4.4, 5.4_

### 12. End-to-End Testing and Documentation

- [ ] 12.1 Create payment flow integration tests
  - Test complete payment flows for each payment method
  - Verify webhook processing and status updates
  - Test refund processing and notification flows
  - _Requirements: 3.4, 4.4, 5.4, 7.4_

- [ ] 12.2 Add payment API documentation
  - Document payment endpoints in Swagger/OpenAPI
  - Add webhook payload examples and error codes
  - Create integration guides for payment providers
  - _Requirements: All requirements for API documentation_

- [ ] 12.3 Create payment configuration documentation
  - Document payment method setup and configuration
  - Add troubleshooting guides for common payment issues
  - Create user guides for payment processing
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 8.3_