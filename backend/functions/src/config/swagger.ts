import swaggerJsdoc from 'swagger-jsdoc';
import { SwaggerDefinition } from 'swagger-jsdoc';

const swaggerDefinition: SwaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Attendance Management System API',
    version: '2.0.0',
    description: `
      API complète pour le système de gestion de présence multi-services.
      
      ## Fonctionnalités principales
      - **Authentification JWT** : Système d'authentification sécurisé avec tokens JWT
      - **Gestion des utilisateurs** : CRUD complet avec permissions basées sur les rôles
      - **Gestion des événements** : Création, planification et gestion des événements
      - **Gestion des présences** : Check-in multi-modal (QR, GPS, biométrie, manuel)
      - **Notifications** : Système multi-canal (email, SMS, push)
      - **Rapports** : Génération de rapports avancés avec export
      - **Intelligence Artificielle** : Prédictions et analyses comportementales
      
      ## Authentification
      Cette API utilise l'authentification JWT (JSON Web Tokens). Pour accéder aux endpoints protégés :
      1. Obtenez un token via \`POST /auth/login\`
      2. Incluez le token dans l'header : \`Authorization: Bearer <token>\`
      
      ## Organisation-centrée
      Toutes les données sont isolées par organisation. Chaque utilisateur appartient à une organisation
      et ne peut accéder qu'aux données de son organisation.
      
      ## Codes d'erreur
      - **400** : Données invalides
      - **401** : Non authentifié
      - **403** : Permissions insuffisantes
      - **404** : Ressource non trouvée
      - **409** : Conflit (ex: email déjà utilisé)
      - **429** : Rate limiting dépassé
      - **500** : Erreur serveur
    `,
    contact: {
      name: 'Support API',
      email: 'support@attendance-x.com',
      url: 'https://attendance-x.com/support'
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT'
    }
  },
  servers: [
    {
      url: 'http://localhost:5001/attendance-x/us-central1/api',
      description: 'Serveur de développement local'
    },
    {
      url: 'https://us-central1-attendance-x.cloudfunctions.net/api',
      description: 'Serveur de production'
    }
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Token JWT obtenu via /auth/login'
      }
    },
    schemas: {
      // Schémas de base
      User: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'Identifiant unique de l\'utilisateur'
          },
          email: {
            type: 'string',
            format: 'email',
            description: 'Adresse email de l\'utilisateur'
          },
          firstName: {
            type: 'string',
            description: 'Prénom de l\'utilisateur'
          },
          lastName: {
            type: 'string',
            description: 'Nom de famille de l\'utilisateur'
          },
          role: {
            type: 'string',
            enum: ['user', 'manager', 'admin', 'super_admin'],
            description: 'Rôle de l\'utilisateur dans l\'organisation'
          },
          status: {
            type: 'string',
            enum: ['active', 'inactive', 'suspended'],
            description: 'Statut du compte utilisateur'
          },
          organizationId: {
            type: 'string',
            description: 'Identifiant de l\'organisation'
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
            description: 'Date de création du compte'
          },
          updatedAt: {
            type: 'string',
            format: 'date-time',
            description: 'Date de dernière modification'
          }
        },
        required: ['id', 'email', 'firstName', 'lastName', 'role', 'status', 'organizationId']
      },
      Event: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'Identifiant unique de l\'événement'
          },
          title: {
            type: 'string',
            description: 'Titre de l\'événement'
          },
          description: {
            type: 'string',
            description: 'Description détaillée de l\'événement'
          },
          startTime: {
            type: 'string',
            format: 'date-time',
            description: 'Date et heure de début'
          },
          endTime: {
            type: 'string',
            format: 'date-time',
            description: 'Date et heure de fin'
          },
          location: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              address: { type: 'string' },
              coordinates: {
                type: 'object',
                properties: {
                  latitude: { type: 'number' },
                  longitude: { type: 'number' }
                }
              }
            }
          },
          organizerId: {
            type: 'string',
            description: 'Identifiant de l\'organisateur'
          },
          organizationId: {
            type: 'string',
            description: 'Identifiant de l\'organisation'
          },
          status: {
            type: 'string',
            enum: ['draft', 'published', 'ongoing', 'completed', 'cancelled'],
            description: 'Statut de l\'événement'
          },
          maxParticipants: {
            type: 'number',
            description: 'Nombre maximum de participants'
          },
          requiresCheckIn: {
            type: 'boolean',
            description: 'Si l\'événement nécessite un check-in'
          },
          checkInMethods: {
            type: 'array',
            items: {
              type: 'string',
              enum: ['qr_code', 'geolocation', 'manual', 'biometric']
            },
            description: 'Méthodes de check-in autorisées'
          }
        },
        required: ['id', 'title', 'startTime', 'endTime', 'organizerId', 'organizationId']
      },
      Attendance: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'Identifiant unique de la présence'
          },
          userId: {
            type: 'string',
            description: 'Identifiant de l\'utilisateur'
          },
          eventId: {
            type: 'string',
            description: 'Identifiant de l\'événement'
          },
          status: {
            type: 'string',
            enum: ['present', 'late', 'absent', 'excused'],
            description: 'Statut de présence'
          },
          checkInTime: {
            type: 'string',
            format: 'date-time',
            description: 'Heure de check-in'
          },
          checkInMethod: {
            type: 'string',
            enum: ['qr_code', 'geolocation', 'manual', 'biometric'],
            description: 'Méthode utilisée pour le check-in'
          },
          location: {
            type: 'object',
            properties: {
              latitude: { type: 'number' },
              longitude: { type: 'number' },
              accuracy: { type: 'number' }
            }
          },
          validated: {
            type: 'boolean',
            description: 'Si la présence a été validée par un superviseur'
          },
          validatedBy: {
            type: 'string',
            description: 'Identifiant du superviseur qui a validé'
          },
          validatedAt: {
            type: 'string',
            format: 'date-time',
            description: 'Date de validation'
          }
        },
        required: ['id', 'userId', 'eventId', 'status']
      },
      // Schémas d'authentification
      LoginRequest: {
        type: 'object',
        properties: {
          email: {
            type: 'string',
            format: 'email',
            description: 'Adresse email de l\'utilisateur'
          },
          password: {
            type: 'string',
            minLength: 8,
            description: 'Mot de passe de l\'utilisateur'
          },
          rememberMe: {
            type: 'boolean',
            description: 'Maintenir la session plus longtemps'
          },
          twoFactorCode: {
            type: 'string',
            pattern: '^[0-9]{6}$',
            description: 'Code 2FA si activé'
          }
        },
        required: ['email', 'password']
      },
      LoginResponse: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            description: 'Succès de l\'authentification'
          },
          accessToken: {
            type: 'string',
            description: 'Token JWT d\'accès (24h)'
          },
          refreshToken: {
            type: 'string',
            description: 'Token de rafraîchissement (7j)'
          },
          user: {
            $ref: '#/components/schemas/User'
          },
          expiresIn: {
            type: 'number',
            description: 'Durée de validité du token en secondes'
          }
        }
      },
      RegisterRequest: {
        type: 'object',
        properties: {
          email: {
            type: 'string',
            format: 'email'
          },
          password: {
            type: 'string',
            minLength: 8,
            pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]',
            description: 'Mot de passe fort (min 8 chars, maj, min, chiffre, caractère spécial)'
          },
          firstName: {
            type: 'string',
            minLength: 2
          },
          lastName: {
            type: 'string',
            minLength: 2
          },
          organizationName: {
            type: 'string',
            description: 'Nom de l\'organisation (pour nouveaux utilisateurs)'
          }
        },
        required: ['email', 'password', 'firstName', 'lastName']
      },
      // Schémas de réponse d'erreur
      ErrorResponse: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: false
          },
          error: {
            type: 'object',
            properties: {
              code: {
                type: 'string',
                description: 'Code d\'erreur unique'
              },
              message: {
                type: 'string',
                description: 'Message d\'erreur lisible'
              },
              details: {
                type: 'object',
                description: 'Détails supplémentaires sur l\'erreur'
              }
            }
          },
          timestamp: {
            type: 'string',
            format: 'date-time'
          },
          requestId: {
            type: 'string',
            description: 'Identifiant unique de la requête pour le debugging'
          }
        }
      },
      // Schémas de pagination
      PaginationMeta: {
        type: 'object',
        properties: {
          page: {
            type: 'number',
            description: 'Page actuelle (commence à 1)'
          },
          limit: {
            type: 'number',
            description: 'Nombre d\'éléments par page'
          },
          total: {
            type: 'number',
            description: 'Nombre total d\'éléments'
          },
          totalPages: {
            type: 'number',
            description: 'Nombre total de pages'
          },
          hasNext: {
            type: 'boolean',
            description: 'S\'il y a une page suivante'
          },
          hasPrev: {
            type: 'boolean',
            description: 'S\'il y a une page précédente'
          }
        }
      }
    },
    parameters: {
      PageParam: {
        name: 'page',
        in: 'query',
        description: 'Numéro de page (commence à 1)',
        required: false,
        schema: {
          type: 'integer',
          minimum: 1,
          default: 1
        }
      },
      LimitParam: {
        name: 'limit',
        in: 'query',
        description: 'Nombre d\'éléments par page',
        required: false,
        schema: {
          type: 'integer',
          minimum: 1,
          maximum: 100,
          default: 20
        }
      },
      SortParam: {
        name: 'sort',
        in: 'query',
        description: 'Champ de tri (préfixer par - pour ordre décroissant)',
        required: false,
        schema: {
          type: 'string',
          example: '-createdAt'
        }
      }
    },
    responses: {
      UnauthorizedError: {
        description: 'Token d\'authentification manquant ou invalide',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ErrorResponse'
            },
            example: {
              success: false,
              error: {
                code: 'UNAUTHORIZED',
                message: 'Token d\'authentification requis'
              },
              timestamp: '2024-01-15T10:30:00Z',
              requestId: 'req_123456789'
            }
          }
        }
      },
      ForbiddenError: {
        description: 'Permissions insuffisantes',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ErrorResponse'
            },
            example: {
              success: false,
              error: {
                code: 'FORBIDDEN',
                message: 'Permissions insuffisantes pour cette action'
              },
              timestamp: '2024-01-15T10:30:00Z',
              requestId: 'req_123456789'
            }
          }
        }
      },
      NotFoundError: {
        description: 'Ressource non trouvée',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ErrorResponse'
            }
          }
        }
      },
      ValidationError: {
        description: 'Erreur de validation des données',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ErrorResponse'
            },
            example: {
              success: false,
              error: {
                code: 'VALIDATION_ERROR',
                message: 'Données invalides',
                details: {
                  email: 'Format d\'email invalide',
                  password: 'Le mot de passe doit contenir au moins 8 caractères'
                }
              },
              timestamp: '2024-01-15T10:30:00Z',
              requestId: 'req_123456789'
            }
          }
        }
      },
      RateLimitError: {
        description: 'Limite de taux dépassée',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ErrorResponse'
            },
            example: {
              success: false,
              error: {
                code: 'RATE_LIMIT_EXCEEDED',
                message: 'Trop de requêtes. Réessayez dans 15 minutes.'
              },
              timestamp: '2024-01-15T10:30:00Z',
              requestId: 'req_123456789'
            }
          }
        }
      }
    }
  },
  security: [
    {
      BearerAuth: []
    }
  ],
  tags: [
    {
      name: 'Authentication',
      description: 'Endpoints d\'authentification et gestion des sessions JWT'
    },
    {
      name: 'Users',
      description: 'Gestion des utilisateurs et profils'
    },
    {
      name: 'Events',
      description: 'Gestion des événements et planification'
    },
    {
      name: 'Attendances',
      description: 'Gestion des présences et check-in'
    },
    {
      name: 'Notifications',
      description: 'Système de notifications multi-canal'
    },
    {
      name: 'Reports',
      description: 'Génération et gestion des rapports'
    },
    {
      name: 'ML/AI',
      description: 'Intelligence artificielle et prédictions'
    },
    {
      name: 'System',
      description: 'Endpoints système et monitoring'
    }
  ]
};

const options = {
  definition: swaggerDefinition,
  apis: [
    './src/routes/*.ts',
    './src/controllers/*.ts',
    './src/models/*.ts'
  ]
};

export const swaggerSpec = swaggerJsdoc(options);

// Swagger UI Configuration
export const swaggerUiConfig = {
  customCss: `
    .swagger-ui .topbar { display: none }
    .swagger-ui .info { margin: 50px 0 }
    .swagger-ui .scheme-container { background: #fafafa; padding: 20px; border-radius: 4px; }
  `,
  customSiteTitle: 'AttendanceX API Documentation',
  customfavIcon: '/favicon.ico',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    filter: true,
    tryItOutEnabled: true,
    syntaxHighlight: {
      activate: true,
      theme: 'monokai'
    }
  }
};

export default swaggerSpec;