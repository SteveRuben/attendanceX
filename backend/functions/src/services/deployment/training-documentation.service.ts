/**
 * Service de formation et documentation pour le déploiement
 */
import { collections } from '../../config/database';

export interface TrainingModule {
  id: string;
  title: string;
  description: string;
  targetAudience: 'end_users' | 'administrators' | 'developers' | 'managers';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedDuration: number; // en minutes
  prerequisites: string[];
  content: TrainingContent[];
  assessments: Assessment[];
  resources: Resource[];
}

export interface TrainingContent {
  type: 'text' | 'video' | 'interactive' | 'screenshot' | 'demo';
  title: string;
  content: string;
  order: number;
  metadata?: any;
}

export interface Assessment {
  id: string;
  type: 'quiz' | 'practical' | 'scenario';
  questions: Question[];
  passingScore: number;
}

export interface Question {
  id: string;
  type: 'multiple_choice' | 'true_false' | 'text' | 'practical';
  question: string;
  options?: string[];
  correctAnswer: string | string[];
  explanation: string;
}

export interface Resource {
  type: 'document' | 'video' | 'link' | 'download';
  title: string;
  url: string;
  description: string;
}

export interface DocumentationSection {
  id: string;
  title: string;
  category: 'user_guide' | 'admin_guide' | 'api_docs' | 'troubleshooting' | 'faq';
  content: string;
  lastUpdated: Date;
  version: string;
  tags: string[];
  relatedSections: string[];
}

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  tags: string[];
  popularity: number;
  lastUpdated: Date;
}

export interface TroubleshootingGuide {
  id: string;
  title: string;
  problem: string;
  symptoms: string[];
  causes: string[];
  solutions: Solution[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: string;
}

export interface Solution {
  step: number;
  description: string;
  code?: string;
  screenshot?: string;
  expectedResult: string;
}

export class TrainingDocumentationService {

  /**
   * Crée les guides utilisateur
   */
  async createUserGuides(): Promise<DocumentationSection[]> {
    const userGuides: DocumentationSection[] = [
      {
        id: 'timesheet_basics',
        title: 'Gestion des Feuilles de Temps - Guide de Base',
        category: 'user_guide',
        content: this.generateTimesheetBasicsGuide(),
        lastUpdated: new Date(),
        version: '1.0.0',
        tags: ['timesheet', 'basics', 'getting-started'],
        relatedSections: ['time_entry_guide', 'project_selection']
      },
      {
        id: 'time_entry_guide',
        title: 'Saisie des Entrées de Temps',
        category: 'user_guide',
        content: this.generateTimeEntryGuide(),
        lastUpdated: new Date(),
        version: '1.0.0',
        tags: ['time-entry', 'logging', 'projects'],
        relatedSections: ['timesheet_basics', 'project_selection']
      },
      {
        id: 'project_selection',
        title: 'Sélection des Projets et Activités',
        category: 'user_guide',
        content: this.generateProjectSelectionGuide(),
        lastUpdated: new Date(),
        version: '1.0.0',
        tags: ['projects', 'activities', 'selection'],
        relatedSections: ['time_entry_guide', 'billing_guide']
      },
      {
        id: 'timesheet_submission',
        title: 'Soumission et Approbation des Feuilles de Temps',
        category: 'user_guide',
        content: this.generateTimesheetSubmissionGuide(),
        lastUpdated: new Date(),
        version: '1.0.0',
        tags: ['submission', 'approval', 'workflow'],
        relatedSections: ['timesheet_basics', 'approval_process']
      },
      {
        id: 'reports_viewing',
        title: 'Consultation des Rapports',
        category: 'user_guide',
        content: this.generateReportsViewingGuide(),
        lastUpdated: new Date(),
        version: '1.0.0',
        tags: ['reports', 'analytics', 'viewing'],
        relatedSections: ['dashboard_guide', 'export_guide']
      }
    ];

    // Sauvegarder dans Firestore
    for (const guide of userGuides) {
      await collections.documentation.doc(guide.id).set(guide);
    }

    return userGuides;
  }

  /**
   * Crée les guides administrateur
   */
  async createAdminGuides(): Promise<DocumentationSection[]> {
    const adminGuides: DocumentationSection[] = [
      {
        id: 'system_configuration',
        title: 'Configuration du Système',
        category: 'admin_guide',
        content: this.generateSystemConfigGuide(),
        lastUpdated: new Date(),
        version: '1.0.0',
        tags: ['configuration', 'setup', 'admin'],
        relatedSections: ['user_management', 'project_management']
      },
      {
        id: 'user_management',
        title: 'Gestion des Utilisateurs',
        category: 'admin_guide',
        content: this.generateUserManagementGuide(),
        lastUpdated: new Date(),
        version: '1.0.0',
        tags: ['users', 'permissions', 'roles'],
        relatedSections: ['system_configuration', 'security_settings']
      },
      {
        id: 'project_management',
        title: 'Gestion des Projets et Codes d\'Activité',
        category: 'admin_guide',
        content: this.generateProjectManagementGuide(),
        lastUpdated: new Date(),
        version: '1.0.0',
        tags: ['projects', 'activities', 'management'],
        relatedSections: ['system_configuration', 'billing_setup']
      },
      {
        id: 'approval_workflow',
        title: 'Configuration des Workflows d\'Approbation',
        category: 'admin_guide',
        content: this.generateApprovalWorkflowGuide(),
        lastUpdated: new Date(),
        version: '1.0.0',
        tags: ['approval', 'workflow', 'configuration'],
        relatedSections: ['user_management', 'notifications_setup']
      },
      {
        id: 'reports_configuration',
        title: 'Configuration des Rapports et Analytics',
        category: 'admin_guide',
        content: this.generateReportsConfigGuide(),
        lastUpdated: new Date(),
        version: '1.0.0',
        tags: ['reports', 'analytics', 'configuration'],
        relatedSections: ['dashboard_setup', 'export_configuration']
      }
    ];

    for (const guide of adminGuides) {
      await collections.documentation.doc(guide.id).set(guide);
    }

    return adminGuides;
  }

  /**
   * Crée les modules de formation
   */
  async createTrainingModules(): Promise<TrainingModule[]> {
    const trainingModules: TrainingModule[] = [
      {
        id: 'end_user_basics',
        title: 'Formation Utilisateur Final - Bases',
        description: 'Formation de base pour les utilisateurs finaux sur l\'utilisation des feuilles de temps',
        targetAudience: 'end_users',
        difficulty: 'beginner',
        estimatedDuration: 45,
        prerequisites: [],
        content: this.generateEndUserBasicsContent(),
        assessments: this.generateEndUserAssessments(),
        resources: this.generateEndUserResources()
      },
      {
        id: 'manager_training',
        title: 'Formation Managers - Approbation et Suivi',
        description: 'Formation pour les managers sur l\'approbation des feuilles de temps et le suivi d\'équipe',
        targetAudience: 'managers',
        difficulty: 'intermediate',
        estimatedDuration: 60,
        prerequisites: ['end_user_basics'],
        content: this.generateManagerTrainingContent(),
        assessments: this.generateManagerAssessments(),
        resources: this.generateManagerResources()
      },
      {
        id: 'admin_advanced',
        title: 'Formation Administrateur - Configuration Avancée',
        description: 'Formation avancée pour les administrateurs système',
        targetAudience: 'administrators',
        difficulty: 'advanced',
        estimatedDuration: 120,
        prerequisites: ['end_user_basics', 'manager_training'],
        content: this.generateAdminAdvancedContent(),
        assessments: this.generateAdminAssessments(),
        resources: this.generateAdminResources()
      }
    ];

    for (const module of trainingModules) {
      await collections.training_modules.doc(module.id).set(module);
    }

    return trainingModules;
  }

  /**
   * Crée la FAQ
   */
  async createFAQ(): Promise<FAQItem[]> {
    const faqItems: FAQItem[] = [
      {
        id: 'timesheet_not_saving',
        question: 'Pourquoi ma feuille de temps ne se sauvegarde-t-elle pas ?',
        answer: 'Vérifiez votre connexion internet et assurez-vous que tous les champs obligatoires sont remplis. Si le problème persiste, contactez le support technique.',
        category: 'technical',
        tags: ['saving', 'technical', 'troubleshooting'],
        popularity: 85,
        lastUpdated: new Date()
      },
      {
        id: 'project_not_visible',
        question: 'Je ne vois pas mon projet dans la liste, que faire ?',
        answer: 'Contactez votre manager ou administrateur pour vérifier que vous êtes bien assigné au projet. Les projets inactifs n\'apparaissent pas dans la liste.',
        category: 'projects',
        tags: ['projects', 'visibility', 'assignment'],
        popularity: 72,
        lastUpdated: new Date()
      },
      {
        id: 'timesheet_approval_delay',
        question: 'Combien de temps faut-il pour l\'approbation d\'une feuille de temps ?',
        answer: 'Le délai d\'approbation standard est de 48 heures ouvrables. Vous recevrez une notification par email une fois votre feuille approuvée ou rejetée.',
        category: 'approval',
        tags: ['approval', 'timeline', 'notifications'],
        popularity: 68,
        lastUpdated: new Date()
      },
      {
        id: 'time_entry_modification',
        question: 'Puis-je modifier une entrée de temps après soumission ?',
        answer: 'Une fois soumise, une feuille de temps ne peut plus être modifiée. Si des corrections sont nécessaires, contactez votre manager pour un retour en brouillon.',
        category: 'editing',
        tags: ['editing', 'submission', 'workflow'],
        popularity: 91,
        lastUpdated: new Date()
      },
      {
        id: 'mobile_access',
        question: 'Puis-je utiliser le système sur mon téléphone mobile ?',
        answer: 'Oui, le système est optimisé pour les appareils mobiles. Utilisez votre navigateur mobile pour accéder à l\'interface responsive.',
        category: 'mobile',
        tags: ['mobile', 'access', 'responsive'],
        popularity: 56,
        lastUpdated: new Date()
      }
    ];

    for (const item of faqItems) {
      await collections.documentation.doc(item.id).set(item);
    }

    return faqItems;
  }

  /**
   * Crée les guides de dépannage
   */
  async createTroubleshootingGuides(): Promise<TroubleshootingGuide[]> {
    const troubleshootingGuides: TroubleshootingGuide[] = [
      {
        id: 'login_issues',
        title: 'Problèmes de Connexion',
        problem: 'Impossible de se connecter au système',
        symptoms: [
          'Message d\'erreur "Identifiants incorrects"',
          'Page de connexion qui se recharge',
          'Timeout de connexion'
        ],
        causes: [
          'Identifiants incorrects',
          'Compte désactivé',
          'Problème de réseau',
          'Cache du navigateur'
        ],
        solutions: [
          {
            step: 1,
            description: 'Vérifiez vos identifiants de connexion',
            expectedResult: 'Confirmation des identifiants corrects'
          },
          {
            step: 2,
            description: 'Videz le cache de votre navigateur',
            code: 'Ctrl+Shift+Delete (Windows) ou Cmd+Shift+Delete (Mac)',
            expectedResult: 'Cache vidé, page rechargée'
          },
          {
            step: 3,
            description: 'Contactez l\'administrateur si le problème persiste',
            expectedResult: 'Vérification du statut du compte'
          }
        ],
        severity: 'high',
        category: 'authentication'
      },
      {
        id: 'data_not_loading',
        title: 'Données qui ne se chargent pas',
        problem: 'Les feuilles de temps ou projets ne s\'affichent pas',
        symptoms: [
          'Écran de chargement infini',
          'Listes vides',
          'Messages d\'erreur de chargement'
        ],
        causes: [
          'Problème de connexion réseau',
          'Permissions insuffisantes',
          'Problème serveur temporaire'
        ],
        solutions: [
          {
            step: 1,
            description: 'Actualisez la page (F5)',
            expectedResult: 'Rechargement des données'
          },
          {
            step: 2,
            description: 'Vérifiez votre connexion internet',
            expectedResult: 'Connexion stable confirmée'
          },
          {
            step: 3,
            description: 'Déconnectez-vous et reconnectez-vous',
            expectedResult: 'Session rafraîchie'
          }
        ],
        severity: 'medium',
        category: 'data_loading'
      }
    ];

    for (const guide of troubleshootingGuides) {
      await collections.documentation.doc(guide.id).set(guide);
    }

    return troubleshootingGuides;
  }

  /**
   * Génère un rapport de formation
   */
  async generateTrainingReport(tenantId: string): Promise<{
    summary: any;
    moduleProgress: any[];
    recommendations: string[];
  }> {
    // Récupérer les données de progression de formation
    const progressSnapshot = await collections.documentation
      .where('tenantId', '==', tenantId)
      .get();

    const moduleStats = new Map<string, { completed: number; total: number; averageScore: number }>();
    let totalUsers = 0;
    const userSet = new Set<string>();

    for (const doc of progressSnapshot.docs) {
      const progress = doc.data();
      userSet.add(progress.userId);
      
      if (!moduleStats.has(progress.moduleId)) {
        moduleStats.set(progress.moduleId, { completed: 0, total: 0, averageScore: 0 });
      }
      
      const stats = moduleStats.get(progress.moduleId)!;
      stats.total++;
      
      if (progress.status === 'completed') {
        stats.completed++;
        stats.averageScore += progress.score || 0;
      }
    }

    totalUsers = userSet.size;

    // Calculer les moyennes
    for (const stats of moduleStats.values()) {
      if (stats.completed > 0) {
        stats.averageScore = stats.averageScore / stats.completed;
      }
    }

    const moduleProgress = Array.from(moduleStats.entries()).map(([moduleId, stats]) => ({
      moduleId,
      completionRate: stats.total > 0 ? (stats.completed / stats.total) * 100 : 0,
      averageScore: stats.averageScore,
      totalUsers: stats.total,
      completedUsers: stats.completed
    }));

    const summary = {
      totalUsers,
      totalModules: moduleStats.size,
      overallCompletionRate: this.calculateOverallCompletionRate(moduleProgress),
      averageScore: this.calculateAverageScore(moduleProgress)
    };

    const recommendations = this.generateTrainingRecommendations(moduleProgress, summary);

    return {
      summary,
      moduleProgress,
      recommendations
    };
  }

  // Méthodes privées pour générer le contenu

  private generateTimesheetBasicsGuide(): string {
    return `
# Gestion des Feuilles de Temps - Guide de Base

## Introduction
Les feuilles de temps permettent de suivre et d'enregistrer le temps passé sur différents projets et activités.

## Accès au système
1. Connectez-vous avec vos identifiants
2. Accédez à la section "Feuilles de temps"
3. Sélectionnez la période souhaitée

## Navigation de base
- **Tableau de bord** : Vue d'ensemble de vos feuilles de temps
- **Nouvelle feuille** : Créer une nouvelle feuille de temps
- **Historique** : Consulter les feuilles précédentes
- **Rapports** : Voir vos statistiques personnelles

## Statuts des feuilles de temps
- **Brouillon** : En cours de saisie, modifiable
- **Soumise** : Envoyée pour approbation, non modifiable
- **Approuvée** : Validée par le manager
- **Rejetée** : Retournée pour correction

## Bonnes pratiques
- Saisissez vos heures quotidiennement
- Utilisez des descriptions claires et précises
- Vérifiez vos totaux avant soumission
- Respectez les délais de soumission
    `;
  }

  private generateTimeEntryGuide(): string {
    return `
# Saisie des Entrées de Temps

## Création d'une entrée
1. Cliquez sur "Nouvelle entrée"
2. Sélectionnez la date
3. Choisissez le projet et l'activité
4. Saisissez les heures de début et fin
5. Ajoutez une description détaillée
6. Indiquez si l'entrée est facturable
7. Sauvegardez

## Champs obligatoires
- Date
- Projet
- Activité
- Durée ou heures de début/fin
- Description

## Types d'entrées
- **Facturable** : Temps facturable au client
- **Non facturable** : Temps interne (formation, réunions, etc.)
- **Congés** : Vacances, maladie, etc.

## Conseils de saisie
- Soyez précis dans vos descriptions
- Utilisez des mots-clés pour faciliter la recherche
- Arrondissez au quart d'heure le plus proche
- Vérifiez les chevauchements d'horaires
    `;
  }

  private generateProjectSelectionGuide(): string {
    return `
# Sélection des Projets et Activités

## Structure des projets
Les projets sont organisés par client et peuvent contenir plusieurs activités.

## Sélection d'un projet
1. Utilisez la liste déroulante des projets
2. Tapez les premières lettres pour filtrer
3. Sélectionnez le projet approprié
4. Le code projet s'affiche automatiquement

## Codes d'activité
Les activités sont organisées par catégories :
- **Développement** : Programmation, tests, débogage
- **Gestion** : Réunions, planification, suivi
- **Support** : Maintenance, documentation, formation
- **Administration** : Tâches administratives

## Règles de sélection
- Vérifiez que vous êtes assigné au projet
- Respectez les codes d'activité définis
- Utilisez l'activité la plus spécifique possible
- En cas de doute, contactez votre manager
    `;
  }

  private generateTimesheetSubmissionGuide(): string {
    return `
# Soumission et Approbation des Feuilles de Temps

## Processus de soumission
1. Vérifiez que toutes les entrées sont complètes
2. Contrôlez les totaux hebdomadaires
3. Cliquez sur "Soumettre pour approbation"
4. Confirmez la soumission

## Vérifications avant soumission
- Toutes les journées travaillées sont saisies
- Les descriptions sont complètes
- Les projets et activités sont corrects
- Les heures correspondent à votre planning

## Processus d'approbation
1. **Soumission** : Feuille envoyée au manager
2. **Révision** : Le manager examine la feuille
3. **Approbation/Rejet** : Décision prise
4. **Notification** : Vous recevez un email

## Délais
- Soumission : Avant le lundi 10h
- Approbation : Sous 48h ouvrables
- Corrections : Sous 24h après rejet

## En cas de rejet
1. Consultez les commentaires du manager
2. Effectuez les corrections demandées
3. Resoumettez la feuille corrigée
    `;
  }

  private generateReportsViewingGuide(): string {
    return `
# Consultation des Rapports

## Types de rapports disponibles
- **Personnel** : Vos statistiques individuelles
- **Équipe** : Vue d'ensemble de l'équipe (managers)
- **Projet** : Suivi par projet
- **Facturation** : Heures facturables vs non facturables

## Accès aux rapports
1. Menu "Rapports"
2. Sélectionnez le type de rapport
3. Définissez la période
4. Appliquez les filtres souhaités
5. Générez le rapport

## Filtres disponibles
- Période (date de début/fin)
- Projets spécifiques
- Types d'activités
- Statut facturable
- Employés (pour les managers)

## Export des données
- Format PDF pour impression
- Format Excel pour analyse
- Format CSV pour import
- Envoi par email automatique

## Interprétation des données
- **Heures totales** : Temps total saisi
- **Heures facturables** : Temps facturable aux clients
- **Taux d'utilisation** : Pourcentage d'heures facturables
- **Répartition** : Distribution par projet/activité
    `;
  }

  private generateSystemConfigGuide(): string {
    return `
# Configuration du Système

## Paramètres généraux
- Fuseau horaire de l'organisation
- Format de date et heure
- Devise par défaut
- Langue de l'interface

## Périodes de saisie
- Définition des semaines de travail
- Jours ouvrables
- Heures de travail standard
- Délais de soumission

## Règles de validation
- Heures minimum/maximum par jour
- Chevauchements autorisés
- Validation des descriptions
- Contrôles de cohérence

## Notifications
- Configuration des emails
- Templates de notification
- Fréquence des rappels
- Destinataires par défaut
    `;
  }

  private generateUserManagementGuide(): string {
    return `
# Gestion des Utilisateurs

## Création d'utilisateurs
1. Accédez à "Administration > Utilisateurs"
2. Cliquez sur "Nouvel utilisateur"
3. Remplissez les informations personnelles
4. Définissez le rôle et les permissions
5. Assignez aux projets appropriés

## Rôles disponibles
- **Employé** : Saisie de ses propres feuilles de temps
- **Manager** : Approbation des feuilles d'équipe
- **Administrateur** : Configuration système complète
- **RH** : Accès aux rapports et statistiques

## Gestion des permissions
- Accès aux projets par assignation
- Droits de modification selon le statut
- Visibilité des rapports par rôle
- Paramètres de sécurité

## Désactivation d'utilisateurs
- Processus de désactivation
- Conservation des données historiques
- Transfert des responsabilités
- Archivage des accès
    `;
  }

  private generateProjectManagementGuide(): string {
    return `
# Gestion des Projets et Codes d'Activité

## Création de projets
1. Définir les informations de base
2. Assigner un code unique
3. Configurer les paramètres de facturation
4. Définir l'équipe projet
5. Activer le projet

## Structure des activités
- Organisation hiérarchique
- Catégories principales
- Sous-activités spécialisées
- Codes standardisés

## Assignation des équipes
- Sélection des employés
- Définition des rôles projet
- Taux horaires spécifiques
- Périodes d'assignation

## Suivi et reporting
- Tableaux de bord projet
- Métriques de performance
- Alertes de dépassement
- Rapports de rentabilité
    `;
  }

  private generateApprovalWorkflowGuide(): string {
    return `
# Configuration des Workflows d'Approbation

## Types de workflows
- **Simple** : Un seul niveau d'approbation
- **Hiérarchique** : Plusieurs niveaux selon l'organisation
- **Matriciel** : Approbation par projet et manager
- **Délégué** : Système de délégation temporaire

## Configuration des approbateurs
- Assignation par employé
- Hiérarchie organisationnelle
- Règles de substitution
- Délégations temporaires

## Règles d'escalation
- Délais d'approbation
- Escalation automatique
- Notifications de rappel
- Procédures d'urgence

## Personnalisation
- Templates de notification
- Critères d'approbation
- Règles métier spécifiques
- Intégrations externes
    `;
  }

  private generateReportsConfigGuide(): string {
    return `
# Configuration des Rapports et Analytics

## Types de rapports
- Rapports standard prédéfinis
- Rapports personnalisés
- Tableaux de bord interactifs
- Exports automatisés

## Configuration des métriques
- KPIs organisationnels
- Seuils d'alerte
- Calculs personnalisés
- Agrégations temporelles

## Planification des rapports
- Génération automatique
- Distribution par email
- Archivage des données
- Rétention des historiques

## Sécurité et accès
- Permissions par rapport
- Filtrage automatique des données
- Anonymisation si nécessaire
- Audit des consultations
    `;
  }

  private generateEndUserBasicsContent(): TrainingContent[] {
    return [
      {
        type: 'text',
        title: 'Introduction au système',
        content: 'Présentation générale du système de gestion des feuilles de temps',
        order: 1
      },
      {
        type: 'video',
        title: 'Démonstration de connexion',
        content: 'Vidéo montrant comment se connecter et naviguer',
        order: 2
      },
      {
        type: 'interactive',
        title: 'Exercice pratique - Première connexion',
        content: 'Simulation guidée de première connexion',
        order: 3
      },
      {
        type: 'text',
        title: 'Saisie des entrées de temps',
        content: 'Guide détaillé pour saisir ses heures de travail',
        order: 4
      },
      {
        type: 'demo',
        title: 'Démonstration - Création d\'entrée',
        content: 'Démonstration pas à pas de création d\'entrée',
        order: 5
      }
    ];
  }

  private generateEndUserAssessments(): Assessment[] {
    return [
      {
        id: 'basic_knowledge',
        type: 'quiz',
        questions: [
          {
            id: 'q1',
            type: 'multiple_choice',
            question: 'Quel est le délai de soumission des feuilles de temps ?',
            options: ['Vendredi 17h', 'Lundi 10h', 'Mardi midi', 'Mercredi matin'],
            correctAnswer: 'Lundi 10h',
            explanation: 'Les feuilles doivent être soumises avant lundi 10h pour traitement.'
          },
          {
            id: 'q2',
            type: 'true_false',
            question: 'Peut-on modifier une feuille de temps après soumission ?',
            correctAnswer: 'false',
            explanation: 'Une fois soumise, la feuille ne peut plus être modifiée sans retour en brouillon.'
          }
        ],
        passingScore: 80
      }
    ];
  }

  private generateEndUserResources(): Resource[] {
    return [
      {
        type: 'document',
        title: 'Guide de référence rapide',
        url: '/docs/quick-reference.pdf',
        description: 'Aide-mémoire des fonctions principales'
      },
      {
        type: 'video',
        title: 'Tutoriels vidéo',
        url: '/videos/tutorials',
        description: 'Collection de tutoriels vidéo'
      }
    ];
  }

  private generateManagerTrainingContent(): TrainingContent[] {
    return [
      {
        type: 'text',
        title: 'Rôle du manager dans l\'approbation',
        content: 'Responsabilités et processus d\'approbation',
        order: 1
      },
      {
        type: 'demo',
        title: 'Processus d\'approbation',
        content: 'Démonstration du workflow d\'approbation',
        order: 2
      }
    ];
  }

  private generateManagerAssessments(): Assessment[] {
    return [
      {
        id: 'approval_process',
        type: 'scenario',
        questions: [
          {
            id: 's1',
            type: 'practical',
            question: 'Comment gérer une feuille de temps avec des heures suspectes ?',
            correctAnswer: 'Contacter l\'employé pour clarification avant approbation',
            explanation: 'Il est important de vérifier les anomalies avant validation.'
          }
        ],
        passingScore: 75
      }
    ];
  }

  private generateManagerResources(): Resource[] {
    return [
      {
        type: 'document',
        title: 'Guide du manager',
        url: '/docs/manager-guide.pdf',
        description: 'Guide complet pour les managers'
      }
    ];
  }

  private generateAdminAdvancedContent(): TrainingContent[] {
    return [
      {
        type: 'text',
        title: 'Configuration avancée du système',
        content: 'Paramètres système et personnalisation',
        order: 1
      }
    ];
  }

  private generateAdminAssessments(): Assessment[] {
    return [
      {
        id: 'system_config',
        type: 'practical',
        questions: [
          {
            id: 'p1',
            type: 'practical',
            question: 'Configurez un nouveau workflow d\'approbation',
            correctAnswer: 'Configuration complète avec test',
            explanation: 'Validation de la configuration par test pratique'
          }
        ],
        passingScore: 85
      }
    ];
  }

  private generateAdminResources(): Resource[] {
    return [
      {
        type: 'document',
        title: 'Guide d\'administration',
        url: '/docs/admin-guide.pdf',
        description: 'Documentation technique complète'
      }
    ];
  }

  private calculateOverallCompletionRate(moduleProgress: any[]): number {
    if (moduleProgress.length === 0) return 0;
    const totalRate = moduleProgress.reduce((sum, module) => sum + module.completionRate, 0);
    return totalRate / moduleProgress.length;
  }

  private calculateAverageScore(moduleProgress: any[]): number {
    const modulesWithScores = moduleProgress.filter(module => module.averageScore > 0);
    if (modulesWithScores.length === 0) return 0;
    const totalScore = modulesWithScores.reduce((sum, module) => sum + module.averageScore, 0);
    return totalScore / modulesWithScores.length;
  }

  private generateTrainingRecommendations(moduleProgress: any[], summary: any): string[] {
    const recommendations: string[] = [];

    if (summary.overallCompletionRate < 70) {
      recommendations.push('Organiser des sessions de formation supplémentaires pour améliorer le taux de completion');
    }

    if (summary.averageScore < 75) {
      recommendations.push('Revoir le contenu des formations pour améliorer la compréhension');
    }

    const lowCompletionModules = moduleProgress.filter(module => module.completionRate < 50);
    if (lowCompletionModules.length > 0) {
      recommendations.push(`Modules nécessitant une attention particulière: ${lowCompletionModules.map(m => m.moduleId).join(', ')}`);
    }

    recommendations.push('Planifier des sessions de rappel trimestrielles');
    recommendations.push('Créer un système de mentoring pour les nouveaux utilisateurs');

    return recommendations;
  }
}