// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

Cypress.Commands.add('compareImagesAndCheckResult', (baseImage, afterImage, noChangesExpected) => {
    cy.compareImages(baseImage, afterImage).then((diffPercent) => {
        noChangesExpected ? expect(diffPercent).to.be.eq(0) : expect(diffPercent).to.be.gt(0);
    });
});

Cypress.Commands.add('create3DCuboid', (cuboidCreationParams) => {
    cy.get('.cvat-draw-cuboid-control').trigger('mouseover');
    cy.get('.cvat-draw-cuboid-popover-visible').find('[type="search"]').click({ force: true });
    cy.get('.ant-select-dropdown')
        .not('.ant-select-dropdown-hidden')
        .within(() => {
            cy.contains(new RegExp(`^${cuboidCreationParams.labelName}$`)).click();
        });
    cy.get('.cvat-draw-cuboid-popover-visible').find('button').click();
    cy.get('.cvat-canvas3d-perspective')
        .trigger('mousemove', cuboidCreationParams.x, cuboidCreationParams.y)
        .dblclick(cuboidCreationParams.x, cuboidCreationParams.y);
    cy.wait(1000); // Waiting for a cuboid creation
});
