// Export de toutes les configurations
import * as firebase from "./firebase";
import * as app from "./app";
import * as database from "./database";

import * as attendance from "./attendance";
import * as notification from "./notifications";
import * as report from "./report";
import * as smsProviders from "./sms-provider";
import * as emailProviders from "./email-provider";

// Export default avec toutes les configurations
export default {
  firebase,
  app,
  database,
  attendance,
  notification,
  report,
  smsProviders,
  emailProviders,
};

// Export individuel des configurations
export {default as firebase} from "./firebase";
export {default as app} from "./app";
export {default as database} from "./database";
export * from "./cors";
/* export {default as roles} from "./roles"; */
export {default as attendance} from "./attendance";
export * from "./notifications";
export {default as report} from "./report";
export {default as smsProviders} from "./sms-provider";
export {default as emailProviders} from "./email-provider";

// Export des objets individuels
export {db, storage} from "./firebase";
export {appConfig, securityConfig, paginationConfig} from "./app";
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
