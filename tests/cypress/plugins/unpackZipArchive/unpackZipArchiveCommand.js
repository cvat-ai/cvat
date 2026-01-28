// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

Cypress.Commands.add('unpackZipArchive', (archivePath, extractPath) => cy.task('unpackZipArchive', {
    archivePath,
    extractPath,
}));
