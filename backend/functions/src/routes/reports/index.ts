/**
 * Index des routes de rapports unifiées
 */
import { Router } from 'express';
// import reportRoutes from './report.routes'; // Temporarily disabled due to conflicts

const router = Router();

// Routes de rapports unifiées (fusion complète terminée)
// router.use('/', reportRoutes); // Temporarily disabled due to conflicts

// Placeholder endpoint for reports
router.get('/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Reports service is available but temporarily disabled due to conflicts',
    timestamp: new Date().toISOString()
  });
});

export default router;