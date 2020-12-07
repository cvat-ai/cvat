// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName } from '../../support/const';

context('Settings "Player step"', () => {
    const caseId = '29';
    const countJumpStep = 3;
    let startStep;

    function changePlayerStep() {
        cy.openSettings();
        cy.get('.cvat-settings-modal').within(() => {
            cy.contains('Player').click();
            cy.get('.cvat-player-settings-step').within(() => {
                cy.get('[role="spinbutton"]').clear().type(countJumpStep);
            });
        });
        cy.closeSettings();
    };

    before(() => {
        cy.openTaskJob(taskName);
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Change player step ', () => {
            changePlayerStep();
            // get and save current step
            cy.get('.cvat-player-frame-selector').within(() => {
                cy.get('[role="spinbutton"]')
                    .should('have.attr', 'aria-valuenow')
                    .then((valueStepNow) => {
                        startStep = Number(valueStepNow);
                    });
            });
        });

        it('Jump to forward frame', () => {
            cy.get('.cvat-player-forward-button').click();
            cy.checkFrameNum(startStep + countJumpStep);
        });

        it('Jump to backward frame', () => {
            cy.get('.cvat-player-backward-button').click();
            cy.checkFrameNum(startStep);
        });
    });
});
