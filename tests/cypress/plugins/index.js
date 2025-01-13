// Copyright (C) 2020-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

const fs = require('fs');
// eslint-disable-next-line import/no-extraneous-dependencies
const { isFileExist } = require('cy-verify-downloads');
const { imageGenerator } = require('./imageGenerator/addPlugin');
const { createZipArchive } = require('./createZipArchive/addPlugin');
const { compareImages } = require('./compareImages/addPlugin');
const { unpackZipArchive } = require('./unpackZipArchive/addPlugin');

module.exports = (on, config) => {
    // eslint-disable-next-line import/no-extraneous-dependencies
    require('@cypress/code-coverage/task')(on, config);
    on('task', { imageGenerator });
    on('task', { createZipArchive });
    on('task', { compareImages });
    on('task', { unpackZipArchive });
    on('task', {
        log(message) {
            console.log(message);
            return null;
        },
    });
    on('task', {
        listFiles(folderName) {
            return fs.readdirSync(folderName);
        },
    });
    on('task', { isFileExist });
    // Try to resolve "Cypress failed to make a connection to the Chrome DevTools Protocol"
    // https://github.com/cypress-io/cypress/issues/7450
    on('before:browser:launch', (browser, launchOptions) => {
        if (browser.name === 'chrome') {
            if (browser.isHeadless) {
                launchOptions.args.push('--disable-gpu');
            }
        }
        return launchOptions;
    });
    on('after:spec', (spec, results) => {
        if (results && results.stats.failures === 0 && results.video) {
            fs.unlinkSync(results.video);
        }
    });
    return config;
};
