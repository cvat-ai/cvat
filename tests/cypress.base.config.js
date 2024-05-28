// Copyright (C) 2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT
const plugins = require('./cypress/plugins/index');

module.exports = {
    video: true,
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
    },
};
