const { defineConfig } = require('cypress');
const plugins = require('./cypress/plugins/index');

module.exports = defineConfig({
    video: false,
    viewportWidth: 1300,
    viewportHeight: 960,
    defaultCommandTimeout: 25000,
    downloadsFolder: 'cypress/fixtures',
    env: {
        user: 'admin',
        email: 'admin@localhost.company',
        password: '12qwaszx',
    },
    e2e: {
        setupNodeEvents(on, config) {
            return plugins(on, config);
        },
        testIsolation: false,
        baseUrl: 'http://localhost:8080',
        specPattern: [
            'cypress/e2e/auth_page.js',
            'cypress/e2e/actions_tasks/*.js',
            'cypress/e2e/actions_tasks2/*.js',
            'cypress/e2e/actions_tasks3/*.js',
            'cypress/e2e/actions_objects/*.js',
            'cypress/e2e/actions_objects2/*.js',
            'cypress/e2e/issues_prs/*.js',
            'cypress/e2e/issues_prs2/*.js',
            'cypress/e2e/actions_projects_models/*.js',
            'cypress/e2e/actions_users/*.js',
            'cypress/e2e/email_system/*.js',
            'cypress/e2e/remove_users_tasks_projects_organizations.js',
        ],
    },
});
