// Copyright (C) 2020-2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

const { imageGenerator } = require('../plugins/imageGenerator/addPlugin');
const { createZipArchive } = require('../plugins/createZipArchive/addPlugin');
const { compareImages } = require('../plugins/compareImages/addPlugin');
const { unpackZipArchive } = require('../plugins/unpackZipArchive/addPlugin');
const { isFileExist } = require('cy-verify-downloads');
const fs = require('fs');

module.exports = (on, config) => {
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
    on('task', {isFileExist});
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
    return config;
};
