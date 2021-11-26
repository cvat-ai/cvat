// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

Cypress.Commands.add('unpackZipArchive', (arhivePath) => cy.task('unpackZipArchive', {
    arhivePath,
}));
