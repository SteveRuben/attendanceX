import { Router } from "express";
import { authenticate } from "../../middleware/auth";
import { smartRateLimit } from "../../middleware/smartRateLimit";
import { ConnectorController } from "../../controllers/integration/connector.controller";

const router = Router();

// Middleware chain obligatoire
router.use(smartRateLimit);
router.use(authenticate);

// Routes pour la gestion des connecteurs
router.post("/meeting", ConnectorController.createEventMeeting);
router.post("/notifications", ConnectorController.sendEventNotifications);
router.post("/channels", ConnectorController.createEventChannels);
router.post("/reminders", ConnectorController.scheduleEventReminders);

// Routes pour obtenir des informations
router.get("/summary", ConnectorController.getConnectorSummary);
router.get("/test", ConnectorController.testAllConnections);

// Routes spécifiques aux providers
router.get("/slack/:integrationId/channels", ConnectorController.getSlackChannels);
router.get("/teams/:integrationId/events", ConnectorController.getTeamsCalendarEvents);
router.get("/:integrationId/test", ConnectorController.testConnection);

export { router as connectorRoutes };