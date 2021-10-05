// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName } from '../../support/const';

context('Check maintenance of popups visibility.', () => {
    const issueId = '2230';

    before(() => {
        cy.openTaskJob(taskName);
    });

    describe(`Testing issue "${issueId}"`, () => {
        it('Open a popover for draw an object and apply the "mouseout" event to it. The popover be visible.', () => {
            cy.interactControlButton('draw-rectangle');
            cy.get('.cvat-draw-rectangle-popover').trigger('mouseout').wait(500);
            cy.get('.cvat-draw-rectangle-popover').should('be.visible');
        });

        it('Click to another element. The popover hidden.', () => {
            cy.get('.cvat-canvas-container').click();
            cy.get('.cvat-draw-rectangle-popover').should('be.hidden');
        });
    });
});
