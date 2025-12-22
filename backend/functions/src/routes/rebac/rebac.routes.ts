import { Router } from "express";
import { ParallelRunController } from "../../controllers/rebac/parallel-run.controller";
import { authenticate, requirePermission } from "../../middleware/auth";
import { asyncHandler } from "../../middleware/errorHandler";

const router = Router();

router.get(
  "/parallel-run/stats",
  authenticate,
  requirePermission("view_rebac_parallel_stats"),
  asyncHandler((req, res) => ParallelRunController.getStats(req, res))
);

export const rebacRoutes = router;
