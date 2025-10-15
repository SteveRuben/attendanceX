// backend/functions/src/routes/qrcode.routes.ts - Routes pour la gestion des QR codes

import { Router } from "express";
import { authenticate, requirePermission } from "../../middleware/auth";
import { rateLimit } from "../../middleware/rateLimit";
import { validateBody, validateParams } from "../../middleware/validation";
import { z } from "zod";
import { QRCodeController } from "../../controllers/integration/qrcode.controller";

const router = Router();

// 🔒 Authentification requise pour toutes les routes
router.use(authenticate);

// 🎯 Génération de QR code pour un événement
router.post("/events/:eventId/generate",
  requirePermission("manage_events"),
  rateLimit({
    windowMs: 60 * 1000,
    maxRequests: 10,
  }),
  validateParams(z.object({
    eventId: z.string().min(1, "ID événement requis"),
  })),
  validateBody(z.object({
    expiresAt: z.string().datetime().optional(),
    maxUsage: z.number().int().positive().optional(),
    timeWindow: z.object({
      start: z.string().datetime(),
      end: z.string().datetime(),
    }).optional(),
    locationRadius: z.object({
      center: z.object({
        latitude: z.number(),
        longitude: z.number(),
      }),
      radius: z.number().positive(),
    }).optional(),
    maxScansPerUser: z.number().int().positive().optional(),
  })),
  QRCodeController.generateEventQRCode
);

// 🔍 Validation de QR code
router.post("/validate",
  rateLimit({
    windowMs: 60 * 1000,
    maxRequests: 50,
  }),
  validateBody(z.object({
    qrCodeData: z.string().min(1, "Données QR code requises"),
    location: z.object({
      latitude: z.number(),
      longitude: z.number(),
    }).optional(),
  })),
  QRCodeController.validateQRCode
);

// 🔄 Régénération de QR code
router.post("/events/:eventId/regenerate",
  requirePermission("manage_events"),
  rateLimit({
    windowMs: 60 * 1000,
    maxRequests: 5,
  }),
  validateParams(z.object({
    eventId: z.string().min(1, "ID événement requis"),
  })),
  QRCodeController.regenerateQRCode
);

// ❌ Désactivation de QR code
router.delete("/events/:eventId",
  requirePermission("manage_events"),
  validateParams(z.object({
    eventId: z.string().min(1, "ID événement requis"),
  })),
  QRCodeController.deactivateQRCode
);

// 📊 Statistiques d'usage du QR code
router.get("/events/:eventId/stats",
  requirePermission("view_reports"),
  validateParams(z.object({
    eventId: z.string().min(1, "ID événement requis"),
  })),
  QRCodeController.getQRCodeStats
);

// 📱 Téléchargement du QR code (image)
router.get("/events/:eventId/download",
  requirePermission("manage_events"),
  validateParams(z.object({
    eventId: z.string().min(1, "ID événement requis"),
  })),
  QRCodeController.downloadQRCode
);

export { router as qrCodeRoutes };