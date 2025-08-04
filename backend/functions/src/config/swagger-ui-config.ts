/**
 * Configuration personnalisée pour Swagger UI
 * Définit l'apparence et le comportement de l'interface de documentation
 */

export const swaggerUiConfig = {
  customCss: `
    /* Masquer la barre supérieure Swagger */
    .swagger-ui .topbar { 
      display: none; 
    }
    
    /* Personnalisation du titre */
    .swagger-ui .info .title { 
      color: #2c3e50; 
      font-size: 2.5rem;
      font-weight: 700;
      margin-bottom: 1rem;
    }
    
    /* Style de la description */
    .swagger-ui .info .description { 
      font-size: 16px; 
      line-height: 1.7; 
      color: #34495e;
      margin-bottom: 2rem;
    }
    
    /* Container des schémas d'authentification */
    .swagger-ui .scheme-container { 
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 20px; 
      border-radius: 8px; 
      margin: 20px 0;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    
    .swagger-ui .scheme-container .auth-btn-wrapper {
      text-align: center;
      margin-top: 15px;
    }
    
    .swagger-ui .scheme-container button {
      background: rgba(255, 255, 255, 0.2);
      border: 1px solid rgba(255, 255, 255, 0.3);
      color: white;
      padding: 10px 20px;
      border-radius: 5px;
      font-weight: 500;
      transition: all 0.3s ease;
    }
    
    .swagger-ui .scheme-container button:hover {
      background: rgba(255, 255, 255, 0.3);
      transform: translateY(-1px);
    }
    
    /* Couleurs des méthodes HTTP */
    .swagger-ui .opblock.opblock-post { 
      border-color: #28a745; 
      background: rgba(40, 167, 69, 0.05);
    }
    
    .swagger-ui .opblock.opblock-post .opblock-summary {
      border-color: #28a745;
    }
    
    .swagger-ui .opblock.opblock-get { 
      border-color: #007bff; 
      background: rgba(0, 123, 255, 0.05);
    }
    
    .swagger-ui .opblock.opblock-get .opblock-summary {
      border-color: #007bff;
    }
    
    .swagger-ui .opblock.opblock-put { 
      border-color: #ffc107; 
      background: rgba(255, 193, 7, 0.05);
    }
    
    .swagger-ui .opblock.opblock-put .opblock-summary {
      border-color: #ffc107;
    }
    
    .swagger-ui .opblock.opblock-delete { 
      border-color: #dc3545; 
      background: rgba(220, 53, 69, 0.05);
    }
    
    .swagger-ui .opblock.opblock-delete .opblock-summary {
      border-color: #dc3545;
    }
    
    /* Style des tags */
    .swagger-ui .opblock-tag {
      font-size: 1.2rem;
      font-weight: 600;
      color: #2c3e50;
      margin: 30px 0 15px 0;
      padding: 10px 0;
      border-bottom: 2px solid #ecf0f1;
    }
    
    /* Amélioration des boutons Try it out */
    .swagger-ui .btn.try-out__btn {
      background: #3498db;
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 4px;
      font-weight: 500;
      transition: all 0.3s ease;
    }
    
    .swagger-ui .btn.try-out__btn:hover {
      background: #2980b9;
      transform: translateY(-1px);
    }
    
    .swagger-ui .btn.execute {
      background: #27ae60;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 4px;
      font-weight: 600;
      transition: all 0.3s ease;
    }
    
    .swagger-ui .btn.execute:hover {
      background: #229954;
      transform: translateY(-1px);
    }
    
    /* Style des réponses */
    .swagger-ui .responses-inner {
      padding: 20px;
      background: #f8f9fa;
      border-radius: 8px;
      margin-top: 15px;
    }
    
    /* Amélioration des modèles */
    .swagger-ui .model-box {
      background: #ffffff;
      border: 1px solid #e9ecef;
      border-radius: 8px;
      padding: 15px;
      margin: 10px 0;
    }
    
    /* Style des paramètres */
    .swagger-ui .parameters-col_description {
      font-size: 14px;
      color: #6c757d;
    }
    
    /* Responsive design */
    @media (max-width: 768px) {
      .swagger-ui .info .title {
        font-size: 2rem;
      }
      
      .swagger-ui .scheme-container {
        padding: 15px;
      }
    }
    
    /* Animation pour les sections qui s'ouvrent */
    .swagger-ui .opblock-body {
      animation: slideDown 0.3s ease-out;
    }
    
    @keyframes slideDown {
      from {
        opacity: 0;
        transform: translateY(-10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    
    /* Style pour les codes d'erreur */
    .swagger-ui .response-col_status {
      font-weight: 600;
    }
    
    .swagger-ui .response-col_status.response-200 {
      color: #28a745;
    }
    
    .swagger-ui .response-col_status.response-400,
    .swagger-ui .response-col_status.response-401,
    .swagger-ui .response-col_status.response-403,
    .swagger-ui .response-col_status.response-404 {
      color: #dc3545;
    }
    
    .swagger-ui .response-col_status.response-429 {
      color: #ffc107;
    }
    
    /* Footer personnalisé */
    .swagger-ui .info::after {
      content: "🚀 Documentation générée automatiquement • Attendance Management System";
      display: block;
      text-align: center;
      margin-top: 40px;
      padding: 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
    }
  `,
  
  customSiteTitle: 'Attendance Management API - Documentation Interactive',
  
  customfavIcon: '/favicon.ico',
  
  swaggerOptions: {
    // Garder l'autorisation entre les sessions
    persistAuthorization: true,
    
    // Afficher la durée des requêtes
    displayRequestDuration: true,
    
    // Expansion par défaut (none, list, full)
    docExpansion: 'none',
    
    // Activer le filtre de recherche
    filter: true,
    
    // Afficher les extensions
    showExtensions: true,
    showCommonExtensions: true,
    
    // Profondeur d'expansion des modèles
    defaultModelsExpandDepth: 2,
    defaultModelExpandDepth: 2,
    
    // Activer "Try it out" par défaut
    tryItOutEnabled: true,
    
    // Validation des requêtes
    requestInterceptor: (request: any) => {
      // Ajouter des headers personnalisés si nécessaire
      request.headers['X-API-Client'] = 'Swagger-UI';
      return request;
    },
    
    // Intercepteur de réponse pour logging
    responseInterceptor: (response: any) => {
      // Logger les réponses pour debugging
      if (process.env.NODE_ENV === 'development') {
        console.log('Swagger UI Response:', {
          status: response.status,
          url: response.url,
          headers: response.headers
        });
      }
      return response;
    },
    
    // Configuration des validateurs
    validatorUrl: null, // Désactiver la validation externe
    
    // URLs des serveurs par défaut
    urls: [
      {
        url: '/swagger.json',
        name: 'API Specification'
      }
    ],
    
    // Configuration de l'authentification
    initOAuth: {
      clientId: 'swagger-ui',
      realm: 'attendance-management',
      appName: 'Attendance Management API',
      scopeSeparator: ' ',
      additionalQueryStringParams: {},
      useBasicAuthenticationWithAccessCodeGrant: false,
      usePkceWithAuthorizationCodeGrant: true
    }
  }
};

export default swaggerUiConfig;