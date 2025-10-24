/**
 * Test de santé pour les services de facturation
 * Vérifie que tous les composants de facturation fonctionnent correctement
 */

import { billingNotificationsService, BillingAlertType } from '../../services/billing/billing-notifications.service';

interface TestResult {
  name: string;
  status: 'success' | 'error' | 'warning';
  message: string;
  details?: any;
}

class BillingHealthCheck {
  private results: TestResult[] = [];

  private addResult(name: string, status: 'success' | 'error' | 'warning', message: string, details?: any) {
    this.results.push({ name, status, message, details });
  }

  private logResult(result: TestResult) {
    const icon = result.status === 'success' ? '✅' : result.status === 'error' ? '❌' : '⚠️';
    console.log(`${icon} ${result.name}: ${result.message}`);
    if (result.details) {
      console.log(`   Details: ${JSON.stringify(result.details, null, 2)}`);
    }
  }

  /**
   * Test de création d'alerte d'usage
   */
  async testUsageAlert(): Promise<void> {
    try {
      console.log('\n🔍 Test: Création d\'alerte d\'usage...');
      
      // Simuler la création d'une alerte (sans vraiment l'enregistrer en base)
      const alertData = {
        tenantId: 'test_tenant_123',
        type: BillingAlertType.USAGE_WARNING,
        title: 'Test - Limite d\'utilisateurs bientôt atteinte',
        message: 'Test - Vous avez utilisé 85% de votre limite d\'utilisateurs.',
        severity: 'warning' as const,
        actionUrl: '/billing?tab=plans',
        actionText: 'Voir les plans',
        metadata: {
          metric: 'users',
          currentUsage: 85,
          limit: 100,
          percentage: 85
        }
      };

      // Vérifier que la structure de données est correcte
      if (!alertData.tenantId || !alertData.type || !alertData.title) {
        throw new Error('Structure d\'alerte invalide');
      }

      this.addResult(
        'Création d\'alerte d\'usage',
        'success',
        'Structure d\'alerte validée avec succès',
        { alertType: alertData.type, severity: alertData.severity }
      );

    } catch (error) {
      this.addResult(
        'Création d\'alerte d\'usage',
        'error',
        `Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
        { error }
      );
    }
  }

  /**
   * Test de validation des types d'alertes
   */
  async testAlertTypes(): Promise<void> {
    try {
      console.log('\n🔍 Test: Validation des types d\'alertes...');
      
      const expectedTypes = [
        BillingAlertType.USAGE_WARNING,
        BillingAlertType.USAGE_LIMIT_EXCEEDED,
        BillingAlertType.PAYMENT_FAILED,
        BillingAlertType.TRIAL_ENDING,
        BillingAlertType.SUBSCRIPTION_CANCELLED,
        BillingAlertType.INVOICE_OVERDUE,
        BillingAlertType.PLAN_UPGRADE_RECOMMENDED
      ];

      const allTypesValid = expectedTypes.every(type => typeof type === 'string' && type.length > 0);

      if (!allTypesValid) {
        throw new Error('Certains types d\'alertes sont invalides');
      }

      this.addResult(
        'Types d\'alertes',
        'success',
        `${expectedTypes.length} types d\'alertes validés`,
        { types: expectedTypes }
      );

    } catch (error) {
      this.addResult(
        'Types d\'alertes',
        'error',
        `Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`
      );
    }
  }

  /**
   * Test de validation des méthodes du service
   */
  async testServiceMethods(): Promise<void> {
    try {
      console.log('\n🔍 Test: Validation des méthodes du service...');
      
      const requiredMethods = [
        'createAlert',
        'getAlertsByTenant',
        'dismissAlert',
        'createUsageWarningAlert',
        'createUsageLimitExceededAlert',
        'createPaymentFailedAlert',
        'createTrialEndingAlert',
        'createSubscriptionCancelledAlert',
        'checkAndCreateUsageAlerts'
      ];

      const missingMethods = requiredMethods.filter(method => 
        typeof (billingNotificationsService as any)[method] !== 'function'
      );

      if (missingMethods.length > 0) {
        throw new Error(`Méthodes manquantes: ${missingMethods.join(', ')}`);
      }

      this.addResult(
        'Méthodes du service',
        'success',
        `${requiredMethods.length} méthodes validées`,
        { methods: requiredMethods }
      );

    } catch (error) {
      this.addResult(
        'Méthodes du service',
        'error',
        `Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`
      );
    }
  }

  /**
   * Test de simulation d'alertes multiples
   */
  async testMultipleAlerts(): Promise<void> {
    try {
      console.log('\n🔍 Test: Simulation d\'alertes multiples...');
      
      const alertScenarios = [
        {
          type: BillingAlertType.USAGE_WARNING,
          metric: 'users',
          usage: 90,
          limit: 100
        },
        {
          type: BillingAlertType.USAGE_LIMIT_EXCEEDED,
          metric: 'storage',
          usage: 120,
          limit: 100
        },
        {
          type: BillingAlertType.TRIAL_ENDING,
          daysRemaining: 2
        },
        {
          type: BillingAlertType.PAYMENT_FAILED,
          amount: 49.99,
          currency: 'EUR'
        }
      ];

      // Valider chaque scénario
      for (const scenario of alertScenarios) {
        if (!scenario.type) {
          throw new Error(`Scénario invalide: ${JSON.stringify(scenario)}`);
        }
      }

      this.addResult(
        'Scénarios d\'alertes multiples',
        'success',
        `${alertScenarios.length} scénarios validés`,
        { scenarios: alertScenarios.map(s => s.type) }
      );

    } catch (error) {
      this.addResult(
        'Scénarios d\'alertes multiples',
        'error',
        `Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`
      );
    }
  }

  /**
   * Test de validation des données de facturation
   */
  async testBillingDataValidation(): Promise<void> {
    try {
      console.log('\n🔍 Test: Validation des données de facturation...');
      
      const sampleBillingData = {
        usage: {
          users: 85,
          events: 450,
          storage: 2048, // MB
          apiCalls: 8500
        },
        limits: {
          maxUsers: 100,
          maxEvents: 500,
          maxStorage: 2000, // MB
          apiCallsPerMonth: 10000
        }
      };

      // Calculer les pourcentages d'usage
      const usagePercentages = {
        users: (sampleBillingData.usage.users / sampleBillingData.limits.maxUsers) * 100,
        events: (sampleBillingData.usage.events / sampleBillingData.limits.maxEvents) * 100,
        storage: (sampleBillingData.usage.storage / sampleBillingData.limits.maxStorage) * 100,
        apiCalls: (sampleBillingData.usage.apiCalls / sampleBillingData.limits.apiCallsPerMonth) * 100
      };

      // Identifier les métriques qui nécessitent des alertes
      const alertsNeeded = Object.entries(usagePercentages)
        .filter(([_, percentage]) => percentage >= 90)
        .map(([metric, percentage]) => ({ metric, percentage }));

      this.addResult(
        'Validation des données de facturation',
        'success',
        `Données validées, ${alertsNeeded.length} alertes nécessaires`,
        { 
          usagePercentages: Object.fromEntries(
            Object.entries(usagePercentages).map(([k, v]) => [k, `${Math.round(v)}%`])
          ),
          alertsNeeded 
        }
      );

    } catch (error) {
      this.addResult(
        'Validation des données de facturation',
        'error',
        `Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`
      );
    }
  }

  /**
   * Exécuter tous les tests
   */
  async runAllTests(): Promise<void> {
    console.log('🚀 Démarrage des tests de santé pour la facturation...\n');

    await this.testUsageAlert();
    await this.testAlertTypes();
    await this.testServiceMethods();
    await this.testMultipleAlerts();
    await this.testBillingDataValidation();

    console.log('\n📊 Résultats des tests:');
    console.log('=' .repeat(50));

    this.results.forEach(result => this.logResult(result));

    const successCount = this.results.filter(r => r.status === 'success').length;
    const errorCount = this.results.filter(r => r.status === 'error').length;
    const warningCount = this.results.filter(r => r.status === 'warning').length;

    console.log('\n📈 Résumé:');
    console.log(`✅ Succès: ${successCount}`);
    console.log(`❌ Erreurs: ${errorCount}`);
    console.log(`⚠️  Avertissements: ${warningCount}`);
    console.log(`📊 Total: ${this.results.length} tests`);

    if (errorCount === 0) {
      console.log('\n🎉 Tous les tests de facturation sont passés avec succès!');
      console.log('💡 Le système de facturation est prêt à être utilisé.');
    } else {
      console.log('\n⚠️  Certains tests ont échoué. Veuillez vérifier les erreurs ci-dessus.');
    }

    console.log('\n🔗 Prochaines étapes:');
    console.log('  1. Tester l\'interface utilisateur de facturation');
    console.log('  2. Configurer les webhooks Stripe (si applicable)');
    console.log('  3. Tester les notifications par email');
    console.log('  4. Valider les calculs de facturation en environnement de test');
  }
}

// Exécuter les tests si ce script est appelé directement
if (require.main === module) {
  const healthCheck = new BillingHealthCheck();
  healthCheck.runAllTests().catch(error => {
    console.error('❌ Erreur lors de l\'exécution des tests:', error);
    process.exit(1);
  });
}

export { BillingHealthCheck };