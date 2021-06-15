// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

Cypress.Commands.add('compareImagesAndCheckResult', (baseImage, afterImage) => {
    cy.compareImages(baseImage, afterImage).then((diffPercent) => {
        expect(diffPercent).to.be.gt(0);
    });
});
