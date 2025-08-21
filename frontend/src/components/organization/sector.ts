import { OrganizationSector, type OrganizationTemplate } from "@attendance-x/shared";

export const DEFAULT_TEMPLATES: Record<OrganizationSector, OrganizationTemplate[]> = {
    [OrganizationSector.SERVICES]: [
        {
            id: 'services-basic',
            name: 'Configuration de base',
            description: 'Configuration simple pour les entreprises de services',
            sector: OrganizationSector.SERVICES,
            features: {
                appointments: true,
                attendance: true,
                events: true
            },
            branding: {
                primaryColor: '#3B82F6',
                secondaryColor: '#EF4444'
            },
            settings: {
                notifications: {
                    emailEnabled: true,
                    smsEnabled: false,
                    pushEnabled: false,
                    digestFrequency: "daily"
                },
                security: {
                    requireTwoFactor: false,
                    passwordPolicy: {
                        minLength: 8,
                        requireUppercase: false,
                        requireLowercase: false,
                        requireNumbers: true,
                        requireSymbols: false
                    },
                    sessionTimeout: 0
                }
            },
            preview: {
                features: ['Gestion des rendez-vous', 'Suivi de présence', 'Gestion clients', 'Événements'],
                benefits: ['Interface simple', 'Démarrage rapide', 'Fonctionnalités essentielles']
            }
        },
        {
            id: 'services-advanced',
            name: 'Configuration avancée',
            description: 'Configuration complète avec toutes les fonctionnalités',
            sector: OrganizationSector.SERVICES,
            features: {
                appointments: true,
                attendance: true,
                events: true
            },
            branding: {
                primaryColor: '#059669',
                secondaryColor: '#DC2626'
            },
            settings: {
                notifications: {
                    emailEnabled: true,
                    smsEnabled: true,
                    pushEnabled: false,
                    digestFrequency: "daily"
                },
                security: {
                    requireTwoFactor: true,
                    passwordPolicy: {
                        minLength: 12,
                        requireUppercase: true,
                        requireLowercase: true,
                        requireNumbers: true,
                        requireSymbols: true
                    },
                    sessionTimeout: 0
                }
            },
            preview: {
                features: ['Toutes les fonctionnalités', 'Ventes et produits', 'Notifications SMS', 'Sécurité renforcée'],
                benefits: ['Solution complète', 'Évolutivité maximale', 'Sécurité avancée']
            }
        }
    ],
    [OrganizationSector.HOSPITALITY]: [{
        id: 'services-basic',
        name: 'Configuration de base',
        description: 'Configuration simple pour les entreprises de services',
        sector: OrganizationSector.SERVICES,
        features: {
            appointments: true,
            attendance: true,
            events: true
        },
        branding: {
            primaryColor: '#3B82F6',
            secondaryColor: '#EF4444'
        },
        settings: {
            notifications: {
                emailEnabled: true,
                smsEnabled: false,
                pushEnabled: false,
                digestFrequency: "daily"
            },
            security: {
                requireTwoFactor: false,
                passwordPolicy: {
                    minLength: 8,
                    requireSymbols: false,
                    requireNumbers: true,
                    requireUppercase: false,
                    requireLowercase: false
                },
                sessionTimeout: 0
            }
        },
        preview: {
            features: ['Gestion des rendez-vous', 'Suivi de présence', 'Gestion clients', 'Événements'],
            benefits: ['Interface simple', 'Démarrage rapide', 'Fonctionnalités essentielles']
        }
    },
    {
        id: 'services-advanced',
        name: 'Configuration avancée',
        description: 'Configuration complète avec toutes les fonctionnalités',
        sector: OrganizationSector.SERVICES,
        features: {
            appointments: true,
            attendance: true,
            events: true
        },
        branding: {
            primaryColor: '#059669',
            secondaryColor: '#DC2626'
        },
        settings: {
            notifications: {
                emailEnabled: true,
                smsEnabled: true,
                pushEnabled: false,
                digestFrequency: "daily"
            },
            security: {
                requireTwoFactor: true,
                passwordPolicy: {
                    minLength: 12,
                    requireSymbols: true,
                    requireNumbers: true,
                    requireUppercase: false,
                    requireLowercase: false
                },
                sessionTimeout: 0
            }
        },
        preview: {
            features: ['Toutes les fonctionnalités', 'Ventes et produits', 'Notifications SMS', 'Sécurité renforcée'],
            benefits: ['Solution complète', 'Évolutivité maximale', 'Sécurité avancée']
        }
    }
    ],

    [OrganizationSector.HEALTHCARE]: [
        {
            id: 'healthcare-clinic',
            name: 'Clinique médicale',
            description: 'Configuration sécurisée pour les établissements de santé',
            sector: OrganizationSector.HEALTHCARE,
            features: {
                appointments: true,
                attendance: true,
                events: false
            },
            branding: {
                primaryColor: '#10B981',
                secondaryColor: '#3B82F6'
            },
            settings: {
                notifications: {
                    emailEnabled: true,
                    smsEnabled: true,
                    pushEnabled: false,
                    digestFrequency: "daily"
                },
                security: {
                    requireTwoFactor: true,
                    passwordPolicy: {
                        minLength: 12,
                        requireSymbols: true,
                        requireNumbers: true,
                        requireUppercase: false,
                        requireLowercase: false
                    },
                    sessionTimeout: 0
                }
            },
            preview: {
                features: ['Rendez-vous médicaux', 'Dossiers patients', 'Sécurité RGPD', 'Rappels automatiques'],
                benefits: ['Conformité réglementaire', 'Sécurité maximale', 'Gestion des patients']
            }
        }
    ],
    [OrganizationSector.EDUCATION]: [
        {
            id: 'education-school',
            name: 'Établissement scolaire',
            description: 'Configuration pour écoles et centres de formation',
            sector: OrganizationSector.EDUCATION,
            features: {
                appointments: false,
                attendance: true,
                events: true
            },
            branding: {
                primaryColor: '#7C3AED',
                secondaryColor: '#F59E0B'
            },
            settings: {
                notifications: {
                    emailEnabled: true,
                    smsEnabled: false,
                    pushEnabled: false,
                    digestFrequency: "daily"
                },
                security: {
                    requireTwoFactor: false,
                    passwordPolicy: {
                        minLength: 8,
                        requireSymbols: false,
                        requireNumbers: true,
                        requireUppercase: false,
                        requireLowercase: false
                    },
                    sessionTimeout: 0
                }
            },
            preview: {
                features: ['Suivi de présence', 'Gestion des événements', 'Communication parents', 'Rapports académiques'],
                benefits: ['Suivi pédagogique', 'Communication facilitée', 'Rapports détaillés']
            }
        }
    ],
    [OrganizationSector.RETAIL]: [
        {
            id: 'retail-store',
            name: 'Commerce de détail',
            description: 'Configuration pour magasins et boutiques',
            sector: OrganizationSector.RETAIL,
            features: {
                appointments: false,
                attendance: true,
                events: true
            },
            branding: {
                primaryColor: '#F59E0B',
                secondaryColor: '#EF4444'
            },
            settings: {
                notifications: {
                    emailEnabled: true,
                    smsEnabled: true,
                    pushEnabled: false,
                    digestFrequency: "daily"
                },
                security: {
                    requireTwoFactor: false,
                    passwordPolicy: {
                        minLength: 8,
                        requireSymbols: false,
                        requireNumbers: true,
                        requireUppercase: false,
                        requireLowercase: false
                    },
                    sessionTimeout: 0
                }
            },
            preview: {
                features: ['Gestion des ventes', 'Inventaire produits', 'Fidélité client', 'Événements promotionnels'],
                benefits: ['Suivi des ventes', 'Gestion des stocks', 'Marketing ciblé']
            }
        }
    ],
    [OrganizationSector.CONSULTING]: [
        {
            id: 'consulting-firm',
            name: 'Cabinet de conseil',
            description: 'Configuration pour consultants et cabinets',
            sector: OrganizationSector.CONSULTING,
            features: {
                appointments: true,
                attendance: true,
                events: true
            },
            branding: {
                primaryColor: '#374151',
                secondaryColor: '#6B7280'
            },
            settings: {
                notifications: {
                    emailEnabled: true,
                    smsEnabled: false,
                    pushEnabled: false,
                    digestFrequency: "daily"
                },
                security: {
                    requireTwoFactor: true,
                    passwordPolicy: {
                        minLength: 12,
                        requireSymbols: true,
                        requireNumbers: true,
                        requireUppercase: false,
                        requireLowercase: false
                    },
                    sessionTimeout: 0
                }
            },
            preview: {
                features: ['Rendez-vous clients', 'Suivi des projets', 'Gestion d\'équipe', 'Événements professionnels'],
                benefits: ['Professionnalisme', 'Sécurité des données', 'Collaboration d\'équipe']
            }
        }
    ],
    [OrganizationSector.ASSOCIATION]: [
        {
            id: 'association-nonprofit',
            name: 'Association',
            description: 'Configuration pour associations et organisations à but non lucratif',
            sector: OrganizationSector.ASSOCIATION,
            features: {
                appointments: false,
                attendance: true,
                events: true
            },
            branding: {
                primaryColor: '#059669',
                secondaryColor: '#DC2626'
            },
            settings: {

                notifications: {
                    emailEnabled: true,
                    smsEnabled: false,
                    pushEnabled: false,
                    digestFrequency: "daily"
                },
                security: {
                    requireTwoFactor: false,
                    passwordPolicy: {
                        minLength: 8,
                        requireSymbols: false,
                        requireNumbers: true,
                        requireUppercase: false,
                        requireLowercase: false
                    },
                    sessionTimeout: 0
                }
            },
            preview: {
                features: ['Gestion des membres', 'Événements associatifs', 'Communication', 'Bénévolat'],
                benefits: ['Gestion communautaire', 'Événements simplifiés', 'Communication efficace']
            }
        }
    ],
    [OrganizationSector.OTHER]: [
        {
            id: 'other-basic',
            name: 'Configuration personnalisée',
            description: 'Configuration de base adaptable à votre secteur',
            sector: OrganizationSector.OTHER,
            features: {
                appointments: true,
                attendance: true,
                events: true
            },
            branding: {
                primaryColor: '#6B7280',
                secondaryColor: '#374151'
            }, settings: {

                notifications: {
                    emailEnabled: true,
                    smsEnabled: false,
                    pushEnabled: false,
                    digestFrequency: "daily"
                },
                security: {
                    requireTwoFactor: false,
                    passwordPolicy: {
                        minLength: 8,
                        requireSymbols: false,
                        requireNumbers: true,
                        requireUppercase: false,
                        requireLowercase: false
                    },
                    sessionTimeout: 0
                }
            },
            preview: {
                features: ['Fonctionnalités de base', 'Personnalisation complète', 'Évolutivité', 'Support dédié'],
                benefits: ['Flexibilité maximale', 'Adaptation sur mesure', 'Évolution possible']
            }
        }
    ],
    [OrganizationSector.CORPORATE]: [
        {
            id: 'services-basic',
            name: 'Configuration de base',
            description: 'Configuration simple pour les entreprises de services',
            sector: OrganizationSector.SERVICES,
            features: {
                appointments: true,
                attendance: true,
                events: true
            },
            branding: {
                primaryColor: '#3B82F6',
                secondaryColor: '#EF4444'
            }, settings: {

                notifications: {
                    emailEnabled: true,
                    smsEnabled: false,
                    pushEnabled: false,
                    digestFrequency: "daily"
                },
                security: {
                    requireTwoFactor: false,
                    passwordPolicy: {
                        minLength: 8,
                        requireSymbols: false,
                        requireNumbers: true,
                        requireUppercase: false,
                        requireLowercase: false
                    },
                    sessionTimeout: 0
                }
            },
            preview: {
                features: ['Gestion des rendez-vous', 'Suivi de présence', 'Gestion clients', 'Événements'],
                benefits: ['Interface simple', 'Démarrage rapide', 'Fonctionnalités essentielles']
            }
        },
        {
            id: 'services-advanced',
            name: 'Configuration avancée',
            description: 'Configuration complète avec toutes les fonctionnalités',
            sector: OrganizationSector.SERVICES, features: {
                appointments: true,
                attendance: true,
                events: true
            },
            branding: {
                primaryColor: '#059669',
                secondaryColor: '#DC2626'
            },
            settings: {

                notifications: {
                    emailEnabled: true,
                    smsEnabled: true,
                    pushEnabled: false,
                    digestFrequency: "daily"
                },
                security: {
                    requireTwoFactor: true,
                    passwordPolicy: {
                        minLength: 12,
                        requireSymbols: true,
                        requireNumbers: true,
                        requireUppercase: false,
                        requireLowercase: false
                    },
                    sessionTimeout: 0
                }
            },
            preview: {
                features: ['Toutes les fonctionnalités', 'Ventes et produits', 'Notifications SMS', 'Sécurité renforcée'],
                benefits: ['Solution complète', 'Évolutivité maximale', 'Sécurité avancée']
            }
        }
    ],
    [OrganizationSector.GOVERNMENT]: [
        {
            id: 'services-basic',
            name: 'Configuration de base',
            description: 'Configuration simple pour les entreprises de services',
            sector: OrganizationSector.SERVICES,
            features: {
                appointments: true,
                attendance: true,
                events: true
            },
            branding: {
                primaryColor: '#3B82F6',
                secondaryColor: '#EF4444'
            },
            settings: {
                notifications: {
                    emailEnabled: true,
                    smsEnabled: false,
                    pushEnabled: false,
                    digestFrequency: "daily"
                },
                security: {
                    requireTwoFactor: false,
                    passwordPolicy: {
                        minLength: 8,
                        requireSymbols: false,
                        requireNumbers: true,
                        requireUppercase: false,
                        requireLowercase: false
                    },
                    sessionTimeout: 0
                }
            },
            preview: {
                features: ['Gestion des rendez-vous', 'Suivi de présence', 'Gestion clients', 'Événements'],
                benefits: ['Interface simple', 'Démarrage rapide', 'Fonctionnalités essentielles']
            }
        },
        {
            id: 'services-advanced',
            name: 'Configuration avancée',
            description: 'Configuration complète avec toutes les fonctionnalités',
            sector: OrganizationSector.SERVICES, features: {
                appointments: true,
                attendance: true,
                events: true
            },
            branding: {
                primaryColor: '#059669',
                secondaryColor: '#DC2626'
            },
            settings: {

                notifications: {
                    emailEnabled: true,
                    smsEnabled: true,
                    pushEnabled: false,
                    digestFrequency: "daily"
                },
                security: {
                    requireTwoFactor: true,
                    passwordPolicy: {
                        minLength: 12,
                        requireSymbols: true,
                        requireNumbers: true,
                        requireUppercase: false,
                        requireLowercase: false
                    },
                    sessionTimeout: 0
                }
            },
            preview: {
                features: ['Toutes les fonctionnalités', 'Ventes et produits', 'Notifications SMS', 'Sécurité renforcée'],
                benefits: ['Solution complète', 'Évolutivité maximale', 'Sécurité avancée']
            }
        }
    ],
    [OrganizationSector.NON_PROFIT]: [
        {
            id: 'services-basic',
            name: 'Configuration de base',
            description: 'Configuration simple pour les entreprises de services',
            sector: OrganizationSector.SERVICES, features: {
                appointments: true,
                attendance: true,
                events: true
            },
            branding: {
                primaryColor: '#3B82F6',
                secondaryColor: '#EF4444'
            },
            settings: {
                notifications: {
                    emailEnabled: true,
                    smsEnabled: false,
                    pushEnabled: false,
                    digestFrequency: "daily"
                },
                security: {
                    requireTwoFactor: false,
                    passwordPolicy: {
                        minLength: 8,
                        requireSymbols: false,
                        requireNumbers: true,
                        requireUppercase: false,
                        requireLowercase: false
                    },
                    sessionTimeout: 0
                }
            },
            preview: {
                features: ['Gestion des rendez-vous', 'Suivi de présence', 'Gestion clients', 'Événements'],
                benefits: ['Interface simple', 'Démarrage rapide', 'Fonctionnalités essentielles']
            }
        },
        {
            id: 'services-advanced',
            name: 'Configuration avancée',
            description: 'Configuration complète avec toutes les fonctionnalités',
            sector: OrganizationSector.SERVICES, features: {
                appointments: true,
                attendance: true,
                events: true
            },
            branding: {
                primaryColor: '#059669',
                secondaryColor: '#DC2626'
            },
            settings: {

                notifications: {
                    emailEnabled: true,
                    smsEnabled: true,
                    pushEnabled: false,
                    digestFrequency: "daily"
                },
                security: {
                    requireTwoFactor: true,
                    passwordPolicy: {
                        minLength: 12,
                        requireSymbols: true,
                        requireNumbers: true,
                        requireUppercase: false,
                        requireLowercase: false
                    },
                    sessionTimeout: 0
                }
            },
            preview: {
                features: ['Toutes les fonctionnalités', 'Ventes et produits', 'Notifications SMS', 'Sécurité renforcée'],
                benefits: ['Solution complète', 'Évolutivité maximale', 'Sécurité avancée']
            }
        }
    ],
    [OrganizationSector.TECHNOLOGY]: [
        {
            id: 'services-basic',
            name: 'Configuration de base',
            description: 'Configuration simple pour les entreprises de services',
            sector: OrganizationSector.SERVICES, features: {
                appointments: true,
                attendance: true,
                events: true
            },
            branding: {
                primaryColor: '#3B82F6',
                secondaryColor: '#EF4444'
            },
            settings: {

                notifications: {
                    emailEnabled: true,
                    smsEnabled: false,
                    pushEnabled: false,
                    digestFrequency: "daily"
                },
                security: {
                    requireTwoFactor: false,
                    passwordPolicy: {
                        minLength: 8,
                        requireSymbols: false,
                        requireNumbers: true,
                        requireUppercase: false,
                        requireLowercase: false
                    },
                    sessionTimeout: 0
                }
            },
            preview: {
                features: ['Gestion des rendez-vous', 'Suivi de présence', 'Gestion clients', 'Événements'],
                benefits: ['Interface simple', 'Démarrage rapide', 'Fonctionnalités essentielles']
            }
        },
        {
            id: 'services-advanced',
            name: 'Configuration avancée',
            description: 'Configuration complète avec toutes les fonctionnalités',
            sector: OrganizationSector.SERVICES,
            features: {
                appointments: true,
                attendance: true,
                events: true
            },
            branding: {
                primaryColor: '#059669',
                secondaryColor: '#DC2626'
            }, settings: {

                notifications: {
                    emailEnabled: true,
                    smsEnabled: true,
                    pushEnabled: false,
                    digestFrequency: "daily"
                },
                security: {
                    requireTwoFactor: true,
                    passwordPolicy: {
                        minLength: 12,
                        requireSymbols: true,
                        requireNumbers: true,
                        requireUppercase: false,
                        requireLowercase: false
                    },
                    sessionTimeout: 0
                }
            },
            preview: {
                features: ['Toutes les fonctionnalités', 'Ventes et produits', 'Notifications SMS', 'Sécurité renforcée'],
                benefits: ['Solution complète', 'Évolutivité maximale', 'Sécurité avancée']
            }
        }
    ],
    [OrganizationSector.FINANCE]: [
        {
            id: 'services-basic',
            name: 'Configuration de base',
            description: 'Configuration simple pour les entreprises de services',
            sector: OrganizationSector.SERVICES,
            features: {
                appointments: true,
                attendance: true,
                events: true
            },
            branding: {
                primaryColor: '#3B82F6',
                secondaryColor: '#EF4444'
            },
            settings: {

                notifications: {
                    emailEnabled: true,
                    smsEnabled: false,
                    pushEnabled: false,
                    digestFrequency: "daily"
                },
                security: {
                    requireTwoFactor: false,
                    passwordPolicy: {
                        minLength: 8,
                        requireSymbols: false,
                        requireNumbers: true,
                        requireUppercase: false,
                        requireLowercase: false
                    },
                    sessionTimeout: 0
                }
            },
            preview: {
                features: ['Gestion des rendez-vous', 'Suivi de présence', 'Gestion clients', 'Événements'],
                benefits: ['Interface simple', 'Démarrage rapide', 'Fonctionnalités essentielles']
            }
        },
        {
            id: 'services-advanced',
            name: 'Configuration avancée',
            description: 'Configuration complète avec toutes les fonctionnalités',
            sector: OrganizationSector.SERVICES,
            features: {
                appointments: true,
                attendance: true,
                events: true
            },
            branding: {
                primaryColor: '#059669',
                secondaryColor: '#DC2626'
            }, settings: {
                notifications: {
                    emailEnabled: true,
                    smsEnabled: true,
                    pushEnabled: false,
                    digestFrequency: "daily"
                },
                security: {
                    requireTwoFactor: true,
                    passwordPolicy: {
                        minLength: 12,
                        requireSymbols: true,
                        requireNumbers: true,
                        requireUppercase: false,
                        requireLowercase: false
                    },
                    sessionTimeout: 0
                }
            },
            preview: {
                features: ['Toutes les fonctionnalités', 'Ventes et produits', 'Notifications SMS', 'Sécurité renforcée'],
                benefits: ['Solution complète', 'Évolutivité maximale', 'Sécurité avancée']
            }
        }
    ],
    [OrganizationSector.MANUFACTURING]: [
        {
            id: 'services-basic',
            name: 'Configuration de base',
            description: 'Configuration simple pour les entreprises de services',
            sector: OrganizationSector.SERVICES,
            features: {
                appointments: true,
                attendance: true,
                events: true
            },
            branding: {
                primaryColor: '#3B82F6',
                secondaryColor: '#EF4444'
            }, settings: {

                notifications: {
                    emailEnabled: true,
                    smsEnabled: false,
                    pushEnabled: false,
                    digestFrequency: "daily"
                },
                security: {
                    requireTwoFactor: false,
                    passwordPolicy: {
                        minLength: 8,
                        requireSymbols: false,
                        requireNumbers: true,
                        requireUppercase: false,
                        requireLowercase: false
                    },
                    sessionTimeout: 0
                }
            },
            preview: {
                features: ['Gestion des rendez-vous', 'Suivi de présence', 'Gestion clients', 'Événements'],
                benefits: ['Interface simple', 'Démarrage rapide', 'Fonctionnalités essentielles']
            }
        },
        {
            id: 'services-advanced',
            name: 'Configuration avancée',
            description: 'Configuration complète avec toutes les fonctionnalités',
            sector: OrganizationSector.SERVICES,
            features: {
                appointments: true,
                attendance: true,
                events: true
            },
            branding: {
                primaryColor: '#059669',
                secondaryColor: '#DC2626'
            }, settings: {

                notifications: {
                    emailEnabled: true,
                    smsEnabled: true,
                    pushEnabled: false,
                    digestFrequency: "daily"
                },
                security: {
                    requireTwoFactor: true,
                    passwordPolicy: {
                        minLength: 12,
                        requireSymbols: true,
                        requireNumbers: true,
                        requireUppercase: false,
                        requireLowercase: false
                    },
                    sessionTimeout: 0
                }
            },
            preview: {
                features: ['Toutes les fonctionnalités', 'Ventes et produits', 'Notifications SMS', 'Sécurité renforcée'],
                benefits: ['Solution complète', 'Évolutivité maximale', 'Sécurité avancée']
            }
        }
    ]
}