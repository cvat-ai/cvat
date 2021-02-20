// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName } from '../../support/const';

context('Check maintanance of popups visibility.', () => {
    const issueId = '2230';

    before(() => {
        cy.openTaskJob(taskName);
    });

    describe(`Testing issue "${issueId}"`, () => {
        it('Open a popover for draw an object and apply "mouseout" event to it. Popover be visible.', () => {
            cy.interactControlButton('draw-rectangle');
            cy.get('.cvat-draw-rectangle-popover-visible').trigger('mouseout').wait(500);
            cy.get('.cvat-draw-rectangle-popover-visible').should('exist');
        });

        it('Click to another element. Popover hidden.', () => {
            cy.get('.cvat-canvas-container').click();
            cy.get('.cvat-draw-rectangle-popover-visible').should('not.exist');
        });
    });
});
