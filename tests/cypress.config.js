const { defineConfig } = require('cypress');
const baseConfig = require('./cypress.base.config');

module.exports = defineConfig({
    ...baseConfig,
    numTestsKeptInMemory: 30, // reduce because out of memory issues
    e2e: {
        ...baseConfig.e2e,
        specPattern: [
            'cypress/e2e/auth_page.js',
            'cypress/e2e/features/*.js',
            'cypress/e2e/actions_tasks/**/*.js',
            'cypress/e2e/actions_tasks2/**/*.js',
            'cypress/e2e/actions_tasks3/**/*.js',
            'cypress/e2e/actions_objects/**/*.js',
            'cypress/e2e/actions_objects2/**/*.js',
            'cypress/e2e/issues_prs/**/*.js',
            'cypress/e2e/issues_prs2/**/*.js',
            'cypress/e2e/actions_users/**/*.js',
            'cypress/e2e/actions_projects_models/**/*.js',
            'cypress/e2e/remove_users_tasks_projects_organizations.js',
        ],
    },
});
