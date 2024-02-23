// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) 2023-2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName } from '../../support/const';

context('Rotate all images feature.', () => {
    const caseId = '19';

    function checkDegRotate(deg) {
        cy.get('#cvat_canvas_background').should('have.attr', 'style').and('contain', `rotate(${deg}deg);`);
    }

    function imageRotate(direction = 'anticlockwise', deg) {
        cy.get('.cvat-rotate-canvas-control').click();
        cy.get('.cvat-rotate-canvas-popover').should('be.visible');
        if (direction === 'clockwise') {
            cy.get('.cvat-rotate-canvas-controls-right').should('be.visible').click();
        } else {
            cy.get('.cvat-rotate-canvas-controls-left').should('be.visible').click();
        }
        checkDegRotate(deg);
        cy.get('body').click();
    }

    function checkFrameNum(frameNum) {
        cy.get('.cvat-player-frame-selector').within(() => {
            cy.get('input[role="spinbutton"]').should('have.value', frameNum);
        });
    }

    before(() => {
        cy.openTaskJob(taskName);
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Rotate an image (once clockwise, twice anticlockwise)', () => {
            imageRotate('clockwise', 90);
            imageRotate('anticlockwise', 0);
            imageRotate('anticlockwise', 270);
        });

        it("Go to the next frame. It wasn't rotated.", () => {
            cy.get('.cvat-player-next-button').click();
            checkFrameNum(1);
            checkDegRotate(0);
        });

        it('Go to settings, set "Rotate all images" to true.', () => {
            cy.openSettings();
            cy.get('.cvat-player-settings-rotate-all-checkbox').click();
            cy.closeSettings();
        });

        it('Rotate current frame 180 deg.', () => {
            imageRotate('clockwise', 90);
            imageRotate('clockwise', 180);
        });

        it('Go to the previous and to the next frame. They are also rotated 180 deg.', () => {
            cy.get('.cvat-player-previous-button').click();
            checkFrameNum(0);
            checkDegRotate(180);
            cy.get('.cvat-player-next-button').click();
            checkFrameNum(1);
            checkDegRotate(180);
        });
    });
});
