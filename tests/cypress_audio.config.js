// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

const { defineConfig } = require('cypress');
const baseConfig = require('./cypress.base.config');

module.exports = defineConfig({
    ...baseConfig,
    e2e: {
        ...baseConfig.e2e,
        testIsolation: true,
        supportFile: 'cypress/support/e2e_audio.js',
        specPattern: [
            'cypress/e2e/setup/setup_audio.js',
            'cypress/e2e/auth_page.js',
            'cypress/e2e/audio_workspace/*.js',
            'cypress/e2e/remove_users_tasks_projects_organizations.js',
        ],
    },
});
