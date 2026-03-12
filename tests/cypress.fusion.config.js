// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

const { defineConfig } = require('cypress');
const baseConfig = require('./cypress.base.config');

module.exports = defineConfig({
    ...baseConfig,
    e2e: {
        ...baseConfig.e2e,
        specPattern: [
            'cypress/e2e/fusion/setup_fusion.js',
            'cypress/e2e/fusion/fusion_viewer.js',
            'cypress/e2e/remove_users_tasks_projects_organizations.js',
        ],
    },
});
