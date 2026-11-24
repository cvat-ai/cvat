// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { labelName, taskName } from '../../support/const_canvas3d';

context('Canvas 3D functionality. Cuboid projection.', () => {
    const caseId = '95';
    const contextImageOverlay = '.cvat-context-image-svg-overlay';
    const cuboidProjection = '.cvat-context-image-cuboid-projection';
    const cuboidCreationParams = {
        objectType: 'Shape',
        labelName,
        x: 480,
        y: 160,
    };

    before(() => {
        cy.prepareUserSession();
        cy.openTaskJob(taskName);
        cy.get('.cvat-player-first-button').click();
        cy.checkFrameNum(0);
        cy.get(contextImageOverlay).should('be.visible');
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Displays a cuboid on a calibrated related image.', () => {
            cy.create3DCuboid(cuboidCreationParams);
            cy.get(cuboidProjection).should('exist').and('be.visible');
        });
    });
});
