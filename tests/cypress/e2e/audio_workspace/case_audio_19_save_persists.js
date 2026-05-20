// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName, firstLabelName } from '../../support/const_audio';

context('Audio annotation. Save annotations persists across reload.', () => {
    const caseId = 'audio_19';

    before(() => {
        cy.prepareUserSession();
        cy.openAudioJob(taskName);
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Create region, save, reload — region is loaded back', () => {
            cy.audioCreateRegionViaButton(firstLabelName, 100, 250);
            cy.get('.cvat-audio-region-item').should('have.length', 1);
            cy.audioSaveAnnotations();
            cy.reload();
            cy.assertWaveformReady();
            cy.get('.cvat-audio-region-item', { timeout: 15000 }).should('have.length', 1);
            cy.get('.cvat-audio-region-item').first().should('contain.text', firstLabelName);
        });
    });
});
