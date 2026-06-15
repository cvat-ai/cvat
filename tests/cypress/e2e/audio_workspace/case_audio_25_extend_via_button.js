// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName, firstLabelName } from '../../support/const_audio';

context('Audio annotation. Extend region via toolbar button.', () => {
    const caseId = 'audio_25';

    before(() => {
        cy.prepareUserSession();
        cy.openAudioJob(taskName);
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Extend button creates a new region from the end of the last region to the playhead', () => {
            cy.get('body').then(($body) => {
                const initial = $body.find('.cvat-audio-region-item').length;
                cy.audioCreateRegionViaButton(firstLabelName, 100, 250);
                cy.get('.cvat-audio-region-item').should('have.length', initial + 1);
                cy.get('body').type('{esc}');
                cy.get('.cvat-cursor-control').should('have.class', 'cvat-active-canvas-control');
                cy.get('.cvat-audio-waveform-wrapper').first().then(($el) => {
                    const rect = $el[0].getBoundingClientRect();
                    cy.get('.cvat-audio-waveform-wrapper').realClick({
                        position: { x: rect.width * 0.9, y: rect.height / 2 },
                        button: 'left',
                    });
                });
                cy.audioExtendViaButton(firstLabelName);
                cy.get('.cvat-audio-region-item', { timeout: 5000 })
                    .should('have.length', initial + 2);
                cy.get('.cvat-audio-region-item').last().should('contain.text', firstLabelName);
            });
        });
    });
});
