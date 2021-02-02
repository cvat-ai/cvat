// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName } from '../../support/const';

context('Settings. "Player speed" option.', () => {
    const caseId = '50';

    let timeBeforePlay = 0;
    let timeAferPlay = 0;
    let durationUsual = 0;
    let durationFastest = 0;

    before(() => {
        cy.openTaskJob(taskName);
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Get current time interval for chenge of frames.', () => {
            cy.get('.cvat-player-play-button').click();
            timeBeforePlay = Date.now();
            cy.get('.cvat-player-filename-wrapper')
                .should('have.text', 'image_main_task_28.png')
                .then(() => {
                    timeAferPlay = Date.now();
                    durationUsual = timeAferPlay - timeBeforePlay;
                });
        });

        it('Change "Player speed" to "Fastest"', () => {
            cy.openSettings();
            cy.get('.cvat-player-settings-speed').within(() => {
                cy.get('[title="Usual"]').click();
            });
            cy.get('.ant-select-dropdown').not('.ant-select-dropdown-hidden').contains('Fastest').click();
            cy.get('.cvat-player-settings-speed').within(() => {
                cy.get('[title="Fastest"]').should('exist');
            });
            cy.closeSettings();
        });

        it('Go to first frame and get the frame change time.', () => {
            cy.get('.cvat-player-first-button').click();
            cy.get('.cvat-player-play-button').click();
            timeBeforePlay = Date.now();
            cy.get('.cvat-player-filename-wrapper')
                .should('have.text', 'image_main_task_28.png')
                .then(() => {
                    timeAferPlay = Date.now();
                    durationFastest = timeAferPlay - timeBeforePlay;
                    expect(durationUsual).to.be.greaterThan(durationFastest);
                });
        });
    });
});
