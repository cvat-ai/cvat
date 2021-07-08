// Copyright (C) 2020-2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName } from '../../support/const';

context('Settings "Player step"', () => {
    const caseId = '29';
    const countJumpStep = 3;
    let startFrame;

    before(() => {
        cy.openTaskJob(taskName);
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Change player step ', () => {
            cy.openSettings();
            cy.get('.cvat-settings-modal').within(() => {
                cy.contains('Player').click();
                cy.get('.cvat-player-settings-step').within(() => {
                    cy.get('[role="spinbutton"]').clear().type(countJumpStep);
                });
            });
            cy.closeSettings();

            // get and save start frame
            cy.get('.cvat-player-frame-selector').within(() => {
                cy.get('[role="spinbutton"]')
                    .should('have.attr', 'aria-valuenow')
                    .then((valueFrameNow) => {
                        startFrame = Number(valueFrameNow);
                    });
            });
        });

        it('Jump to forward frame via GUI', () => {
            cy.get('.cvat-player-forward-button').click();
            cy.checkFrameNum(startFrame + countJumpStep);
        });

        it('Jump to backward frame via GUI', () => {
            cy.get('.cvat-player-backward-button').click();
            cy.checkFrameNum(startFrame);
        });

        it('Jump to forward frame via shortcuts', () => {
            cy.get('body').type('{v}');
            cy.checkFrameNum(startFrame + countJumpStep);
        });

        it('Jump to backward frame via shortcuts', () => {
            cy.get('body').type('{c}');
            cy.checkFrameNum(startFrame);
        });
    });
});
