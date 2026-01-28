// Copyright (C) 2020-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

/* eslint-disable
    import/no-extraneous-dependencies,
    security/detect-non-literal-fs-filename,
    no-use-before-define
*/

exports.createZipArchive = createZipArchive;

const archiver = require('archiver');
const fs = require('fs-extra');

function createZipArchive(args) {
    const { directoryToArchive, archivePath } = args;
    const { level } = args;
    const output = fs.createWriteStream(archivePath);
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

    return fs.pathExists(archivePath);
}
