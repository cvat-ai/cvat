// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName } from '../../support/const';
import { imageRotate, checkDegRotate } from '../../support/utils.cy';

context('Rotate all images feature.', () => {
    const caseId = '19';

    before(() => {
        cy.prepareUserSession();
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
            cy.checkFrameNum(1);
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
            cy.checkFrameNum(0);
            checkDegRotate(180);
            cy.get('.cvat-player-next-button').click();
            cy.checkFrameNum(1);
            checkDegRotate(180);
        });
    });
});
