// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

// eslint-disable-next-line no-undef
exports.unpackZipArchive = unpackZipArchive;

const extract = require('extract-zip')
const path = require("path");

async function unpackZipArchive(args) {
    const arhivePath = args.arhivePath;
    const absolutePath = path.dirname(path.resolve(arhivePath));
    try {
        await extract(arhivePath, {dir: absolutePath});
    } catch (err) {
        // handle any errors
    }
    return null;
}
