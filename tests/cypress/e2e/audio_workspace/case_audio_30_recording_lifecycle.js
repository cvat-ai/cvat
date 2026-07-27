// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName } from '../../support/const_audio';

context('Audio annotation. Recording lifecycle.', () => {
    const caseId = 'audio_30';

    beforeEach(() => {
        cy.prepareUserSession();
        cy.openAudioJob(taskName);
    });

    afterEach(() => {
        cy.audioClearAnnotationsAndSave();
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Finalizes a recording when leaving record mode normally', () => {
            cy.get('body').type('{shift}N');

            cy.get('.cvat-player-play-button').click();
            cy.get('.cvat-player-pause-button').should('exist');

            cy.get('.cvat-audio-interval-region-control').should('have.class', 'cvat-active-canvas-control');
            cy.wait(300);
            cy.get('.cvat-player-pause-button').click();

            cy.get('.cvat-cursor-control').should('have.class', 'cvat-active-canvas-control');
            cy.get('.cvat-audio-region-item').should('have.length', 1);
        });

        it('Cancels a recording on Escape without creating an interval', () => {
            cy.get('body').type('{shift}N');

            cy.get('.cvat-player-play-button').click();
            cy.get('.cvat-player-pause-button').should('exist');

            cy.get('.cvat-audio-interval-region-control').should('have.class', 'cvat-active-canvas-control');
            cy.wait(300);
            cy.get('body').type('{esc}');
            cy.get('.cvat-player-pause-button').click();

            cy.get('.cvat-cursor-control').should('have.class', 'cvat-active-canvas-control');
            cy.get('.cvat-audio-region-item').should('have.length', 0);
        });
    });
});
