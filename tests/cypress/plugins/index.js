// Copyright (C) 2020-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

/* eslint-disable security/detect-non-literal-fs-filename */

const fs = require('fs');
const fg = require('fast-glob');
// eslint-disable-next-line import/no-extraneous-dependencies
const { isFileExist } = require('cy-verify-downloads');
const { imageGenerator, bufferToImage } = require('./imageGenerator/addPlugin');
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
    on('task', { bufferToImage });
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
    on('task', {
        async findFiles({ pattern }) {
            const files = await fg(pattern, { dot: true });
            return files;
        },
    });
    on('task', {
        async getAuthHeaders() {
            const loginResp = await fetch(`${config.baseUrl}/api/auth/login`, {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                    username: config.env.user,
                    password: config.env.password,
                }),
            });

            const sessionId = loginResp.headers.get('set-cookie').match(/sessionid=[^;]+/)[0];
            const csrfToken = loginResp.headers.get('set-cookie').match(/csrftoken=[^;]+/)[0];

            const cookieHeader = `${sessionId}; ${csrfToken}`;
            return { cookie: cookieHeader, 'x-csrftoken': csrfToken.split('=')[1] };
        },
    });
    on('task', {
        async nodeJSONRequest({ url, options }) {
            const finalUrl = url.startsWith('/') ? `${config.baseUrl}${url}` : url;
            const response = await fetch(finalUrl, {
                ...(options || {}),
                headers: {
                    ...(options && options.headers ? options.headers : {}),
                    'content-type': 'application/json',
                },
                body: options && options.body ? JSON.stringify(options.body) : undefined,
            });

            const text = await response.text();
            const data = text ? JSON.parse(text) : null;
            const result = {
                body: data,
                status: response.status,
                statusText: response.statusText,
                headers: Object.fromEntries(response.headers.entries()),
                url: response.url,
                ok: response.ok,
            };

            if (result.status >= 400) {
                console.log(result);
                throw new Error(`HTTP error ${result.status} on ${result.url}. Status text: ${result.statusText}`);
            }

            return result;
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
