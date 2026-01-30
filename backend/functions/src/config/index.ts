// Export de toutes les configurations
import * as firebase from "./firebase";
import * as database from "./database";
import * as attendance from "./attendance";
import * as notification from "./notifications";
import * as report from "./report";
import * as smsProviders from "./sms-provider";
import * as emailProviders from "./email-provider";
import { config as appConfig } from "./environment";
import { SERVER_CONFIG } from "./server.config";
import { securityConfig } from "./security.config";

// Export default avec toutes les configurations
export default {
  firebase,
  database,
  attendance,
  notification,
  report,
  smsProviders,
  emailProviders,
  appConfig,
  serverConfig: SERVER_CONFIG,
  securityConfig,
};

// Export individuel des configurations
export * from "./firebase";
export * from "./database";
export * from "./cors";
export * from "./environment";
export * from "./server.config";
export * from "./security.config";
export {default as attendance} from "./attendance";
export * from "./notifications";
export {default as report} from "./report";
export {default as smsProviders} from "./sms-provider";
export {default as emailProviders} from "./email-provider";

// Export des objets individuels
export {
  initializeFirebase,
  getFirebaseApp,
  getConfiguredFirestore,
  getConfiguredStorage,
  getFirebaseServices,
  checkFirebaseHealth
} from "./firebase";

// Alias for backward compatibility
export { getConfiguredStorage as storage } from "./firebase";

export { config as appConfig } from "./environment";
export { SERVER_CONFIG as serverConfig } from "./server.config";
export { securityConfig, paginationConfig } from "./security.config";
export {collections, databaseConfig, cacheKeys, generateId} from "./database";
/* export {roles as roleDefinitions, permissionsMap, hasPermission} from "./roles"; */
export {
  attendanceMethods,
  attendanceStatuses,
  attendanceConfig,
} from "./attendance";
export {
  notificationChannels,
  notificationTypes,
} from "./notifications";
export {reportTypes, reportFormats, reportConfig} from "./report";
export {
  smsConfig,
  twilioConfig,
  vonageConfig,
  awsSnsConfig,
  customApiConfig,
  smsProviderConfigs,
} from "./sms-provider";
export {
  emailConfig,
  sendgridConfig,
  mailgunConfig,
  sesConfig,
  emailProviderConfigs,
} from "./email-provider";
