// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName } from '../../support/const_canvas3d';

context('Canvas 3D functionality. Camera ray.', () => {
    const caseId = '94';
    const cameraRayControl = '.cvat-camera-ray-control';
    const cameraRayClearIndicator = '.cvat-camera-ray-clear-indicator';
    const contextImage = '.cvat-context-image-wrapper canvas';

    function pickCameraRay() {
        cy.get(cameraRayControl)
            .should('not.have.class', 'cvat-disabled-canvas-control')
            .click();
        cy.get(cameraRayControl).should('have.class', 'cvat-active-canvas-control');
        cy.get(contextImage)
            .should('have.class', 'cvat-context-image-camera-ray-picking')
            .click('center');
        cy.get(cameraRayControl).should('not.have.class', 'cvat-active-canvas-control');
        cy.get(cameraRayClearIndicator).should('have.length', 1);
    }

    before(() => {
        cy.prepareUserSession();
        cy.openTaskJob(taskName);
        cy.get('.cvat-player-first-button').click();
        cy.checkFrameNum(0);
        cy.get(contextImage).should('be.visible');
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Creates, clears, and resets a camera ray when the frame changes.', () => {
            pickCameraRay();

            cy.get(cameraRayControl).click();
            cy.get(cameraRayClearIndicator).should('not.exist');

            pickCameraRay();
            cy.get('.cvat-player-next-button').click();
            cy.checkFrameNum(1);
            cy.get(contextImage).should('be.visible');
            cy.get(cameraRayClearIndicator).should('not.exist');

            cy.get(cameraRayControl)
                .should('have.class', 'cvat-disabled-canvas-control')
                .and('not.have.class', 'cvat-active-canvas-control');
            cy.get('body').type('{shift}b');
            cy.get(cameraRayControl).should('not.have.class', 'cvat-active-canvas-control');
            cy.get(contextImage).should('not.have.class', 'cvat-context-image-camera-ray-picking');

            cy.get('.cvat-player-first-button').click();
            cy.checkFrameNum(0);
        });
    });
});
