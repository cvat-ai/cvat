// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName, imageFileName } from '../../support/const';

context('Settings. "Player speed" option.', () => {
    const caseId = '50';

    let timeBeforePlay = 0;
    let timeAfterPlay = 0;
    let durationSlow = 0;
    let durationFast = 0;
    let durationNormal = 0;

    function changePlayerSpeed(speed) {
        cy.openSettings();
        cy.get('.cvat-player-settings-speed').within(() => {
            cy.get('.cvat-player-settings-speed-select').click();
            cy.wait(300); // Wait for the dropdown menu transition.
        });
        cy.get(`.cvat-player-settings-speed-${speed}`).click();
        cy.get('.cvat-player-settings-speed-select').should('contain.text', speed.replace('x', 'x'));
        cy.closeSettings();
    }

    before(() => {
        cy.openTaskJob(taskName);
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Change "Player speed" to "x0.5" (slow) and measure the speed of changing frames. Go to first frame.', () => {
            changePlayerSpeed('x05');
            cy.get('.cvat-player-play-button').click();
            timeBeforePlay = Date.now();
            cy.log(timeBeforePlay);
            cy.get('.cvat-player-filename-wrapper')
                .should('have.text', `${imageFileName}_28.png`)
                .then(() => {
                    timeAfterPlay = Date.now();
                    durationSlow = timeAfterPlay - timeBeforePlay;
                });
            cy.goCheckFrameNumber(0);
        });

        it('Change "Player speed" to "x2" (fast) and measure the speed of changing frames. The "x0.5" is expected to be slower than "x2"', () => {
            changePlayerSpeed('x2');
            cy.get('.cvat-player-play-button').click();
            timeBeforePlay = Date.now();
            cy.log(timeBeforePlay);
            cy.get('.cvat-player-filename-wrapper')
                .should('have.text', `${imageFileName}_28.png`)
                .then(() => {
                    timeAfterPlay = Date.now();
                    durationFast = timeAfterPlay - timeBeforePlay;
                    expect(durationSlow).to.be.greaterThan(durationFast);
                });
            cy.goCheckFrameNumber(0);
        });

        it('Change "Player speed" to "x1" (normal) and measure the speed of changing frames. The "x0.5" is expected to be slower than "x1"', () => {
            changePlayerSpeed('x1');
            cy.get('.cvat-player-play-button').click();
            timeBeforePlay = Date.now();
            cy.log(timeBeforePlay);
            cy.get('.cvat-player-filename-wrapper')
                .should('have.text', `${imageFileName}_28.png`)
                .then(() => {
                    timeAfterPlay = Date.now();
                    durationNormal = timeAfterPlay - timeBeforePlay;
                    expect(durationSlow).to.be.greaterThan(durationNormal);
                });
        });
    });
});
