/**
 * Exemples d'utilisation du service de configuration des approbateurs
 */

import { ApprovalConfigService } from './approval-config.service';
import { ApprovalSetupService } from './approval-setup.service';

/**
 * Exemple 1: Configuration initiale simple
 */
export async function exampleBasicSetup() {
  const setupService = new ApprovalSetupService();
  
  const result = await setupService.quickSetupDefaultApprover(
    'tenant-123',
    'manager-456',
    'admin-user'
  );
  
  if (result.success) {
    console.log('✅ Approbateur par défaut configuré:', result.approver);
  } else {
    console.error('❌ Erreur:', result.error);
  }
}

/**
 * Exemple 2: Configuration complète avec hiérarchie
 */
export async function exampleCompleteSetup() {
  const setupService = new ApprovalSetupService();
  
  const result = await setupService.setupApprovalConfiguration(
    'tenant-123',
    {
      // Approbateur principal
      defaultApprover: {
        userId: 'ceo-001',
        name: 'Jean Dupont',
        email: 'jean.dupont@company.com'
      },
      
      // Configuration d'escalation
      escalation: {
        enabled: true,
        escalateToUserId: 'director-001',
        escalationDays: 5
      },
      
      // Hiérarchie organisationnelle
      organizationalHierarchy: {
        'emp-001': {
          managerId: 'mgr-it-001',
          departmentId: 'dept-it',
          departmentName: 'IT Department'
        },
        'emp-002': {
          managerId: 'mgr-rh-001',
          departmentId: 'dept-rh',
          departmentName: 'HR Department'
        },
        'emp-003': {
          managerId: 'mgr-finance-001',
          departmentId: 'dept-finance',
          departmentName: 'Finance Department'
        }
      }
    },
    'admin-user'
  );
  
  if (result.success) {
    console.log('✅ Configuration complète réussie');
    console.log('📊 Configuration:', result.configuration);
    
    if (result.warnings.length > 0) {
      console.warn('⚠️ Avertissements:', result.warnings);
    }
  } else {
    console.error('❌ Erreurs:', result.errors);
  }
}

/**
 * Exemple 3: Ajout d'employés à la hiérarchie
 */
export async function exampleAddEmployees() {
  const setupService = new ApprovalSetupService();
  
  // Ajouter plusieurs employés
  const employees = [
    {
      employeeId: 'emp-004',
      managerId: 'mgr-it-001',
      department: { departmentId: 'dept-it', departmentName: 'IT Department' }
    },
    {
      employeeId: 'emp-005',
      managerId: 'mgr-it-001',
      department: { departmentId: 'dept-it', departmentName: 'IT Department' }
    }
  ];
  
  for (const emp of employees) {
    const result = await setupService.addEmployeeToHierarchy(
      'tenant-123',
      emp.employeeId,
      emp.managerId,
      emp.department,
      'admin-user'
    );
    
    if (result.success) {
      console.log(`✅ Employé ${emp.employeeId} ajouté sous ${result.manager?.name}`);
    } else {
      console.error(`❌ Erreur pour ${emp.employeeId}:`, result.error);
    }
  }
}

/**
 * Exemple 4: Consultation de la configuration
 */
export async function exampleGetConfiguration() {
  const configService = new ApprovalConfigService();
  const setupService = new ApprovalSetupService();
  
  // Obtenir la configuration complète
  const config = await configService.getApprovalConfiguration('tenant-123');
  console.log('📋 Configuration actuelle:', config);
  
  // Obtenir un résumé
  const summary = await setupService.getConfigurationSummary('tenant-123');
  console.log('📊 Résumé de configuration:', summary);
  
  // Obtenir tous les approbateurs
  const approvers = await configService.getAllApprovers('tenant-123');
  console.log('👥 Tous les approbateurs:', approvers);
  
  // Obtenir la hiérarchie
  const hierarchy = await configService.getOrganizationalHierarchy('tenant-123');
  console.log('🏢 Hiérarchie organisationnelle:', hierarchy);
}

/**
 * Exemple 5: Test des approbateurs pour différents employés
 */
export async function exampleTestApprovers() {
  const configService = new ApprovalConfigService();
  
  const employees = ['emp-001', 'emp-002', 'emp-003', 'emp-999']; // emp-999 n'existe pas
  
  for (const employeeId of employees) {
    const approver = await configService.getApproverForEmployee('tenant-123', employeeId);
    
    if (approver) {
      console.log(`✅ Approbateur pour ${employeeId}: ${approver.name} (${approver.email})`);
    } else {
      console.log(`⚠️ Aucun approbateur configuré pour ${employeeId} - utilisera l'approbateur par défaut`);
      
      const defaultApprover = await configService.getDefaultApprover('tenant-123');
      if (defaultApprover) {
        console.log(`   → Approbateur par défaut: ${defaultApprover.name}`);
      }
    }
  }
}

/**
 * Exemple 6: Test des escalations
 */
export async function exampleTestEscalations() {
  const configService = new ApprovalConfigService();
  
  const currentApprovers = ['mgr-it-001', 'mgr-rh-001', 'unknown-manager'];
  
  for (const approverId of currentApprovers) {
    const escalationTarget = await configService.getEscalationTarget('tenant-123', approverId);
    
    if (escalationTarget) {
      console.log(`📈 Escalation pour ${approverId} → ${escalationTarget}`);
    } else {
      console.log(`⚠️ Aucune escalation configurée pour ${approverId}`);
    }
  }
}

/**
 * Exemple 7: Configuration par étapes
 */
export async function exampleStepByStepSetup() {
  const configService = new ApprovalConfigService();
  
  console.log('🚀 Configuration étape par étape...');
  
  // Étape 1: Approbateur par défaut
  console.log('1️⃣ Configuration de l\'approbateur par défaut...');
  await configService.setDefaultApprover(
    'tenant-123',
    {
      userId: 'ceo-001',
      name: 'CEO Principal',
      email: 'ceo@company.com'
    },
    'admin'
  );
  console.log('✅ Approbateur par défaut configuré');
  
  // Étape 2: Règles d'escalation
  console.log('2️⃣ Configuration des règles d\'escalation...');
  await configService.setEscalationRules(
    'tenant-123',
    {
      enabled: true,
      escalateToUserId: 'board-001',
      escalateToName: 'Conseil d\'Administration',
      escalateToEmail: 'board@company.com',
      escalationDays: 7
    },
    'admin'
  );
  console.log('✅ Règles d\'escalation configurées');
  
  // Étape 3: Ajout de managers
  console.log('3️⃣ Ajout des managers...');
  const managers = [
    { empId: 'mgr-it-001', mgrId: 'ceo-001', dept: 'IT' },
    { empId: 'mgr-rh-001', mgrId: 'ceo-001', dept: 'RH' },
    { empId: 'mgr-finance-001', mgrId: 'ceo-001', dept: 'Finance' }
  ];
  
  for (const mgr of managers) {
    await configService.setEmployeeManager(
      'tenant-123',
      mgr.empId,
      {
        managerId: mgr.mgrId,
        managerName: 'CEO Principal',
        managerEmail: 'ceo@company.com',
        departmentId: `dept-${mgr.dept.toLowerCase()}`,
        departmentName: `${mgr.dept} Department`
      },
      'admin'
    );
  }
  console.log('✅ Managers ajoutés');
  
  // Étape 4: Ajout d'employés
  console.log('4️⃣ Ajout des employés...');
  const employees = [
    { empId: 'emp-001', mgrId: 'mgr-it-001', dept: 'IT' },
    { empId: 'emp-002', mgrId: 'mgr-it-001', dept: 'IT' },
    { empId: 'emp-003', mgrId: 'mgr-rh-001', dept: 'RH' },
    { empId: 'emp-004', mgrId: 'mgr-finance-001', dept: 'Finance' }
  ];
  
  for (const emp of employees) {
    await configService.setEmployeeManager(
      'tenant-123',
      emp.empId,
      {
        managerId: emp.mgrId,
        managerName: `Manager ${emp.dept}`,
        managerEmail: `manager.${emp.dept.toLowerCase()}@company.com`,
        departmentId: `dept-${emp.dept.toLowerCase()}`,
        departmentName: `${emp.dept} Department`
      },
      'admin'
    );
  }
  console.log('✅ Employés ajoutés');
  
  console.log('🎉 Configuration complète terminée !');
}

/**
 * Fonction principale pour exécuter tous les exemples
 */
export async function runAllExamples() {
  console.log('🔧 Exemples de configuration des approbateurs\n');
  
  try {
    console.log('=== Exemple 1: Configuration de base ===');
    await exampleBasicSetup();
    
    console.log('\n=== Exemple 2: Configuration complète ===');
    await exampleCompleteSetup();
    
    console.log('\n=== Exemple 3: Ajout d\'employés ===');
    await exampleAddEmployees();
    
    console.log('\n=== Exemple 4: Consultation ===');
    await exampleGetConfiguration();
    
    console.log('\n=== Exemple 5: Test des approbateurs ===');
    await exampleTestApprovers();
    
    console.log('\n=== Exemple 6: Test des escalations ===');
    await exampleTestEscalations();
    
    console.log('\n=== Exemple 7: Configuration étape par étape ===');
    await exampleStepByStepSetup();
    
  } catch (error) {
    console.error('❌ Erreur lors de l\'exécution des exemples:', error);
  }
}

