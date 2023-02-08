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
            'cypress/e2e/canvas3d_functionality/*.js',
            'cypress/e2e/canvas3d_functionality_2/*.js',
            'cypress/e2e/remove_users_tasks_projects_organizations.js',
        ],
    },
});
