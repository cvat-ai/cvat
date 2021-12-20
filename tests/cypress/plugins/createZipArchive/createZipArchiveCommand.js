// Copyright (C) 2020-2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

Cypress.Commands.add('createZipArchive', (directoryToArchive, arhivePath, level = 9) => cy.task('createZipArchive', {
    directoryToArchive,
    arhivePath,
    level,
}));
