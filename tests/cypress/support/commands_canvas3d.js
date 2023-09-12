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
    cy.get('.cvat-canvas3d-perspective').trigger('mousemove', x, y);
    cy.get('.cvat-canvas3d-perspective').dblclick(x, y);
    cy.wait(1000); // Waiting for a cuboid creation
    cy.get('.cvat-draw-cuboid-popover').should('be.hidden');
});

Cypress.Commands.add('customScreenshot', (element, screenshotName) => {
    cy.get(`${element} canvas`).then(([$el]) => ($el.getBoundingClientRect())).then((rect) => {
        const iframe = window.parent.document
            .querySelector('iframe.aut-iframe');
        const parentRect = iframe.getBoundingClientRect();

        const scale = parentRect.width / iframe.clientWidth;
        cy.screenshot(screenshotName, {
            // tricky way to make screenshots to avoid screen resizing
            // we take a screenshot of the whole screen, including runner and then clip it
            // according to iframe coordinates and scale in the runner
            overwrite: true,
            capture: 'runner',
            scale: false,
            clip: {
                x: parentRect.x + rect.x * scale,
                y: parentRect.y + rect.y * scale,
                width: rect.width * scale,
                height: rect.height * scale,
            },
        });
    });
});
