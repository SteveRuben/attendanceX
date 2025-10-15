import {
  onDocumentCreated,
  onDocumentDeleted,
  onDocumentUpdated,
} from "firebase-functions/v2/firestore";
import {logger} from "firebase-functions";
import {NotificationService} from "../services/notification";
import {
  createAuditLog,
  getChangedFields,
  initializeUserProfile,
  retryWithBackoff,
  TriggerLogger,
  validateTriggerData,
} from "./trigger.utils";
import {FieldValue} from "firebase-admin/firestore";
import { collections } from "../config/database";
import { db } from "../config";
import { MLService } from "../services/utility/ml.service";
import { NotificationChannel, NotificationPriority, NotificationType, User, UserRole, UserStatus } from "../common/types";

// Initialisation Firebase


const notificationService = new NotificationService();
const mlService = new MLService();


/**
 * Trigger de création d'utilisateur (v2)
 */
const onUserCreate = onDocumentCreated("users/{userId}", async (event) => {
  const userId = event.params.userId;
  const user = event.data?.data() as User;

  try {
    logger.info(`User created: ${userId}`, {
      email: user.email,
      role: user.role,
      department: user.tenantId,
      status: user.status,
    });

    // Validation des données
    const validation = validateTriggerData(user, [
      "email", "firstName", "lastName", "role",
    ]);

    if (!validation.isValid) {
      logger.error("Validation failed", validation.errors);
      TriggerLogger.error("UserTrigger", "onCreate", userId, validation.errors);
      await createAuditLog("user_create_failed", userId, {
        errors: validation.errors,
        data: user,
      });
      return;
    }

    // Vérification email unique
    const emailQuery = await collections.users
      .where("email", "==", user.email)
      .where("status", "!=", UserStatus.DELETED)
      .get();

    if (!emailQuery.empty && emailQuery.docs[0].id !== userId) {
      logger.error("Duplicate email detected");
      TriggerLogger.error("UserTrigger", "onCreate", userId, "Email already exists");
      await event.data?.ref.update({
        status: UserStatus.SUSPENDED,
        suspensionReason: "duplicate_email",
        updatedAt: new Date(),
      });
      return;
    }

    // Tâches d'initialisation parallèles
    await Promise.allSettled([
      initializeUserProfile(userId, user),
      createDefaultUserPreferences(userId, user),
      initializeUserStatistics(userId),
      retryWithBackoff(() => mlService.initializeUserProfile(userId, user)),
    ]);

    // Tâches séquentielles
    if (user.role && user.tenantId) {
      await addToDefaultGroups(userId, user.role, user.tenantId);
    }

    await sendWelcomeEmail(user);
    await scheduleOnboardingSequence(userId, user);

    if ([UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER].includes(user.role)) {
      await notifyAdminUserCreation(user);
    }

    await createAutoEventInvitations(userId, user);
    await setupExternalIntegrations(userId, user);

    // Audit log
    await createAuditLog("user_created", userId, {
      email: user.email,
      role: user.role,
      department: user.tenantId,
      status: user.status,
    });

    logger.log("User creation completed successfully", {userId});
  } catch (error) {
    logger.error("User creation failed", error);

    await createAuditLog("user_create_error", userId, {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : String(error),
    });

    await event.data?.ref.update({
      status: UserStatus.SUSPENDED,
      suspensionReason: "creation_error",
      error: error instanceof Error ? error.message : String(error),
      updatedAt: new Date(),
    });

    throw error;
  }
});

async function initializeUserStatistics(userId: string): Promise<void> {
  try {
    const initialStats = {
      attendance: {
        totalEvents: 0,
        totalPresent: 0,
        totalLate: 0,
        totalAbsent: 0,
        totalExcused: 0,
        attendanceRate: 0,
        punctualityRate: 100,
        averageDelay: 0,
        currentStreak: 0,
        longestStreak: 0,
        lastAttendance: null,
      },
      engagement: {
        eventsOrganized: 0,
        invitationsSent: 0,
        achievementsUnlocked: 0,
        profileCompleteness: calculateInitialProfileCompleteness(),
        lastActivity: new Date(),
      },
      preferences: {
        favoriteEventTypes: [],
        preferredMeetingTimes: [],
        preferredLocations: [],
      },
      createdAt: new Date(),
      lastUpdated: new Date(),
    };

    await collections.user_statistics.doc(userId).set(initialStats);
    TriggerLogger.success("UserUtils", "initializeStatistics", userId);
  } catch (error) {
    TriggerLogger.error("UserUtils", "initializeStatistics", userId, error);
    throw error;
  }
}

/**
 * Calculer la complétude initiale du profil
 */
function calculateInitialProfileCompleteness(): number {
  // Commencer avec un score de base pour les champs obligatoires remplis
  return 40; // 40% pour avoir créé le compte avec les infos de base
}

/**
 * Ajouter l'utilisateur aux groupes par défaut
 */
async function addToDefaultGroups(
  userId: string,
  role: UserRole,
  department: string): Promise<void> {
  try {
    const groupTasks = [];

    // Groupe du département
    if (department) {
      groupTasks.push(
        collections.groups.doc(`dept_${department.toLowerCase()}`).update({
          members: FieldValue.arrayUnion(userId),
          lastUpdated: new Date(),
        })
      );
    }

    // Groupes par rôle - CORRIGÉ avec les vraies valeurs d'enum
    const roleGroups: Record<UserRole, string[]> = {
      [UserRole.PARTICIPANT]: ["all_users"],
      [UserRole.MANAGER]: ["all_users", "managers"],
      [UserRole.ADMIN]: ["all_users", "managers", "admins"],
      [UserRole.SUPER_ADMIN]: [
        "all_users",
        "managers",
        "admins",
        "super_admins",
      ],
      [UserRole.ORGANIZER]: ["all_users", "organizers"],
      [UserRole.MODERATOR]: ["all_users", "moderators"],
      [UserRole.VIEWER]: ["all_users", "viewers"],
      [UserRole.GUEST]: ["all_users", "guests"],
      [UserRole.ANALYST]: [],
      [UserRole.CONTRIBUTOR]: [],
    };

    const userGroups = roleGroups[role] || ["all_users"];

    for (const groupName of userGroups) {
      groupTasks.push(
        collections.groups.doc(groupName).set({
          name: groupName,
          members: FieldValue.arrayUnion(userId),
          lastUpdated: new Date(),
        }, {merge: true})
      );
    }

    await Promise.allSettled(groupTasks);
    TriggerLogger.success(
      "UserUtils",
      "addToDefaultGroups",
      userId, {groups: userGroups});
  } catch (error) {
    TriggerLogger.error("UserUtils", "addToDefaultGroups", userId, error);
  }
}

/**
 * Envoyer l'email de bienvenue
 */
async function sendWelcomeEmail(user: any): Promise<void> {
  try {
    await notificationService.sendNotification({
      userId: user.id,
      type: NotificationType.WELCOME,
      title: `Bienvenue dans Attendance-X, ${user.firstName} !`,
      message: "Votre compte a été créé avec succès." +
          " Découvrez toutes les fonctionnalités de notre plateforme.",
      data: {
        userName: `${user.firstName} ${user.lastName}`,
        loginUrl: `${process.env.APP_BASE_URL}/login`,
        helpUrl: `${process.env.APP_BASE_URL}/help`,
        role: user.role,
        department: user.department,
      },
      channels: [NotificationChannel.EMAIL],
      priority: NotificationPriority.NORMAL,
    });

    TriggerLogger.success("UserUtils", "sendWelcomeEmail", user.id);
  } catch (error) {
    TriggerLogger.error("UserUtils", "sendWelcomeEmail", user.id, error);
  }
}

/**
 * Programmer la séquence d'onboarding
 */
async function scheduleOnboardingSequence(
  userId: string,
  user: any): Promise<void> {
  try {
    const onboardingSteps = [
      {
        step: 1,
        title: "Complétez votre profil",
        description: "Ajoutez votre photo et vos informations personnelles",
        scheduledFor:
            new Date(Date.now() + 2 * 60 * 60 * 1000),
        // 2h après création
        type: NotificationType.ONBOARDING_STEP,
      },
      {
        step: 2,
        title: "Configurez vos préférences",
        description: "Personnalisez vos notifications et paramètres",
        scheduledFor:
            new Date(Date.now() + 24 * 60 * 60 * 1000),
        // 1 jour après
        type: NotificationType.ONBOARDING_STEP,
      },
      {
        step: 3,
        title: "Rejoignez votre premier événement",
        description: "Découvrez comment participer aux événements",
        scheduledFor:
            new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        // 3 jours après
        type: NotificationType.ONBOARDING_STEP,
      },
      {
        step: 4,
        title: "Explorez les fonctionnalités avancées",
        description: "Découvrez les rapports et analytics",
        scheduledFor:
            new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        // 1 semaine après
        type: NotificationType.ONBOARDING_STEP,
      },
    ];

    const batch = db.batch();

    for (const step of onboardingSteps) {
      const notificationRef = collections.scheduled_notifications.doc();
      batch.set(notificationRef, {
        userId,
        type: step.type,
        title: step.title,
        message: step.description,
        data: {
          onboardingStep: step.step,
          totalSteps: onboardingSteps.length,
          userId,
          userName: `${user.firstName} ${user.lastName}`,
        },
        channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
        priority: NotificationPriority.LOW,
        scheduledFor: step.scheduledFor,
        status: "scheduled",
        createdAt: new Date(),
      });
    }

    await batch.commit();
    TriggerLogger.success("UserUtils", "scheduleOnboarding", userId, {
      stepsScheduled: onboardingSteps.length,
    });
  } catch (error) {
    TriggerLogger.error("UserUtils", "scheduleOnboarding", userId, error);
  }
}

/**
 * Notifier les administrateurs de la création d'un utilisateur privilégié
 */
async function notifyAdminUserCreation(user: any): Promise<void> {
  try {
    // Récupérer les super administrateurs
    const superAdmins = await collections.users
      .where("role", "==", UserRole.SUPER_ADMIN)
      .where("status", "==", UserStatus.ACTIVE)
      .get();

    if (superAdmins.empty) {return;}

    const notificationTasks = superAdmins.docs.map((adminDoc) =>
      notificationService.sendNotification({
        userId: adminDoc.id,
        type: NotificationType.ADMIN_ALERT,
        title: "Nouveau utilisateur privilégié créé",
        message: `Un nouvel utilisateur avec le
         rôle ${user.role} a été créé : ${user.firstName} ${user.lastName} (${user.email})`,
        data: {
          newUserId: user.id,
          newUserEmail: user.email,
          newUserRole: user.role,
          newUserDepartment: user.department,
          newUserName: `${user.firstName} ${user.lastName}`,
        },
        channels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
        priority: NotificationPriority.HIGH,
      })
    );

    await Promise.allSettled(notificationTasks);

    TriggerLogger.success("UserUtils", "notifyAdminUserCreation", user.id);
  } catch (error) {
    TriggerLogger.error("UserUtils", "notifyAdminUserCreation", user.id, error);
  }
}

/**
 * Créer des invitations automatiques aux événements récurrents
 */
async function createAutoEventInvitations(userId: string, user: any): Promise<void> {
  try {
    // Rechercher les événements récurrents qui correspondent au profil de l'utilisateur
    const recurringEvents = await collections.events
      .where("isRecurring", "==", true)
      .where("status", "==", "active")
      .where("autoInviteNewUsers", "==", true)
      .get();

    if (recurringEvents.empty) {return;}

    const invitationTasks = [];

    for (const eventDoc of recurringEvents.docs) {
      const event = eventDoc.data();

      // Vérifier si l'utilisateur correspond aux critères d'invitation
      const matchesCriteria = checkAutoInviteCriteria(user, event.targetAudience);

      if (matchesCriteria) {
        invitationTasks.push(
          collections.invitations.add({
            eventId: eventDoc.id,
            userId,
            status: "pending",
            sentAt: new Date(),
            createdBy: "system",
            autoInvited: true,
            reason: "new_user_auto_invite",
          })
        );

        // Ajouter l'utilisateur aux participants de l'événement
        invitationTasks.push(
          eventDoc.ref.update({
            participants: FieldValue.arrayUnion(userId),
          })
        );
      }
    }

    await Promise.allSettled(invitationTasks);
    TriggerLogger.success("UserUtils", "createAutoEventInvitations", userId, {
      invitationsCreated: Math.floor(invitationTasks.length / 2),
    });
  } catch (error) {
    TriggerLogger.error("UserUtils", "createAutoEventInvitations", userId, error);
  }
}

/**
 * Vérifier si un utilisateur correspond aux critères d'invitation automatique
 */
function checkAutoInviteCriteria(user: any, targetAudience: any): boolean {
  if (!targetAudience) {return false;}

  // Vérifier le département
  if (targetAudience.departments && targetAudience.departments.length > 0) {
    if (!targetAudience.departments.includes(user.department)) {
      return false;
    }
  }

  // Vérifier le rôle
  if (targetAudience.roles && targetAudience.roles.length > 0) {
    if (!targetAudience.roles.includes(user.role)) {
      return false;
    }
  }

  // Vérifier la localisation
  if (targetAudience.locations && targetAudience.locations.length > 0) {
    if (!targetAudience.locations.includes(user.location)) {
      return false;
    }
  }

  return true;
}

/**
 * Configurer les intégrations externes
 */
async function setupExternalIntegrations(userId: string, user: any): Promise<void> {
  try {
    const integrations = [];

    // Intégration calendrier si l'email est un domaine d'entreprise
    
    if (user.email?.includes("@company.com")) { // Remplacer par votre domaine
      integrations.push({
        type: "calendar",
        provider: "google",
        enabled: false, // L'utilisateur devra l'activer manuellement
        email: user.email,
      });
    }

    // Intégration Slack si c'est activé pour le département
    if (user.department && process.env.SLACK_INTEGRATION_ENABLED === "true") {
      integrations.push({
        type: "messaging",
        provider: "slack",
        enabled: false,
        department: user.department,
      });
    }

    if (integrations.length > 0) {
      await collections.user_integrations.doc(userId).set({
        availableIntegrations: integrations,
        createdAt: new Date(),
      });
    }

    TriggerLogger.success("UserUtils", "setupExternalIntegrations", userId, {
      integrationsAvailable: integrations.length,
    });
  } catch (error) {
    TriggerLogger.error("UserUtils", "setupExternalIntegrations", userId, error);
  }
}


/**
 * Trigger de mise à jour d'utilisateur (v2)
 */
const onUserUpdate = onDocumentUpdated("users/{userId}", async (event) => {
  const userId = event.params.userId;
  const beforeData = event.data?.before.data() as User;
  const afterData = event.data?.after.data() as User;

  try {
    logger.info(`User updated: ${userId}`, {
      statusChange: beforeData.status !== afterData.status ?
        `${beforeData.status} → ${afterData.status}` : null,
      roleChange: beforeData.role !== afterData.role ?
        `${beforeData.role} → ${afterData.role}` : null,
    });

    const changedFields = getChangedFields(beforeData, afterData);
    if (changedFields.length === 0) {return;}

    // Détection des changements critiques
    const criticalChanges = {
      roleChanged: beforeData.role !== afterData.role,
      departmentChanged: beforeData.tenantId !== afterData.tenantId,
      statusChanged: beforeData.status !== afterData.status,
      emailChanged: beforeData.email !== afterData.email,
     /*  permissionsChanged:
        JSON.stringify(beforeData.permissions || []) !==
        JSON.stringify(afterData.permissions || []), */
    };

    // Exécution des tâches de mise à jour
    const tasks = [];

    if (criticalChanges.roleChanged) {
      tasks.push(handleRoleChange(userId, beforeData.role, afterData.role, afterData));
    }

    if (criticalChanges.departmentChanged) {
      tasks.push(handleDepartmentChange(
          userId, 
          beforeData.tenantId ??"", 
          afterData.tenantId ??"",
          afterData));
    }

    if (criticalChanges.statusChanged) {
      tasks.push(handleUserStatusChange(userId, beforeData.status, afterData.status, afterData));
    }

    if (criticalChanges.emailChanged) {
      tasks.push(handleEmailChange(userId, beforeData.email, afterData.email, afterData));
    }

   /*  if (criticalChanges.permissionsChanged) {
      tasks.push(handlePermissionsChange(userId, beforeData.permissions, afterData.permissions));
    } */

    if (Object.values(criticalChanges).some(Boolean)) {
      tasks.push(mlService.updateUserProfile(userId, afterData));
    }

    await Promise.allSettled(tasks);

    if (Object.values(criticalChanges).some(Boolean)) {
      await createAuditLog("user_updated", userId, {
        changedFields,
        criticalChanges,
      });
    }

    logger.log("User update completed successfully", {userId});
  } catch (error) {
    logger.error("User update failed", error);
    await createAuditLog("user_create_error", userId, {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : String(error),
    });
    throw error;
  }
});

/**
 * Gérer les changements de département
 */
async function handleDepartmentChange(
  userId: string,
  oldDepartment: string,
  newDepartment: string,
  _userData: any): Promise<void> {
  try {
    TriggerLogger.info("UserUtils", "handleDepartmentChange", userId, {oldDepartment, newDepartment});

    // Retirer des anciens groupes de département
    if (oldDepartment) {
      await collections.groups.doc(`dept_${oldDepartment.toLowerCase()}`).update({
        members: FieldValue.arrayRemove(userId),
        lastUpdated: new Date(),
      });
    }

    // Ajouter aux nouveaux groupes de département
    if (newDepartment) {
      await collections.groups.doc(`dept_${newDepartment.toLowerCase()}`).set({
        name: `dept_${newDepartment.toLowerCase()}`,
        members: FieldValue.arrayUnion(userId),
        lastUpdated: new Date(),
      }, {merge: true});
    }

    TriggerLogger.success("UserUtils", "handleDepartmentChange", userId);
  } catch (error) {
    TriggerLogger.error("UserUtils", "handleDepartmentChange", userId, error);
  }
}

/**
 * Gérer les changements de statut utilisateur
 */
async function handleUserStatusChange(
  userId: string,
  oldStatus: UserStatus,
  newStatus: UserStatus,
  _userData: any): Promise<void> {
  try {
    TriggerLogger.info("UserUtils", "handleUserStatusChange", userId, {oldStatus, newStatus});

    let notificationTitle = "";
    let notificationMessage = "";
    let notificationPriority = NotificationPriority.NORMAL;

    switch (newStatus) {
    case UserStatus.ACTIVE:
      notificationTitle = "Compte activé";
      notificationMessage = "Votre compte a été activé avec succès";
      break;
    case UserStatus.SUSPENDED:
      notificationTitle = "Compte suspendu";
      notificationMessage = "Votre compte a été temporairement suspendu";
      notificationPriority = NotificationPriority.HIGH;
      break;
    case UserStatus.INACTIVE:
      notificationTitle = "Compte désactivé";
      notificationMessage = "Votre compte a été désactivé";
      break;
    default:
      return; // Pas de notification pour les autres statuts
    }

    // Envoyer la notification uniquement si le compte est actif
    if (newStatus === UserStatus.ACTIVE) {
      await notificationService.sendNotification({
        userId,
        type: NotificationType.ACCOUNT_STATUS_CHANGED,
        title: notificationTitle,
        message: notificationMessage,
        data: {oldStatus, newStatus, updatedAt: new Date()},
        channels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
        priority: notificationPriority,
      });
    }

    TriggerLogger.success("UserUtils", "handleUserStatusChange", userId);
  } catch (error) {
    TriggerLogger.error("UserUtils", "handleUserStatusChange", userId, error);
  }
}

/**
 * Gérer les changements d'email
 */
async function handleEmailChange(
  userId: string,
  oldEmail: string,
  newEmail: string,
  _userData: any): Promise<void> {
  try {
    TriggerLogger.info("UserUtils", "handleEmailChange", userId, {oldEmail, newEmail});

    // Envoyer notification de confirmation à l'ancien email
    await notificationService.sendNotification({
      userId,
      type: NotificationType.EMAIL_CHANGED,
      title: "Adresse email modifiée",
      message: `Votre adresse email a été changée de ${oldEmail} vers ${newEmail}`,
      data: {oldEmail, newEmail, updatedAt: new Date()},
      channels: [NotificationChannel.EMAIL],
      priority: NotificationPriority.HIGH,
    });

    TriggerLogger.success("UserUtils", "handleEmailChange", userId);
  } catch (error) {
    TriggerLogger.error("UserUtils", "handleEmailChange", userId, error);
  }
}

/**
 * Gérer les changements de permissions
 *//*
async function handlePermissionsChange(userId: string, oldPermissions: any, newPermissions: any): Promise<void> {
  try {
    TriggerLogger.info("UserUtils", "handlePermissionsChange", userId);

    // Calculer les permissions ajoutées et supprimées
    const addedPermissions = Object.keys(newPermissions || {}).filter(
      (perm) => newPermissions[perm] && !oldPermissions?.[perm]
    );
    const removedPermissions = Object.keys(oldPermissions || {}).filter(
      (perm) => oldPermissions[perm] && !newPermissions?.[perm]
    );

    if (addedPermissions.length > 0 || removedPermissions.length > 0) {
      await notificationService.sendNotification({
        userId,
        type: NotificationType.PERMISSIONS_CHANGED,
        title: "Vos permissions ont été modifiées",
        message: "Vos autorisations d'accès ont été mises à jour",
        data: {addedPermissions, removedPermissions, updatedAt: new Date()},
        channels: [NotificationChannel.IN_APP],
        priority: NotificationPriority.NORMAL,
      });
    }

    TriggerLogger.success("UserUtils", "handlePermissionsChange", userId);
  } catch (error) {
    TriggerLogger.error("UserUtils", "handlePermissionsChange", userId, error);
  }
}*/

/**
 * Trigger de suppression d'utilisateur (v2)
 */
const onUserDelete = onDocumentDeleted("users/{userId}", async (event) => {
  const userId = event.params.userId;
  const user = event.data?.data() as User;

  try {
    logger.info(`User deleted: ${userId}`, {
      role: user.role,
      department: user.tenantId,
    });

    // Tâches de nettoyage en parallèle
    await Promise.allSettled([
      anonymizeUserAttendances(userId),
      cleanupUserPersonalData(userId),
      cancelUserInvitations(userId),
      mlService.deleteUserProfile(userId),
      deleteUserPreferences(userId),
      cleanupUserSessions(userId),
    ]);

    // Tâches séquentielles
    await transferUserEvents(userId);
    await removeFromAllGroups(userId);
    await notifyUserDeletion(user);

    await createAuditLog("user_deleted", userId, {
      role: user.role,
      deletedAt: new Date(),
    });

    logger.log("User deletion completed successfully", {userId});
  } catch (error) {
    logger.error("User deletion failed", error);
    await createAuditLog("user_create_error", userId, {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : String(error),
    });
    throw error;
  }
});

/**
 * Anonymiser les données de présence d'un utilisateur (RGPD)
 */
async function anonymizeUserAttendances(userId: string): Promise<void> {
  try {
    const attendances = await collections.attendances
      .where("userId", "==", userId)
      .get();

    const batch = db.batch();
    attendances.docs.forEach((doc) => {
      batch.update(doc.ref, {
        userId: "anonymized",
        userName: "Utilisateur anonymisé",
        userEmail: "anonymized@domain.com",
        anonymizedAt: new Date(),
        originalUserId: userId, // Garder pour les statistiques
      });
    });

    if (attendances.size > 0) {
      await batch.commit();
    }

    TriggerLogger.success("UserUtils", "anonymizeUserAttendances", userId, {
      anonymizedCount: attendances.size,
    });
  } catch (error) {
    TriggerLogger.error("UserUtils", "anonymizeUserAttendances", userId, error);
  }
}

/**
 * Nettoyer les données personnelles d'un utilisateur
 */
async function cleanupUserPersonalData(userId: string): Promise<void> {
  try {
    const cleanupTasks = [
      // Supprimer les préférences
      collections.user_preferences.doc(userId).delete(),

      // Supprimer les données de profil étendues
      collections.user_profiles.doc(userId).delete(),

      // Anonymiser les commentaires et feedbacks
      anonymizeUserFeedbacks(userId),

      // Supprimer les fichiers personnels
      cleanupUserFiles(userId),
    ];

    await Promise.allSettled(cleanupTasks);
    TriggerLogger.success("UserUtils", "cleanupUserPersonalData", userId);
  } catch (error) {
    TriggerLogger.error("UserUtils", "cleanupUserPersonalData", userId, error);
  }
}

/**
 * Anonymiser les feedbacks d'un utilisateur
 */
async function anonymizeUserFeedbacks(userId: string): Promise<void> {
  try {
    const feedbacks = await collections.feedbacks
      .where("userId", "==", userId)
      .get();

    const batch = db.batch();
    feedbacks.docs.forEach((doc) => {
      batch.update(doc.ref, {
        userId: "anonymized",
        userName: "Utilisateur anonymisé",
        userEmail: null,
        anonymizedAt: new Date(),
      });
    });

    if (feedbacks.size > 0) {
      await batch.commit();
    }
  } catch (error) {
    TriggerLogger.error("UserUtils", "anonymizeUserFeedbacks", userId, error);
  }
}

/**
 * Nettoyer les fichiers d'un utilisateur
 */
async function cleanupUserFiles(userId: string): Promise<void> {
  try {
    // Marquer les fichiers pour suppression plutôt que de les supprimer immédiatement
    const userFiles = await collections.user_files
      .where("uploadedBy", "==", userId)
      .get();

    const batch = db.batch();
    userFiles.docs.forEach((doc) => {
      batch.update(doc.ref, {
        markedForDeletion: true,
        deletionScheduledAt: new Date(),
        originalUserId: userId,
      });
    });

    if (userFiles.size > 0) {
      await batch.commit();
    }
  } catch (error) {
    TriggerLogger.error("UserUtils", "cleanupUserFiles", userId, error);
  }
}

/**
 * Annuler les invitations en attente d'un utilisateur
 */
async function cancelUserInvitations(userId: string): Promise<void> {
  try {
    const invitations = await collections.invitations
      .where("userId", "==", userId)
      .where("status", "==", "pending")
      .get();

    const batch = db.batch();
    invitations.docs.forEach((doc) => {
      batch.update(doc.ref, {
        status: "cancelled",
        cancelledAt: new Date(),
        cancelReason: "user_deleted",
      });
    });

    if (invitations.size > 0) {
      await batch.commit();
    }

    TriggerLogger.success("UserUtils", "cancelUserInvitations", userId, {
      cancelledCount: invitations.size,
    });
  } catch (error) {
    TriggerLogger.error("UserUtils", "cancelUserInvitations", userId, error);
  }
}

/**
 * Supprimer les préférences utilisateur
 */
async function deleteUserPreferences(userId: string): Promise<void> {
  try {
    await collections.user_preferences.doc(userId).delete();
    TriggerLogger.success("UserUtils", "deleteUserPreferences", userId);
  } catch (error) {
    TriggerLogger.error("UserUtils", "deleteUserPreferences", userId, error);
  }
}

/**
 * Nettoyer les sessions actives d'un utilisateur
 */
async function cleanupUserSessions(userId: string): Promise<void> {
  try {
    const sessions = await collections.user_sessions
      .where("userId", "==", userId)
      .get();

    const batch = db.batch();
    sessions.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    if (sessions.size > 0) {
      await batch.commit();
    }

    TriggerLogger.success("UserUtils", "cleanupUserSessions", userId, {
      deletedSessions: sessions.size,
    });
  } catch (error) {
    TriggerLogger.error("UserUtils", "cleanupUserSessions", userId, error);
  }
}

/**
 * Transférer la propriété des événements d'un utilisateur
 */
async function transferUserEvents(userId: string): Promise<void> {
  try {
    const userEvents = await collections.events
      .where("organizerId", "==", userId)
      .get();

    if (userEvents.empty) {return;}

    // Trouver un administrateur pour transférer la propriété
    const admins = await collections.users
      .where("role", "in", [UserRole.ADMIN, UserRole.SUPER_ADMIN])
      .where("status", "==", UserStatus.ACTIVE)
      .limit(1)
      .get();

    const newOwnerId = admins.empty ? "system" : admins.docs[0].id;

    const batch = db.batch();
    userEvents.docs.forEach((doc) => {
      batch.update(doc.ref, {
        organizerId: newOwnerId,
        originalOrganizerId: userId,
        transferredAt: new Date(),
        transferReason: "original_organizer_deleted",
      });
    });

    await batch.commit();

    TriggerLogger.success("UserUtils", "transferUserEvents", userId, {
      transferredCount: userEvents.size,
      newOwnerId,
    });
  } catch (error) {
    TriggerLogger.error("UserUtils", "transferUserEvents", userId, error);
  }
}

/**
 * Retirer l'utilisateur de tous les groupes
 */
async function removeFromAllGroups(userId: string): Promise<void> {
  try {
    const groups = await collections.groups
      .where("members", "array-contains", userId)
      .get();

    const batch = db.batch();
    groups.docs.forEach((doc) => {
      batch.update(doc.ref, {
        members: FieldValue.arrayRemove(userId),
        lastUpdated: new Date(),
      });
    });

    if (groups.size > 0) {
      await batch.commit();
    }

    TriggerLogger.success("UserUtils", "removeFromAllGroups", userId, {
      removedFromGroups: groups.size,
    });
  } catch (error) {
    TriggerLogger.error("UserUtils", "removeFromAllGroups", userId, error);
  }
}

/**
 * Notifier les administrateurs de la suppression d'un utilisateur
 */
async function notifyUserDeletion(user: any): Promise<void> {
  try {
    const admins = await collections.users
      .where("role", "in", [UserRole.ADMIN, UserRole.SUPER_ADMIN])
      .where("status", "==", UserStatus.ACTIVE)
      .get();

    if (admins.empty) {return;}

    const notificationTasks = admins.docs.map((adminDoc) =>
      notificationService.sendNotification({
        userId: adminDoc.id,
        type: NotificationType.USER_DELETED,
        title: "Utilisateur supprimé",
        message: `L'utilisateur ${user.firstName} ${user.lastName} (${user.role}) a été supprimé du système`,
        data: {
          deletedUserId: user.id,
          deletedUserRole: user.role,
          deletedUserDepartment: user.department,
          deletedAt: new Date(),
        },
        channels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
        priority: NotificationPriority.NORMAL,
      })
    );

    await Promise.allSettled(notificationTasks);
    TriggerLogger.success("UserUtils", "notifyUserDeletion", user.id);
  } catch (error) {
    TriggerLogger.error("UserUtils", "notifyUserDeletion", user.id, error);
  }
}

// =====================================================================
// FONCTIONS UTILITAIRES (adaptées pour v2)
// =====================================================================

async function createDefaultUserPreferences(userId: string, user: User): Promise<void> {
  const defaultPreferences = {
    notifications: {
      email: true,
      push: true,
      quietHours: {enabled: false},
    },
    privacy: {
      shareAttendanceStats: false,
    },
    createdAt: new Date(),
  };

  await collections.user_preferences.doc(userId).set(defaultPreferences);
}

async function handleRoleChange(
  userId: string,
  oldRole: UserRole,
  newRole: UserRole,
  userData: User
): Promise<void> {
  // Mise à jour des groupes
  await updateUserGroups(userId, oldRole, newRole, userData.tenantId);

  // Notification
  await notificationService.sendNotification({
    userId,
    type: NotificationType.ROLE_CHANGED,
    title: "Changement de rôle",
    message: `Votre rôle est maintenant ${newRole}`,
    channels: [NotificationChannel.IN_APP],
  });
}

async function updateUserGroups(
  userId: string,
  oldRole: UserRole,
  newRole: UserRole,
  department?: string
): Promise<void> {
  const roleGroups: Record<UserRole, string[]> = {
    [UserRole.PARTICIPANT]: ["all_users"],
    [UserRole.MANAGER]: ["all_users", "managers"],
    [UserRole.ADMIN]: ["all_users", "managers", "admins"],
    [UserRole.SUPER_ADMIN]: ["all_users", "managers", "admins", "super_admins"],
    [UserRole.ORGANIZER]: ["all_users", "organizers"],
    [UserRole.MODERATOR]: ["all_users", "moderators"],
    [UserRole.VIEWER]: ["all_users", "viewers"],
    [UserRole.GUEST]: ["all_users", "guests"],
    [UserRole.ANALYST]: [],
    [UserRole.CONTRIBUTOR]: [],
  };

  const batch = db.batch();
  const oldGroups = roleGroups[oldRole] || [];
  const newGroups = roleGroups[newRole] || [];

  // Retirer des anciens groupes
  oldGroups
    .filter((group) => !newGroups.includes(group))
    .forEach((group) => {
      batch.update(collections.groups.doc(group), {
        members: FieldValue.arrayRemove(userId),
      });
    });

  // Ajouter aux nouveaux groupes
  newGroups
    .filter((group) => !oldGroups.includes(group))
    .forEach((group) => {
      batch.set(collections.groups.doc(group), {
        members: FieldValue.arrayUnion(userId),
      }, {merge: true});
    });

  // Gestion du département
  if (department) {
    batch.set(collections.groups.doc(`dept_${department}`), {
      members: FieldValue.arrayUnion(userId),
    }, {merge: true});
  }

  await batch.commit();
}

// ... (autres fonctions utilitaires adaptées de la même manière)

export {
  onUserCreate,
  onUserUpdate,
  onUserDelete,
};
