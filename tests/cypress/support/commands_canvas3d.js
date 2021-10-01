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
    cy.interactControlButton('draw-cuboid');
    cy.switchLabel(cuboidCreationParams.labelName, 'draw-cuboid');
    cy.get('.cvat-draw-cuboid-popover').find('button').click();
    cy.get('.cvat-canvas3d-perspective')
        .trigger('mousemove', cuboidCreationParams.x, cuboidCreationParams.y)
        .dblclick(cuboidCreationParams.x, cuboidCreationParams.y);
    cy.wait(1000); // Waiting for a cuboid creation
    cy.get('.cvat-draw-cuboid-popover').should('be.hidden');
});

Cypress.Commands.add('customScreenshot', (element, screenshotName) => {
    cy.get(element).find('canvas').then((canvas) => {
        const width = Number(canvas.attr('width'))
        const height = Number(canvas.attr('height'))
        cy.get(element)
            .screenshot(screenshotName, {clip: {x: 20, y: 20, width: width - 50, height: height - 50}});
    });
});
