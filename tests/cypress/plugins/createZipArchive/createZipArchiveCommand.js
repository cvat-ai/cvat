// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

Cypress.Commands.add('createZipArchive', function (directoryToArchive, arhivePath, level=9) {
    return cy.task('createZipArchive', {
        directoryToArchive: directoryToArchive,
        arhivePath: arhivePath,
        level: level,
    });
});
