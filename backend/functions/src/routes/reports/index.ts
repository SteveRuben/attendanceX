/**
 * Index des routes de rapports unifiées
 */
import { Router } from 'express';
import reportRoutes from './report.routes';

const router = Router();

// Routes de rapports unifiées (fusion complète terminée)
router.use('/', reportRoutes);

export default router;