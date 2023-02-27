// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) 2022-2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/* eslint-disable cypress/no-unnecessary-waiting */

/// <reference types="cypress" />

Cypress.Commands.add('compareImagesAndCheckResult', (baseImage, afterImage, noChangesExpected) => {
    cy.compareImages(baseImage, afterImage).then((diffPercent) => {
        if (noChangesExpected) {
            expect(diffPercent).to.be.lt(0.02);
        } else {
            expect(diffPercent).to.be.gt(0);
        }
    });
});

Cypress.Commands.add('create3DCuboid', (cuboidCreationParams) => {
    const {
        x, y, labelName, objectType,
    } = cuboidCreationParams;
    cy.interactControlButton('draw-cuboid');
    cy.switchLabel(labelName, 'draw-cuboid');
    cy.get('.cvat-draw-cuboid-popover').contains(objectType).click();
    cy.get('.cvat-canvas3d-perspective')
        .trigger('mousemove', x, y)
        .dblclick(x, y);
    cy.wait(1000); // Waiting for a cuboid creation
    cy.get('.cvat-draw-cuboid-popover').should('be.hidden');
});

Cypress.Commands.add('customScreenshot', (element, screenshotName) => {
    cy.get(`${element} canvas`).then(([$el]) => ($el.getBoundingClientRect())).then((rect) => {
        cy.screenshot(screenshotName, {
            overwrite: true,
            capture: 'fullPage',
            clip: {
                x: rect.x, y: rect.y, width: rect.width, height: rect.height,
            },
        });
    });
});
