// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

// eslint-disable-next-line no-use-before-define
exports.unpackZipArchive = unpackZipArchive;

const path = require('path');
const extract = require('extract-zip');

async function unpackZipArchive(args) {
    const { arhivePath } = args;
    const absolutePath = path.dirname(path.resolve(arhivePath));
    try {
        await extract(arhivePath, { dir: absolutePath });
        return null;
    } catch (err) {
        // handle any errors
    }
}
