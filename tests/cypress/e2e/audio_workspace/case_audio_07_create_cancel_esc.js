// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName, firstLabelName } from '../../support/const_audio';

context('Audio annotation. ESC cancels region creation.', () => {
    const caseId = 'audio_07';

    before(() => {
        cy.prepareUserSession();
        cy.openAudioJob(taskName);
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Cancels an in-progress region preview and restores cursor mode', () => {
            cy.get('.cvat-audio-region-item').should('have.length', 0);
            cy.audioActivateCreate(firstLabelName);
            cy.get('.cvat-audio-interval-region-control').should('have.class', 'cvat-active-canvas-control');

            cy.getAudioWaveformViewport().then(($viewport) => {
                const viewportRect = $viewport[0].getBoundingClientRect();
                const yOffset = viewportRect.height / 2;

                cy.wrap($viewport).realMouseDown({
                    position: { x: 100, y: yOffset },
                    button: 'left',
                });
                cy.wrap($viewport).realMouseMove(250, yOffset);
            });
            cy.getAudioWaveformHost().shadow().find('[part*="audio-preview-"]').should('have.length', 1);

            cy.get('body').type('{esc}');
            cy.get('.cvat-audio-interval-region-control').should('not.have.class', 'cvat-active-canvas-control');
            cy.get('.cvat-cursor-control').should('have.class', 'cvat-active-canvas-control');
            cy.getAudioWaveformHost().shadow().find('[part*="audio-preview-"]').should('have.length', 0);
            cy.getAudioWaveformViewport().realMouseUp({ button: 'left' });
            cy.get('.cvat-audio-region-item').should('have.length', 0);
        });
    });
});
