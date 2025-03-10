// Copyright (C) 2020-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

Cypress.Commands.add('createZipArchive', (directoryToArchive, archivePath, level = 9) => cy.task('createZipArchive', {
    directoryToArchive,
    archivePath,
    level,
}));
