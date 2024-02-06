const { defineConfig } = require('cypress');
const plugins = require('./cypress/plugins/index');

module.exports = defineConfig({
    video: true,
    viewportWidth: 1300,
    viewportHeight: 960,
    defaultCommandTimeout: 25000,
    numTestsKeptInMemory: 30, // reduce because out of memory issues
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
            'cypress/e2e/features/analytics_pipeline.js',
            'cypress/e2e/remove_users_tasks_projects_organizations.js',
        ],
    },
});
