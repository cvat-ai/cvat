// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

// eslint-disable-next-line no-undef
exports.createZipArchive = createZipArchive;

const archiver = require('archiver');
const fs = require('fs-extra');

function createZipArchive(args) {
    const directoryToArchive = args.directoryToArchive;
    const output = fs.createWriteStream(args.arhivePath);
    const archive = archiver('zip', {
        gzip: true,
        zlib: { level: 9 },
    });

    archive.on('error', function (err) {
        throw err;
    });

    archive.pipe(output);

    archive.directory(`${directoryToArchive}/`, false);
    archive.finalize();

    return fs.pathExists(archive);
}
