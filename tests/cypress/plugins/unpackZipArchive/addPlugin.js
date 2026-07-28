// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

const path = require('path');
const extract = require('extract-zip');

async function unpackZipArchive(args) {
    const { archivePath, extractPath } = args;
    const absolutePath = path.dirname(path.resolve(archivePath));
    await extract(archivePath, { dir: extractPath ? `${absolutePath}/${extractPath}/` : absolutePath });
    return null;
}

exports.unpackZipArchive = unpackZipArchive;
