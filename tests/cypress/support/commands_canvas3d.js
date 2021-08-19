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
    cy.get('.cvat-draw-cuboid-popover-visible').should(($popover) => {
        expect($popover).to.be.visible;
        expect($popover).not.have.css('pointer-events', 'none');
        expect($popover).not.have.class('ant-popover-hidden');
    });
    cy.get('.cvat-draw-cuboid-popover-visible').find('.ant-select-selection-item').click();
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
    cy.get('.cvat-draw-shape-popover').should(($popover) => {
        expect($popover).to.be.hidden;
        expect($popover).to.have.css('pointer-events', 'none');
        expect($popover).to.have.class('ant-popover-hidden');
    });
});
