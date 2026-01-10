/**
 * Index des routes timesheet
 */

import { Router } from 'express';
import { timesheetRoutes } from './timesheet.routes';
import { timeEntryRoutes } from './time-entry.routes';
import { activityCodeRoutes } from './activity-code.routes';
// import { projectRoutes } from './project.routes'; // Temporarily disabled due to conflicts

const router = Router();

// Routes pour les feuilles de temps
router.use('/timesheets', timesheetRoutes);

// Routes pour les entrées de temps
router.use('/time-entries', timeEntryRoutes);

// Routes pour les projets - temporarily disabled
// router.use('/projects', projectRoutes);

// Routes pour les codes d'activité
router.use('/activity-codes', activityCodeRoutes);

export { router as timesheetRoutes };
export * from './timesheet.routes';
export * from './time-entry.routes';
// export * from './project.routes'; // Temporarily disabled due to conflicts
export * from './activity-code.routes';