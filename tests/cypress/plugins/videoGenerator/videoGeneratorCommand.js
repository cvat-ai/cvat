// Copyright (C) 2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

Cypress.Commands.add('videoGenerator', (images, options, videoOptions) => cy.task('videoGenerator', {
    images,
    options,
    videoOptions,
}));
