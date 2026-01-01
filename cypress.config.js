const { defineConfig } = require('cypress')

module.exports = defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    supportFile: 'cypress/support/e2e.js',
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    viewportWidth: 1280,
    viewportHeight: 720,
    video: true,
    screenshotOnRunFailure: true,
    defaultCommandTimeout: 10000,
    requestTimeout: 10000,
    responseTimeout: 10000,
    env: {
      // Variables d'environnement pour les tests
      API_URL: 'http://127.0.0.1:5001/attendance-management-syst/europe-west1/api/v1',
      TEST_EMAIL: 'test@test.com',
      TEST_PASSWORD: '123Abc@cbA123',
      TEST_PROJECT_ID: 'qoBPzKDQfGSvunnqXRtt',
      TEST_TENANT_ID: 'gbwIul0foY56kQzItyDd'
    }
  },
  component: {
    devServer: {
      framework: 'next',
      bundler: 'webpack',
    },
    specPattern: 'cypress/component/**/*.cy.{js,jsx,ts,tsx}',
    supportFile: 'cypress/support/component.js'
  }
})