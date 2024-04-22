// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) 2022 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

const path = require('path');
const extract = require('extract-zip');

async function unpackZipArchive(args) {
    const { arhivePath, extractPath } = args;
    const absolutePath = path.dirname(path.resolve(arhivePath));
    await extract(arhivePath, { dir: extractPath ? `${absolutePath}/${extractPath}/` : absolutePath });
    return null;
}

exports.unpackZipArchive = unpackZipArchive;
