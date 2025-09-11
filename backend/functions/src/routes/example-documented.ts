/**
 * Exemple de route bien documentée pour Swagger
 */

import { Router } from "express";

const router = Router();

/**
 * @swagger
 * /users:
 *   get:
 *     tags: [Users]
 *     summary: Liste des utilisateurs
 *     description: |
 *       Récupère la liste paginée des utilisateurs de l'organisation.
 *       
 *       **Permissions requises:** `read:users`
 *       
 *       **Filtres disponibles:**
 *       - Par rôle
 *       - Par statut
 *       - Par date de création
 *       - Recherche textuelle (nom, email)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *       - $ref: '#/components/parameters/SortParam'
 *       - name: role
 *         in: query
 *         description: Filtrer par rôle
 *         required: false
 *         schema:
 *           type: string
 *           enum: [user, manager, admin]
 *       - name: status
 *         in: query
 *         description: Filtrer par statut
 *         required: false
 *         schema:
 *           type: string
 *           enum: [active, inactive, suspended]
 *       - name: search
 *         in: query
 *         description: Recherche textuelle (nom, email)
 *         required: false
 *         schema:
 *           type: string
 *           minLength: 2
 *           example: "john"
 *     responses:
 *       200:
 *         description: Liste des utilisateurs récupérée avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     users:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/User'
 *                     pagination:
 *                       $ref: '#/components/schemas/PaginationMeta'
 *             examples:
 *               success:
 *                 summary: Réponse réussie
 *                 value:
 *                   success: true
 *                   data:
 *                     users:
 *                       - id: "user_123"
 *                         email: "john.doe@example.com"
 *                         firstName: "John"
 *                         lastName: "Doe"
 *                         role: "user"
 *                         status: "active"
 *                         organizationId: "org_456"
 *                         createdAt: "2024-01-15T10:30:00Z"
 *                         updatedAt: "2024-01-15T10:30:00Z"
 *                     pagination:
 *                       page: 1
 *                       limit: 20
 *                       total: 150
 *                       totalPages: 8
 *                       hasNext: true
 *                       hasPrev: false
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       429:
 *         $ref: '#/components/responses/RateLimitError'
 *   post:
 *     tags: [Users]
 *     summary: Créer un utilisateur
 *     description: |
 *       Crée un nouveau utilisateur dans l'organisation.
 *       
 *       **Permissions requises:** `create:users`
 *       
 *       **Validations:**
 *       - Email unique dans l'organisation
 *       - Mot de passe fort requis
 *       - Rôle valide selon les permissions
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, firstName, lastName, role]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Adresse email unique
 *                 example: "new.user@example.com"
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]'
 *                 description: Mot de passe fort (8+ chars, maj, min, chiffre, spécial)
 *                 example: "SecurePass123!"
 *               firstName:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 50
 *                 example: "Jane"
 *               lastName:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 50
 *                 example: "Smith"
 *               role:
 *                 type: string
 *                 enum: [user, manager, admin]
 *                 description: Rôle de l'utilisateur
 *                 example: "user"
 *               sendWelcomeEmail:
 *                 type: boolean
 *                 description: Envoyer un email de bienvenue
 *                 default: true
 *           examples:
 *             manager:
 *               summary: Créer un manager
 *               value:
 *                 email: "manager@example.com"
 *                 password: "ManagerPass123!"
 *                 firstName: "Alice"
 *                 lastName: "Johnson"
 *                 role: "manager"
 *                 sendWelcomeEmail: true
 *             user:
 *               summary: Créer un utilisateur standard
 *               value:
 *                 email: "user@example.com"
 *                 password: "UserPass123!"
 *                 firstName: "Bob"
 *                 lastName: "Wilson"
 *                 role: "user"
 *                 sendWelcomeEmail: false
 *     responses:
 *       201:
 *         description: Utilisateur créé avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *                     temporaryPassword:
 *                       type: string
 *                       description: Mot de passe temporaire (si généré automatiquement)
 *                 message:
 *                   type: string
 *                   example: "Utilisateur créé avec succès"
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       409:
 *         description: Email déjà utilisé
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               error:
 *                 code: "EMAIL_ALREADY_EXISTS"
 *                 message: "Cette adresse email est déjà utilisée"
 *               timestamp: "2024-01-15T10:30:00Z"
 *               requestId: "req_123456789"
 */

export default router;