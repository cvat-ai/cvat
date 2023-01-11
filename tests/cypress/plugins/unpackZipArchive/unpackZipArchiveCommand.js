// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) 2022 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

Cypress.Commands.add('unpackZipArchive', (arhivePath, extractPath) => cy.task('unpackZipArchive', {
    arhivePath,
    extractPath,
}));
