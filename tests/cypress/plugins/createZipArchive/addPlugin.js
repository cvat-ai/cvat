// Copyright (C) 2020-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

// eslint-disable-next-line no-use-before-define
exports.createZipArchive = createZipArchive;

const archiver = require('archiver');
// eslint-disable-next-line import/no-extraneous-dependencies
const fs = require('fs-extra');

function createZipArchive(args) {
    const { directoryToArchive } = args;
    const { level } = args;
    const output = fs.createWriteStream(args.arhivePath);
    const archive = archiver('zip', {
        gzip: true,
        zlib: { level },
    });

    archive.on('error', (err) => {
        throw err;
    });

    archive.pipe(output);

    archive.directory(`${directoryToArchive}/`, false);
    archive.finalize();

    return fs.pathExists(archive);
}
