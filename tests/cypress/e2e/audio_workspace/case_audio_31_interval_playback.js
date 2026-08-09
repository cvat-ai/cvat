// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName, firstLabelName } from '../../support/const_audio';

context('Audio annotation. Interval playback behavior.', () => {
    const caseId = 'audio_31';

    beforeEach(() => {
        cy.prepareUserSession();
        cy.openAudioJob(taskName);
    });

    afterEach(() => {
        cy.audioClearAnnotationsAndSave();
    });

    const createShortInterval = (start = 100, end = 112) => {
        cy.audioCreateRegionViaButton(firstLabelName, start, end);
        cy.get('.cvat-audio-region-item').should('have.length', 1);
    };

    describe(`Testing case "${caseId}"`, () => {
        it('Plays an interval once from a sidebar double-click', () => {
            createShortInterval();
            cy.get('.cvat-audio-region-item').first().dblclick();

            cy.get('.cvat-player-pause-button').should('exist');
            cy.get('.cvat-player-play-button', { timeout: 8000 }).should('exist');
        });

        it('Plays an interval once from a canvas double-click', () => {
            createShortInterval();
            cy.doubleClickRegionOnWaveform(106);

            cy.get('.cvat-audio-region-item').first().should('have.class', 'cvat-audio-region-item-active');
            cy.get('.cvat-player-pause-button').should('exist');
            cy.get('.cvat-player-play-button', { timeout: 8000 }).should('exist');
        });

        it('Preserves play-once bounds across pause and resume', () => {
            createShortInterval();
            cy.get('.cvat-audio-region-item').first().dblclick();
            cy.get('.cvat-player-pause-button').should('exist').click();
            cy.get('.cvat-player-play-button').should('exist').click();

            cy.get('.cvat-player-pause-button').should('exist');
            cy.get('.cvat-player-play-button', { timeout: 8000 }).should('exist');
        });

        it('Loops an active interval instead of finishing at the end of the track', () => {
            createShortInterval();
            cy.clickRegionOnWaveform(106);

            cy.get('.cvat-audio-region-item').first().should('have.class', 'cvat-audio-region-item-active');
            cy.get('.cvat-audio-loop-control').click();
            cy.get('.cvat-audio-loop-control').should('have.class', 'cvat-active-canvas-control');
            cy.get('.cvat-player-play-button').click();

            cy.wait(6000);
            cy.get('.cvat-player-pause-button').should('exist');

            cy.get('.cvat-player-pause-button').click();
        });
    });
});
