// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

const path = require('path');
const extract = require('extract-zip');

async function unpackZipArchive(args) {
    const { arhivePath } = args;
    const absolutePath = path.dirname(path.resolve(arhivePath));
    await extract(arhivePath, { dir: absolutePath });
    return null;
}

exports.unpackZipArchive = unpackZipArchive;
