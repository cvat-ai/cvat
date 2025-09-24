// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

// eslint-disable-next-line import/no-unresolved
const reporter = require('allure-cypress/reporter');

const { allureCypress } = reporter;
const plugins = require('./cypress/plugins/index');

const baseUrl = 'http://localhost:8080';
const minioUrl = `http://${baseUrl.includes('3000') ? 'localhost' : 'minio'}:9000`;

module.exports = {
    video: true,
    viewportWidth: 1300,
    viewportHeight: 960,
    defaultCommandTimeout: 25000,
    requestTimeout: 15000,
    downloadsFolder: 'cypress/fixtures',
    env: {
        user: 'admin',
        email: 'admin@localhost.company',
        password: '12qwaszx',
    },
    e2e: {
        setupNodeEvents(on, config) {
            allureCypress(on, config, {
                resultsDir: 'allure-results-e2e',
            });
            return plugins(on, config);
        },
        testIsolation: false,
        baseUrl,
        minioUrl,
    },
};
