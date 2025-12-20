// backend/functions/src/routes/certificates.routes.ts - Routes pour les certificats

import { Router } from "express";
import { authenticate, requireTenantPermission } from "../../middleware/auth";
import { rateLimit } from "../../middleware/rateLimit";
import { validateBody, validateParams } from "../../middleware/validation";
import { z } from "zod";
import { CertificateController } from "../../controllers/branding/certificate.controller";

const router = Router();

// 🔒 Authentification requise pour toutes les routes
router.use(authenticate);

// 📜 Générer un certificat pour une présence
router.post("/attendance/:attendanceId/generate",
  requireTenantPermission("manage_all_events"),
  rateLimit({
    windowMs: 60 * 1000,
    maxRequests: 10,
  }),
  validateParams(z.object({
    attendanceId: z.string().min(1, "ID présence requis"),
  })),
  CertificateController.generateAttendanceCertificate
);

// 📜 Génération en masse pour un événement
router.post("/events/:eventId/bulk-generate",
  requireTenantPermission("manage_all_events"),
  rateLimit({
    windowMs: 60 * 1000,
    maxRequests: 5,
  }),
  validateParams(z.object({
    eventId: z.string().min(1, "ID événement requis"),
  })),
  CertificateController.bulkGenerateCertificates
);

// ✅ Valider un certificat
router.get("/validate/:certificateId",
  validateParams(z.object({
    certificateId: z.string().min(1, "ID certificat requis"),
  })),
  CertificateController.validateCertificate
);

// 📋 Obtenir les certificats d'un utilisateur
router.get("/user/:userId",
  validateParams(z.object({
    userId: z.string().min(1, "ID utilisateur requis"),
  })),
  CertificateController.getUserCertificates
);

// 📋 Obtenir les certificats d'un événement
router.get("/events/:eventId",
  requireTenantPermission("view_reports"),
  validateParams(z.object({
    eventId: z.string().min(1, "ID événement requis"),
  })),
  CertificateController.getEventCertificates
);

// 📥 Télécharger un certificat
router.get("/:certificateId/download",
  validateParams(z.object({
    certificateId: z.string().min(1, "ID certificat requis"),
  })),
  CertificateController.downloadCertificate
);

// 🎨 Personnaliser un template de certificat
router.post("/templates",
  requireTenantPermission("manage_tenant_settings"),
  validateBody(z.object({
    name: z.string().min(1, "Nom du template requis"),
    description: z.string().optional(),
    layout: z.enum(["portrait", "landscape"]).default("portrait"),
    backgroundColor: z.string().default("#ffffff"),
    primaryColor: z.string().default("#000000"),
    secondaryColor: z.string().default("#666666"),
    fontFamily: z.string().default("Arial"),
    title: z.string().default("Certificate of Attendance"),
    subtitle: z.string().optional(),
    bodyText: z.string().min(1, "Texte du corps requis"),
    footerText: z.string().optional(),
    logoPosition: z.object({
      x: z.number(),
      y: z.number(),
      width: z.number(),
      height: z.number()
    }).optional(),
    signaturePosition: z.object({
      x: z.number(),
      y: z.number(),
      width: z.number(),
      height: z.number()
    }).optional(),
    includeQRCode: z.boolean().default(true),
    qrCodePosition: z.object({
      x: z.number(),
      y: z.number(),
      size: z.number()
    }).optional(),
    isDefault: z.boolean().default(false)
  })),
  CertificateController.createCertificateTemplate
);

// 📋 Obtenir les templates de certificats
router.get("/templates",
  requireTenantPermission("manage_tenant_settings"),
  CertificateController.getCertificateTemplates
);

// 🎨 Mettre à jour un template
router.put("/templates/:templateId",
  requireTenantPermission("manage_tenant_settings"),
  validateParams(z.object({
    templateId: z.string().min(1, "ID template requis"),
  })),
  CertificateController.updateCertificateTemplate
);

// 🗑️ Supprimer un template
router.delete("/templates/:templateId",
  requireTenantPermission("manage_tenant_settings"),
  validateParams(z.object({
    templateId: z.string().min(1, "ID template requis"),
  })),
  CertificateController.deleteCertificateTemplate
);

// 📊 Statistiques des certificats
router.get("/stats/organization",
  requireTenantPermission("view_reports"),
  CertificateController.getCertificateStats
);

export { router as certificateRoutes };