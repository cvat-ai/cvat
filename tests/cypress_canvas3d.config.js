const { defineConfig } = require('cypress');
const baseConfig = require('./cypress.base.config');

module.exports = defineConfig({
    ...baseConfig,
    e2e: {
        ...baseConfig.e2e,
        specPattern: [
            'cypress/e2e/auth_page.js',
            'cypress/e2e/canvas3d_functionality/*.js',
            'cypress/e2e/canvas3d_functionality_2/*.js',
            'cypress/e2e/remove_users_tasks_projects_organizations.js',
        ],
    },
});
