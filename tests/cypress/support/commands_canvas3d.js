// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

Cypress.Commands.add('compareImagesAndCheckResult', (baseImage, afterImage, noChangesExpected) => {
    cy.compareImages(baseImage, afterImage).then((diffPercent) => {
        noChangesExpected ? expect(diffPercent).to.be.eq(0) : expect(diffPercent).to.be.gt(0);
    });
});
