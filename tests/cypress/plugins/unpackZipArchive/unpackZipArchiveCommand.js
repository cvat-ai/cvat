// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

Cypress.Commands.add('unpackZipArchive', function (arhivePath) {
    return cy.task('unpackZipArchive', {
        arhivePath: arhivePath,
    });
});
