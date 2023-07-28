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
        coverage: false,
    },
    e2e: {
        setupNodeEvents(on, config) {
            return plugins(on, config);
        },
        testIsolation: false,
        baseUrl: 'http://localhost:8080',
        specPattern: [
            'cypress/e2e/actions_projects_models/case_104_project_export_3d.js',
            'cypress/e2e/canvas3d_functionality_2/case_56_canvas3d_functionality_basic_actions.js',
            'cypress/e2e/canvas3d_functionality_2/case_62_canvas3d_functionality_views_resize.js',
            'cypress/e2e/canvas3d_functionality_2/case_63_canvas3d_functionality_control_button_mouse_interaction.js',
            'cypress/e2e/canvas3d_functionality_2/case_64_canvas3d_functionality_cuboid.js',
            'cypress/e2e/remove_users_tasks_projects_organizations.js',
        ],
    },
});
