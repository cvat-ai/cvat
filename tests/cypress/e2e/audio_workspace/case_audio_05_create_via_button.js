// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName, firstLabelName } from '../../support/const_audio';

context('Audio annotation. Create region via toolbar button.', () => {
    const caseId = 'audio_05';

    before(() => {
        cy.prepareUserSession();
        cy.openAudioJob(taskName);
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Create region by activating Create button and dragging on waveform', () => {
            cy.get('.cvat-audio-region-item').should('have.length', 0);
            cy.audioCreateRegionViaButton(firstLabelName, 100, 250);
            cy.get('.cvat-audio-region-item', { timeout: 5000 }).should('have.length', 1);
            cy.get('.cvat-audio-region-item').first().should('contain.text', firstLabelName);
        });
    });
});
